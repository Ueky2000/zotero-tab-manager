"""Build the XPI and both-generation Zotero update manifest. Python 3, stdlib only."""
from pathlib import Path
import hashlib,json,zipfile,xml.etree.ElementTree as ET

ROOT=Path(__file__).resolve().parent
RUNTIME=['bootstrap.js','core.js','core-legacy.js','manifest.json','install.rdf','LICENSE','icon.png','icon64.png']+[f'icon-{n}.png' for n in [16,32,48,96,128,256]]

def build():
    manifest=json.loads((ROOT/'manifest.json').read_text(encoding='utf-8'))
    version=manifest['version']; app=manifest['applications']['zotero']; addon=app['id']
    rdf=ET.parse(ROOT/'install.rdf');ns={'em':'http://www.mozilla.org/2004/em-rdf#'}
    assert rdf.find('.//em:version',ns).text==version,'Version mismatch'
    assert rdf.find('.//em:id',ns).text==addon,'Plugin ID mismatch'
    assert app['strict_max_version']=='10.0.*'
    destination=ROOT/'dist';destination.mkdir(exist_ok=True)
    xpi=destination/f'tab-manager-{version}.xpi'
    with zipfile.ZipFile(xpi,'w',zipfile.ZIP_DEFLATED) as archive:
        for name in sorted(RUNTIME):
            info=zipfile.ZipInfo(name,date_time=(2026,1,1,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED
            info.create_system=3  # Stable ZIP metadata on Windows, macOS and Linux.
            info.external_attr=0o644<<16;archive.writestr(info,(ROOT/name).read_bytes())
    digest=hashlib.sha256(xpi.read_bytes()).hexdigest()
    # Zotero 6 uses the Firefox platform version in applications.gecko.
    # Zotero 7+ uses its own app version in applications.zotero.
    updates={'addons':{addon:{'updates':[{'version':version,
        'update_link':f'https://raw.githubusercontent.com/Ueky2000/zotero-tab-manager/main/dist/{xpi.name}',
        'update_hash':'sha256:'+digest,'applications':{
            'gecko':{'strict_min_version':'60.9','strict_max_version':'60.9'},
            'zotero':{'strict_min_version':'6.999','strict_max_version':app['strict_max_version']}
        }}]}}}
    (ROOT/'updates.json').write_bytes((json.dumps(updates,indent=2)+'\n').encode('utf-8'))
    (destination/'SHA256SUMS').write_bytes((digest+'  '+xpi.name+'\n').encode('utf-8'))
    with zipfile.ZipFile(xpi) as archive:
        assert archive.testzip() is None
        assert set(archive.namelist())==set(RUNTIME)
    print(f'{xpi.name}: {len(RUNTIME)} files; SHA256 {digest}')
    return xpi

if __name__=='__main__':build()
