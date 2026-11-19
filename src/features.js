/* SPDX-License-Identifier: MIT. Settings, closed-tab memory and reading workspace. */
Object.assign(TabGroups, {
  settingsViews: new Map(),
  settingsWindows: new Set(),
  legacyOptionsWindows: new Map(),
  getSettings() {
    const s = this.state.settings || {};
    return {
      restoreClosedGroups: s.restoreClosedGroups !== false,
      dissolveOnGroupClose: s.dissolveOnGroupClose === true,
      allowUngroupedRename: s.allowUngroupedRename === true,
      showGroupCounts: s.showGroupCounts !== false,
      showSuggestions: s.showSuggestions !== false,
      defaultDisplay: ['original','note','both'].includes(s.defaultDisplay) ? s.defaultDisplay : 'original',
      verticalThreshold: Number.isInteger(s.verticalThreshold)&&s.verticalThreshold>=1&&s.verticalThreshold<=1000?s.verticalThreshold:7,
      groupCountThreshold: Number.isInteger(s.groupCountThreshold)&&s.groupCountThreshold>=1&&s.groupCountThreshold<=1000?s.groupCountThreshold:7,
      suggestDays: this.state.suggestDays,
      ungroupedColor: this.state.ungroupedColor
    };
  },
  updateSettings(patch) {
    if (this.readOnly) return false;
    const next = { ...this.getSettings() };
    for (const [key, value] of Object.entries(patch)) {
      if (['restoreClosedGroups','dissolveOnGroupClose','allowUngroupedRename','showGroupCounts','showSuggestions'].includes(key)) {
        if (typeof value !== 'boolean') return false;
      } else if (key === 'defaultDisplay') {
        if (!['original','note','both'].includes(value)) return false;
      } else if (key === 'suggestDays') {
        if (!Number.isInteger(value) || value < 1 || value > 3650) return false;
      } else if (['verticalThreshold','groupCountThreshold'].includes(key)) {
        if (!Number.isInteger(value) || value < 1 || value > 1000) return false;
      } else if (key === 'ungroupedColor') {
        if (!this.normalizeColor(value)) return false;
      } else return false;
      next[key] = value;
    }
    this.state.settings = { restoreClosedGroups:next.restoreClosedGroups, showGroupCounts:next.showGroupCounts,
      dissolveOnGroupClose:next.dissolveOnGroupClose,
      allowUngroupedRename:next.allowUngroupedRename,
      showSuggestions:next.showSuggestions, defaultDisplay:next.defaultDisplay,verticalThreshold:next.verticalThreshold,groupCountThreshold:next.groupCountThreshold };
    this.state.suggestDays = next.suggestDays;
    this.state.ungroupedColor = this.normalizeColor(next.ungroupedColor);
    if (Object.prototype.hasOwnProperty.call(patch, 'defaultDisplay')) {
      for (const group of this.orderedGroups()) this.state.groupDisplay[group.id] = next.defaultDisplay;
      for (const win of this.windows.keys()) for (const tab of win.Zotero_Tabs._tabs) {
        if (tab.type === 'library') continue;
        const remark = this.state.remarks[this.key(tab)];
        if (remark) delete remark.mode;
      }
    }
    for (const c of this.windows.values()) c.cancelHover();
    this.save();
    return true;
  },
  groupRecord(tab) {
    const group = this.state.groups.find(g => g.id === this.groupOf(tab));
    return group ? { ...group, display:this.state.groupDisplay[group.id] || null } : null;
  },
  validGroupRecord(record) {
    return record && typeof record.id === 'string' && record.id && record.id !== '__proto__'
      && typeof record.name === 'string' && record.name.trim() && this.normalizeColor(record.color);
  },
  restoreGroupRecord(record) {
    if (!this.validGroupRecord(record)) return '';
    let group = this.state.groups.find(g => g.id === record.id) || this.state.groups.find(g => g.name === record.name);
    if (!group) {
      group = {id:record.id,name:record.name.slice(0,60),color:this.normalizeColor(record.color)};
      this.state.groups.push(group);
      if (['original','note','both'].includes(record.display)) this.state.groupDisplay[group.id] = record.display;
    }
    return group.id;
  },
  syncTabs(win, c) {
    if (this.readOnly) return;
    const current = win.Zotero_Tabs._tabs.filter(t => t.type !== 'library');
    const survivingKeys = new Set();
    for (const [otherWin, controller] of this.windows) {
      for (const tab of otherWin.Zotero_Tabs._tabs) {
        const previous = controller.seenTabs.get(tab.id);
        if (previous && previous.key) survivingKeys.add(previous.key);
      }
    }
    let changed = false;
    const remember = this.getSettings().restoreClosedGroups;
    for (const [id, record] of c.seenTabs) {
      if (!record.key || current.some(t => t.id === id) || survivingKeys.has(record.key)) continue;
      if (remember && record.group) this.state.closedGroups[record.key] = record.group;
      else { delete this.state.closedGroups[record.key]; delete this.state.assignments[record.key]; }
      changed = true;
    }
    for (const tab of current) {
      const key = this.key(tab);
      if (!key || c.seenTabs.get(tab.id)?.key===key || survivingKeys.has(key) || this.restoring) continue;
      if (remember && this.validGroupRecord(this.state.closedGroups[key])) {
        this.state.assignments[key] = this.restoreGroupRecord(this.state.closedGroups[key]);
        delete this.state.closedGroups[key];
        changed = true;
      } else if (!remember && c.initializedTabs) {
        delete this.state.assignments[key]; delete this.state.closedGroups[key]; changed = true;
      }
    }
    c.seenTabs = new Map(current.map(tab => [tab.id, {key:this.key(tab),group:this.groupRecord(tab)}]));
    c.initializedTabs = true;
    if (changed) {
      Zotero.Prefs.set(this.pref, JSON.stringify(this.state), true);
      for (const controller of this.windows.values()) if (controller !== c) controller.schedule();
    }
  },
  openDocuments() {
    const rows = [];
    for (const [win] of this.windows) for (const tab of win.Zotero_Tabs._tabs) {
      const key = this.key(tab);
      if (tab.type !== 'library' && key) rows.push({win,tab,key});
    }
    return rows;
  },
  saveWorkspace(win) {
    if (this.readOnly || this.restoring) return {ok:false,message:'当前无法保存阅读现场。'};
    for (const [w,c] of this.windows) this.syncTabs(w,c);
    const unique = new Map();
    for (const row of this.openDocuments()) if (!unique.has(row.key)) unique.set(row.key,row);
    if (!unique.size) return {ok:false,message:'当前没有打开的文献，上次保存的现场已保留。'};
    const selected = win && win.Zotero_Tabs._tabs.find(t => t.id === win.Zotero_Tabs.selectedID);
    const snapshot = { version:1,savedAt:Date.now(),groups:this.state.groups.map(g=>({...g})),
      order:this.orderedGroups().map(g=>g.id),collapsed:[...this.state.collapsed],
      ungroupedColor:this.state.ungroupedColor,ungroupedName:this.state.ungroupedName,groupDisplay:{...this.state.groupDisplay},selectedKey:this.key(selected),
      tabs:[...unique.values()].map(({tab,key})=>{
        const item=Zotero.Items.get(tab.data.itemID);
        return {key,libraryID:item.libraryID,itemKey:item.key,kind:tab.type.indexOf('note')===0?'note':'reader',
          title:this.plainTitle(tab.title || ''),group:this.groupOf(tab),remark:{...this.remark(tab)}};
      }) };
    this.state.workspace = snapshot; this.save();
    return {ok:true,message:`已保存 ${snapshot.tabs.length} 篇文献和 ${snapshot.groups.length} 个分组。`};
  },
  async restoreWorkspace() {
    const snapshot = this.state.workspace;
    if (this.readOnly || this.restoring || !snapshot || !Array.isArray(snapshot.tabs)) return {ok:false,message:'没有可恢复的阅读现场，或正在恢复中。'};
    this.restoring = true;this.lastRestoreResult=null; this.updateSettingsViews();
    const result = {ok:true,opened:0,alreadyOpen:0,missing:0,failed:0,failures:[]};
    this.lastRestoreResult=null;
    const fail=(entry,reason,missing=false)=>{
      if(missing)result.missing++;else result.failed++;
      result.failures.push({key:entry.key,title:typeof entry.title==='string'?entry.title:'未命名文献',reason});
    };
    try {
      const mapping = new Map([['','']]);
      for (const group of snapshot.groups) {
        const id = this.restoreGroupRecord({...group,display:(snapshot.groupDisplay||{})[group.id]});
        if (id) {
          mapping.set(group.id,id);
          const target=this.state.groups.find(g=>g.id===id);
          target.name=group.name.slice(0,60);target.color=this.normalizeColor(group.color);
          const display=(snapshot.groupDisplay||{})[group.id];
          if(['original','note','both'].includes(display))this.state.groupDisplay[id]=display;else delete this.state.groupDisplay[id];
        }
      }
      const seen = new Set();
      for (const entry of snapshot.tabs) {
        if (!entry || typeof entry.key !== 'string' || seen.has(entry.key)) continue;
        seen.add(entry.key);
        let item;
        try { item=await Zotero.Items.getByLibraryAndKeyAsync(entry.libraryID,entry.itemKey); }
        catch(e) { Zotero.logError(e); }
        if (!item || item.deleted) { fail(entry,'文献已删除或不在当前文献库中。',true); continue; }
        const key = `${item.libraryID}:${item.key}`;
        const id = mapping.get(entry.group) || '';
        if (id) this.state.assignments[key]=id; else delete this.state.assignments[key];
        delete this.state.closedGroups[key];
        if (entry.remark && typeof entry.remark.note === 'string') this.state.remarks[key]={note:entry.remark.note.slice(0,300),mode:['original','note','both'].includes(entry.remark.mode)?entry.remark.mode:'original'};
        if (this.openDocuments().some(row=>row.key===key)) { result.alreadyOpen++; continue; }
        try {
          if(typeof Zotero.Items.loadDataTypes==='function')await Zotero.Items.loadDataTypes([item]);
          else if(typeof item.loadAllData==='function')await item.loadAllData();
          const main=typeof Zotero.getMainWindow==='function'?Zotero.getMainWindow():null;
          const target=main&&this.windows.has(main)?main:[...this.windows.keys()].find(w=>!w.closed);
          if(!target||typeof target.Zotero_Tabs.add!=='function')throw new Error('没有可恢复文献的 Zotero 主窗口。');
          if(entry.kind==='note'&&!target.Zotero_Tabs.tabHooks?.load?.note)throw new Error('当前 Zotero 版本不支持笔记标签。');
          if(entry.kind!=='note'&&typeof item.fileExists==='function'&&!await item.fileExists())throw new Error('附件文件不在本机，请先下载或重新定位附件。');
          // Match native session restoration. Creating every live PDF reader can
          // race tab closing/unloading and exhaust the reader cache. Native
          // unloaded tabs are synchronous; only the selected paper is loaded.
          target.Zotero_Tabs.add({type:entry.kind==='note'?'note-unloaded':'reader-unloaded',
            title:this.plainTitle(entry.title||'未命名文献').replace(/[\u0000-\u001f\u007f-\u009f]/g,''),
            data:{itemID:item.id},select:false});
          if(!this.openDocuments().some(row=>row.key===key))throw new Error('Zotero 未创建对应的文献标签。');
          result.opened++;
        } catch(e) { fail(entry,e.message||String(e));Zotero.logError(e); }
      }
      const savedOrder=(snapshot.order||[]).map(id=>mapping.get(id)).filter(id=>id!==undefined);
      this.state.order=[...new Set([...savedOrder,...this.orderedGroups().map(g=>g.id)])];
      const restoredIDs=new Set(mapping.values());
      this.state.collapsed=[...this.state.collapsed.filter(id=>!restoredIDs.has(id)),...(snapshot.collapsed||[]).map(id=>mapping.get(id)).filter(id=>id!==undefined)];
      const color=this.normalizeColor(snapshot.ungroupedColor||'');if(color)this.state.ungroupedColor=color;
      if(typeof snapshot.ungroupedName==='string'&&snapshot.ungroupedName.trim())this.state.ungroupedName=snapshot.ungroupedName.trim().slice(0,60);
      // Reuse native moves so restored members retain their saved reading order,
      // even when some were already open. Leave unrelated documents open.
      for (const [win] of this.windows) {
        const tabs=win.Zotero_Tabs;
        if(typeof tabs.move!=='function')continue;
        let position=1;
        for(const entry of snapshot.tabs) {
          const tab=tabs._tabs.find(t=>t.type!=='library'&&this.key(t)===entry.key);
          if(!tab)continue;
          const index=tabs._tabs.indexOf(tab);
          if(index!==position)tabs.move(tab.id,index<position?position+1:position);
          position++;
        }
      }
      const selected=this.openDocuments().find(row=>row.key===snapshot.selectedKey);
      if(selected){
        // Avoid treating the restored active paper as a manual unfold action.
        const controller=this.windows.get(selected.win);if(controller)controller.lastSelected=selected.tab.id;
        selected.win.Zotero_Tabs.select(selected.tab.id);
      }
      for (const [w,c] of this.windows) {
        c.collapsed=new Set(this.state.collapsed);c.lastSelected=w.Zotero_Tabs.selectedID;
        this.syncTabs(w,c);c.signature='';
      }
      this.save();
      result.ok=result.failed===0&&result.missing===0;
      result.message=`已恢复 ${result.opened} 篇，${result.alreadyOpen} 篇已打开。`;
      if(result.missing)result.message+=` ${result.missing} 篇文献已删除或无法找到。`;
      if(result.failed)result.message+=` ${result.failed} 篇未恢复，请查看详情。`;
      this.lastRestoreResult=result;
      return result;
    } finally { this.restoring=false; this.updateSettingsViews(); }
  },
  async registerSettings(root, version) {
    this.pluginRoot=root;
    this.pluginVersion=version;
    Zotero.TabManagerPlugin=this;
    if (Zotero.PreferencePanes && Zotero.PreferencePanes.register) {
      this.settingsPane=await Zotero.PreferencePanes.register({pluginID:'tab-groups@local.zotero',id:'tab-manager-settings',label:'Tab Manager',src:'preferences.xhtml',image:'icon-32.png'});
    }
    if(parseInt(Zotero.version,10)<7){const windows=Services.wm.getEnumerator(null);while(windows.hasMoreElements())this.attachLegacyOptions(windows.getNext());}
  },
  attachLegacyOptions(win) {
    if(parseInt(Zotero.version,10)>=7||typeof win.openOptionsInTab!=='function'||this.legacyOptionsWindows.has(win))return;
    // Firefox 60 only advertises tab-style options; Zotero has no browser tabs.
    // Route our own URL to the existing settings dialog, preserving other add-ons.
    const original=win.openOptionsInTab,plugin=this;
    const wrapped=function(url){if(url==='chrome://tab-manager/content/preferences-window.xul'){plugin.openSettings(Zotero.getMainWindow());return true;}return original.apply(this,arguments);};
    win.openOptionsInTab=wrapped;this.legacyOptionsWindows.set(win,{original,wrapped});
    win.addEventListener('unload',()=>this.legacyOptionsWindows.delete(win),{once:true});
  },
  openSettings(win) {
    if (this.settingsPane) return Zotero.Utilities.Internal.openPreferences(this.settingsPane);
    for (const w of this.settingsWindows) if(!w.closed){w.focus();return w;}
    const dialog=win.openDialog('chrome://tab-manager/content/preferences-window.xul','tab-manager-settings','chrome,centerscreen,resizable,width=660,height=720',this);
    this.settingsWindows.add(dialog);
    const loaded=()=>{
      const root=dialog.document.getElementById('tm-settings-root');if(!root)return;
      dialog.removeEventListener('load',loaded);this.renderSettings(dialog.document,root);
      dialog.addEventListener('unload',()=>this.settingsWindows.delete(dialog),{once:true});
    };
    dialog.addEventListener('load',loaded);loaded();
    return dialog;
  },
  workspaceIcon(action) {
    const body=action==='save'?'<rect x="3" y="3" width="18" height="18" rx="4" fill="#e8efff" stroke="#527bd7"/><path d="M8 3v7h8V3M8 21v-7h8v7" stroke="#527bd7"/>':'<path d="M4 10a8 8 0 1 1 2 8" stroke="#299b86"/><path d="M4 4v6h6" stroke="#299b86"/><path d="M12 8v5l3 2" stroke="#d59a31"/>';
    return 'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+body+'</svg>');
  },
  attachToolsMenu(win) {
    const doc=win.document,parent=doc.getElementById('menu_ToolsPopup');
    if(!parent)return null;
    const menu=this.xul(doc,'menu');menu.id='ztg-tools-menu';menu.setAttribute('label','Tab Manager');
    menu.classList.add('menu-iconic');menu.setAttribute('image',this.pluginRoot+'icon-16.png');
    const popup=this.xul(doc,'menupopup');menu.append(popup);
    const add=(label,image,fn)=>{const item=this.xul(doc,'menuitem');item.classList.add('menuitem-iconic');item.setAttribute('image',image);item.setAttribute('label',label);item.addEventListener('command',fn);popup.append(item);return item;};
    add('保存当前阅读现场',this.workspaceIcon('save'),()=>{const r=this.saveWorkspace(win);Services.prompt.alert(win,'Tab Manager',r.message);});
    const restore=add('恢复阅读现场',this.workspaceIcon('restore'),async()=>{
      try {const r=await this.restoreWorkspace();Services.prompt.alert(win,'Tab Manager',r.message);}
      catch(e){Zotero.logError(e);Services.prompt.alert(win,'Tab Manager','恢复未完成，已打开的文献会保留，可稍后重试。');}
    });
    popup.addEventListener('popupshowing',()=>{restore.disabled=!this.state.workspace||!!this.restoring;});
    parent.append(menu);return menu;
  },
  updateSettingsViews() {
    for(const [root,update] of this.settingsViews){if(!root.isConnected)this.settingsViews.delete(root);else update();}
  },
  renderSettings(doc, root) {
    if(root.querySelector('.tm-settings'))return;
    const h=(tag,text)=>{const n=doc.createElementNS('http://www.w3.org/1999/xhtml',tag);if(text!==undefined)n.textContent=text;return n;};
    const panel=h('div');panel.className='tm-settings';panel.style.cssText='font:13px/1.5 system-ui;max-width:640px;padding:0 4px;color:inherit;';root.append(panel);
    const controls=new Map(), status=h('p');status.id='tm-settings-status';status.setAttribute('role','status');status.hidden=true;
    const showStatus=message=>{status.textContent=message;status.hidden=false;};
    const section=title=>{const box=h('section');box.style.cssText='margin:0 0 18px;';const heading=h('h2',title);heading.style.cssText='font-size:15px;margin:0 0 10px;';box.append(heading);panel.append(box);return box;};
    const field=(box,key,label,type,help)=>{
      const row=h('label');row.style.cssText='display:flex;align-items:center;margin:9px 0;';
      const input=h(type==='select'?'select':'input');input.id='tm-setting-'+key;
      if(type==='select')for(const [value,name] of [['original','原文件名'],['note','备注'],['both','原文件名 + 备注']]){const option=h('option',name);option.value=value;input.append(option);}
      else input.type=type;
      if(type==='number'){input.min='1';input.max=['verticalThreshold','groupCountThreshold'].includes(key)?'1000':'3650';input.step='1';input.style.width='72px';}
      const text=h('span',label);if(type==='checkbox'){row.append(input,text);input.style.marginInlineEnd='8px';}else{row.append(text,input);input.style.marginInlineStart='12px';input.style.flex='0 0 auto';}
      input.addEventListener('change',()=>{
        const value=type==='checkbox'?input.checked:type==='number'?Number(input.value):input.value;
        if(!this.updateSettings({[key]:value})){showStatus(['verticalThreshold','groupCountThreshold'].includes(key)?'数量须为 1–1000 的整数。':'设置未保存。天数须为 1–3650 的整数。');update();}
      });
      controls.set(key,{input,type});box.append(row);
      if(help)row.title=help;
    };
    const groups=section('分组');
    field(groups,'restoreClosedGroups','重新打开文献时自动进入上一次的分组','checkbox','原组不存在时自动重建；关闭此项不移动当前文献。');
    field(groups,'dissolveOnGroupClose','关闭组内所有文献后自动解散分组','checkbox');
    field(groups,'allowUngroupedRename','是否允许未分组重命名','checkbox');
    field(groups,'showGroupCounts','显示文献数量','checkbox');
    field(groups,'verticalThreshold','分组内文献超过此数量时竖向排列','number');
    field(groups,'groupCountThreshold','分组数量超过此值时全部竖向排列','number','按自建分组数量计算，不含未分组；当前阅读的文献仍横向显示。');
    const display=section('标签显示');
    field(display,'defaultDisplay','默认显示','select','立即应用到所有当前分组和已打开的文献。');
    const suggestions=section('建议关闭');
    field(suggestions,'showSuggestions','显示“建议关闭”按钮','checkbox');
    field(suggestions,'suggestDays','未查看天数','number','仅提供建议，不会自动关闭文献。');
    const workspace=section('阅读现场');
    const detail=h('p');detail.id='tm-workspace-summary';workspace.append(detail);
    const actions=h('div');actions.style.cssText='display:flex;gap:10px;flex-wrap:wrap;';
    const save=h('button','保存当前阅读现场'),restore=h('button','恢复阅读现场');save.type=restore.type='button';save.id='tm-save-workspace';restore.id='tm-restore-workspace';
    let restoreLabel;
    for(const [button,action] of [[save,'save'],[restore,'restore']]){
      const label=h('span',button.textContent),icon=h('img');icon.src=this.workspaceIcon(action);icon.alt='';icon.width=icon.height=16;
      button.textContent='';button.append(icon,label);button.style.cssText='display:inline-flex;align-items:center;gap:7px;';
      if(action==='restore')restoreLabel=label;
    }
    save.addEventListener('click',()=>{const r=this.saveWorkspace(Zotero.getMainWindow());showStatus(r.message);update();});
    restore.addEventListener('click',async()=>{try{const r=await this.restoreWorkspace();showStatus(r.message);}catch(e){Zotero.logError(e);showStatus('恢复未完成，可稍后重试。');}finally{update();}});
    actions.append(save,restore);workspace.append(actions);panel.append(status);
    const failures=h('details');failures.id='tm-restore-failures';failures.hidden=true;
    const failureSummary=h('summary'),failureList=h('ul');failureList.style.cssText='font-size:12px;max-height:180px;overflow:auto;padding-inline-start:20px;';
    failures.append(failureSummary,failureList);workspace.append(failures);
    const note=h('p','仅保存在本机；再次保存会覆盖上次记录。');note.style.cssText='font-size:12px;opacity:.7;';workspace.append(note);
    const footer=h('footer');footer.id='tm-settings-footer';footer.style.cssText='border-top:1px solid #8884;margin-top:20px;padding-top:12px;font-size:12px;line-height:1.8;display:flex;flex-wrap:wrap;gap:4px 12px;';
    const link=(label,url)=>{const a=h('a',label);a.href=url;a.title=url;a.addEventListener('click',event=>{event.preventDefault();Zotero.launchURL(url);});return a;};
    footer.append(h('span',`当前版本：${this.pluginVersion||'未知'}`),link('项目网站','https://github.com/Ueky2000/zotero-tab-manager'));
    const feedback=h('span','反馈 Bug 与功能建议：可在 ');feedback.append(link('小红书帖子','https://xhslink.cn/o/5yD58jP6BNV'),doc.createTextNode(' 下留言或 Email：'),link('ueky@foxmail.com','mailto:ueky@foxmail.com'));footer.append(feedback);panel.append(footer);
    const update=()=>{
      const s=this.getSettings();for(const [key,{input,type}] of controls){if(type==='checkbox')input.checked=s[key];else input.value=String(s[key]);input.disabled=!!this.readOnly;}
      const saved=this.state.workspace;
      detail.textContent=saved?`上次保存：${new Date(saved.savedAt).toLocaleString()} · ${saved.tabs.length} 篇文献 · ${saved.groups.length} 个分组`:'尚未保存阅读现场。';
      save.disabled=!!this.readOnly||!!this.restoring;restore.disabled=!!this.readOnly||!!this.restoring||!saved;restoreLabel.textContent=this.restoring?'正在恢复…':'恢复阅读现场';
      const issues=this.lastRestoreResult?.failures||[];failures.hidden=!issues.length;failureSummary.textContent=`未恢复的文献（${issues.length}）`;
      this.clear(failureList);for(const issue of issues)failureList.append(h('li',`${issue.title}：${issue.reason}`));
    };
    this.settingsViews.set(root,update);doc.defaultView.addEventListener('unload',()=>this.settingsViews.delete(root),{once:true});update();
  },
  stopSettings() {
    for(const [win,{original,wrapped}] of this.legacyOptionsWindows)if(!win.closed&&win.openOptionsInTab===wrapped)win.openOptionsInTab=original;
    this.legacyOptionsWindows.clear();
    if(this.settingsPane && Zotero.PreferencePanes)Zotero.PreferencePanes.unregister(this.settingsPane);
    this.settingsPane=null;
    if(Zotero.TabManagerPlugin===this)delete Zotero.TabManagerPlugin;
    for(const win of this.settingsWindows)if(!win.closed)win.close();this.settingsWindows.clear();
    for(const [root] of this.settingsViews)for(const n of root.querySelectorAll('input,select,button'))n.disabled=true;
    this.settingsViews.clear();
  }
});
