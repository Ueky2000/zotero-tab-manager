const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
async function run(legacy) {
  let pref;
  const items=[1,2,3].map(id=>({id,libraryID:1,key:'ITEM'+id,isAttachment:()=>true,attachmentFilename:'paper'+id+'.pdf'}));
  const tabs={_tabs:[{id:'zotero-pane',type:'library'}],selectedID:'zotero-pane',select(id){this.selectedID=id;},move(id,index){const before=this._tabs.findIndex(t=>t.id===id);const tab=this._tabs.splice(before,1)[0];this._tabs.splice(before<index?index-1:index,0,tab);}};
  const win={Zotero_Tabs:tabs};let p;
  const sandbox={Zotero:{Prefs:{get:()=>pref,set:(_k,v)=>{pref=v;}},Items:{get:id=>items.find(x=>x.id===id),getByLibraryAndKeyAsync:async(lib,key)=>items.find(x=>x.libraryID===lib&&x.key===key)},Reader:{open:async id=>{tabs._tabs.push({id:'tab-'+id,type:'reader',title:'Paper '+id,data:{itemID:id}});p.syncTabs(win,c);}},Utilities:{Internal:{}},logError:e=>{throw e;}}};
  for(const name of ['core','features'])vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/'+name+(legacy?'-legacy':'')+'.js'),'utf8'),sandbox);
  p=sandbox.TabGroups;
  const c={seenTabs:new Map(),initializedTabs:false,cancelHover(){},schedule(){},refresh(){p.syncTabs(win,c);},root:{querySelector:()=>null},collapsed:new Set(),signature:''};p.windows.set(win,c);
  const add=id=>{const tab={id:'tab-'+id,type:'reader',title:'Paper '+id,data:{itemID:id}};tabs._tabs.push(tab);p.syncTabs(win,c);return tab;};
  const close=id=>{tabs._tabs=tabs._tabs.filter(t=>t.id!==id);p.syncTabs(win,c);};
  const a=add(1),b=add(2);
  p.state.groups.push({id:'g',name:'研究主题',color:'#3977d5'});p.assign(a,'g');p.assign(b,'g');p.setRemark(a,'重点实验');p.setGroupDisplay('g','both');p.setCollapsed('g',true);
  assert.equal(p.getSettings().restoreClosedGroups,true);
  assert.equal(p.updateSettings({suggestDays:0}),false);
  assert.equal(p.updateSettings({showGroupCounts:'no'}),false);
  assert.equal(p.updateSettings({showGroupCounts:false,suggestDays:14}),true);
  assert.equal(p.state.suggestDays,14);
  assert.equal(p.saveWorkspace(win).ok,true);
  const snapshot=JSON.stringify(p.state.workspace);
  close(a.id);close(b.id);
  assert.equal(p.state.closedGroups['1:ITEM1'].name,'研究主题');
  assert.equal(JSON.stringify(p.state.workspace),snapshot); // Closing never overwrites a save.
  p.state.groups=[];p.state.assignments={};p.save();
  const again=add(1);
  assert.equal(p.groupOf(again),'g');assert.equal(p.state.groups[0].name,'研究主题');
  assert.equal(p.state.closedGroups['1:ITEM1'],undefined); // A restored memory is consumed.
  p.updateSettings({restoreClosedGroups:false});
  assert.equal(p.groupOf(again),'g'); // Toggle does not move an already open document.
  close(again.id);const ungrouped=add(1);
  assert.equal(p.groupOf(ungrouped),'');
  const extra=add(3);
  p.state.groups[0].color='#21866a';p.state.groups[0].name='Changed';
  let result=await p.restoreWorkspace();
  assert.equal(result.ok,true);assert.equal(result.opened,1);assert.equal(result.alreadyOpen,1);
  assert.equal(p.groupOf(ungrouped),'g');assert.equal(p.state.groups[0].color,'#3977d5');
  assert.equal(p.state.groups[0].name,'研究主题');assert.equal(p.remark(ungrouped).note,'重点实验');
  assert.ok(tabs._tabs.some(t=>t.id===extra.id));assert.ok(p.state.collapsed.includes('g'));
  assert.deepEqual(tabs._tabs.slice(1,3).map(t=>t.data.itemID),[1,2]);
  result=await p.restoreWorkspace();assert.equal(result.opened,0);assert.equal(result.alreadyOpen,2);
  const saved=JSON.stringify(p.state.workspace);tabs._tabs=[tabs._tabs[0]];
  assert.equal(p.saveWorkspace(win).ok,false);assert.equal(JSON.stringify(p.state.workspace),saved);
  pref=JSON.stringify(p.state);p.load();assert.equal(p.state.workspace.tabs.length,2);assert.equal(p.getSettings().restoreClosedGroups,false);
  items[1].deleted=true;
  result=await p.restoreWorkspace();assert.equal(result.missing,1);assert.equal(result.opened,1);
  console.log((legacy?'legacy':'modern')+': closed-tab memory, settings and workspace restore checks passed');
}
(async()=>{await run(false);await run(true);})().catch(e=>{console.error(e);process.exitCode=1;});
