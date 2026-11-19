"""Verify the release package and update eligibility, using only Python stdlib."""
import hashlib,json,zipfile
from pathlib import Path

ROOT=Path(__file__).resolve().parent.parent
manifest=json.loads((ROOT/'src/manifest.json').read_text(encoding='utf-8'))
app=manifest['applications']['zotero']
assert app['id']=='tab-groups@local.zotero'
assert app['strict_min_version']=='7.0' and app['strict_max_version']=='10.0.*'
version=manifest['version'];xpi=ROOT/'dist'/f'tab-manager-{version}.xpi'
obsolete=['src/core-legacy.js','src/features-legacy.js','src/install.rdf','src/preferences-window.xul','src/chrome.manifest','scripts/build-legacy.cjs','tests/harness/run-legacy.js','tests/harness/install.rdf']
assert all(not (ROOT/name).exists() for name in obsolete), 'Obsolete compatibility file remains'
with zipfile.ZipFile(xpi) as archive:
    assert archive.testzip() is None
    names=set(archive.namelist())
    assert not names.intersection(Path(name).name for name in obsolete)
    assert json.loads(archive.read('manifest.json'))==manifest
    assert all(path in names for path in manifest['icons'].values())
    for name in ['bootstrap.js','core.js','features.js','preferences.xhtml']:
        assert archive.read(name)==(ROOT/'src'/name).read_bytes().replace(b'\r\n',b'\n')
updates=json.loads((ROOT/'updates.json').read_text(encoding='utf-8'))['addons'][app['id']]['updates']
assert len(updates)==1
update=updates[0]
assert update['version']==version and update['applications']=={'zotero':{'strict_min_version':'7.0','strict_max_version':'10.0.*'}}
assert update['update_link'].endswith(f'/dist/{xpi.name}')
assert update['update_hash']=='sha256:'+hashlib.sha256(xpi.read_bytes()).hexdigest()
# The previous-generation updater skips application entries without 'gecko'.
assert 'gecko' not in update['applications']
print(f'{version}: package integrity, supported versions and update eligibility passed')
