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
    Services.scriptloader.loadSubScript(pluginRoot+'src/'+(major<7?'core-legacy.js':'core.js'),scope,'UTF-8');
    await scope.startup();
    const p=scope.TabGroups,c=p.windows.get(w),tabs=w.Zotero_Tabs,d=w.document;
    const a=await Zotero.Attachments.linkFromFile({file:fixtureDir+'fixture-a.pdf'});
    const b=await Zotero.Attachments.linkFromFile({file:fixtureDir+'fixture-b.pdf'});
    const ta=tabs.add({type:'reader-unloaded',title:'Fixture A',data:{itemID:a.id},select:false});
    const tb=tabs.add({type:'reader-unloaded',title:'Fixture B',data:{itemID:b.id},select:false});
    await wait(250);
    const aTab=tabs._tabs.find(t=>t.id===ta.id),bTab=tabs._tabs.find(t=>t.id===tb.id);
    p.state.groups.push({id:'compat-a',name:'Compatibility A',color:'#3977d5'},{id:'compat-b',name:'Compatibility B',color:'#21866a'});p.assign(aTab,'compat-a');p.assign(bTab,'compat-a');
    check('Ungrouped follows named groups by default',p.orderedGroups().slice(-1)[0].id==='');
    const heading=()=>d.querySelector('#ztg-inline .ztg-heading[data-group="compat-a"]');
    const headingWidth=heading().getBoundingClientRect().width;
    p.assign(bTab,'compat-b');
    check('Heading width does not change with member count',heading().getBoundingClientRect().width===headingWidth);
    p.assign(bTab,'compat-a');
    check('Groups render attachment tabs',d.querySelectorAll('#ztg-inline .ztg-document').length===2);
    p.setColor('','#f5d547');check('Ungrouped color supported',p.state.ungroupedColor==='#f5d547');
    p.setCollapsed('compat-a',true);check('Group collapse hides members',!d.querySelector('#ztg-inline .ztg-document'));
    p.setCollapsed('compat-a',false);p.moveGroup('compat-b','compat-a');check('Group order updates',p.orderedGroups().findIndex(g=>g.id==='compat-b')<p.orderedGroups().findIndex(g=>g.id==='compat-a'));
    p.setRemark(aTab,'Compatibility remark');p.setGroupDisplay('compat-a','note');check('Bulk display and remarks supported',p.label(aTab)==='Compatibility remark'&&p.remark(bTab).mode==='note');
    check('Search matches remarks',p.search(tabs,'compatibility remark').some(t=>t.id===ta.id));
    const note=d.querySelector('#ztg-inline .ztg-document[data-id="'+ta.id+'"]');check('Remark appears on tab',note&&note.textContent.indexOf('Compatibility remark')!==-1);
    w.focus();await wait(100);c.openSearch();
    const panel=d.getElementById('ztg-search-panel');
    for(let i=0;i<30&&panel.state!=='open';i++)await wait(50);
    check('Search panel opens',panel.state==='open');
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
    check('Cleanup restores native library tab',Array.from(d.querySelectorAll('#tab-bar-container [data-id="zotero-pane"]')).some(n=>n.getBoundingClientRect().width>0));
    if(typeof plugin.enable==='function')await plugin.enable();else plugin.userDisabled=false;
    await wait(300);check('Packaged plugin re-enables',!!d.getElementById('ztg-inline'));
  } catch(error){results.push({error:String(error),stack:error.stack});}
  finally{if(scope&&scope.TabGroups)scope.TabGroups.stop();}
  const report={version:Zotero.version,platform:Zotero.isWin?'Windows':'other',passed:results.every(x=>x.passed===true),results};
  await Zotero.File.putContentsAsync(outputFile,JSON.stringify(report,null,2));
  Services.startup.quit(Components.interfaces.nsIAppStartup.eForceQuit);
}

async function runSettingsHarness(Zotero, Services, outputFile, fixtureDir) {
  const results=[];
  const wait=ms=>new Promise(resolve=>Zotero.getMainWindow().setTimeout(resolve,ms));
  const check=(name,passed)=>{results.push({name,passed:!!passed});if(!passed)throw new Error(name);};
  const until=async test=>{for(let i=0;i<200;i++){if(test())return;await wait(100);}throw new Error('Timed out waiting for settings/workspace UI');};
  try {
    if(Zotero.uiReadyPromise)await Zotero.uiReadyPromise;
    await wait(1500);
    await until(()=>Zotero.TabManagerPlugin&&Zotero.getMainWindow().document.getElementById('ztg-inline'));
    const w=Zotero.getMainWindow(),p=Zotero.TabManagerPlugin,tabs=w.Zotero_Tabs,c=p.windows.get(w);
    check('Packaged plugin starts with settings support',!!p&&!!c);
    check('Tools menu contains settings and workspace shortcuts',!!w.document.getElementById('ztg-tools-menu'));
    if(parseInt(Zotero.version,10)<7){
      // Firefox 60's PDF renderer can wait indefinitely in a hidden window.
      // Check the real legacy settings window here; shared restore logic is
      // covered by features.cjs, and full PDF flows by the modern UI runs.
      await p.openSettings(w);let legacyWin;await wait(500);
      await until(()=>{legacyWin=[...p.settingsWindows].find(x=>!x.closed);return legacyWin&&legacyWin.document.getElementById('tm-setting-restoreClosedGroups');});
      const doc=legacyWin.document;
      check('Legacy settings window renders all seven controls',doc.querySelectorAll('[id^="tm-setting-"]').length===7);
      const memory=doc.getElementById('tm-setting-restoreClosedGroups');memory.checked=false;memory.dispatchEvent(new legacyWin.Event('change',{bubbles:true}));
      check('Legacy memory setting applies and persists',!p.getSettings().restoreClosedGroups&&!JSON.parse(Zotero.Prefs.get(p.pref,true)).settings.restoreClosedGroups);
      const days=doc.getElementById('tm-setting-suggestDays');days.value='14';days.dispatchEvent(new legacyWin.Event('change',{bubbles:true}));
      check('Legacy suggestion threshold persists',p.state.suggestDays===14);
      check('Legacy workspace buttons are available',!!doc.getElementById('tm-save-workspace')&&doc.getElementById('tm-restore-workspace').disabled);
      legacyWin.close();p.stop();check('Legacy cleanup removes settings and Tools menu',!p.settingsWindows.size&&!w.document.getElementById('ztg-tools-menu'));
      await Zotero.File.putContentsAsync(outputFile,JSON.stringify({version:Zotero.version,platform:'Windows',suite:'legacy-settings-only',passed:true,results},null,2));
      Services.startup.quit(Components.interfaces.nsIAppStartup.eForceQuit);return;
    }
    if(parseInt(Zotero.version,10)>=7)check('Native Zotero preferences pane registered',Zotero.PreferencePanes.pluginPanes.some(pane=>pane.id==='tab-manager-settings'));
    const a=await Zotero.Attachments.linkFromFile({file:fixtureDir+'fixture-a.pdf'}),b=await Zotero.Attachments.linkFromFile({file:fixtureDir+'fixture-b.pdf'});
    await Zotero.Reader.open(a.id);await Zotero.Reader.open(b.id);await wait(400);
    const find=item=>tabs._tabs.find(t=>t.data&&t.data.itemID===item.id);
    p.state.groups.push({id:'settings-group',name:'Reading task',color:'#3977d5'});p.assign(find(a),'settings-group');p.assign(find(b),'settings-group');
    p.setRemark(find(a),'Workspace experiment');p.setGroupDisplay('settings-group','both');
    await p.openSettings(w);
    let settingsWin;
    await until(()=>{
      settingsWin=p.settingsPane?Services.wm.getMostRecentWindow('zotero:pref'):[...p.settingsWindows].find(x=>!x.closed);
      return settingsWin&&settingsWin.document.getElementById('tm-setting-restoreClosedGroups');
    });
    const d=settingsWin.document,control=key=>d.getElementById('tm-setting-'+key);
    check('Settings page renders all seven controls',d.querySelectorAll('[id^="tm-setting-"]').length===7);
    const change=(key,value)=>{const n=control(key);if(n.type==='checkbox')n.checked=value;else n.value=value;n.dispatchEvent(new settingsWin.Event('change',{bubbles:true}));};
    change('showGroupCounts',false);check('Group count setting applies immediately',!w.document.querySelector('.ztg-heading').textContent.includes('('));
    change('showGroupCounts',true);change('suggestDays',14);check('Suggestion threshold persists',p.state.suggestDays===14);
    change('defaultDisplay','note');check('Default tab display setting persists',p.getSettings().defaultDisplay==='note');
    change('showSuggestions',false);check('Suggestion button can be hidden',w.document.getElementById('ztg-suggestions').hidden);
    change('showSuggestions',true);check('Suggestion button can be restored',!w.document.getElementById('ztg-suggestions').hidden);
    p.setCollapsed('settings-group',true);d.getElementById('tm-save-workspace').click();
    check('One-click save captures both open documents',p.state.workspace&&p.state.workspace.tabs.length===2);
    const saved=JSON.stringify(p.state.workspace);
    tabs.close([find(a).id,find(b).id]);await wait(500);
    check('Closing all documents retains saved workspace',JSON.stringify(p.state.workspace)===saved);
    check('Closed document remembers group name and color',p.state.closedGroups[p.key({data:{itemID:a.id}})].name==='Reading task');
    p.state.groups=[];p.state.assignments={};p.state.groupDisplay={};p.save();
    await Zotero.Reader.open(a.id);await wait(400);
    check('Reopen recreates the missing group',p.groupOf(find(a))==='settings-group'&&p.state.groups.some(g=>g.name==='Reading task'));
    change('restoreClosedGroups',false);check('Disabling memory keeps current document grouped',p.groupOf(find(a))==='settings-group');
    tabs.close(find(a).id);await wait(400);await Zotero.Reader.open(a.id);await wait(400);
    check('Reopen while memory disabled goes to ungrouped',p.groupOf(find(a))==='');
    p.state.groups[0].color='#21866a';p.save();
    d.getElementById('tm-restore-workspace').click();await until(()=>!p.restoring&&!!find(b));await wait(400);
    check('One-click restore reopens all saved documents',!!find(a)&&!!find(b));
    check('Workspace restores grouping even when automatic memory is disabled',p.groupOf(find(a))==='settings-group'&&p.groupOf(find(b))==='settings-group');
    check('Workspace restores colors and remarks',p.state.groups[0].color==='#3977d5'&&p.remark(find(a)).note==='Workspace experiment');
    check('Workspace restores saved paper order',tabs._tabs.indexOf(find(a))<tabs._tabs.indexOf(find(b)));
    check('Workspace restores fold state',p.state.collapsed.includes('settings-group')&&c.collapsed.has('settings-group'));
    const count=tabs._tabs.length;await p.restoreWorkspace();check('Restoring twice does not duplicate documents',tabs._tabs.length===count);
    check('Settings and workspace stored in preferences',JSON.parse(Zotero.Prefs.get(p.pref,true)).workspace.tabs.length===2);
    // Give the target group a distant position, then move the selected paper there.
    p.setCollapsed('settings-group',false);
    p.state.groups.push({id:'far-group',name:'Far group',color:'#8b5ac7'});p.save();
    const extra=[];for(let i=0;i<35;i++)extra.push(tabs.add({type:'reader-unloaded',title:'Scroll fixture '+i,data:{itemID:b.id},select:false}).id);
    tabs.select(find(a).id);await wait(300);p.assign(find(a),'far-group');await wait(150);
    const selected=c.root.querySelector('.ztg-document.selected'),r=selected.getBoundingClientRect(),bar=c.root.getBoundingClientRect();
    check('Moving selected document to another group reveals its tab',r.left>=bar.left-1&&r.right<=bar.right+1);
    tabs.close(extra);await wait(100);
    settingsWin.close();p.stop();
    check('Stopping removes the Tools menu',!w.document.getElementById('ztg-tools-menu'));
    check('Stopping unregisters the native settings pane',!p.settingsPane&&(!Zotero.PreferencePanes||!Zotero.PreferencePanes.pluginPanes.some(pane=>pane.id==='tab-manager-settings')));
  } catch(error){results.push({error:String(error),stack:error.stack});}
  await Zotero.File.putContentsAsync(outputFile,JSON.stringify({version:Zotero.version,platform:Zotero.isWin?'Windows':'other',suite:'settings-workspace',passed:results.every(x=>x.passed===true),results},null,2));
  Services.startup.quit(Components.interfaces.nsIAppStartup.eForceQuit);
}
