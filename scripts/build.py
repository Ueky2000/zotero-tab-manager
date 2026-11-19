"""Build the Zotero 7–10 XPI and update manifest. Python 3, stdlib only."""
from pathlib import Path
import hashlib,json,zipfile

ROOT=Path(__file__).resolve().parent.parent
SRC=ROOT/'src'
RUNTIME=['bootstrap.js','core.js','features.js','preferences.xhtml','manifest.json','LICENSE','icon.png','icon64.png']+[f'icon-{n}.png' for n in [16,32,48,96,128,256]]

def build():
    manifest=json.loads((SRC/'manifest.json').read_text(encoding='utf-8'))
    version=manifest['version']; app=manifest['applications']['zotero']; addon=app['id']
    assert app['strict_min_version']=='7.0'
    assert app['strict_max_version']=='10.0.*'
    destination=ROOT/'dist';destination.mkdir(exist_ok=True)
    xpi=destination/f'tab-manager-{version}.xpi'
    with zipfile.ZipFile(xpi,'w',zipfile.ZIP_DEFLATED) as archive:
        for name in sorted(RUNTIME):
            info=zipfile.ZipInfo(name,date_time=(2026,1,1,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED
            info.create_system=3  # Stable ZIP metadata on Windows, macOS and Linux.
            info.external_attr=0o644<<16
            content=(ROOT/name if name=='LICENSE' else SRC/'icons'/name if name.startswith('icon') else SRC/name).read_bytes()
            # A Windows checkout or contents-API upload can change text line endings.
            # Normalize packaged text so local and CI archives are byte-identical.
            if not name.startswith('icon'):
                content=content.replace(b'\r\n',b'\n')
            archive.writestr(info,content)
    digest=hashlib.sha256(xpi.read_bytes()).hexdigest()
    # Only advertise updates to Zotero 7–10. Older update clients skip entries
    # without a gecko application target; historical release assets stay intact.
    updates={'addons':{addon:{'updates':[{'version':version,
        'update_link':f'https://raw.githubusercontent.com/Ueky2000/zotero-tab-manager/main/dist/{xpi.name}',
        'update_hash':'sha256:'+digest,'applications':{
            'zotero':{'strict_min_version':app['strict_min_version'],'strict_max_version':app['strict_max_version']}
        }}]}}}
    (ROOT/'updates.json').write_bytes((json.dumps(updates,indent=2)+'\n').encode('utf-8'))
    (destination/'SHA256SUMS').write_bytes((digest+'  '+xpi.name+'\n').encode('utf-8'))
    with zipfile.ZipFile(xpi) as archive:
        assert archive.testzip() is None
        assert set(archive.namelist())==set(RUNTIME)
    print(f'{xpi.name}: {len(RUNTIME)} files; SHA256 {digest}')
    return xpi

if __name__=='__main__':build()
