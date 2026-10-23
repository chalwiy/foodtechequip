#!/usr/bin/env python3
import argparse
import json
import os
import subprocess
import sys
import tempfile
import time
import pathlib
import re
import urllib.robotparser
import urllib.error
import urllib.parse
import urllib.request
from html.parser import HTMLParser
from xml.sax.saxutils import escape

SITE_HOST = os.environ.get("SITE_HOST", "www.foodtechequip.com")
SITE_ORIGIN = os.environ.get("SITE_ORIGIN", "https://www.foodtechequip.com").rstrip("/")
CONFIG_PATH=pathlib.Path(__file__).resolve().parents[1]/'seo-config.json'
if CONFIG_PATH.exists():
    _config=json.loads(CONFIG_PATH.read_text(encoding='utf8'))
    os.environ.setdefault('INDEXNOW_KEY',_config['key'])
    os.environ.setdefault('INDEXNOW_KEY_LOCATION',_config['origin']+'/'+_config['key']+'.txt')


class SeoHeadParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.noindex = False
        self.refresh = False
        self.canonical = None

    def handle_starttag(self, tag, attrs):
        tag = tag.lower()
        a = {str(k).lower(): (v or "") for k, v in attrs if k}
        if tag == "meta":
            name = a.get("name", "").lower()
            content = a.get("content", "").lower()
            directives = content.replace(",", " ").split()
            if name in {"robots", "googlebot", "bingbot"} and {"noindex", "none"}.intersection(directives):
                self.noindex = True
            if a.get("http-equiv", "").lower() == "refresh":
                self.refresh = True
        elif tag == "link":
            rel = a.get("rel", "").lower().split()
            if "canonical" in rel and a.get("href"):
                self.canonical = a["href"].strip()


def public_url(path):
    path = safe_path(path)
    path = path.replace("\\", "/").lstrip("./")
    public_path = "/" + path
    if public_path == "/index.html":
        public_path = "/"
    elif public_path.endswith("/index.html"):
        public_path = public_path[:-len("index.html")]
    public_path = urllib.parse.quote(public_path, safe="/%-._~")
    return SITE_ORIGIN + public_path


def inspect_html(path, url, allow_deleted=False):
    if path == "404.html" or path.endswith("/404.html"):
        return False, "404 page"

    if not os.path.isfile(path):
        if allow_deleted:
            return True, "deleted URL"
        return False, "missing file"

    parser = SeoHeadParser()
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            parser.feed(f.read())
    except OSError as exc:
        if allow_deleted:
            return True, f"inspection failed: {exc}"
        return False, f"inspection failed: {exc}"

    if parser.noindex:
        return False, "meta robots noindex"
    if parser.refresh:
        return False, "meta refresh redirect"
    if parser.canonical:
        canonical = urllib.parse.urljoin(url, parser.canonical)
        if canonical.rstrip("/") != url.rstrip("/"):
            return False, f"canonical points to {canonical}"

    return True, "indexable"


def tracked_html_files():
    output = subprocess.check_output(["git", "ls-files", "-z", "*.html"]).decode("utf-8")
    result=[]
    for path in output.split('\0'):
        if not path: continue
        try: result.append(safe_path(path))
        except ValueError: print('Skipping internal tracked path: '+path)
    return sorted(set(result))


def html_lastmod_dates(paths):
    """Return the latest Git commit date (YYYY-MM-DD) for each current HTML file."""
    wanted = set(paths)
    dates = {}
    if not wanted:
        return dates
    marker = "@@FTE_DATE@@"

    # One Git history traversal is much faster than running `git log -1`
    # separately for thousands of HTML files. --no-renames makes a rename
    # expose the new path at the rename commit, which is the right lastmod for
    # the current URL.
    output = subprocess.check_output(
        [
            "git",
            "-c", "core.quotepath=false",
            "log",
            "--no-renames",
            f"--format={marker}%cs",
            "--name-only",
            "--diff-filter=ACMR",
            "--",
            "*.html",
        ],
        text=True,
        encoding="utf-8",
        errors="replace",
    )

    current_date = None
    for raw_line in output.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        if line.startswith(marker):
            current_date = line[len(marker):].strip()
            continue
        path = line.replace("\\", "/")
        if current_date and path in wanted and path not in dates:
            dates[path] = current_date
            if len(dates) == len(wanted):
                break

    missing = wanted - dates.keys()
    if missing:
        # This should be rare (for example, unusual shallow history). Fall back
        # per file so sitemap generation still succeeds with accurate dates.
        for path in sorted(missing):
            try:
                date = subprocess.check_output(
                    ["git", "log", "-1", "--format=%cs", "--", path],
                    text=True,
                    errors="replace",
                ).strip()
            except subprocess.CalledProcessError:
                date = ""
            if date:
                dates[path] = date
            else:
                print(f"Warning: no Git lastmod date found for {path}; omitting <lastmod>.")

    return dates


def generate_sitemap(output_path="sitemap.xml"):
    paths = tracked_html_files()
    lastmods = html_lastmod_dates(paths)
    entries = {}
    skipped = []

    for path in paths:
        url = public_url(path)
        include, reason = inspect_html(path, url, allow_deleted=False)
        if reason == "missing file" or reason.startswith("inspection failed:"):
            raise RuntimeError(f"Cannot inspect tracked page {path}: {reason}; existing sitemap was preserved.")
        if include:
            date = lastmods.get(path)
            # If two tracked files somehow map to the same public URL, keep the
            # newest real modification date for that URL.
            previous = entries.get(url)
            if previous is None or (date and (not previous or date > previous)):
                entries[url] = date
        else:
            skipped.append((path, reason))

    # Refuse to replace a good sitemap with an empty or oversized one.
    if not entries and paths and all(inspect_html(p, public_url(p))[1] in ('meta robots noindex', '404 page', 'meta refresh redirect') for p in paths):
        print('SKIP: no indexable pages; preserving existing sitemap (pre-release state).')
        return False
    if not entries:
        raise RuntimeError("No indexable HTML pages found; existing sitemap was preserved.")
    for url in entries:
        if not robots_allowed(url):
            raise RuntimeError('robots.txt blocks an indexable page: '+url)
    if len(entries) > 50000:
        raise RuntimeError("Sitemap exceeds 50,000 URLs; split into a sitemap index first.")

    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    for url in sorted(entries):
        lines.append("  <url>")
        lines.append(f"    <loc>{escape(url)}</loc>")
        if entries[url]:
            lines.append(f"    <lastmod>{entries[url]}</lastmod>")
        lines.append("  </url>")
    lines.append("</urlset>")

    data = ("\n".join(lines) + "\n").encode("utf-8")
    if len(data) > 52428800:
        raise RuntimeError("Sitemap exceeds the 50 MB protocol limit.")
    # Same-directory atomic replacement keeps the old file intact on failure.
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(dir=os.path.dirname(os.path.abspath(output_path)), delete=False) as f:
            temporary = f.name
            f.write(data)
        os.replace(temporary, output_path)
    finally:
        if temporary and os.path.exists(temporary):
            os.unlink(temporary)

    with_lastmod = sum(1 for date in entries.values() if date)
    print(
        f"Generated {output_path} with {len(entries)} URL(s), "
        f"{with_lastmod} lastmod date(s); skipped {len(skipped)} non-indexable page(s)."
    )
    for path, reason in skipped:
        print(f"Skipping sitemap entry {path}: {reason}")


def send_indexnow(request, attempts=4):
    """Retry transient failures only; invalid keys/payloads must fail visibly."""
    for attempt in range(attempts):
        delay = min(2 ** attempt * 5, 60)
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                status = response.status
                detail = response.read().decode("utf-8", errors="replace")
                print(f"IndexNow HTTP {status}: {detail or 'OK'}")
                if status not in (200, 202):
                    raise RuntimeError(f"Unexpected IndexNow status: {status}")
                print('Received; indexing is not guaranteed.' if status==200 else 'Accepted; key validation is pending, not an indexing confirmation.')
                return
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            print(f"IndexNow HTTP {exc.code}: {detail}", file=sys.stderr)
            if exc.code not in (408, 429, 500, 502, 503, 504) or attempt == attempts - 1:
                raise
            retry_after = exc.headers.get("Retry-After", "") if exc.headers else ""
            if retry_after.isdigit():
                delay = min(int(retry_after), 60)
        except (urllib.error.URLError, TimeoutError, ConnectionError):
            if attempt == attempts - 1:
                raise
        print(f"Transient IndexNow failure; retrying in {delay}s.")
        time.sleep(delay)


def submit_indexnow(file_list, dry_run=False):
    key = os.environ["INDEXNOW_KEY"]
    key_location = os.environ["INDEXNOW_KEY_LOCATION"]

    try:
        with open(file_list, "r", encoding="utf-8") as f:
            paths = [safe_path(line.strip()) for line in f if line.strip()]
    except FileNotFoundError:
        raise RuntimeError(f"Changed-file list is missing: {file_list}")

    urls = []
    seen = set()
    for path in paths:
        if not path.endswith(".html"):
            continue
        url = public_url(path)
        include, reason = inspect_html(path, url, allow_deleted=True)
        if not include:
            print(f"Skipping {url}: {reason}")
            continue
        if url not in seen:
            seen.add(url)
            urls.append(url)
            print(f"Queueing {url}: {reason}")

    if not urls:
        print("No eligible HTML URLs changed; nothing to submit.")
        return

    if not any(inspect_html(p, public_url(p))[0] for p in tracked_html_files()):
        print('SKIP: no current indexable pages; no IndexNow submission.')
        return
    for url in urls:
        if not robots_allowed(url):
            raise RuntimeError('robots.txt blocks submission: '+url)
    if dry_run:
        print('DRY RUN: '+json.dumps(urls)); return urls
    validate_config(key, key_location)
    verify_live(key, key_location, urls)

    print(f"Submitting {len(urls)} URL(s) to IndexNow")
    for start in range(0, len(urls), 10000):
        batch = urls[start:start + 10000]
        payload = {
            "host": SITE_HOST,
            "key": key,
            "keyLocation": key_location,
            "urlList": batch,
        }
        request = urllib.request.Request(
            "https://api.indexnow.org/indexnow",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json; charset=utf-8"},
            method="POST",
        )
        send_indexnow(request)

    print("IndexNow submission completed successfully.")


def safe_path(path):
    path = path.replace('\\', '/')
    parts = pathlib.PurePosixPath(path).parts
    if not path or path.startswith('/') or any(x in ('.', '..') for x in parts) or ':' in path or any(x.startswith('.') for x in parts):
        raise ValueError('Unsafe/internal path: '+path)
    if any(x.lower() in {'backup','backups','tests','reports','node_modules','work','tools'} for x in parts[:-1]):
        raise ValueError('Internal path: '+path)
    return path


def robots_allowed(url):
    path=pathlib.Path('robots.txt')
    if not path.exists(): return True
    robots=urllib.robotparser.RobotFileParser()
    robots.parse(path.read_text(encoding='utf8').splitlines())
    return all(robots.can_fetch(bot,url) for bot in ['*','bingbot','Googlebot'])


def validate_config(key, location):
    if SITE_ORIGIN != 'https://www.foodtechequip.com' or SITE_HOST != 'www.foodtechequip.com':
        raise ValueError('Unexpected production origin')
    if not re.fullmatch('[a-f0-9]{32}',key) or location != SITE_ORIGIN+'/'+key+'.txt':
        raise ValueError('Invalid key/location')
    if pathlib.Path(key+'.txt').read_text(encoding='utf8').strip()!=key:
        raise ValueError('Local key file mismatch')


def read_live(url):
    request=urllib.request.Request(url,headers={'Cache-Control':'no-cache','User-Agent':'FTE-SEO-maintenance/1.0'})
    with urllib.request.urlopen(request,timeout=30) as response:
        if response.geturl()!=url: raise RuntimeError('Unexpected redirect: '+url)
        return response.read()


def verify_live(key, location, urls):
    if read_live(location).decode('utf8').strip()!=key: raise RuntimeError('Online key not ready')
    for name in ['robots.txt','sitemap.xml']:
        p=pathlib.Path(name)
        if not p.exists() or read_live(SITE_ORIGIN+'/'+name)!=p.read_bytes():
            raise RuntimeError('Online deployment differs: '+name)
    # Confirm every submitted existing page matches the checked-out deployment.
    for url in urls:
        relative=urllib.parse.unquote(urllib.parse.urlsplit(url).path).lstrip('/')
        path=pathlib.Path(relative+'index.html' if not relative or relative.endswith('/') else relative)
        try: content=read_live(url)
        except urllib.error.HTTPError as exc:
            if not path.exists() and exc.code in (404,410): continue
            raise
        if not path.exists() or path.read_bytes()!=content: raise RuntimeError('Page not published yet: '+url)


def main():
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="command", required=True)
    sitemap = sub.add_parser("sitemap")
    sitemap.add_argument("--output", default="sitemap.xml")
    indexnow = sub.add_parser("indexnow")
    indexnow.add_argument("file_list")
    indexnow.add_argument('--dry-run',action='store_true')
    args = parser.parse_args()

    if args.command == "sitemap":
        generate_sitemap(args.output)
    elif args.command == "indexnow":
        submit_indexnow(args.file_list, args.dry_run)


if __name__ == "__main__":
    main()
