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
  const checkCompact=doc=>check('Settings controls stay beside their labels',['verticalThreshold','defaultDisplay','suggestDays'].every(key=>{
    const input=doc.getElementById('tm-setting-'+key),gap=input.getBoundingClientRect().left-input.previousElementSibling.getBoundingClientRect().right;
    return gap>=0&&gap<=16;
  }));
  try {
    if(Zotero.uiReadyPromise)await Zotero.uiReadyPromise;
    await wait(1500);
    await until(()=>Zotero.TabManagerPlugin&&Zotero.getMainWindow().document.getElementById('ztg-inline'));
    const w=Zotero.getMainWindow(),p=Zotero.TabManagerPlugin,tabs=w.Zotero_Tabs,c=p.windows.get(w);
    check('Packaged plugin starts with settings support',!!p&&!!c);
    check('Tools menu contains workspace shortcuts',!!w.document.getElementById('ztg-tools-menu'));
    if(parseInt(Zotero.version,10)<7){
      // Firefox 60's PDF renderer can wait indefinitely in a hidden window.
      // Check the real legacy settings window here; shared restore logic is
      // covered by features.cjs, and full PDF flows by the modern UI runs.
      await p.openSettings(w);let legacyWin;await wait(500);
      await until(()=>{legacyWin=[...p.settingsWindows].find(x=>!x.closed);return legacyWin&&legacyWin.document.getElementById('tm-setting-restoreClosedGroups');});
      const doc=legacyWin.document;
      check('Legacy settings window renders all eight controls',doc.querySelectorAll('[id^="tm-setting-"]').length===8);
      checkCompact(doc);
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
    check('Settings page renders all eight controls',d.querySelectorAll('[id^="tm-setting-"]').length===8);
    checkCompact(d);
    const change=(key,value)=>{const n=control(key);if(n.type==='checkbox')n.checked=value;else n.value=value;n.dispatchEvent(new settingsWin.Event('change',{bubbles:true}));};
    change('showGroupCounts',false);check('Group count setting applies immediately',!w.document.querySelector('.ztg-heading').textContent.includes('('));
    change('showGroupCounts',true);change('suggestDays',14);check('Suggestion threshold persists',p.state.suggestDays===14);
    change('defaultDisplay','note');check('Default tab display setting persists',p.getSettings().defaultDisplay==='note');
    change('showSuggestions',false);check('Suggestion button can be hidden',w.document.getElementById('ztg-suggestions').hidden);
    change('showSuggestions',true);check('Suggestion button can be restored',!w.document.getElementById('ztg-suggestions').hidden);
    p.setCollapsed('settings-group',true);d.getElementById('tm-save-workspace').click();
    check('One-click save captures both open documents',p.state.workspace&&p.state.workspace.tabs.length===2);
    const saved=JSON.stringify(p.state.workspace);
    tabs.close([find(a).id,find(b).id]);await wait(1200);
    check('Closing all documents retains saved workspace',JSON.stringify(p.state.workspace)===saved);
    check('Closed document remembers group name and color',p.state.closedGroups[p.key({data:{itemID:a.id}})].name==='Reading task');
    p.state.groups=[];p.state.assignments={};p.state.groupDisplay={};p.save();
    await Zotero.Reader.open(a.id);await wait(400);
    check('Reopen recreates the missing group',p.groupOf(find(a))==='settings-group'&&p.state.groups.some(g=>g.name==='Reading task'));
    change('restoreClosedGroups',false);check('Disabling memory keeps current document grouped',p.groupOf(find(a))==='settings-group');
    tabs.close(find(a).id);await wait(1200);await Zotero.Reader.open(a.id);await wait(400);
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
    check('Vertical list threshold defaults to seven',p.getSettings().verticalThreshold===7);
    p.updateSettings({verticalThreshold:100});
    p.setCollapsed('settings-group',false);
    p.state.groups.push({id:'far-group',name:'Far group',color:'#8b5ac7'});p.save();
    const extra=[];for(let i=0;i<35;i++)extra.push(tabs.add({type:'reader-unloaded',title:'Scroll fixture '+i,data:{itemID:b.id},select:false}).id);
    tabs.select(find(a).id);await wait(300);p.assign(find(a),'far-group');await wait(150);
    const selected=c.root.querySelector('.ztg-document.selected'),r=selected.getBoundingClientRect(),bar=c.root.getBoundingClientRect();
    check('Moving selected document to another group reveals its tab',r.left>=bar.left-1&&r.right<=bar.right+1);
    settingsWin.close();w.focus();await wait(150);
    const focus=Components.interfaces.nsIFocusManager;
    Services.focus.setFocus(selected,focus.FLAG_BYMOUSE|focus.FLAG_NOSCROLL);await wait(50);
    check('Pointer focus has no extra tab outline',w.getComputedStyle(selected).outlineStyle==='none');
    selected.blur();Services.focus.setFocus(selected,focus.FLAG_BYKEY|focus.FLAG_NOSCROLL);await wait(50);
    const focusedStyle=w.getComputedStyle(selected),groupColor=focusedStyle.getPropertyValue('--ztg-color').trim();
    check('Keyboard focus uses the group color',focusedStyle.outlineStyle==='solid'&&groupColor==='#8b5ac7'&&focusedStyle.outlineColor==='rgb(139, 90, 199)');
    p.updateSettings({verticalThreshold:7});
    check('Large group keeps its papers out of the horizontal strip',c.isVertical('settings-group')&&![...c.root.querySelectorAll('.ztg-section[data-group="settings-group"] .ztg-document')].length);
    c.openGroupList('settings-group',true);await until(()=>c.groupPanel.state==='open');
    const rows=[...c.groupList.querySelectorAll('.ztg-document')];
    check('Large group opens a vertical list below its heading',rows.length===36&&rows[1].getBoundingClientRect().top>=rows[0].getBoundingClientRect().bottom);
    check('Vertical list scrolls within a bounded height',c.groupList.getBoundingClientRect().height<=420&&c.groupList.scrollHeight>c.groupList.clientHeight);
    c.groupPanel.hidePopup();await wait(100);
    const seven=extra.slice(0,6);tabs.close(extra.filter(id=>!seven.includes(id)));await wait(300);
    check('Exactly seven papers remain horizontal',!c.isVertical('settings-group')&&c.root.querySelectorAll('.ztg-section[data-group="settings-group"] .ztg-document').length===7);
    p.updateSettings({verticalThreshold:6});
    check('Changing the threshold changes the group presentation',c.isVertical('settings-group')&&JSON.parse(Zotero.Prefs.get(p.pref,true)).settings.verticalThreshold===6);
    c.openGroupList('settings-group',true);await until(()=>c.groupPanel.state==='open');
    const target=c.groupList.querySelector('.ztg-document');target.dispatchEvent(new w.MouseEvent('mousedown',{bubbles:true,button:0}));target.click();await wait(100);
    check('Clicking a vertical entry selects its document',tabs.selectedID===target.dataset.id);
    tabs.select(find(a).id);p.assign(find(a),'settings-group');await wait(100);
    check('Assigning the active paper reveals its horizontal tab in a vertical group',!!c.root.querySelector('.ztg-document.selected'));
    c.groupPanel.hidePopup();
    tabs.close(extra.filter(id=>tabs._tabs.some(t=>t.id===id)));await wait(100);
    p.stop();
    check('Stopping removes the Tools menu',!w.document.getElementById('ztg-tools-menu'));
    check('Stopping unregisters the native settings pane',!p.settingsPane&&(!Zotero.PreferencePanes||!Zotero.PreferencePanes.pluginPanes.some(pane=>pane.id==='tab-manager-settings')));
  } catch(error){results.push({error:String(error),stack:error.stack});}
  await Zotero.File.putContentsAsync(outputFile,JSON.stringify({version:Zotero.version,platform:Zotero.isWin?'Windows':'other',suite:'settings-workspace',passed:results.every(x=>x.passed===true),results},null,2));
  Services.startup.quit(Components.interfaces.nsIAppStartup.eForceQuit);
}

// Exercise the actual grouped strip and native popup without waiting for a PDF
// renderer. Fixtures are real library attachments, opened as unloaded tabs.
async function runGroupListHarness(Zotero,Services,outputFile,fixtureDir){
  const results=[],wait=ms=>new Promise(resolve=>{
    const timer=Components.classes['@mozilla.org/timer;1'].createInstance(Components.interfaces.nsITimer);
    timer.initWithCallback(()=>{timer.cancel();resolve();},ms,Components.interfaces.nsITimer.TYPE_ONE_SHOT);
  });
  const check=(name,passed)=>{results.push({name,passed:!!passed});Zotero.debug('Tab Manager groups: '+name+' '+!!passed);if(!passed)throw new Error(name);};
  const until=async test=>{for(let i=0;i<200;i++){if(test())return;await wait(100);}throw new Error('Timed out waiting for group list');};
  try{
    if(Zotero.uiReadyPromise)await Zotero.uiReadyPromise;await wait(1500);
    await until(()=>Zotero.TabManagerPlugin&&Zotero.getMainWindow().document.getElementById('ztg-inline'));
    const w=Zotero.getMainWindow(),p=Zotero.TabManagerPlugin,tabs=w.Zotero_Tabs,c=p.windows.get(w);w.focus();
    const tools=w.document.getElementById('ztg-tools-menu'),actions=tools.querySelector('menupopup');
    check('Tools submenu has exactly the two workspace actions',actions.children.length===2&&actions.children[0].getAttribute('label')==='保存当前阅读现场'&&actions.children[1].getAttribute('label')==='恢复阅读现场');
    check('Tools menu and both actions have colored icons',tools.classList.contains('menu-iconic')&&!!tools.getAttribute('image')&&[...actions.children].every(n=>n.classList.contains('menuitem-iconic')&&n.getAttribute('image').startsWith('data:image/svg+xml,')));
    check('Threshold defaults to seven',p.getSettings().verticalThreshold===7);
    const searchButton=w.document.getElementById('ztg-search'),suggestButton=w.document.getElementById('ztg-suggestions'),searchPopup=w.document.getElementById('ztg-search-panel');
    const utils=w.windowUtils||w.QueryInterface(Components.interfaces.nsIInterfaceRequestor).getInterface(Components.interfaces.nsIDOMWindowUtils);
    const clickButton=button=>{const rect=button.getBoundingClientRect();for(const type of ['mousedown','mouseup'])utils.sendMouseEvent(type,rect.left+rect.width/2,rect.top+rect.height/2,0,1,0);};
    clickButton(searchButton);await until(()=>searchPopup.state==='open');
    clickButton(searchButton);await until(()=>searchPopup.state==='closed');check('Search button opens on first click and closes on second click',true);
    clickButton(suggestButton);await until(()=>c.suggestionsPopup&&c.suggestionsPopup.state==='open');
    clickButton(suggestButton);await until(()=>!c.suggestionsPopup);check('Suggestions button opens on first click and closes on second click',true);
    clickButton(searchButton);await until(()=>searchPopup.state==='open');clickButton(suggestButton);await until(()=>c.suggestionsPopup&&c.suggestionsPopup.state==='open');
    check('Opening suggestions closes search',searchPopup.state==='closed');
    clickButton(searchButton);await until(()=>searchPopup.state==='open');check('Opening search closes suggestions',!c.suggestionsPopup);
    searchPopup.hidePopup();await until(()=>searchPopup.state==='closed');
    p.state.groups.push({id:'vertical-test',name:'Vertical test',color:'#21866a'});p.save();
    const ids=[];
    for(let i=0;i<8;i++){
      const item=await Zotero.Attachments.linkFromFile({file:fixtureDir+'fixture-a.pdf'});
      const tab=tabs.add({type:'reader-unloaded',title:'Vertical fixture '+i,data:{itemID:item.id},select:false});ids.push(tab.id);
      p.assign(tabs._tabs.find(t=>t.id===tab.id),'vertical-test');
    }
    check('Eight papers switch to a vertical group',c.isVertical('vertical-test')&&!c.root.querySelector('.ztg-section[data-group="vertical-test"] .ztg-document'));
    c.toggle('vertical-test');await until(()=>c.groupPanel.state==='open');await wait(100);
    const rows=[...c.groupList.querySelectorAll('.ztg-document')];
    check('Popup lists all eight papers vertically',rows.length===8&&rows[1].getBoundingClientRect().top>=rows[0].getBoundingClientRect().bottom);
    check('Vertical papers are numbered in group order',rows.every((row,i)=>row.querySelector('.ztg-index').textContent===String(i+1)));
    check('Top tab strip remains a single row',c.root.getBoundingClientRect().height<=38);
    check('Rows retain right-click and drag actions',typeof rows[0].oncontextmenu==='function'&&rows[0].draggable);
    const focus=Components.interfaces.nsIFocusManager;
    rows[0].dispatchEvent(new w.MouseEvent('mousedown',{bubbles:true,button:0}));
    Services.focus.setFocus(rows[0],focus.FLAG_BYMOUSE|focus.FLAG_NOSCROLL);await wait(50);
    check('Pointer focus adds no outline to popup rows',w.getComputedStyle(rows[0]).outlineStyle==='none');
    const focusRow=c.groupList.querySelector('.ztg-document');focusRow.blur();focusRow.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowUp',bubbles:true}));Services.focus.setFocus(focusRow,focus.FLAG_BYKEY|focus.FLAG_NOSCROLL);await wait(50);
    const focusColor=w.getComputedStyle(focusRow).outlineColor;
    check('Keyboard focus follows the green group color ('+focusColor+', connected='+focusRow.isConnected+')',focusColor==='rgb(33, 134, 106)');
    c.dragged=ids[0];const rect=rows[1].getBoundingClientRect();
    check('Vertical drag insertion uses the row height',c.plan({clientY:rect.top+1,clientX:rect.left+rect.width/2},rows[1],'vertical-test',ids[1]).mode==='before'&&c.plan({clientY:rect.bottom-1,clientX:rect.left+rect.width/2},rows[1],'vertical-test',ids[1]).mode==='after');
    c.dragged=null;
    rows[1].dispatchEvent(new w.MouseEvent('mousedown',{bubbles:true,button:0}));await wait(100);
    check('Selecting a vertical row exposes one horizontal active tab without replacing its popup row',!!c.root.querySelector('.ztg-document.selected')&&c.root.querySelectorAll('.ztg-document').length===1&&rows[1].isConnected);
    rows[1].dispatchEvent(new w.MouseEvent('click',{bubbles:true,button:0}));await wait(150);
    check('Reading a vertical entry closes its popup',c.groupPanel.state==='closed');
    c.openGroupList('vertical-test',true);await until(()=>c.groupPanel.state==='open');
    const next=c.groupList.querySelectorAll('.ztg-document')[2];
    next.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));await wait(150);
    check('Keyboard selection replaces the horizontal active paper',c.root.querySelectorAll('.ztg-document').length===1&&c.root.querySelector('.ztg-document.selected').dataset.id===ids[2]&&c.groupPanel.state==='closed');
    c.root.querySelector('.ztg-document.selected .ztg-close').click();await wait(250);c.refresh();
    check('Closing an entry at the boundary restores horizontal tabs',!c.isVertical('vertical-test')&&c.root.querySelectorAll('.ztg-section[data-group="vertical-test"] .ztg-document').length===7);
    p.updateSettings({verticalThreshold:6});
    check('A configured threshold changes the presentation',c.isVertical('vertical-test')&&JSON.parse(Zotero.Prefs.get(p.pref,true)).settings.verticalThreshold===6);
    Zotero.debug('Tab Manager popup before reopen: '+c.groupPanel.state);
    c.openGroupList('vertical-test',true);await until(()=>c.groupPanel.state==='open');
    Zotero.debug('Tab Manager popup reopened');
    c.toggle('vertical-test');await wait(100);
    check('Clicking the same heading closes its list',c.groupPanel.state==='closed');
    p.updateSettings({verticalThreshold:100});
    check('Raising the threshold restores horizontal presentation',!c.isVertical('vertical-test')&&c.root.querySelectorAll('.ztg-section[data-group="vertical-test"] .ztg-document').length===7);
    for(let i=0;i<7;i++)p.state.groups.push({id:'count-test-'+i,name:'Count test '+i,color:'#3977d5'});p.save();
    check('More than seven named groups switches every group to vertical mode',p.getSettings().groupCountThreshold===7&&c.isVertical('vertical-test')&&c.isVertical('')&&c.root.querySelectorAll('.ztg-document').length===1);
    p.updateSettings({groupCountThreshold:8});
    check('The group-count threshold is strict and immediately adjustable',!c.isVertical('vertical-test')&&c.root.querySelectorAll('.ztg-section[data-group="vertical-test"] .ztg-document').length===7);
    p.updateSettings({groupCountThreshold:7});
    p.state.groups=p.state.groups.filter(g=>!g.id.startsWith('count-test-'));p.save();
    check('Removing excess groups restores per-group document thresholds',!c.isVertical('vertical-test'));
    const rowLimit=Math.max(1,Math.floor((Math.max(100,Math.min(420,w.innerHeight-140))-12)/38));
    const extra=[];
    const grow=async count=>{while(tabs._tabs.filter(t=>t.type!=='library'&&p.groupOf(t)==='vertical-test').length<count){
      const item=await Zotero.Attachments.linkFromFile({file:fixtureDir+'fixture-a.pdf'});
      const tab=tabs.add({type:'reader-unloaded',title:'Multi-column paper',data:{itemID:item.id},select:false});extra.push(tab.id);p.assign(tabs._tabs.find(t=>t.id===tab.id),'vertical-test');
    }};
    p.updateSettings({verticalThreshold:6});await grow(rowLimit+1);
    c.openGroupList('vertical-test',true);await until(()=>c.groupPanel.state==='open');await wait(100);
    const maxColumns=Math.min(3,Math.max(1,Math.floor(Math.max(240,w.innerWidth-32)/280)));
    check('Large groups adapt to two columns when the window permits',Number(c.groupList.dataset.columns)===Math.min(2,maxColumns));
    c.groupPanel.hidePopup();await wait(100);await grow(rowLimit*3+2);
    c.openGroupList('vertical-test',true);await until(()=>c.groupPanel.state==='open');await wait(100);
    const many=[...c.groupList.querySelectorAll('.ztg-document')],bounds=c.groupList.getBoundingClientRect();
    results.push({name:'Multi-column layout measurements',passed:true,columns:Number(c.groupList.dataset.columns),expectedColumns:maxColumns,width:bounds.width,height:bounds.height,windowWidth:w.innerWidth,scrollHeight:c.groupList.scrollHeight,clientHeight:c.groupList.clientHeight});
    check('Very large groups cap at three columns and remain scrollable within the window',Number(c.groupList.dataset.columns)===maxColumns&&bounds.width<=w.innerWidth&&bounds.height<=421&&c.groupList.scrollHeight>c.groupList.clientHeight);
    check('Multi-column numbering stays in document order',many.every((row,i)=>row.querySelector('.ztg-index').textContent===String(i+1)));
    if(maxColumns>1){const perColumn=Number(c.groupList.dataset.rows);check('Documents fill down each column before the next',many[perColumn].getBoundingClientRect().left>many[0].getBoundingClientRect().right&&Math.abs(many[perColumn].getBoundingClientRect().top-many[0].getBoundingClientRect().top)<2);}
    check('Hover tint uses the group color with high transparency',w.getComputedStyle(c.groupList).getPropertyValue('--ztg-hover').trim()==='rgba(33,134,106,0.14)');
    c.groupPanel.hidePopup();await wait(100);tabs.close(extra);p.updateSettings({verticalThreshold:100});c.refresh();
    let addons;
    if(parseInt(Zotero.version,10)<7){
      addons=w.openDialog('chrome://mozapps/content/extensions/extensions.xul','','chrome,centerscreen,resizable');
      await until(()=>p.legacyOptionsWindows.has(addons));
      const manager=ChromeUtils.import('resource://gre/modules/AddonManager.jsm').AddonManager;
      const addon=await manager.getAddonByID('tab-groups@local.zotero');
      check('Zotero 6 exposes the plugin preferences action',addon&&addon.isActive&&Number(addon.optionsType)===3);
      addons.gViewController.commands.cmd_showItemPreferences.doCommand(addon);
    }else await p.openSettings(w);
    let preferences;
    await until(()=>{preferences=p.settingsPane?Services.wm.getMostRecentWindow('zotero:pref'):[...p.settingsWindows].find(x=>!x.closed);return preferences&&preferences.document.getElementById('tm-setting-verticalThreshold');});
    const threshold=preferences.document.getElementById('tm-setting-verticalThreshold');
    check('Settings include all eight compact controls',preferences.document.querySelectorAll('[id^="tm-setting-"]').length===8&&threshold.getBoundingClientRect().left-threshold.previousElementSibling.getBoundingClientRect().right<=16);
    check('Settings use requested labels and omit the hover switch',preferences.document.getElementById('tm-setting-restoreClosedGroups').parentElement.textContent==='重新打开文献时自动进入上一次的分组'&&threshold.parentElement.textContent==='分组内文献超过此数量时竖向排列'&&!preferences.document.getElementById('tm-setting-hoverExpand'));
    await until(()=>[...preferences.document.querySelectorAll('#tm-save-workspace img,#tm-restore-workspace img')].every(n=>n.naturalWidth===16));
    check('Both settings workspace buttons render matching colored icons',preferences.document.querySelectorAll('#tm-save-workspace img,#tm-restore-workspace img').length===2);
    threshold.value='9';threshold.dispatchEvent(new preferences.Event('change',{bubbles:true}));
    check('Threshold can be changed from the settings UI',p.getSettings().verticalThreshold===9);
    const groupThreshold=preferences.document.getElementById('tm-setting-groupCountThreshold');groupThreshold.value='10';groupThreshold.dispatchEvent(new preferences.Event('change',{bubbles:true}));
    check('The group-count threshold can be changed from settings',p.getSettings().groupCountThreshold===10);
    const paper=tabs._tabs.find(t=>t.id===ids[0]);p.setRemark(paper,'Reading note');p.setGroupDisplay('vertical-test','original');p.setDisplay(paper,'both');
    const display=preferences.document.getElementById('tm-setting-defaultDisplay');display.value='note';display.dispatchEvent(new preferences.Event('change',{bubbles:true}));
    check('Changing default display immediately overrides existing group and paper display settings',p.remark(paper).mode==='note'&&c.root.querySelector('[data-id="'+paper.id+'"] .ztg-title').textContent==='Reading note'&&p.state.groupDisplay['']==='note');
    const autoDissolve=preferences.document.getElementById('tm-setting-dissolveOnGroupClose');
    check('Auto-dissolve is optional and ungrouped color is absent from settings',autoDissolve&&!autoDissolve.checked&&!preferences.document.getElementById('tm-setting-ungroupedColor'));
    const workspaceBefore=JSON.stringify(p.state.workspace);autoDissolve.checked=true;autoDissolve.dispatchEvent(new preferences.Event('change',{bubbles:true}));
    p.closeGroup(w,'vertical-test');c.refresh();
    check('Group close removes the empty group when enabled',!p.state.groups.some(g=>g.id==='vertical-test')&&!c.root.querySelector('.ztg-section[data-group="vertical-test"]')&&JSON.parse(Zotero.Prefs.get(p.pref,true)).settings.dissolveOnGroupClose===true);
    check('Auto-dissolve preserves reading workspace and paper group memory',JSON.stringify(p.state.workspace)===workspaceBefore&&p.state.closedGroups[p.key(paper)].name==='Vertical test');
    const reopened=tabs.add({type:'reader-unloaded',title:'Reopened paper',data:{itemID:paper.data.itemID},select:false});c.refresh();
    check('Reopening a paper recreates its automatically dissolved group',p.groupOf(tabs._tabs.find(t=>t.id===reopened.id))==='vertical-test'&&p.state.groups.find(g=>g.id==='vertical-test').color==='#21866a');
    preferences.close();
    if(addons)addons.close();
    p.stop();check('Shutdown removes the popup',!w.document.getElementById('ztg-group-panel'));
  }catch(error){results.push({error:String(error),stack:error.stack});}
  await Zotero.File.putContentsAsync(outputFile,JSON.stringify({version:Zotero.version,platform:'Windows',suite:'groups-unloaded-fixtures',passed:results.every(x=>x.passed===true),results},null,2));
  Services.startup.quit(Components.interfaces.nsIAppStartup.eForceQuit);
}

async function runWorkspaceHarness(Zotero,Services,outputFile,fixtureDir){
  const results=[],errors=[],legacy=parseInt(Zotero.version,10)<7;let restoreResult=null;
  const wait=ms=>new Promise(resolve=>{const timer=Components.classes['@mozilla.org/timer;1'].createInstance(Components.interfaces.nsITimer);timer.initWithCallback(()=>{timer.cancel();resolve();},ms,Components.interfaces.nsITimer.TYPE_ONE_SHOT);});
  const check=(name,passed)=>{results.push({name,passed:!!passed});Zotero.debug('Workspace test: '+name+' '+!!passed);if(!passed)throw new Error(name);};
  const until=async(test,label)=>{for(let i=0;i<300;i++){if(test())return;await wait(100);}throw new Error('Timed out: '+label);};
  try{
    if(Zotero.uiReadyPromise)await Zotero.uiReadyPromise;await wait(1500);
    await until(()=>Zotero.TabManagerPlugin&&Zotero.getMainWindow().document.getElementById('ztg-inline'),'plugin');
    const w=Zotero.getMainWindow(),p=Zotero.TabManagerPlugin,tabs=w.Zotero_Tabs,c=p.windows.get(w);w.focus();
    const log=Zotero.logError;Zotero.logError=function(error){if(p.restoring)errors.push({error:String(error),stack:error.stack});return log.call(this,error);};
    const items=[];
    p.state.groups.push({id:'workspace-a',name:'Workspace A',color:'#21866a'},{id:'workspace-b',name:'Workspace B',color:'#8b5ac7'});p.save();
    for(let i=0;i<20;i++){
      const item=await Zotero.Attachments.linkFromFile({file:fixtureDir+'fixture-'+(i%2?'b':'a')+'.pdf'});items.push(item);
      const tab=tabs.add({type:'reader-unloaded',title:'Workspace paper '+i,data:{itemID:item.id},select:false});p.assign(tabs._tabs.find(t=>t.id===tab.id),i<10?'workspace-a':'workspace-b');
    }
    const find=item=>tabs._tabs.find(t=>t.data&&t.data.itemID===item.id);
    const ready=item=>{try{const r=Zotero.Reader.getByTabID(find(item).id);return r&&r._internalReader&&r._internalReader._primaryView&&r._internalReader._primaryView._iframeWindow.PDFViewerApplication.pdfDocument.numPages===1;}catch(e){return false;}};
    if(!legacy){tabs.select(find(items[0]).id);await until(()=>ready(items[0]),'initial real PDF');
    check('Initial PDF actually renders a page',ready(items[0]));}
    p.setRemark(find(items[0]),'Saved experiment');p.setCollapsed('workspace-b',true);
    check('Save captures twenty documents',p.saveWorkspace(w).ok&&p.state.workspace.tabs.length===20);
    const saved=JSON.stringify(p.state.workspace);
    tabs.closeAll();await wait(2000);c.refresh();
    check('Closing all tabs retains the saved snapshot',tabs._tabs.length===1&&JSON.stringify(p.state.workspace)===saved);
    let done=false;let failure;
    p.restoreWorkspace().then(value=>{restoreResult=value;done=true;},error=>{failure=error;done=true;});
    await until(()=>done,'batch restore');if(failure)throw failure;
    check('Twenty-document restore reports no failures',restoreResult.failed===0&&restoreResult.opened+restoreResult.alreadyOpen===20);
    check('All twenty distinct saved documents are restored',items.every(item=>!!find(item))&&tabs._tabs.filter(t=>t.type!=='library').length===20);
    check('Group assignments, remarks and folding are restored',items.every((item,i)=>p.groupOf(find(item))===(i<10?'workspace-a':'workspace-b'))&&p.remark(find(items[0])).note==='Saved experiment'&&p.state.collapsed.includes('workspace-b'));
    if(!legacy){await until(()=>ready(items[0]),'restored active PDF');check('Restored active PDF actually renders',ready(items[0]));}
    const second=await p.restoreWorkspace();check('Repeated restore creates no duplicates',second.opened===0&&second.alreadyOpen===20&&tabs._tabs.length===21);
    const visit=legacy?[]:[19,10,1,18,...Array.from({length:20},(_,i)=>i).filter(i=>![0,19,10,1,18].includes(i))];
    for(const index of visit){tabs.select(find(items[index]).id);await until(()=>ready(items[index]),'restored PDF '+index);check('Restored PDF '+index+' actually renders',ready(items[index]));}
    tabs.select('zotero-pane');tabs.close(tabs._tabs.filter(t=>t.type!=='library'&&t.data.itemID!==items[1].id).map(t=>t.id));await wait(300);c.refresh();
    const extra=await Zotero.Attachments.linkFromFile({file:fixtureDir+'fixture-a.pdf'});
    tabs.add({type:'reader-unloaded',title:'New unrelated paper',data:{itemID:extra.id},select:false});
    p.state.groups=[];p.state.assignments={};p.save();
    const mixed=await p.restoreWorkspace();
    check('Partial restore preserves an existing saved paper and a newer paper',mixed.opened===19&&mixed.alreadyOpen===1&&mixed.failed===0&&!!find(extra)&&tabs._tabs.length===22);
    check('Partial restore recreates both saved groups',p.state.groups.some(g=>g.id==='workspace-a')&&p.state.groups.some(g=>g.id==='workspace-b'));
    check('Manual saved snapshot is unchanged by every restore',JSON.stringify(p.state.workspace)===saved);
    const missing=await Zotero.Attachments.linkFromFile({file:fixtureDir+'fixture-a.pdf'});missing.attachmentPath=fixtureDir+'nonexistent-file.pdf';await missing.saveTx();
    p.state.workspace=JSON.parse(saved);p.state.workspace.tabs.push({key:missing.libraryID+':'+missing.key,libraryID:missing.libraryID,itemKey:missing.key,title:'Missing file fixture',kind:'reader',group:''});
    const unavailable=await p.restoreWorkspace();
    check('Unavailable file reports its reason without blocking other papers',unavailable.failed===1&&unavailable.alreadyOpen===20&&unavailable.failures.some(f=>f.reason.includes('附件文件')));
    await p.openSettings(w);let preferences;
    await until(()=>{preferences=p.settingsPane?Services.wm.getMostRecentWindow('zotero:pref'):[...p.settingsWindows].find(x=>!x.closed);return preferences&&preferences.document.getElementById('tm-restore-failures');},'failure details');
    const details=preferences.document.getElementById('tm-restore-failures');
    check('Settings show the failed paper and actionable reason',!details.hidden&&details.textContent.includes('Missing file fixture')&&details.textContent.includes('附件文件'));
    preferences.close();
  }catch(error){results.push({error:String(error),stack:error.stack});}
  await Zotero.File.putContentsAsync(outputFile,JSON.stringify({version:Zotero.version,platform:'Windows',suite:legacy?'workspace-native-tabs-20':'workspace-real-pdf-20',passed:results.every(x=>x.passed===true),restoreResult,errors,results},null,2));
  Services.startup.quit(Components.interfaces.nsIAppStartup.eForceQuit);
}
