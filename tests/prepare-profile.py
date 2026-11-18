"""Prepare a NEW isolated Zotero test profile. Never point this at a real profile."""
from pathlib import Path
import argparse,json,shutil,zipfile

def fixture(path,label):
    stream=f'BT /F1 16 Tf 72 720 Td (Tab Manager fixture {label}) Tj ET'.encode()
    objects=[b'<< /Type /Catalog /Pages 2 0 R >>',b'<< /Type /Pages /Count 1 /Kids [3 0 R] >>',
        b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
        b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',b'<< /Length '+str(len(stream)).encode()+b' >>\nstream\n'+stream+b'\nendstream']
    data=b'%PDF-1.4\n';offsets=[0]
    for i,obj in enumerate(objects,1):
        offsets.append(len(data));data+=f'{i} 0 obj\n'.encode()+obj+b'\nendobj\n'
    start=len(data);data+=b'xref\n0 6\n0000000000 65535 f \n'
    for offset in offsets[1:]:data+=f'{offset:010d} 00000 n \n'.encode()
    data+=f'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n{start}\n%%EOF\n'.encode();path.write_bytes(data)

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--profile',required=True);parser.add_argument('--report',required=True)
parser.add_argument('--suite',choices=['compat','settings','groups','workspace'],default='compat')
args=parser.parse_args();profile=Path(args.profile).resolve();report=Path(args.report).resolve()
if profile.exists():raise SystemExit('Refusing an existing profile. Choose a new directory.')
root=Path(__file__).resolve().parent.parent
profile.mkdir(parents=True);report.parent.mkdir(parents=True,exist_ok=True)
data=profile/'data';data.mkdir();extensions=profile/'extensions';extensions.mkdir()
fixtures=profile/'fixtures';fixtures.mkdir()
for label in ['a','b']:fixture(fixtures/f'fixture-{label}.pdf',label)
manifest=json.loads((root/'src/manifest.json').read_text(encoding='utf-8'))
shutil.copyfile(root/'dist'/f'tab-manager-{manifest["version"]}.xpi',extensions/(manifest['applications']['zotero']['id']+'.xpi'))
with zipfile.ZipFile(extensions/'test-harness@tab-manager.local.xpi','w',zipfile.ZIP_DEFLATED) as archive:
    for name in ['bootstrap.js','manifest.json','install.rdf','run-legacy.js']:
        archive.write(root/'tests/harness'/name,name)
prefs={'extensions.zotero.dataDir':str(data),'extensions.zotero.useDataDir':True,
    'extensions.zotero.firstRun':False,'extensions.zotero.firstRun2':False,
    'extensions.zotero.sync.autoSync':False,'extensions.autoDisableScopes':0,'extensions.enabledScopes':15,
    'extensions.update.enabled':False,'app.update.enabled':False,
    'extensions.tabManager.testOutput':str(report),'extensions.tabManager.testRoot':root.as_uri()+'/',
    'extensions.tabManager.testSuite':args.suite,
    'extensions.tabManager.testFixtures':str(fixtures)+str(__import__('os').sep)}
for branch in ['zoteroWinWordIntegration','zoteroOpenOfficeIntegration','zoteroMacWordIntegration']:
    prefs['extensions.'+branch+'.skipInstallation']=True
(profile/'user.js').write_text('\n'.join('user_pref('+json.dumps(k)+','+json.dumps(v)+');' for k,v in prefs.items())+'\n',encoding='utf-8')
print('Profile:',profile);print('Report:',report)
