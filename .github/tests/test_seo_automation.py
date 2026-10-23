import contextlib
import importlib.util
import io
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
import urllib.error
import xml.etree.ElementTree as ET
from unittest.mock import patch


SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "seo_automation.py"
spec = importlib.util.spec_from_file_location("seo_automation", SCRIPT)
seo = importlib.util.module_from_spec(spec)
spec.loader.exec_module(seo)
NS = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}


class SiteTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.previous = os.getcwd()
        os.chdir(self.temporary.name)
        self.addCleanup(self.temporary.cleanup)
        self.addCleanup(os.chdir, self.previous)
        self.git("init", "-q")
        self.git("config", "user.name", "SEO Tests")
        self.git("config", "user.email", "seo@example.invalid")
        self.git("config", "core.autocrlf", "false")
        self.addCleanup(patch.stopall)
        patch.object(seo, "SITE_ORIGIN", "https://www.foodtechequip.com").start()
        patch.object(seo, "SITE_HOST", "www.foodtechequip.com").start()

    def git(self, *args, env=None):
        return subprocess.check_output(["git", *args], env=env).decode("utf-8").strip()

    def write(self, path, content="<html><head></head><body>Page</body></html>"):
        target = Path(path)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8")

    def commit(self, date):
        self.git("add", ".")
        env = dict(os.environ, GIT_AUTHOR_DATE=date + "T12:00:00Z", GIT_COMMITTER_DATE=date + "T12:00:00Z")
        self.git("commit", "-qm", "Update pages", env=env)

    def generate(self):
        with contextlib.redirect_stdout(io.StringIO()):
            seo.generate_sitemap()
        root = ET.parse("sitemap.xml").getroot()
        return {node.findtext("s:loc", namespaces=NS): node.findtext("s:lastmod", namespaces=NS)
                for node in root.findall("s:url", NS)}

    def test_missing_sitemap_is_detected_after_staging(self):
        self.write("index.html")
        self.commit("2026-09-01")
        self.generate()
        # Reproduce the original false-success bug, then exercise the fix.
        self.assertEqual(subprocess.run(["git", "diff", "--quiet", "--", "sitemap.xml"]).returncode, 0)
        self.git("add", "--", "sitemap.xml")
        self.assertEqual(subprocess.run(["git", "diff", "--cached", "--quiet", "--", "sitemap.xml"]).returncode, 1)

    def test_deleted_committed_sitemap_is_restored(self):
        self.write("index.html")
        self.commit("2026-09-01")
        self.generate()
        self.commit("2026-09-02")
        original = Path("sitemap.xml").read_bytes()
        self.git("rm", "sitemap.xml")
        self.commit("2026-09-03")
        self.generate()
        self.assertEqual(Path("sitemap.xml").read_bytes(), original)
        self.git("add", "--", "sitemap.xml")
        self.assertEqual(subprocess.run(["git", "diff", "--cached", "--quiet", "--", "sitemap.xml"]).returncode, 1)

    def test_updates_dates_and_deletions_are_deterministic(self):
        self.write("index.html")
        self.write("zh/index.html")
        self.write("products/old.html")
        self.commit("2026-09-01")
        self.generate()
        self.write("zh/index.html", "Updated Chinese homepage")
        self.write("products/new.html")
        self.git("rm", "products/old.html")
        self.commit("2026-09-10")
        entries = self.generate()
        origin = seo.SITE_ORIGIN
        self.assertEqual(entries, {origin + "/": "2026-09-01", origin + "/zh/": "2026-09-10",
                                   origin + "/products/new.html": "2026-09-10"})
        first = Path("sitemap.xml").read_bytes()
        self.generate()
        self.assertEqual(Path("sitemap.xml").read_bytes(), first)

    def test_filters_nonindexable_pages_and_handles_relative_canonical(self):
        pages = {
            "index.html": "",
            "404.html": "",
            "hidden.html": '<meta name="robots" content="noindex, follow">',
            "none.html": '<meta name="robots" content="none">',
            "redirect.html": '<meta http-equiv="refresh" content="0;url=/">',
            "duplicate.html": '<link rel="canonical" href="/">',
            "external.html": '<link rel="canonical" href="https://example.org/">',
            "products/valid.html": '<link rel="canonical" href="valid.html">',
            "products/a&b.html": "",
        }
        for path, head in pages.items():
            self.write(path, "<html><head>" + head + "</head></html>")
        self.commit("2026-09-01")
        entries = self.generate()
        self.assertEqual(set(entries), {seo.SITE_ORIGIN + "/", seo.SITE_ORIGIN + "/products/valid.html",
                                       seo.SITE_ORIGIN + "/products/a%26b.html"})

    def test_failed_generation_preserves_existing_file(self):
        self.write("sitemap.xml", "existing sitemap")
        with self.assertRaises(RuntimeError):
            self.generate()
        self.assertEqual(Path("sitemap.xml").read_text(), "existing sitemap")

    def test_failed_atomic_replace_preserves_existing_file(self):
        self.write("index.html")
        self.commit("2026-09-01")
        self.write("sitemap.xml", "existing sitemap")
        with patch.object(seo.os, "replace", side_effect=OSError("disk error")):
            with self.assertRaises(OSError):
                self.generate()
        self.assertEqual(Path("sitemap.xml").read_text(), "existing sitemap")
        self.assertEqual({p.name for p in Path('.').iterdir()}, {".git", "index.html", "sitemap.xml"})

    def test_unreadable_page_does_not_publish_partial_sitemap(self):
        self.write("index.html")
        self.commit("2026-09-01")
        self.write("sitemap.xml", "existing sitemap")
        with patch.object(seo, "inspect_html", return_value=(False, "inspection failed: disk error")):
            with self.assertRaises(RuntimeError):
                self.generate()
        self.assertEqual(Path("sitemap.xml").read_text(), "existing sitemap")

    def test_indexnow_includes_deleted_urls_and_filters_duplicates(self):
        self.write("index.html")
        self.write("hidden.html", '<meta name="robots" content="noindex">')
        self.write("changed.txt", "index.html\nindex.html\ndeleted.html\nhidden.html\nrobots.txt\n")
        self.commit('2026-09-01')
        patch.object(seo,'validate_config').start()
        patch.object(seo,'verify_live').start()
        with patch.dict(os.environ, {"INDEXNOW_KEY": "test-key", "INDEXNOW_KEY_LOCATION": seo.SITE_ORIGIN + "/test-key.txt"}):
            with patch.object(seo, "send_indexnow") as send:
                seo.submit_indexnow("changed.txt")
        payload = json.loads(send.call_args.args[0].data)
        self.assertEqual(payload["urlList"], [seo.SITE_ORIGIN + "/", seo.SITE_ORIGIN + "/deleted.html"])
        self.assertEqual(payload["host"], "www.foodtechequip.com")

    def test_missing_indexnow_list_fails_visibly(self):
        with patch.dict(os.environ, {"INDEXNOW_KEY": "key", "INDEXNOW_KEY_LOCATION": "https://example.org/key.txt"}):
            with self.assertRaises(RuntimeError):
                seo.submit_indexnow("missing.txt")


class RetryTests(unittest.TestCase):
    def response(self, status=200):
        response = unittest.mock.MagicMock()
        response.__enter__.return_value = response
        response.status = status
        response.read.return_value = b""
        return response

    def test_accepted_response(self):
        with patch.object(seo.urllib.request, "urlopen", return_value=self.response(202)) as send:
            seo.send_indexnow("request")
        self.assertEqual(send.call_count, 1)

    def test_rate_limit_then_success(self):
        error = urllib.error.HTTPError("https://api.indexnow.org", 429, "rate limit", {"Retry-After": "3"}, io.BytesIO(b"busy"))
        with patch.object(seo.urllib.request, "urlopen", side_effect=[error, self.response()]) as send:
            with patch.object(seo.time, "sleep") as sleep:
                seo.send_indexnow("request")
        self.assertEqual(send.call_count, 2)
        sleep.assert_called_once_with(3)

    def test_invalid_key_is_not_retried(self):
        error = urllib.error.HTTPError("https://api.indexnow.org", 403, "invalid key", {}, io.BytesIO(b"invalid key"))
        with patch.object(seo.urllib.request, "urlopen", side_effect=error) as send:
            with patch.object(seo.time, "sleep") as sleep:
                with self.assertRaises(urllib.error.HTTPError):
                    seo.send_indexnow("request")
        self.assertEqual(send.call_count, 1)
        sleep.assert_not_called()

    def test_network_failure_exhausts_retries(self):
        with patch.object(seo.urllib.request, "urlopen", side_effect=urllib.error.URLError("offline")) as send:
            with patch.object(seo.time, "sleep") as sleep:
                with self.assertRaises(urllib.error.URLError):
                    seo.send_indexnow("request")
        self.assertEqual(send.call_count, 4)
        self.assertEqual(sleep.call_count, 3)


if __name__ == "__main__":
    unittest.main()
