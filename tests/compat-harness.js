async function runCompatHarness(Zotero, Services, pluginRoot, outputFile, fixtureDir) {
  const results=[];
  const wait=ms=>new Promise(resolve=>Services.tm.dispatchToMainThread(()=>Zotero.getMainWindow().setTimeout(resolve,ms)));
  const check=(name,passed)=>{results.push({name,passed:!!passed});if(!passed)throw new Error(name);};
  let plugin=null,scope=null;
  try {
    let w;
    for(let i=0;i<120;i++){w=Zotero.getMainWindow();if(w&&w.Zotero_Tabs&&w.document.getElementById('ztg-inline'))break;await new Promise(resolve=>Services.tm.dispatchToMainThread(()=>{const t=Components.classes['@mozilla.org/timer;1'].createInstance(Components.interfaces.nsITimer);t.initWithCallback(resolve,250,Components.interfaces.nsITimer.TYPE_ONE_SHOT);}));}
    check('Packaged bootstrap starts and mounts UI',w&&!!w.document.getElementById('ztg-inline'));
    const major=parseInt(Zotero.version,10);
    const AddonManager=major>=8?ChromeUtils.importESModule('resource://gre/modules/AddonManager.sys.mjs').AddonManager:ChromeUtils.import('resource://gre/modules/AddonManager.jsm').AddonManager;
    plugin=await AddonManager.getAddonByID('tab-groups@local.zotero');
    check('Plugin installs and is active',plugin&&plugin.isActive);
    if(typeof plugin.disable==='function')await plugin.disable();else {plugin.userDisabled=true;await wait(100);}
    check('Disable removes UI',!w.document.getElementById('ztg-inline'));
    scope={Zotero,Services};
    Services.scriptloader.loadSubScript(pluginRoot+(major<7?'core-legacy.js':'core.js'),scope,'UTF-8');
    await scope.startup();
    const p=scope.TabGroups,c=p.windows.get(w),tabs=w.Zotero_Tabs,d=w.document;
    const a=await Zotero.Attachments.linkFromFile({file:fixtureDir+'fixture-a.pdf'});
    const b=await Zotero.Attachments.linkFromFile({file:fixtureDir+'fixture-b.pdf'});
    const ta=tabs.add({type:'reader-unloaded',title:'Fixture A',data:{itemID:a.id},select:false});
    const tb=tabs.add({type:'reader-unloaded',title:'Fixture B',data:{itemID:b.id},select:false});
    await wait(250);
    const aTab=tabs._tabs.find(t=>t.id===ta.id),bTab=tabs._tabs.find(t=>t.id===tb.id);
    p.state.groups.push({id:'compat-a',name:'Compatibility A',color:'#3977d5'},{id:'compat-b',name:'Compatibility B',color:'#21866a'});p.assign(aTab,'compat-a');p.assign(bTab,'compat-a');
    check('Groups render attachment tabs',d.querySelectorAll('#ztg-inline .ztg-document').length===2);
    p.setColor('','#f5d547');check('Ungrouped color supported',p.state.ungroupedColor==='#f5d547');
    p.setCollapsed('compat-a',true);check('Group collapse hides members',!d.querySelector('#ztg-inline .ztg-document'));
    p.setCollapsed('compat-a',false);p.moveGroup('compat-b','compat-a');check('Group order updates',p.orderedGroups().findIndex(g=>g.id==='compat-b')<p.orderedGroups().findIndex(g=>g.id==='compat-a'));
    p.setRemark(aTab,'Compatibility remark');p.setGroupDisplay('compat-a','note');check('Bulk display and remarks supported',p.label(aTab)==='Compatibility remark'&&p.remark(bTab).mode==='note');
    check('Search matches remarks',p.search(tabs,'compatibility remark').some(t=>t.id===ta.id));
    const note=d.querySelector('#ztg-inline .ztg-document[data-id="'+ta.id+'"]');check('Remark appears on tab',note&&note.textContent.indexOf('Compatibility remark')!==-1);
    c.openSearch();await wait(150);const panel=d.getElementById('ztg-search-panel');check('Search panel opens',panel.state==='open');
    const rows=Array.from(panel.querySelectorAll('.ztg-search-result'));
    check('Search cards do not overlap',rows.length===2&&rows[1].getBoundingClientRect().top>=rows[0].getBoundingClientRect().bottom);
    panel.hidePopup();
    c.openTabMenu({screenX:300,screenY:100,preventDefault(){},stopPropagation(){}},ta.id);await wait(200);
    const modeMenu=d.querySelector('menu.ztg-menu[label="标签显示"]');check('Native tab menu includes remark display actions',!!modeMenu);
    if(modeMenu)modeMenu.parentElement.hidePopup();
    const persisted=JSON.parse(Zotero.Prefs.get(p.pref,true));check('Settings persist',persisted.remarks[p.key(aTab)].note==='Compatibility remark'&&persisted.groupDisplay['compat-a']==='note');
    p.assign(bTab,'compat-b');p.closeGroup(w,'compat-b');check('Actual group close closes only its member',!tabs._tabs.some(t=>t.id===tb.id)&&tabs._tabs.some(t=>t.id===ta.id)&&tabs._tabs.some(t=>t.type==='library'));
    check('Close preserves assignment',p.state.assignments[p.key(bTab)]==='compat-b');
    p.setCollapsed('compat-a',true);c.reveal(ta.id);await wait(300);check('Search-style reveal selects document and expands group',tabs.selectedID===ta.id&&!c.collapsed.has('compat-a'));
    check('Suggestion toolbar label is visible',d.getElementById('ztg-suggestions').getBoundingClientRect().width>70);
    const stress={};Services.scriptloader.loadSubScript(pluginRoot+'tests/overflow.js',stress,'UTF-8');
    await stress.testOverflow(Zotero,p,w,check,wait,a.id);
    p.stop();check('Cleanup removes all controls',!d.getElementById('ztg-inline')&&!d.getElementById('ztg-search'));
    if(typeof plugin.enable==='function')await plugin.enable();else plugin.userDisabled=false;
    await wait(300);check('Packaged plugin re-enables',!!d.getElementById('ztg-inline'));
  } catch(error){results.push({error:String(error),stack:error.stack});}
  finally{if(scope&&scope.TabGroups)scope.TabGroups.stop();}
  const report={version:Zotero.version,platform:Zotero.isWin?'Windows':'other',passed:results.every(x=>x.passed===true),results};
  await Zotero.File.putContentsAsync(outputFile,JSON.stringify(report,null,2));
  Services.startup.quit(Components.interfaces.nsIAppStartup.eForceQuit);
}
