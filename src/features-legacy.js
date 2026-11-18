/* SPDX-License-Identifier: MIT. Settings, closed-tab memory and reading workspace. */
Object.assign(TabGroups, {
  settingsViews: new Map(),
  settingsWindows: new Set(),
  getSettings() {
    const s = this.state.settings || {};
    return {
      restoreClosedGroups: s.restoreClosedGroups !== false,
      showGroupCounts: s.showGroupCounts !== false,
      hoverExpand: s.hoverExpand !== false,
      showSuggestions: s.showSuggestions !== false,
      defaultDisplay: ['original', 'note', 'both'].includes(s.defaultDisplay) ? s.defaultDisplay : 'original',
      verticalThreshold: Number.isInteger(s.verticalThreshold) && s.verticalThreshold >= 1 && s.verticalThreshold <= 1000 ? s.verticalThreshold : 7,
      suggestDays: this.state.suggestDays,
      ungroupedColor: this.state.ungroupedColor
    };
  },
  updateSettings(patch) {
    if (this.readOnly) return false;
    const next = {
      ...this.getSettings()
    };
    for (const [key, value] of Object.entries(patch)) {
      if (['restoreClosedGroups', 'showGroupCounts', 'hoverExpand', 'showSuggestions'].includes(key)) {
        if (typeof value !== 'boolean') return false;
      } else if (key === 'defaultDisplay') {
        if (!['original', 'note', 'both'].includes(value)) return false;
      } else if (key === 'suggestDays') {
        if (!Number.isInteger(value) || value < 1 || value > 3650) return false;
      } else if (key === 'verticalThreshold') {
        if (!Number.isInteger(value) || value < 1 || value > 1000) return false;
      } else if (key === 'ungroupedColor') {
        if (!this.normalizeColor(value)) return false;
      } else return false;
      next[key] = value;
    }
    this.state.settings = {
      restoreClosedGroups: next.restoreClosedGroups,
      showGroupCounts: next.showGroupCounts,
      hoverExpand: next.hoverExpand,
      showSuggestions: next.showSuggestions,
      defaultDisplay: next.defaultDisplay,
      verticalThreshold: next.verticalThreshold
    };
    this.state.suggestDays = next.suggestDays;
    this.state.ungroupedColor = this.normalizeColor(next.ungroupedColor);
    for (const c of this.windows.values()) c.cancelHover();
    this.save();
    return true;
  },
  groupRecord(tab) {
    const group = this.state.groups.find(g => g.id === this.groupOf(tab));
    return group ? {
      ...group,
      display: this.state.groupDisplay[group.id] || null
    } : null;
  },
  validGroupRecord(record) {
    return record && typeof record.id === 'string' && record.id && record.id !== '__proto__' && typeof record.name === 'string' && record.name.trim() && this.normalizeColor(record.color);
  },
  restoreGroupRecord(record) {
    if (!this.validGroupRecord(record)) return '';
    let group = this.state.groups.find(g => g.id === record.id) || this.state.groups.find(g => g.name === record.name);
    if (!group) {
      group = {
        id: record.id,
        name: record.name.slice(0, 60),
        color: this.normalizeColor(record.color)
      };
      this.state.groups.push(group);
      if (['original', 'note', 'both'].includes(record.display)) this.state.groupDisplay[group.id] = record.display;
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
      if (remember && record.group) this.state.closedGroups[record.key] = record.group;else {
        delete this.state.closedGroups[record.key];
        delete this.state.assignments[record.key];
      }
      changed = true;
    }
    for (const tab of current) {
      var _c$seenTabs$get;
      const key = this.key(tab);
      if (!key || ((_c$seenTabs$get = c.seenTabs.get(tab.id)) === null || _c$seenTabs$get === void 0 ? void 0 : _c$seenTabs$get.key) === key || survivingKeys.has(key) || this.restoring) continue;
      if (remember && this.validGroupRecord(this.state.closedGroups[key])) {
        this.state.assignments[key] = this.restoreGroupRecord(this.state.closedGroups[key]);
        delete this.state.closedGroups[key];
        changed = true;
      } else if (!remember && c.initializedTabs) {
        delete this.state.assignments[key];
        delete this.state.closedGroups[key];
        changed = true;
      }
    }
    c.seenTabs = new Map(current.map(tab => [tab.id, {
      key: this.key(tab),
      group: this.groupRecord(tab)
    }]));
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
      if (tab.type !== 'library' && key) rows.push({
        win,
        tab,
        key
      });
    }
    return rows;
  },
  saveWorkspace(win) {
    if (this.readOnly || this.restoring) return {
      ok: false,
      message: '当前无法保存阅读现场。'
    };
    for (const [w, c] of this.windows) this.syncTabs(w, c);
    const unique = new Map();
    for (const row of this.openDocuments()) if (!unique.has(row.key)) unique.set(row.key, row);
    if (!unique.size) return {
      ok: false,
      message: '当前没有打开的文献，上次保存的现场已保留。'
    };
    const selected = win && win.Zotero_Tabs._tabs.find(t => t.id === win.Zotero_Tabs.selectedID);
    const snapshot = {
      version: 1,
      savedAt: Date.now(),
      groups: this.state.groups.map(g => ({
        ...g
      })),
      order: this.orderedGroups().map(g => g.id),
      collapsed: [...this.state.collapsed],
      ungroupedColor: this.state.ungroupedColor,
      groupDisplay: {
        ...this.state.groupDisplay
      },
      selectedKey: this.key(selected),
      tabs: [...unique.values()].map(({
        tab,
        key
      }) => {
        const item = Zotero.Items.get(tab.data.itemID);
        return {
          key,
          libraryID: item.libraryID,
          itemKey: item.key,
          kind: tab.type.indexOf('note') === 0 ? 'note' : 'reader',
          title: this.plainTitle(tab.title || ''),
          group: this.groupOf(tab),
          remark: {
            ...this.remark(tab)
          }
        };
      })
    };
    this.state.workspace = snapshot;
    this.save();
    return {
      ok: true,
      message: `已保存 ${snapshot.tabs.length} 篇文献和 ${snapshot.groups.length} 个分组。`
    };
  },
  async restoreWorkspace() {
    const snapshot = this.state.workspace;
    if (this.readOnly || this.restoring || !snapshot || !Array.isArray(snapshot.tabs)) return {
      ok: false,
      message: '没有可恢复的阅读现场，或正在恢复中。'
    };
    this.restoring = true;
    this.updateSettingsViews();
    const result = {
      ok: true,
      opened: 0,
      alreadyOpen: 0,
      missing: 0,
      failed: 0
    };
    try {
      const mapping = new Map([['', '']]);
      for (const group of snapshot.groups) {
        const id = this.restoreGroupRecord({
          ...group,
          display: (snapshot.groupDisplay || {})[group.id]
        });
        if (id) {
          mapping.set(group.id, id);
          const target = this.state.groups.find(g => g.id === id);
          target.name = group.name.slice(0, 60);
          target.color = this.normalizeColor(group.color);
          const display = (snapshot.groupDisplay || {})[group.id];
          if (['original', 'note', 'both'].includes(display)) this.state.groupDisplay[id] = display;else delete this.state.groupDisplay[id];
        }
      }
      const seen = new Set();
      for (const entry of snapshot.tabs) {
        if (!entry || typeof entry.key !== 'string' || seen.has(entry.key)) continue;
        seen.add(entry.key);
        let item;
        try {
          item = await Zotero.Items.getByLibraryAndKeyAsync(entry.libraryID, entry.itemKey);
        } catch (e) {
          Zotero.logError(e);
        }
        if (!item || item.deleted) {
          result.missing++;
          continue;
        }
        const key = `${item.libraryID}:${item.key}`;
        const id = mapping.get(entry.group) || '';
        if (id) this.state.assignments[key] = id;else delete this.state.assignments[key];
        delete this.state.closedGroups[key];
        if (entry.remark && typeof entry.remark.note === 'string') this.state.remarks[key] = {
          note: entry.remark.note.slice(0, 300),
          mode: ['original', 'note', 'both'].includes(entry.remark.mode) ? entry.remark.mode : 'original'
        };
        if (this.openDocuments().some(row => row.key === key)) {
          result.alreadyOpen++;
          continue;
        }
        try {
          const api = entry.kind === 'note' ? Zotero.Notes : Zotero.Reader;
          if (!api || typeof api.open !== 'function') throw new Error('This Zotero version cannot open this document type');
          await api.open(item.id, undefined, {
            openInBackground: true,
            allowDuplicate: false
          });
          result.opened++;
        } catch (e) {
          result.failed++;
          Zotero.logError(e);
        }
      }
      const savedOrder = (snapshot.order || []).map(id => mapping.get(id)).filter(id => id !== undefined);
      this.state.order = [...new Set([...savedOrder, ...this.orderedGroups().map(g => g.id)])];
      const restoredIDs = new Set(mapping.values());
      this.state.collapsed = [...this.state.collapsed.filter(id => !restoredIDs.has(id)), ...(snapshot.collapsed || []).map(id => mapping.get(id)).filter(id => id !== undefined)];
      const color = this.normalizeColor(snapshot.ungroupedColor || '');
      if (color) this.state.ungroupedColor = color;
      // Reuse native moves so restored members retain their saved reading order,
      // even when some were already open. Leave unrelated documents open.
      for (const [win] of this.windows) {
        const tabs = win.Zotero_Tabs;
        if (typeof tabs.move !== 'function') continue;
        let position = 1;
        for (const entry of snapshot.tabs) {
          const tab = tabs._tabs.find(t => t.type !== 'library' && this.key(t) === entry.key);
          if (!tab) continue;
          const index = tabs._tabs.indexOf(tab);
          if (index !== position) tabs.move(tab.id, index < position ? position + 1 : position);
          position++;
        }
      }
      const selected = this.openDocuments().find(row => row.key === snapshot.selectedKey);
      if (selected) selected.win.Zotero_Tabs.select(selected.tab.id);
      for (const [w, c] of this.windows) {
        c.collapsed = new Set(this.state.collapsed);
        c.lastSelected = w.Zotero_Tabs.selectedID;
        this.syncTabs(w, c);
        c.signature = '';
      }
      this.save();
      result.message = `已打开 ${result.opened} 篇，${result.alreadyOpen} 篇已打开。`;
      if (result.missing) result.message += ` ${result.missing} 篇文献已删除或无法找到。`;
      if (result.failed) result.message += ` ${result.failed} 篇打开失败，可稍后重试。`;
      return result;
    } finally {
      this.restoring = false;
      this.updateSettingsViews();
    }
  },
  async registerSettings(root) {
    this.pluginRoot = root;
    Zotero.TabManagerPlugin = this;
    if (Zotero.PreferencePanes && Zotero.PreferencePanes.register) {
      this.settingsPane = await Zotero.PreferencePanes.register({
        pluginID: 'tab-groups@local.zotero',
        id: 'tab-manager-settings',
        label: 'Tab Manager',
        src: 'preferences.xhtml',
        image: 'icon-32.png'
      });
    }
  },
  openSettings(win) {
    if (this.settingsPane) return Zotero.Utilities.Internal.openPreferences(this.settingsPane);
    for (const w of this.settingsWindows) if (!w.closed) {
      w.focus();
      return w;
    }
    const dialog = win.openDialog('chrome://tab-manager/content/preferences-window.xul', 'tab-manager-settings', 'chrome,centerscreen,resizable,width=660,height=720', this);
    this.settingsWindows.add(dialog);
    const loaded = () => {
      const root = dialog.document.getElementById('tm-settings-root');
      if (!root) return;
      dialog.removeEventListener('load', loaded);
      this.renderSettings(dialog.document, root);
      dialog.addEventListener('unload', () => this.settingsWindows.delete(dialog), {
        once: true
      });
    };
    dialog.addEventListener('load', loaded);
    loaded();
    return dialog;
  },
  attachToolsMenu(win) {
    const doc = win.document,
      parent = doc.getElementById('menu_ToolsPopup');
    if (!parent) return null;
    const menu = this.xul(doc, 'menu');
    menu.id = 'ztg-tools-menu';
    menu.setAttribute('label', 'Tab Manager');
    const popup = this.xul(doc, 'menupopup');
    menu.append(popup);
    const add = (label, fn) => {
      const item = this.xul(doc, 'menuitem');
      item.setAttribute('label', label);
      item.addEventListener('command', fn);
      popup.append(item);
      return item;
    };
    add('设置…', () => this.openSettings(win));
    popup.append(this.xul(doc, 'menuseparator'));
    add('保存当前阅读现场', () => {
      const r = this.saveWorkspace(win);
      Services.prompt.alert(win, 'Tab Manager', r.message);
    });
    const restore = add('恢复阅读现场', async () => {
      try {
        const r = await this.restoreWorkspace();
        Services.prompt.alert(win, 'Tab Manager', r.message);
      } catch (e) {
        Zotero.logError(e);
        Services.prompt.alert(win, 'Tab Manager', '恢复未完成，已打开的文献会保留，可稍后重试。');
      }
    });
    popup.addEventListener('popupshowing', () => {
      restore.disabled = !this.state.workspace || !!this.restoring;
    });
    parent.append(menu);
    return menu;
  },
  updateSettingsViews() {
    for (const [root, update] of this.settingsViews) {
      if (!root.isConnected) this.settingsViews.delete(root);else update();
    }
  },
  renderSettings(doc, root) {
    if (root.querySelector('.tm-settings')) return;
    const h = (tag, text) => {
      const n = doc.createElementNS('http://www.w3.org/1999/xhtml', tag);
      if (text !== undefined) n.textContent = text;
      return n;
    };
    const panel = h('div');
    panel.className = 'tm-settings';
    panel.style.cssText = 'font:13px/1.5 system-ui;max-width:640px;padding:0 4px;color:inherit;';
    root.append(panel);
    const controls = new Map(),
      status = h('p');
    status.id = 'tm-settings-status';
    status.setAttribute('role', 'status');
    status.hidden = true;
    const showStatus = message => {
      status.textContent = message;
      status.hidden = false;
    };
    const section = title => {
      const box = h('section');
      box.style.cssText = 'margin:0 0 18px;';
      const heading = h('h2', title);
      heading.style.cssText = 'font-size:15px;margin:0 0 10px;';
      box.append(heading);
      panel.append(box);
      return box;
    };
    const field = (box, key, label, type, help) => {
      const row = h('label');
      row.style.cssText = 'display:flex;align-items:center;margin:9px 0;';
      const input = h(type === 'select' ? 'select' : 'input');
      input.id = 'tm-setting-' + key;
      if (type === 'select') for (const [value, name] of [['original', '原文件名'], ['note', '备注'], ['both', '原文件名 + 备注']]) {
        const option = h('option', name);
        option.value = value;
        input.append(option);
      } else input.type = type;
      if (type === 'number') {
        input.min = '1';
        input.max = key === 'verticalThreshold' ? '1000' : '3650';
        input.step = '1';
        input.style.width = '72px';
      }
      const text = h('span', label);
      if (type === 'checkbox') {
        row.append(input, text);
        input.style.marginInlineEnd = '8px';
      } else {
        row.append(text, input);
        input.style.marginInlineStart = '12px';
        input.style.flex = '0 0 auto';
      }
      input.addEventListener('change', () => {
        const value = type === 'checkbox' ? input.checked : type === 'number' ? Number(input.value) : input.value;
        if (!this.updateSettings({
          [key]: value
        })) {
          showStatus(key === 'verticalThreshold' ? '文献数量须为 1–1000 的整数。' : '设置未保存。天数须为 1–3650 的整数。');
          update();
        }
      });
      controls.set(key, {
        input,
        type
      });
      box.append(row);
      if (help) row.title = help;
    };
    const groups = section('分组');
    field(groups, 'restoreClosedGroups', '重新打开时恢复分组', 'checkbox', '原组不存在时自动重建；关闭此项不移动当前文献。');
    field(groups, 'showGroupCounts', '显示文献数量', 'checkbox');
    field(groups, 'hoverExpand', '拖动悬停展开分组', 'checkbox');
    field(groups, 'verticalThreshold', '超过此数量时竖向展开', 'number', '按每个分组内打开的文献数量计算。');
    field(groups, 'ungroupedColor', '未分组颜色', 'color');
    const display = section('标签显示');
    field(display, 'defaultDisplay', '默认显示', 'select', '分组和单篇文献的设置优先。');
    const suggestions = section('建议关闭');
    field(suggestions, 'showSuggestions', '显示“建议关闭”按钮', 'checkbox');
    field(suggestions, 'suggestDays', '未查看天数', 'number', '仅提供建议，不会自动关闭文献。');
    const workspace = section('阅读现场');
    const detail = h('p');
    detail.id = 'tm-workspace-summary';
    workspace.append(detail);
    const actions = h('div');
    actions.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap;';
    const save = h('button', '保存当前阅读现场'),
      restore = h('button', '恢复阅读现场');
    save.type = restore.type = 'button';
    save.id = 'tm-save-workspace';
    restore.id = 'tm-restore-workspace';
    save.addEventListener('click', () => {
      const r = this.saveWorkspace(Zotero.getMainWindow());
      showStatus(r.message);
      update();
    });
    restore.addEventListener('click', async () => {
      try {
        const r = await this.restoreWorkspace();
        showStatus(r.message);
      } catch (e) {
        Zotero.logError(e);
        showStatus('恢复未完成，可稍后重试。');
      } finally {
        update();
      }
    });
    actions.append(save, restore);
    workspace.append(actions);
    panel.append(status);
    const note = h('p', '仅保存在本机；再次保存会覆盖上次记录。');
    note.style.cssText = 'font-size:12px;opacity:.7;';
    workspace.append(note);
    const update = () => {
      const s = this.getSettings();
      for (const [key, {
        input,
        type
      }] of controls) {
        if (type === 'checkbox') input.checked = s[key];else input.value = String(s[key]);
        input.disabled = !!this.readOnly;
      }
      const saved = this.state.workspace;
      detail.textContent = saved ? `上次保存：${new Date(saved.savedAt).toLocaleString()} · ${saved.tabs.length} 篇文献 · ${saved.groups.length} 个分组` : '尚未保存阅读现场。';
      save.disabled = !!this.readOnly || !!this.restoring;
      restore.disabled = !!this.readOnly || !!this.restoring || !saved;
      restore.textContent = this.restoring ? '正在恢复…' : '恢复阅读现场';
    };
    this.settingsViews.set(root, update);
    doc.defaultView.addEventListener('unload', () => this.settingsViews.delete(root), {
      once: true
    });
    update();
  },
  stopSettings() {
    if (this.settingsPane && Zotero.PreferencePanes) Zotero.PreferencePanes.unregister(this.settingsPane);
    this.settingsPane = null;
    if (Zotero.TabManagerPlugin === this) delete Zotero.TabManagerPlugin;
    for (const win of this.settingsWindows) if (!win.closed) win.close();
    this.settingsWindows.clear();
    for (const [root] of this.settingsViews) for (const n of root.querySelectorAll('input,select,button')) n.disabled = true;
    this.settingsViews.clear();
  }
});
