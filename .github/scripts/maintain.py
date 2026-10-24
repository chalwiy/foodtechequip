"""Trusted-main maintenance driver. Network/writes only with explicit --execute."""
import argparse, json, os, pathlib, subprocess, tempfile, time, urllib.request, urllib.error
import seo_automation as seo

def git(*args):
    return subprocess.check_output(['git',*args],text=True,encoding='utf8').strip()

def changed_paths(event,before,after):
    if event=='schedule': return []
    if event=='workflow_dispatch': return seo.tracked_html_files()
    if not before or set(before)=={'0'} or subprocess.run(['git','cat-file','-e',before+'^{commit}'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL).returncode:
        return seo.tracked_html_files()
    return sorted(set(p for p in git('diff','--name-only','--no-renames','--diff-filter=ACMDR',before,after,'--','*.html').splitlines() if p))

def pages_api(path,method='GET'):
    repo=os.environ['GITHUB_REPOSITORY']
    request=urllib.request.Request('https://api.github.com/repos/'+repo+'/pages'+path,method=method,headers={
        'Authorization':'Bearer '+os.environ['GH_TOKEN'],'Accept':'application/vnd.github+json',
        'X-GitHub-Api-Version':'2026-03-10','User-Agent':'FTE-maintenance'})
    with urllib.request.urlopen(request,timeout=30) as response:
        raw=response.read()
        return json.loads(raw) if raw else {}

def rebuild_and_wait(sha):
    settings=pages_api('')
    if settings.get('build_type')=='workflow' or settings.get('source')!={'branch':'main','path':'/'}:
        raise RuntimeError('Expected branch-based Pages: main / root. No settings were changed.')
    for attempt in range(12):
        try:
            build=pages_api('/builds','POST'); break
        except urllib.error.HTTPError as exc:
            if exc.code!=409 or attempt==11: raise
            time.sleep(10)
    # POST /pages/builds returns a URL/status, not a build id (GitHub REST).
    # Poll latest and verify its commit so an older completed build cannot pass.
    for attempt in range(45):
        state=pages_api('/builds/latest')
        if state.get('commit')==sha and state.get('status')=='errored': raise RuntimeError('Pages build failed')
        if state.get('status')=='built' and state.get('commit')==sha:
            print('Pages build completed for checked-out commit'); return
        time.sleep(10)
    raise RuntimeError('Pages build timeout; nothing submitted to IndexNow')

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--execute',action='store_true')
    args=parser.parse_args()
    event=os.environ.get('GITHUB_EVENT_NAME','workflow_dispatch')
    target=os.environ.get('EVENT_AFTER') or git('rev-parse','HEAD')
    before=os.environ.get('EVENT_BEFORE','')
    # A queued old run must not publish or notify against newer human changes.
    if os.environ.get('EVENT_AFTER') and target!=git('rev-parse','HEAD'):
        raise RuntimeError('main advanced since event; newest queued run handles it')
    paths=changed_paths(event,before,target)
    if not args.execute:
        print('DRY RUN: no commits, rebuild API calls or IndexNow requests')
        with tempfile.TemporaryDirectory() as temporary:
            seo.generate_sitemap(str(pathlib.Path(temporary)/'sitemap.xml'))
            filelist=pathlib.Path(temporary)/'changed.txt';filelist.write_text('\n'.join(paths),encoding='utf8')
            seo.submit_indexnow(str(filelist),dry_run=True)
        return
    if os.environ.get('GITHUB_REPOSITORY')!='chalwiy/foodtechequip' or os.environ.get('GITHUB_REF')!='refs/heads/main':
        raise RuntimeError('Execution restricted to target repository main')
    seo.generate_sitemap()
    if not any(seo.inspect_html(p,seo.public_url(p))[0] for p in seo.tracked_html_files()):
        print('SKIP: pre-release/no indexable pages. No commit, rebuild or submission.');return
    if pathlib.Path('sitemap.xml').exists():
        subprocess.run(['git','add','--','sitemap.xml'],check=True)
        changed=subprocess.run(['git','diff','--cached','--quiet','--','sitemap.xml']).returncode
        if changed not in (0,1): raise RuntimeError('git diff failed')
        if changed:
            git('config','user.name','github-actions[bot]')
            git('config','user.email','41898282+github-actions[bot]@users.noreply.github.com')
            git('commit','-m','Update sitemap automatically','--','sitemap.xml')
            git('push','origin','HEAD:main')
            target=git('rev-parse','HEAD')
            rebuild_and_wait(target)
    if event=='schedule': print('Recovery only; no bulk IndexNow submission');return
    if not paths: print('No HTML changes; nothing to submit');return
    with tempfile.TemporaryDirectory() as temporary:
        filelist=pathlib.Path(temporary)/'changed.txt';filelist.write_text('\n'.join(paths),encoding='utf8')
        seo.submit_indexnow(str(filelist))

if __name__=='__main__':main()

