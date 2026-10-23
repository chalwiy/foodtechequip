import importlib.util, pathlib, sys, json, os, unittest, io, urllib.error
from unittest.mock import patch, MagicMock
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/'scripts'))
import maintain
import test_seo_automation as base
seo=base.seo

class SafetyTests(base.SiteTests):
    def test_all_noindex_preserves_sitemap_and_skips(self):
        self.write('index.html','<meta name="robots" content="noindex">')
        self.write('sitemap.xml','keep')
        self.commit('2026-09-01')
        self.assertFalse(seo.generate_sitemap())
        self.assertEqual(pathlib.Path('sitemap.xml').read_text(),'keep')
    def test_robots_conflict_preserves(self):
        self.write('index.html');self.write('robots.txt','User-agent: *\nDisallow: /\n')
        self.write('sitemap.xml','keep');self.commit('2026-09-01')
        with self.assertRaises(RuntimeError):seo.generate_sitemap()
        self.assertEqual(pathlib.Path('sitemap.xml').read_text(),'keep')
    def test_dry_run_no_network(self):
        self.write('index.html');self.write('list.txt','index.html');self.commit('2026-09-01')
        with patch.object(seo.urllib.request,'urlopen',side_effect=AssertionError('network forbidden')):
            self.assertEqual(seo.submit_indexnow('list.txt',dry_run=True),[seo.SITE_ORIGIN+'/'])
    def test_unsafe_paths(self):
        for path in ['../secret.html','/index.html','C:/x.html','.github/x.html','work/x.html']:
            with self.assertRaises(ValueError):seo.public_url(path)
    def test_internal_tracked_excluded(self):
        self.write('index.html');self.write('.github/test.html');self.write('reports/x.html');self.commit('2026-09-01')
        self.assertEqual(seo.tracked_html_files(),['index.html'])
    def test_deep_canonical_and_encoding(self):
        self.write('products/设备/index.html','<link rel="canonical" href="./">');self.commit('2026-09-01')
        self.assertEqual(set(self.generate()),{seo.SITE_ORIGIN+'/products/%E8%AE%BE%E5%A4%87/'})
    def test_rename_includes_both_urls(self):
        self.write('old.html');self.commit('2026-09-01');before=self.git('rev-parse','HEAD')
        self.git('mv','old.html','new.html');self.commit('2026-09-02')
        self.assertEqual(maintain.changed_paths('push',before,self.git('rev-parse','HEAD')),['new.html','old.html'])
    def test_missing_before_and_schedule(self):
        self.write('index.html');self.commit('2026-09-01')
        self.assertEqual(maintain.changed_paths('push','0'*40,'HEAD'),['index.html'])
        self.assertEqual(maintain.changed_paths('schedule','','HEAD'),[])
    def test_batches(self):
        self.write('index.html');self.commit('2026-09-01')
        self.write('list.txt','\n'.join('deleted'+str(i)+'.html' for i in range(10001)))
        with patch.object(seo,'validate_config'),patch.object(seo,'verify_live'),patch.object(seo,'send_indexnow') as send,patch('builtins.print'):
            seo.submit_indexnow('list.txt')
        self.assertEqual([len(json.loads(c.args[0].data)['urlList']) for c in send.call_args_list],[10000,1])
    def test_online_not_published_blocks(self):
        self.write('robots.txt','User-agent: *\nAllow: /');self.write('sitemap.xml','xml');self.write('index.html','local')
        with patch.object(seo,'read_live',side_effect=[b'key',b'User-agent: *\nAllow: /',b'xml',b'old']):
            with self.assertRaises(RuntimeError):seo.verify_live('key','location',[seo.SITE_ORIGIN+'/'])
    def test_key_mismatch(self):
        with self.assertRaises(ValueError):seo.validate_config('invalid','https://other/key.txt')
    def test_dry_driver_no_api(self):
        self.write('index.html');self.commit('2026-09-01')
        with patch.object(sys,'argv',['maintain']),patch.object(maintain,'pages_api',side_effect=AssertionError('API forbidden')),patch.object(seo.urllib.request,'urlopen',side_effect=AssertionError('network forbidden')),patch.dict(os.environ,{'EVENT_AFTER':'','GITHUB_EVENT_NAME':'workflow_dispatch'}):
            maintain.main()

class ConfigTests(unittest.TestCase):
    def test_fte_only(self):
        config=json.loads((pathlib.Path(__file__).resolve().parents[1]/'seo-config.json').read_text())
        self.assertEqual(config['origin'],'https://www.foodtechequip.com')
        self.assertRegex(config['key'],r'^[a-f0-9]{32}$')
        self.assertNotEqual(config['key'],'425a4655a3dc49f59e4e5bcfebc27999')
    def test_pages_build_wait(self):
        with patch.object(maintain,'pages_api',side_effect=[{'build_type':'legacy','source':{'branch':'main','path':'/'}},{'id':42},{'status':'built','commit':'abc'}]) as api:
            maintain.rebuild_and_wait('abc')
        self.assertEqual(api.call_args_list[1].args,('/builds','POST'))
    def test_pages_other_mode_rejected(self):
        with patch.object(maintain,'pages_api',return_value={'build_type':'workflow'}):
            with self.assertRaises(RuntimeError):maintain.rebuild_and_wait('abc')
    def test_pages_wrong_commit_rejected(self):
        with patch.object(maintain,'pages_api',side_effect=[{'source':{'branch':'main','path':'/'}},{'id':42},{'status':'built','commit':'wrong'}]):
            with self.assertRaises(RuntimeError):maintain.rebuild_and_wait('abc')

if __name__=='__main__':unittest.main()
