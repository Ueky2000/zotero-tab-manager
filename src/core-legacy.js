/* SPDX-License-Identifier: MIT */
var TabGroups = {
  mainWindows() {
    if (typeof Zotero.getMainWindows === 'function') return Zotero.getMainWindows();
    const windows = [],
      list = Services.wm.getEnumerator(null);
    while (list.hasMoreElements()) {
      const win = list.getNext();
      if (win.Zotero_Tabs) windows.push(win);
    }
    return windows;
  },
  xul(doc, tag) {
    return doc.createXULElement ? doc.createXULElement(tag) : doc.createElementNS('http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul', tag);
  },
  fromEntries(entries) {
    const object = {};
    for (const [key, value] of entries) if (key !== '__proto__') object[key] = value;
    return object;
  },
  clear(node) {
    node.textContent = '';
  },
  setLabel(node, label) {
    node.setAttribute('label', label);
    if ('label' in node) node.label = label;
  },
  plainTitle(value) {
    const render = Zotero.Utilities.Internal && Zotero.Utilities.Internal.renderItemTitle;
    return typeof render === 'function' ? render.call(Zotero.Utilities.Internal, String(value)) : String(value).replace(/<[^>]*>/g, '');
  },
  pref: 'extensions.tabGroups.state',
  windows: new Map(),
  state: {
    version: 1,
    orderVersion: 2,
    groups: [],
    assignments: {},
    ungroupedColor: '#737373',
    collapsed: [],
    order: [],
    history: {},
    suggestDays: 7,
    remarks: {},
    groupDisplay: {},
    settings: {},
    closedGroups: {},
    workspace: null
  },
  colors: ['#3977d5', '#8b5ac7', '#21866a', '#bc6228', '#b34e77', '#667a2a'],
  normalizeColor(value) {
    const hex = String(value).trim().replace(/^#/, '');
    if (/^[0-9a-f]{3}$/i.test(hex)) return '#' + [...hex].map(c => c + c).join('').toLowerCase();
    return /^[0-9a-f]{6}$/i.test(hex) ? '#' + hex.toLowerCase() : null;
  },
  setColor(id, value) {
    const color = this.normalizeColor(value),
      g = id === '' ? {
        id: ''
      } : this.state.groups.find(g => g.id === id);
    if (!g || !color || this.readOnly) return false;
    if (id === '') this.state.ungroupedColor = color;else g.color = color;
    this.save();
    return true;
  },
  customColor(win, g) {
    const v = {
      value: g.color
    };
    while (!this.readOnly && Services.prompt.prompt(win, '自定义分组颜色', '输入颜色代码，如 #3977d5、#ff8800 或 #abc：', v, null, {})) {
      if (this.setColor(g.id, v.value)) return;
      Services.prompt.alert(win, '颜色格式不正确', '请输入 3 位或 6 位十六进制颜色代码，例如 #ff8800。');
    }
  },
  ink(color) {
    const rgb = color.slice(1).match(/../g).map(x => parseInt(x, 16) / 255).map(x => x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722 > 0.179 ? '#111111' : '#ffffff';
  },
  load() {
    const raw = Zotero.Prefs.get(this.pref, true);
    if (!raw) return;
    try {
      const s = JSON.parse(raw);
      if (s.version !== 1 || !Array.isArray(s.groups) || !s.assignments || typeof s.assignments !== 'object') throw new Error('Invalid Tab Groups settings');
      const groups = s.groups.filter(g => typeof g.id === 'string' && g.id && typeof g.name === 'string' && /^#[0-9a-f]{6}$/i.test(g.color));
      const valid = new Set([...groups.map(g => g.id), '']);
      let order = [...new Set(Array.isArray(s.order) ? s.order.filter(id => valid.has(id)) : [])];
      for (const id of valid) {
        if (order.includes(id)) continue;
        const ungrouped = order.indexOf('');
        order.splice(ungrouped === -1 ? order.length : ungrouped, 0, id);
      }
      // Move the old default ungrouped section once, retaining named-group order.
      // Subsequent explicit drags, including moving ungrouped, remain persistent.
      if (s.orderVersion !== 2) order = [...order.filter(id => id !== ''), ''];
      this.state = {
        version: 1,
        orderVersion: 2,
        groups,
        assignments: {
          ...s.assignments
        },
        ungroupedColor: this.normalizeColor(s.ungroupedColor || '') || '#737373',
        collapsed: [...new Set(Array.isArray(s.collapsed) ? s.collapsed.filter(id => valid.has(id)) : [])],
        order,
        history: s.history && typeof s.history === 'object' && !Array.isArray(s.history) ? {
          ...s.history
        } : {},
        suggestDays: Number.isInteger(s.suggestDays) && s.suggestDays >= 1 && s.suggestDays <= 3650 ? s.suggestDays : 7,
        remarks: s.remarks && typeof s.remarks === 'object' && !Array.isArray(s.remarks) ? {
          ...s.remarks
        } : {},
        settings: s.settings && typeof s.settings === 'object' && !Array.isArray(s.settings) ? {
          ...s.settings
        } : {},
        closedGroups: s.closedGroups && typeof s.closedGroups === 'object' && !Array.isArray(s.closedGroups) ? {
          ...s.closedGroups
        } : {},
        workspace: s.workspace && s.workspace.version === 1 && Array.isArray(s.workspace.tabs) && Array.isArray(s.workspace.groups) ? s.workspace : null,
        groupDisplay: s.groupDisplay && typeof s.groupDisplay === 'object' && !Array.isArray(s.groupDisplay) ? this.fromEntries(Object.entries(s.groupDisplay).filter(([id, mode]) => valid.has(id) && ['original', 'note', 'both'].includes(mode))) : {}
      };
    } catch (e) {
      this.readOnly = true;
      Zotero.logError(e);
    }
  },
  save() {
    if (this.readOnly) throw new Error('分组设置无法读取，原数据已保留。');
    Zotero.Prefs.set(this.pref, JSON.stringify(this.state), true);
    for (const c of this.windows.values()) c.refresh();
    if (this.updateSettingsViews) this.updateSettingsViews();
  },
  orderedGroups() {
    const all = [...this.state.groups, {
      id: '',
      name: '未分组',
      color: this.state.ungroupedColor || '#737373'
    }];
    const order = [...new Set((this.state.order || []).filter(id => all.some(g => g.id === id)))];
    for (const g of all) {
      if (order.includes(g.id)) continue;
      const ungrouped = order.indexOf('');
      order.splice(ungrouped === -1 ? order.length : ungrouped, 0, g.id);
    }
    return order.map(id => all.find(g => g.id === id)).filter(Boolean);
  },
  moveGroup(id, target, after = false) {
    if (this.readOnly || id === target) return;
    const ids = this.orderedGroups().map(g => g.id);
    if (!ids.includes(id) || !ids.includes(target)) return;
    ids.splice(ids.indexOf(id), 1);
    ids.splice(ids.indexOf(target) + (after ? 1 : 0), 0, id);
    this.state.order = ids;
    this.save();
  },
  setCollapsed(id, collapsed) {
    if (this.readOnly) return;
    const ids = new Set(this.state.collapsed || []);
    if (collapsed) ids.add(id);else ids.delete(id);
    this.state.collapsed = [...ids];
    for (const c of this.windows.values()) {
      if (collapsed) c.collapsed.add(id);else c.collapsed.delete(id);
    }
    this.save();
  },
  headingWidth(g) {
    const nameWidth = [...g.name].reduce((width, ch) => width + (ch.charCodeAt(0) > 255 ? 12 : 7), 0);
    return Math.min(280, Math.max(96, 58 + nameWidth));
  },
  closeGroup(win, id) {
    const tabs = win.Zotero_Tabs;
    const ids = tabs._tabs.filter(t => t.type !== 'library' && this.groupOf(t) === id).map(t => t.id);
    const dissolve = !!id && !this.readOnly && this.getSettings && this.getSettings().dissolveOnGroupClose;
    if (dissolve && this.syncTabs) for (const [w, c] of this.windows) this.syncTabs(w, c);
    if (ids.length) tabs.close(ids);
    if (dissolve && ids.length && ![...this.windows.keys(), win].some(w => w.Zotero_Tabs._tabs.some(t => t.type !== 'library' && this.groupOf(t) === id))) {
      // Capture closed-paper memories while the group still exists.
      if (this.syncTabs) for (const [w, c] of this.windows) this.syncTabs(w, c);
      this.dissolveGroup(id);
    }
    return ids;
  },
  dissolveGroup(id) {
    if (!id || this.readOnly || !this.state.groups.some(g => g.id === id)) return false;
    this.state.groups = this.state.groups.filter(g => g.id !== id);
    for (const key of Object.keys(this.state.assignments)) if (this.state.assignments[key] === id) delete this.state.assignments[key];
    this.state.order = this.state.order.filter(group => group !== id);
    this.state.collapsed = this.state.collapsed.filter(group => group !== id);
    delete this.state.groupDisplay[id];
    for (const c of this.windows.values()) c.collapsed.delete(id);
    this.save();
    return true;
  },
  track(tabs, previousSelected) {
    if (this.readOnly) return tabs.selectedID;
    const now = Date.now();
    let changed = false;
    for (const tab of tabs._tabs.filter(t => t.type !== 'library')) {
      const key = this.key(tab);
      if (!key) continue;
      const old = this.state.history[key];
      if (!old || !Number.isFinite(old.firstSeen) || old.firstSeen <= 0) {
        this.state.history[key] = {
          firstSeen: now,
          lastViewed: null
        };
        changed = true;
      }
    }
    if (previousSelected !== tabs.selectedID) {
      for (const id of [previousSelected, tabs.selectedID]) {
        const tab = tabs._tabs.find(t => t.id === id && t.type !== 'library');
        const key = this.key(tab);
        if (key && this.state.history[key]) {
          this.state.history[key].lastViewed = now;
          changed = true;
        }
      }
    }
    // Do not call save() here: track runs during rendering, so refreshing all
    // windows recursively would duplicate view events.
    if (changed) Zotero.Prefs.set(this.pref, JSON.stringify(this.state), true);
    return tabs.selectedID;
  },
  suggestions(tabs, now = Date.now()) {
    const day = 86400000;
    return tabs._tabs.filter(t => t.type !== 'library' && t.id !== tabs.selectedID).map(tab => {
      const h = this.state.history[this.key(tab)];
      const viewed = Number.isFinite(h === null || h === void 0 ? void 0 : h.lastViewed) && h.lastViewed > 0;
      const since = viewed ? h.lastViewed : h === null || h === void 0 ? void 0 : h.firstSeen;
      return {
        tab,
        days: Number.isFinite(since) ? Math.max(0, Math.floor((now - since) / day)) : 0,
        uncertain: !viewed
      };
    }).filter(x => x.days >= this.state.suggestDays).sort((a, b) => b.days - a.days);
  },
  setSuggestDays(win) {
    if (this.readOnly) return;
    const v = {
      value: String(this.state.suggestDays)
    };
    while (Services.prompt.prompt(win, '建议关闭的文献', '多少天未查看后列入建议？请输入 1—3650 的整数：', v, null, {})) {
      const days = Number(v.value);
      if (Number.isInteger(days) && days >= 1 && days <= 3650) {
        this.state.suggestDays = days;
        this.save();
        return;
      }
      Services.prompt.alert(win, '天数格式不正确', '请输入 1—3650 的整数。');
    }
  },
  key(tab) {
    var _tab$data;
    const item = (tab === null || tab === void 0 || (_tab$data = tab.data) === null || _tab$data === void 0 ? void 0 : _tab$data.itemID) && Zotero.Items.get(tab.data.itemID);
    return item ? `${item.libraryID}:${item.key}` : null;
  },
  remark(tab) {
    const r = this.state.remarks[this.key(tab)];
    const defaultMode = this.state.groupDisplay[this.groupOf(tab)] || (this.getSettings ? this.getSettings().defaultDisplay : 'original');
    return {
      note: typeof (r === null || r === void 0 ? void 0 : r.note) === 'string' ? r.note : '',
      mode: ['original', 'note', 'both'].includes(r === null || r === void 0 ? void 0 : r.mode) ? r.mode : defaultMode
    };
  },
  originalName(tab) {
    var _tab$data2, _item$isAttachment;
    const item = (tab === null || tab === void 0 || (_tab$data2 = tab.data) === null || _tab$data2 === void 0 ? void 0 : _tab$data2.itemID) && Zotero.Items.get(tab.data.itemID);
    return String((item !== null && item !== void 0 && (_item$isAttachment = item.isAttachment) !== null && _item$isAttachment !== void 0 && _item$isAttachment.call(item) ? item.attachmentFilename : '') || this.plainTitle(String((tab === null || tab === void 0 ? void 0 : tab.title) || '无标题')));
  },
  label(tab) {
    const r = this.remark(tab),
      original = this.originalName(tab);
    return !r.note || r.mode === 'original' ? original : r.mode === 'note' ? r.note : `${r.note} · ${original}`;
  },
  setRemark(tab, note) {
    const key = this.key(tab);
    if (!key || this.readOnly || typeof note !== 'string' || note.trim().length > 300) return false;
    const r = this.remark(tab);
    this.state.remarks[key] = {
      ...r,
      note: note.trim()
    };
    this.save();
    return true;
  },
  editRemark(win, tab) {
    if (!this.key(tab) || this.readOnly) return;
    const value = {
      value: this.remark(tab).note
    };
    while (Services.prompt.prompt(win, '设置文献备注', '输入标签备注（最多 300 字符，留空清除；不会修改文件名）：', value, null, {})) {
      if (this.setRemark(tab, value.value)) return;
      Services.prompt.alert(win, '备注过长', '备注最多 300 个字符，请缩短后保存。');
    }
  },
  setDisplay(tab, mode) {
    const key = this.key(tab);
    if (!key || this.readOnly || !['original', 'note', 'both'].includes(mode)) return false;
    this.state.remarks[key] = {
      ...this.remark(tab),
      mode
    };
    this.save();
    return true;
  },
  setGroupDisplay(id, mode) {
    if (this.readOnly || !['original', 'note', 'both'].includes(mode) || id && !this.state.groups.some(g => g.id === id)) return false;
    this.state.groupDisplay[id] = mode;
    const keys = new Set([...Object.keys(this.state.remarks), ...Object.keys(this.state.assignments)]);
    for (const win of this.windows.keys()) for (const tab of win.Zotero_Tabs._tabs) {
      const key = this.key(tab);
      if (key) keys.add(key);
    }
    for (const key of keys) {
      var _this$state$remarks$k;
      const assigned = this.state.assignments[key];
      const group = this.state.groups.some(g => g.id === assigned) ? assigned : '';
      if (group === id) this.state.remarks[key] = {
        note: typeof ((_this$state$remarks$k = this.state.remarks[key]) === null || _this$state$remarks$k === void 0 ? void 0 : _this$state$remarks$k.note) === 'string' ? this.state.remarks[key].note : '',
        mode
      };
    }
    this.save();
    return true;
  },
  search(tabs, query) {
    const normalize = s => String(s).normalize('NFKC').toLocaleLowerCase();
    const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
    return tabs._tabs.filter(t => t.type !== 'library' && terms.every(term => normalize(`${this.remark(t).note}\n${this.originalName(t)}\n${t.title}`).includes(term)));
  },
  groupOf(tab) {
    const id = this.state.assignments[this.key(tab)];
    return this.state.groups.some(g => g.id === id) ? id : '';
  },
  assign(tab, group) {
    if (this.readOnly) return;
    const key = this.key(tab);
    if (!key || group && !this.state.groups.some(g => g.id === group)) return;
    if (group) this.state.assignments[key] = group;else delete this.state.assignments[key];
    if (this.state.closedGroups) delete this.state.closedGroups[key];
    if (this.state.groupDisplay[group]) this.state.remarks[key] = {
      ...this.remark(tab),
      mode: this.state.groupDisplay[group]
    };
    this.state.collapsed = (this.state.collapsed || []).filter(id => id !== group);
    for (const c of this.windows.values()) c.collapsed.delete(group);
    this.save();
    for (const [win, c] of this.windows) {
      var _c$root$querySelector;
      if (this.key(win.Zotero_Tabs._tabs.find(t => t.id === win.Zotero_Tabs.selectedID)) !== key) continue;
      (_c$root$querySelector = c.root.querySelector('.ztg-document.selected')) === null || _c$root$querySelector === void 0 || _c$root$querySelector.scrollIntoView({
        block: 'nearest',
        inline: 'nearest'
      });
    }
  },
  create(win) {
    if (this.readOnly) return null;
    const v = {
      value: ''
    };
    if (!Services.prompt.prompt(win, '新建文献分组', '分组名称：', v, null, {})) return null;
    const name = v.value.trim().slice(0, 60);
    if (!name) return null;
    const existing = this.state.groups.find(g => g.name === name);
    if (existing) return existing.id;
    const id = `g-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.state.groups.push({
      id,
      name,
      color: this.colors[this.state.groups.length % this.colors.length]
    });
    this.save();
    return id;
  },
  attach(win) {
    if (this.windows.has(win) || !win.Zotero_Tabs) return;
    const doc = win.document,
      tabs = win.Zotero_Tabs;
    const host = doc.getElementById('tab-bar-container');
    const inner = host === null || host === void 0 ? void 0 : host.querySelector('.tab-bar-inner-container');
    if (!inner) return;
    const h = (tag, text) => {
      const n = doc.createElementNS('http://www.w3.org/1999/xhtml', tag);
      if (text !== undefined) n.textContent = text;
      return n;
    };
    const root = h('div');
    root.id = 'ztg-inline';
    root.setAttribute('role', 'tablist');
    root.setAttribute('aria-label', '文献标签分组');
    const legacyActions = h('div');
    legacyActions.id = 'ztg-actions';
    const suggestions = this.xul(doc, 'toolbarbutton');
    suggestions.id = 'ztg-suggestions';
    suggestions.classList.add('zotero-tb-button');
    suggestions.setAttribute('aria-label', '建议关闭的文献');
    suggestions.setAttribute('tooltiptext', '建议关闭的文献');
    suggestions.setAttribute('tabindex', '0');
    suggestions.setAttribute('label', '建议关闭 (0)');
    const suggestionIcon = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="10" r="7" fill="#e5f3ff" stroke="#3977d5" stroke-width="1.6"/><path d="M10 5.6v4.6l3 1.9" fill="none" stroke="#3977d5" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>');
    suggestions.style.listStyleImage = `url("${suggestionIcon}")`;
    const searchButton = this.xul(doc, 'toolbarbutton');
    searchButton.id = 'ztg-search';
    searchButton.classList.add('zotero-tb-button');
    searchButton.setAttribute('label', '搜索文献');
    searchButton.setAttribute('aria-label', '搜索已打开文献的备注、文件名或标题');
    searchButton.setAttribute('tooltiptext', '搜索已打开文献：备注、文件名或标题');
    searchButton.setAttribute('tabindex', '0');
    const searchIcon = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><circle cx="8.2" cy="8.2" r="5.2" fill="#f1edff" stroke="#8262c9" stroke-width="1.7"/><path d="m12.2 12.2 4.2 4.2" stroke="#8262c9" stroke-width="2" stroke-linecap="round"/></svg>');
    searchButton.style.listStyleImage = `url("${searchIcon}")`;
    const searchPanel = this.xul(doc, 'panel');
    searchPanel.id = 'ztg-search-panel';
    searchPanel.setAttribute('orient', 'vertical');
    searchPanel.setAttribute('norolluponanchor', 'true');
    searchPanel.setAttribute('consumeoutsideclicks', 'false');
    const searchBox = h('div');
    searchBox.className = 'ztg-search-box';
    const searchInput = h('input');
    searchInput.type = 'search';
    searchInput.placeholder = '搜索备注、原文件名或文献标题…';
    searchInput.setAttribute('aria-label', '搜索已打开文献');
    const searchStatus = h('div');
    searchStatus.className = 'ztg-search-status';
    searchStatus.setAttribute('role', 'status');
    const searchResults = h('div');
    searchResults.className = 'ztg-search-results';
    searchBox.append(searchInput, searchStatus, searchResults);
    searchPanel.append(searchBox);
    doc.querySelector('popupset').append(searchPanel);
    root.addEventListener('wheel', e => {
      if (root.scrollWidth <= root.clientWidth) return;
      e.preventDefault();
      e.stopPropagation();
      root.scrollLeft += (e.deltaX || e.deltaY) * (e.deltaMode === 1 ? 20 : e.deltaMode === 2 ? root.clientWidth : 1);
    }, {
      passive: false
    });
    const style = h('style');
    style.textContent = `
      /* Bound the entire flex chain: min-width:auto on either ancestor lets
         the tab contents push Zotero's native toolbar outside the window. */
      #tab-bar-container[data-ztg-inline] { display:flex !important; min-width:0 !important; overflow:hidden; }
      #tab-bar-container[data-ztg-inline] > div { min-width:0 !important; width:0; flex:1 1 0% !important; }
      #tab-bar-container[data-ztg-inline] .tab-bar-inner-container { min-width:0 !important; width:100%; max-width:100%; box-sizing:border-box; }
      #tab-bar-container[data-ztg-inline] ~ #zotero-tabs-toolbar { flex:0 0 auto; -moz-box-flex:0; }
      /* Native CSS normally hides this library tab until its own strip overflows.
         Our strip replaces that layout, so keep the original library control
         visible independently of Zotero's scrollable class (including v10). */
      #tab-bar-container[data-ztg-inline] .pinned-tabs { display:flex !important; align-items:center; flex:0 0 auto !important; min-width:100px; max-width:180px; }
      #tab-bar-container[data-ztg-inline] .pinned-tabs .tabs { display:flex; position:static; overflow:visible; }
      #tab-bar-container[data-ztg-inline] .pinned-tabs .tab { flex:0 1 160px; min-width:100px; max-width:172px; }
      #ztg-actions { display:flex; align-items:center; flex:0 0 auto; -moz-window-dragging:no-drag; }
      #tab-bar-container[data-ztg-inline] .tabs-wrapper,
      #tab-bar-container[data-ztg-inline] .scroll-start-arrow,
      #tab-bar-container[data-ztg-inline] .scroll-end-arrow { display:none !important; }
      #ztg-inline { display:flex; align-items:center; flex:1 1 0%; width:0; min-width:0; height:38px; overflow-x:auto; overflow-y:hidden; scrollbar-width:thin; -moz-window-dragging:no-drag; font:12px system-ui; }
      #ztg-inline .ztg-section { display:flex; align-items:center; flex:none; height:32px; border-bottom:2px solid var(--ztg-color,transparent); }
      #ztg-inline > * + * { margin-inline-start:5px; }
      #ztg-inline .ztg-section > * + * { margin-inline-start:3px; }
      #ztg-inline .ztg-document > * + * { margin-inline-start:5px; }
      #ztg-search-panel .ztg-search-result + .ztg-search-result { margin-top:6px; }
      #ztg-search-panel .ztg-search-result .ztg-search-secondary { margin-top:5px; }
      #ztg-inline button { font:inherit; color:inherit; cursor:pointer; -moz-window-dragging:no-drag; }
      #ztg-inline .ztg-heading { position:relative; box-sizing:border-box; flex:none; max-width:320px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; border:0; border-radius:5px; padding:5px 8px; background:var(--ztg-color,#888); color:var(--ztg-ink,white); }
      #ztg-inline .ztg-ungrouped { border:1px dashed #ffffff88; }
      #ztg-inline .ztg-document.tab { display:flex; align-items:center; position:relative; box-sizing:border-box; flex:0 0 190px; width:190px; min-width:100px; max-width:190px; height:29px; padding:3px 5px 3px 8px; border:1px solid #8884; border-radius:5px 5px 0 0; background:transparent; cursor:default; }
      #ztg-inline .ztg-document.selected { background:var(--material-background,#8882); border-color:var(--ztg-color,#3977d5); box-shadow:inset 0 -2px var(--ztg-color,#3977d5); }
      #ztg-inline .ztg-title { flex:1; min-width:0; text-overflow:ellipsis; overflow:hidden; white-space:nowrap; }
      #ztg-inline .ztg-close { border:0; border-radius:3px; background:transparent; padding:1px 4px; font-size:16px; line-height:18px; }
      #ztg-inline .ztg-close:hover { background:#8883; }
      #ztg-inline .ztg-add { flex:none; border:1px solid #8885; border-radius:5px; background:transparent; padding:3px 8px; white-space:nowrap; }
      #ztg-suggestions, #ztg-search { -moz-window-dragging:no-drag; width:auto !important; min-width:104px; padding-inline:6px; }
      #ztg-suggestions .toolbarbutton-icon, #ztg-search .toolbarbutton-icon { width:20px; height:20px; flex:none; }
      #ztg-suggestions .toolbarbutton-text, #ztg-search .toolbarbutton-text { display:flex !important; visibility:visible !important; margin:0 3px; font:inherit; color:inherit; }
      #ztg-search-panel .ztg-search-box { display:block; width:520px; max-width:calc(100vw - 40px); padding:12px; box-sizing:border-box; font:13px/1.5 system-ui; color:var(--fill-primary,inherit); }
      .ztg-search-box input { box-sizing:border-box; width:100%; padding:8px 10px; border:1px solid #8886; border-radius:5px; color:inherit; background:var(--material-background,transparent); font:inherit; }
      .ztg-search-status { padding:8px 0; color:var(--fill-secondary,inherit); }
      #ztg-search-panel .ztg-search-results { display:flex; flex-direction:column; max-height:340px; overflow:auto; min-height:0; }
      #ztg-search-panel .ztg-search-result { all:unset; appearance:none; display:flex !important; flex-direction:column; flex:none !important; align-items:stretch; box-sizing:border-box; width:100%; height:auto !important; min-height:64px !important; max-height:none !important; padding:10px; margin:0; text-align:start; color:inherit; background:transparent; border:1px solid #8883; border-radius:6px; cursor:pointer; font:13px/1.5 system-ui; white-space:normal !important; overflow:visible; }
      #ztg-search-panel .ztg-search-result:hover, #ztg-search-panel .ztg-search-result:focus { background:#3977d51c; outline:1px solid #3977d5; outline-offset:-1px; }
      #ztg-search-panel .ztg-search-primary, #ztg-search-panel .ztg-search-secondary { position:static !important; display:block !important; flex:none; width:auto; height:auto !important; max-height:none !important; margin:0; white-space:normal !important; overflow-wrap:break-word; word-break:normal; line-height:1.5 !important; }
      #ztg-search-panel .ztg-search-primary { font-weight:600; }
      #ztg-search-panel .ztg-search-secondary { color:var(--fill-secondary,inherit); font-size:12px; }
      .ztg-color-option .menu-iconic-left { display:flex !important; visibility:visible !important; }
      .ztg-color-option .menu-iconic-icon { display:flex !important; visibility:visible !important; width:14px !important; height:14px !important; margin:1px; border-radius:3px; background-color:var(--ztg-swatch) !important; border:1px solid #8885; list-style-image:none !important; }
      #ztg-inline :focus { outline:none; }
      #ztg-inline :focus-visible { outline:2px solid var(--ztg-color,currentColor); outline-offset:-2px; }
      #ztg-inline :-moz-focusring { outline:2px solid var(--ztg-color,currentColor); outline-offset:-2px; }
      #ztg-inline [data-ztg-drop="join"] { outline:2px solid var(--ztg-color,#3977d5); outline-offset:-2px; box-shadow:inset 0 0 0 3px #ffffff88; }
      #ztg-inline [data-ztg-drop="before"], #ztg-inline [data-ztg-drop="group-before"] { border-left:4px solid #267dff; }
      #ztg-inline [data-ztg-drop="after"], #ztg-inline [data-ztg-drop="group-after"] { border-right:4px solid #267dff; }
      #ztg-group-panel .ztg-group-list { box-sizing:border-box;display:block;width:440px;max-width:calc(100vw - 32px);max-height:420px;max-height:min(420px,calc(100vh - 140px));overflow:auto;padding:6px;font:12px system-ui;color:var(--fill-primary,inherit); }
      #ztg-group-panel .ztg-document.tab { box-sizing:border-box;position:relative;display:flex;align-items:center;width:100%;min-width:0;max-width:none;height:34px;flex:none;padding:4px 8px;margin:2px 0;border:1px solid #8884;border-radius:4px;background:transparent;cursor:default; }
      #ztg-group-panel .ztg-document:hover, #ztg-group-panel .ztg-document.selected:hover { background:var(--ztg-hover); }
      #ztg-group-panel .ztg-document.selected { border-color:var(--ztg-color);box-shadow:inset 0 -2px var(--ztg-color);background:var(--material-background,#8882); }
      #ztg-group-panel .ztg-title { flex:1;min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis; }
      #ztg-group-panel .ztg-close { flex:none;margin-inline-start:8px;border:0;border-radius:3px;background:transparent;color:inherit;padding:1px 4px;font-size:16px;line-height:18px; }
      #ztg-group-panel .ztg-close:hover { background:#8883; }
      #ztg-group-panel :focus { outline:none; }
      #ztg-group-panel :focus-visible { outline:2px solid var(--ztg-color,currentColor);outline-offset:-2px; }
      #ztg-group-panel :-moz-focusring { outline:2px solid var(--ztg-color,currentColor);outline-offset:-2px; }
      #ztg-inline .ztg-document[data-pointer-focus], #ztg-group-panel .ztg-document[data-pointer-focus] { outline:none !important; }
      #ztg-inline .ztg-document[data-keyboard-focus], #ztg-group-panel .ztg-document[data-keyboard-focus] { outline:2px solid var(--ztg-color,currentColor);outline-offset:-2px; }
      #ztg-group-panel [data-ztg-drop="join"] { outline:2px solid var(--ztg-color);outline-offset:-2px; }
      #ztg-group-panel [data-ztg-drop="before"] { border-top:3px solid var(--ztg-color); }
      #ztg-group-panel [data-ztg-drop="after"] { border-bottom:3px solid var(--ztg-color); }
      .ztg-drop-hint { position:fixed; pointer-events:none; z-index:2147483647; max-width:400px; font:12px system-ui; color:white; background:#20252e; border:1px solid #ffffff66; border-radius:5px; padding:5px 9px; }
    `;
    doc.documentElement.append(style);
    const hint = h('div');
    hint.className = 'ztg-drop-hint';
    hint.hidden = true;
    hint.setAttribute('role', 'status');
    doc.documentElement.append(hint);
    const groupPanel = this.xul(doc, 'panel');
    groupPanel.id = 'ztg-group-panel';
    groupPanel.setAttribute('noautofocus', 'true');
    groupPanel.setAttribute('animate', 'false');
    const groupList = h('div');
    groupList.className = 'ztg-group-list';
    groupList.setAttribute('role', 'tablist');
    groupList.setAttribute('aria-orientation', 'vertical');
    const groupEntries = h('div');
    groupList.append(groupEntries);
    groupPanel.append(groupList);
    doc.documentElement.append(groupPanel);
    const popups = new Set();
    const c = {
      groupPanel,
      groupList,
      groupListID: null,
      pendingGroup: null,
      root,
      collapsed: new Set(this.state.collapsed || []),
      lastSelected: tabs.selectedID,
      timer: null,
      disposed: false,
      seenTabs: new Map(),
      initializedTabs: false,
      dragged: null,
      draggedGroup: null,
      pendingMenu: null,
      signature: '',
      hoverTimer: null,
      hoverTarget: null,
      activitySelectedID: null,
      isDragging: () => c.dragged !== null || c.draggedGroup !== null,
      cancelHover: () => {
        if (c.hoverTimer !== null) win.clearTimeout(c.hoverTimer);
        c.hoverTimer = null;
        c.hoverTarget = null;
      },
      clearDrop: () => {
        root.querySelectorAll('[data-ztg-drop]').forEach(n => n.removeAttribute('data-ztg-drop'));
        groupList.querySelectorAll('[data-ztg-drop]').forEach(n => n.removeAttribute('data-ztg-drop'));
        hint.hidden = true;
      },
      finishDrag: () => {
        c.cancelHover();
        c.clearDrop();
        c.dragged = null;
        c.draggedGroup = null;
        c.collapsed = new Set(this.state.collapsed || []);
        c.signature = '';
        c.refresh();
      },
      springOpen: group => {
        // Append only to the target section. Rebuilding the bar here would remove
        // the source DOM node and abort a real native drag.
        const section = [...root.querySelectorAll('.ztg-section')].find(n => n.dataset.group === group);
        if (!section || !c.dragged) return;
        if (c.isVertical(group)) {
          c.openGroupList(group, true, true);
          return;
        }
        if (!c.collapsed.has(group)) return;
        c.collapsed.delete(group);
        const heading = section.querySelector('.ztg-heading');
        heading.setAttribute('aria-expanded', 'true');
        heading.textContent = heading.textContent.replace(/^▸/, '▾');
        for (const tab of tabs._tabs.filter(t => t.type !== 'library' && this.groupOf(t) === group)) section.append(c.document(tab, group));
      },
      mount: () => {
        const current = host.querySelector('.tab-bar-inner-container');
        if (current && root.parentElement !== current) current.insertBefore(root, current.querySelector('.tabs-wrapper'));
        host.setAttribute('data-ztg-inline', 'true');
        const nativeToolbar = doc.getElementById('zotero-tabs-toolbar');
        if (!nativeToolbar && current && legacyActions.parentElement !== current) current.append(legacyActions);
        const toolbar = nativeToolbar || legacyActions;
        if (suggestions.parentElement !== toolbar || toolbar.lastElementChild !== suggestions) toolbar.append(suggestions);
        if (searchButton.parentElement !== toolbar || searchButton.nextElementSibling !== suggestions) toolbar.insertBefore(searchButton, suggestions);
      },
      schedule: () => {
        if (c.disposed || c.timer !== null) return;
        c.timer = win.setTimeout(() => {
          c.timer = null;
          c.refresh();
        }, 0);
      },
      toggle: id => {
        if (c.isVertical(id)) {
          c.openGroupList(id);
          return;
        }
        groupPanel.hidePopup();
        this.setCollapsed(id, !c.collapsed.has(id));
      },
      isVertical: id => {
        if (!this.getSettings) return false;
        const settings = this.getSettings();
        return this.state.groups.length > settings.groupCountThreshold || tabs._tabs.filter(t => t.type !== 'library' && this.groupOf(t) === id).length > settings.verticalThreshold;
      },
      renderGroupList: () => {
        const group = this.orderedGroups().find(g => g.id === c.groupListID);
        if (!group || !c.isVertical(group.id)) {
          groupPanel.hidePopup();
          return;
        }
        const scroll = groupList.scrollTop;
        const members = tabs._tabs.filter(t => t.type !== 'library' && this.groupOf(t) === group.id);
        const availableWidth = Math.max(240, win.innerWidth - 32),
          availableHeight = Math.max(100, Math.min(420, win.innerHeight - 140));
        const rowLimit = Math.max(1, Math.floor((availableHeight - 12) / 38));
        const columns = Math.min(3, Math.max(1, Math.floor(availableWidth / 280)), Math.max(1, Math.ceil(members.length / rowLimit)));
        const rows = Math.ceil(members.length / columns);
        const signature = JSON.stringify([group.id, group.name, group.color, columns, availableWidth, availableHeight, members.map(t => [t.id, this.label(t), this.originalName(t), t.title, this.remark(t)])]);
        if (signature === c.groupListSignature) return;
        c.groupListSignature = signature;
        if (c.groupListRenderedID !== group.id) {
          this.clear(groupEntries);
          c.groupListRenderedID = group.id;
        }
        const existing = new Map([...groupEntries.children].map(row => [row.dataset.id, row]));
        groupList.style.setProperty('--ztg-color', group.color);
        groupList.setAttribute('aria-label', group.name);
        const rgb = group.color.slice(1).match(/../g).map(value => parseInt(value, 16));
        groupList.style.setProperty('--ztg-hover', `rgba(${rgb.join(',')},0.14)`);
        groupList.dataset.columns = String(columns);
        groupList.dataset.rows = String(rows);
        groupEntries.style.display = columns > 1 ? 'grid' : 'block';
        groupEntries.style.gridAutoFlow = 'column';
        groupEntries.style.gridTemplateRows = columns > 1 ? `repeat(${rows},38px)` : '';
        groupEntries.style.gridTemplateColumns = columns > 1 ? `repeat(${columns},minmax(0,1fr))` : '';
        groupEntries.style.columnGap = columns > 1 ? '8px' : '0';
        groupList.style.width = Math.min(availableWidth, columns > 1 ? columns * 320 : 440) + 'px';
        groupList.style.maxHeight = availableHeight + 'px';
        groupList.style.minHeight = '0';
        groupList.style.height = Math.min(availableHeight, rows * 38 + 12) + 'px';
        members.forEach((tab, index) => {
          const row = existing.get(tab.id) || c.document(tab, group.id, index + 1);
          existing.delete(tab.id);
          const note = this.remark(tab).note,
            label = this.label(tab);
          row.querySelector('.ztg-title').textContent = label;
          row.querySelector('.ztg-index').textContent = String(index + 1);
          row.title = `原文件名：${this.originalName(tab)}${note ? '\n备注：' + note : ''}\n原标题：${this.plainTitle(String(tab.title || '无标题'))}`;
          row.querySelector('.ztg-close').setAttribute('aria-label', `关闭 ${label}`);
          row.classList.toggle('selected', tabs.selectedID === tab.id);
          row.setAttribute('aria-selected', String(tabs.selectedID === tab.id));
          if (groupEntries.children[index] !== row) groupEntries.insertBefore(row, groupEntries.children[index] || null);
        });
        for (const row of existing.values()) row.remove();
        groupList.scrollTop = scroll;
      },
      openGroupList: (id, force = false, temporary = false) => {
        var _groupList$querySelec2;
        if (!c.isVertical(id)) return;
        if (groupPanel.state === 'hiding') {
          c.pendingGroup = {
            id,
            force,
            temporary
          };
          return;
        }
        if (!force && c.groupListID === id && (groupPanel.state === 'open' || groupPanel.state === 'showing')) {
          groupPanel.hidePopup();
          return;
        }
        if (force && c.groupListID === id && (groupPanel.state === 'open' || groupPanel.state === 'showing')) {
          var _groupList$querySelec;
          (_groupList$querySelec = groupList.querySelector('.selected')) === null || _groupList$querySelec === void 0 || _groupList$querySelec.scrollIntoView({
            block: 'nearest'
          });
          return;
        }
        if (c.groupListID !== id && (groupPanel.state === 'open' || groupPanel.state === 'showing')) {
          c.pendingGroup = {
            id,
            force,
            temporary
          };
          groupPanel.hidePopup();
          return;
        }
        c.groupListID = id;
        if (temporary) c.collapsed.delete(id);else this.setCollapsed(id, false);
        c.renderGroupList();
        const heading = [...root.querySelectorAll('.ztg-heading')].find(n => n.dataset.group === id);
        if (!heading) return;
        heading.scrollIntoView({
          block: 'nearest',
          inline: 'nearest'
        });
        heading.setAttribute('aria-expanded', 'true');
        heading.textContent = heading.textContent.replace(/^▸/, '▾');
        if (groupPanel.state !== 'open' && groupPanel.state !== 'showing') groupPanel.openPopup(heading, 'after_start', 0, 0, false, false);
        (_groupList$querySelec2 = groupList.querySelector('.selected')) === null || _groupList$querySelec2 === void 0 || _groupList$querySelec2.scrollIntoView({
          block: 'nearest'
        });
      },
      reveal: id => {
        var _root$querySelector;
        const tab = tabs._tabs.find(t => t.id === id);
        if (!tab) return;
        this.setCollapsed(this.groupOf(tab), false);
        c.lastSelected = id;
        tabs.select(id);
        c.refresh();
        (_root$querySelector = root.querySelector('.ztg-document.selected')) === null || _root$querySelector === void 0 || _root$querySelector.scrollIntoView({
          block: 'nearest',
          inline: 'nearest'
        });
      },
      item: (popup, label, action, attrs = {}) => {
        const n = this.xul(doc, 'menuitem');
        n.setAttribute('label', label);
        for (const [key, value] of Object.entries(attrs)) n.setAttribute(key, String(value));
        n.addEventListener('command', () => {
          if (!c.disposed) action();
        });
        popup.append(n);
        return n;
      },
      renderSearch: () => {
        const focused = searchResults.contains(doc.activeElement) ? doc.activeElement.dataset.id : null;
        const matches = this.search(tabs, searchInput.value);
        this.clear(searchResults);
        searchStatus.textContent = `找到 ${matches.length} 篇已打开文献`;
        for (const tab of matches) {
          const r = this.remark(tab),
            original = this.originalName(tab);
          const group = this.orderedGroups().find(g => g.id === this.groupOf(tab));
          const row = h('button');
          row.className = 'ztg-search-result';
          row.type = 'button';
          row.dataset.id = tab.id;
          row.append(h('span', r.note || original), h('span', `${r.note ? original + ' · ' : ''}${(group === null || group === void 0 ? void 0 : group.name) || '未分组'}`));
          row.children[0].className = 'ztg-search-primary';
          row.children[1].className = 'ztg-search-secondary';
          row.title = `${r.note ? '备注：' + r.note + '\n' : ''}原文件名：${original}\n原标题：${this.plainTitle(String(tab.title))}`;
          row.onclick = () => {
            if (tabs._tabs.some(t => t.id === tab.id)) c.reveal(tab.id);
            searchPanel.hidePopup();
          };
          searchResults.append(row);
          if (focused === tab.id) row.focus({
            preventScroll: true
          });
        }
        if (!matches.length) searchResults.append(h('p', '没有匹配的已打开文献。'));
      },
      openSearch: () => {
        if (['open', 'showing', 'hiding'].includes(searchPanel.state)) {
          searchPanel.hidePopup();
          return;
        }
        if (c.suggestionsPopup) c.suggestionsPopup.hidePopup();
        groupPanel.hidePopup();
        c.renderSearch();
        searchPanel.openPopup(searchButton, 'after_end');
      },
      popup: (event, build, anchor) => {
        const popup = this.xul(doc, 'menupopup');
        doc.querySelector('popupset').append(popup);
        popups.add(popup);
        popup.addEventListener('popuphidden', e => {
          if (e.target === popup) {
            popups.delete(popup);
            popup.remove();
          }
        });
        build(popup);
        if (anchor) {
          popup.setAttribute('norolluponanchor', 'true');
          popup.setAttribute('consumeoutsideclicks', 'false');
          popup.openPopup(anchor, 'after_end');
        } else popup.openPopupAtScreen(event.screenX, event.screenY, true);
        return popup;
      },
      groupMenu: (event, g) => c.popup(event, popup => {
        if (g.id) c.item(popup, '重命名此分组', () => {
          const v = {
            value: g.name
          };
          if (Services.prompt.prompt(win, '重命名分组', '分组名称：', v, null, {}) && v.value.trim()) {
            g.name = v.value.trim().slice(0, 60);
            this.save();
          }
        }, {
          disabled: !!this.readOnly
        });
        if (g.id) c.item(popup, '解散该分组', () => {
          if (!Services.prompt.confirm(win, '解散分组', `解散“${g.name}”？文献会回到未分组，标签页保持打开。`)) return;
          this.dissolveGroup(g.id);
        }, {
          disabled: !!this.readOnly
        });
        const colors = this.xul(doc, 'menu');
        colors.setAttribute('label', '分组颜色');
        const palette = this.xul(doc, 'menupopup');
        colors.append(palette);
        popup.append(colors);
        for (const [name, color] of [['红色', '#c74646'], ['橙色', '#dc8225'], ['黄色', '#f5d547'], ['绿色', '#21866a'], ['青色', '#298c9b'], ['蓝色', '#3977d5'], ['紫色', '#8b5ac7'], ['粉色', '#d064a3'], ['灰色', '#737373']]) {
          const item = c.item(palette, name, () => this.setColor(g.id, color), {
            disabled: !!this.readOnly
          });
          // Native checkbox menuitems replace the image slot with a checkmark.
          // Keep every swatch visible, and indicate selection in the right column.
          item.setAttribute('class', 'menuitem-iconic ztg-color-option');
          item.style.setProperty('--ztg-swatch', color);
          item.setAttribute('acceltext', g.color.toLowerCase() === color ? '✓' : '');
          item.setAttribute('tooltiptext', `${name} ${color}`);
        }
        c.item(palette, '自定义颜色…', () => this.customColor(win, g), {
          disabled: !!this.readOnly
        });
        const display = this.xul(doc, 'menu');
        display.setAttribute('label', '组内标签显示');
        const displayOptions = this.xul(doc, 'menupopup');
        display.append(displayOptions);
        popup.append(display);
        const groupTabs = tabs._tabs.filter(t => t.type !== 'library' && this.groupOf(t) === g.id);
        for (const [value, label] of [['original', '原文件名'], ['note', '备注'], ['both', '原文件名 + 备注']]) c.item(displayOptions, label, () => this.setGroupDisplay(g.id, value), {
          type: 'radio',
          name: 'ztg-group-display',
          checked: groupTabs.length ? groupTabs.every(t => this.remark(t).mode === value) : (this.state.groupDisplay[g.id] || 'original') === value,
          disabled: !!this.readOnly
        });
        const count = tabs._tabs.filter(t => t.type !== 'library' && this.groupOf(t) === g.id).length;
        const autoDissolve = !!g.id && this.getSettings && this.getSettings().dissolveOnGroupClose;
        c.item(popup, '关闭分组下所有文献', () => {
          this.closeGroup(win, g.id);
          c.schedule();
        }, {
          disabled: count === 0,
          tooltiptext: `关闭 ${count} 个阅读标签${autoDissolve ? '，关闭后自动解散空分组' : '，保留分组'}`
        });
      }),
      openSuggestions: event => {
        if (c.suggestionsPopup && ['open', 'showing', 'hiding'].includes(c.suggestionsPopup.state)) {
          c.suggestionsPopup.hidePopup();
          return;
        }
        searchPanel.hidePopup();
        groupPanel.hidePopup();
        c.suggestionsPopup = c.popup(event, popup => {
          popup.id = 'ztg-suggestions-popup';
          popup.addEventListener('popuphidden', e => {
            if (e.target === popup && c.suggestionsPopup === popup) c.suggestionsPopup = null;
          });
          const candidates = this.suggestions(tabs);
          c.item(popup, `${this.state.suggestDays} 天未查看的文献 (${candidates.length})`, () => {}, {
            disabled: true
          });
          if (!candidates.length) c.item(popup, '暂时没有建议关闭的文献', () => {}, {
            disabled: true
          });
          for (const candidate of candidates) {
            const title = this.plainTitle(String(candidate.tab.title || '无标题'));
            const menu = this.xul(doc, 'menu');
            const age = candidate.uncertain ? `启用后至少 ${candidate.days} 天未查看` : `${candidate.days} 天未查看`;
            menu.setAttribute('label', `${String(title).slice(0, 65)} · ${age}`);
            menu.setAttribute('tooltiptext', `${title} · ${age}`);
            const actions = this.xul(doc, 'menupopup');
            menu.append(actions);
            popup.append(menu);
            c.item(actions, '查看文献', () => c.reveal(candidate.tab.id));
            c.item(actions, '关闭此文献标签页', () => {
              if (tabs._tabs.some(t => t.id === candidate.tab.id)) tabs.close(candidate.tab.id);
              c.schedule();
            });
          }
          popup.append(this.xul(doc, 'menuseparator'));
          c.item(popup, '关闭以上建议的全部标签页', () => {
            const eligible = new Set(this.suggestions(tabs).map(x => x.tab.id));
            const ids = candidates.map(x => x.tab.id).filter(id => eligible.has(id));
            if (ids.length) tabs.close(ids);
            c.schedule();
          }, {
            disabled: !candidates.length
          });
        }, suggestions);
      },
      fillAssignments: (popup, tab) => {
        for (const g of this.orderedGroups().filter(g => g.id)) c.item(popup, g.name, () => this.assign(tab, g.id), {
          type: 'checkbox',
          checked: this.groupOf(tab) === g.id,
          disabled: !!this.readOnly
        });
        c.item(popup, '新建分组并加入…', () => {
          const id = this.create(win);
          if (id) this.assign(tab, id);
        }, {
          disabled: !!this.readOnly
        });
        c.item(popup, '移出分组', () => this.assign(tab, ''), {
          disabled: !this.groupOf(tab) || !!this.readOnly
        });
      },
      openTabMenu: (event, id) => {
        event.preventDefault();
        event.stopPropagation();
        c.pendingMenu = id;
        // Use Zotero's native menu and append grouping actions during popupshowing.
        win.setTimeout(() => {
          if (!c.disposed && tabs._tabs.some(t => t.id === id)) tabs._openMenu(event.screenX, event.screenY, id);else c.pendingMenu = null;
        }, 0);
      },
      plan: (event, node, group, tabID) => {
        var _this$orderedGroups$f2;
        if (c.draggedGroup !== null) {
          var _node$closest, _this$orderedGroups$f;
          const heading = ((_node$closest = node.closest('.ztg-section')) === null || _node$closest === void 0 ? void 0 : _node$closest.querySelector('.ztg-heading')) || [...root.querySelectorAll('.ztg-heading')].find(n => n.dataset.group === group);
          const r = heading.getBoundingClientRect();
          const after = Number.isFinite(event.clientX) && event.clientX > r.left + r.width / 2;
          return {
            group,
            after,
            mode: after ? 'group-after' : 'group-before',
            marker: heading,
            label: `移动分组到“${(_this$orderedGroups$f = this.orderedGroups().find(g => g.id === group)) === null || _this$orderedGroups$f === void 0 ? void 0 : _this$orderedGroups$f.name}”${after ? '之后' : '之前'}`
          };
        }
        const r = node.getBoundingClientRect();
        const vertical = !!node.closest('.ztg-group-list');
        const coordinate = vertical ? event.clientY : event.clientX;
        const ratio = Number.isFinite(coordinate) ? (coordinate - (vertical ? r.top : r.left)) / (vertical ? r.height : r.width) : 0.5;
        const mode = tabID && ratio < 0.25 ? 'before' : tabID && ratio > 0.75 ? 'after' : 'join';
        const tab = tabs._tabs.find(t => t.id === tabID);
        return {
          group,
          tabID,
          mode,
          marker: node,
          label: mode === 'join' ? `加入“${(_this$orderedGroups$f2 = this.orderedGroups().find(g => g.id === group)) === null || _this$orderedGroups$f2 === void 0 ? void 0 : _this$orderedGroups$f2.name}”` : `排在“${String((tab === null || tab === void 0 ? void 0 : tab.title) || '').slice(0, 40)}”${mode === 'before' ? '之前' : '之后'}`
        };
      },
      drop: (event, group, tabID, node) => {
        event.preventDefault();
        event.stopPropagation();
        if (!c.isDragging() || this.readOnly) return;
        const plan = c.plan(event, node, group, tabID);
        if (c.draggedGroup !== null) {
          const id = c.draggedGroup;
          c.finishDrag();
          this.moveGroup(id, group, plan.after);
          return;
        }
        const id = c.dragged;
        const tab = tabs._tabs.find(t => t.id === id);
        c.finishDrag();
        if (!tab || !this.key(tab) || this.readOnly) return;
        this.assign(tab, group);
        if (plan.mode !== 'join' && tabID !== id) {
          const index = tabs._tabs.findIndex(t => t.id === tabID);
          if (index > 0) tabs.move(id, index + (plan.mode === 'after' ? 1 : 0));
        }
        c.refresh();
      },
      target: (node, group, tabID) => {
        node.addEventListener('dragover', e => {
          if (!c.isDragging() || this.readOnly) return;
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = 'move';
          const plan = c.plan(e, node, group, tabID);
          c.clearDrop();
          plan.marker.setAttribute('data-ztg-drop', plan.mode);
          hint.textContent = plan.label;
          hint.hidden = false;
          const bounds = node.getBoundingClientRect();
          hint.style.left = Math.max(0, Math.min(bounds.left, win.innerWidth - 410)) + 'px';
          hint.style.top = bounds.bottom + 5 + 'px';
          if (c.hoverTarget !== node) {
            c.cancelHover();
            c.hoverTarget = node;
            if (c.dragged && (c.collapsed.has(group) || c.isVertical(group))) c.hoverTimer = win.setTimeout(() => {
              c.hoverTimer = null;
              if (!c.disposed && c.hoverTarget === node && c.dragged) c.springOpen(group);
            }, 600);
          }
          const list = node.closest('.ztg-group-list');
          const rect = (list || root).getBoundingClientRect();
          if (list) {
            if (e.clientY > rect.bottom - 35) list.scrollTop += 18;
            if (e.clientY < rect.top + 35) list.scrollTop -= 18;
          } else {
            if (e.clientX > rect.right - 35) root.scrollLeft += 18;
            if (e.clientX < rect.left + 35) root.scrollLeft -= 18;
          }
        });
        node.addEventListener('dragleave', e => {
          if (node.contains(e.relatedTarget)) return;
          c.clearDrop();
          if (c.hoverTarget === node) c.cancelHover();
        });
        node.addEventListener('drop', e => c.drop(e, group, tabID, node));
      },
      document: (tab, group, number) => {
        const n = h('div');
        n.className = 'tab ztg-document' + (tabs.selectedID === tab.id ? ' selected' : '');
        n.dataset.id = tab.id;
        n.draggable = !this.readOnly;
        n.tabIndex = 0;
        n.setAttribute('role', 'tab');
        n.setAttribute('aria-selected', String(tabs.selectedID === tab.id));
        const remark = this.remark(tab);
        n.title = `原文件名：${this.originalName(tab)}${remark.note ? '\n备注：' + remark.note : ''}\n原标题：${this.plainTitle(String(tab.title || '无标题'))}`;
        const title = h('span', this.label(tab));
        title.className = 'ztg-title';
        const close = h('button', '×');
        close.className = 'ztg-close';
        close.title = '关闭文献';
        close.setAttribute('aria-label', `关闭 ${title.textContent}`);
        close.onmousedown = e => e.stopPropagation();
        close.onclick = e => {
          e.stopPropagation();
          tabs.close(tab.id);
          c.schedule();
        };
        if (number !== undefined) {
          const index = h('span', String(number));
          index.className = 'ztg-index';
          index.setAttribute('aria-hidden', 'true');
          index.style.cssText = 'flex:0 0 26px;text-align:right;margin-inline-end:10px;opacity:.65;font-variant-numeric:tabular-nums;';
          n.append(index);
        }
        n.append(title, close);
        n.onmousedown = e => {
          if (e.button === 0 && !e.target.closest('button')) {
            n.removeAttribute('data-keyboard-focus');
            n.setAttribute('data-pointer-focus', 'true');
            e.stopPropagation();
            c.reveal(tab.id);
          }
        };
        n.onblur = () => {
          n.removeAttribute('data-pointer-focus');
          n.removeAttribute('data-keyboard-focus');
        };
        n.onauxclick = e => {
          if (e.button === 1) {
            e.preventDefault();
            tabs.close(tab.id);
            c.schedule();
          }
        };
        n.onclick = e => {
          if (n.closest('.ztg-group-list') && !e.target.closest('button')) groupPanel.hidePopup();
        };
        n.oncontextmenu = e => c.openTabMenu(e, tab.id);
        n.onkeydown = e => {
          n.removeAttribute('data-pointer-focus');
          n.setAttribute('data-keyboard-focus', 'true');
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            c.reveal(tab.id);
            if (n.closest('.ztg-group-list')) groupPanel.hidePopup();
          }
          if (e.key === 'ContextMenu' || e.key === 'F10' && e.shiftKey) {
            const r = n.getBoundingClientRect();
            c.openTabMenu({
              preventDefault() {},
              stopPropagation() {},
              screenX: win.mozInnerScreenX + r.left,
              screenY: win.mozInnerScreenY + r.bottom
            }, tab.id);
            e.preventDefault();
          }
        };
        n.ondragstart = e => {
          e.stopPropagation();
          c.dragged = tab.id;
          c.draggedGroup = null;
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('zotero/tab', tab.id);
        };
        n.ondragend = () => {
          if (c.isDragging()) c.finishDrag();
        };
        c.target(n, group, tab.id);
        return n;
      },
      refresh: () => {
        var _root$querySelector2, _root$querySelector3;
        if (c.disposed) return;
        c.mount();
        if (this.syncTabs) this.syncTabs(win, c);
        c.activitySelectedID = this.track(tabs, c.activitySelectedID);
        const selectedChanged = c.lastSelected !== tabs.selectedID;
        if (selectedChanged) {
          c.lastSelected = tabs.selectedID;
          const selected = tabs._tabs.find(t => t.id === tabs.selectedID);
          if (selected && selected.type !== 'library') this.setCollapsed(this.groupOf(selected), false);
        }
        const documents = tabs._tabs.filter(t => t.type !== 'library');
        // Selection must not recreate the pressed DOM node: doing so aborts a real
        // mouse drag before dragstart, even though synthetic drag tests still pass.
        for (const n of [...root.querySelectorAll('.ztg-document'), ...groupList.querySelectorAll('.ztg-document')]) {
          const selected = n.dataset.id === tabs.selectedID;
          n.classList.toggle('selected', selected);
          n.setAttribute('aria-selected', String(selected));
        }
        const suggested = this.suggestions(tabs).length;
        const options = this.getSettings ? this.getSettings() : {
          showGroupCounts: true,
          showSuggestions: true,
          verticalThreshold: Infinity
        };
        suggestions.hidden = !options.showSuggestions;
        const activeVertical = documents.find(t => t.id === tabs.selectedID && c.isVertical(this.groupOf(t)));
        const signature = JSON.stringify([activeVertical === null || activeVertical === void 0 ? void 0 : activeVertical.id, documents.map(t => [t.id, t.title, this.originalName(t), this.remark(t), this.groupOf(t)]), this.state.groups, this.state.ungroupedColor, this.state.order, [...c.collapsed], options]);
        if (searchPanel.state === 'open') c.renderSearch();
        suggestions.setAttribute('tooltiptext', `建议关闭 (${suggested})：${this.state.suggestDays} 天未查看的文献`);
        this.setLabel(suggestions, `建议关闭 (${suggested})`);
        suggestions.setAttribute('aria-label', `建议关闭的文献，${suggested} 篇`);
        if (selectedChanged) (_root$querySelector2 = root.querySelector('.ztg-document.selected')) === null || _root$querySelector2 === void 0 || _root$querySelector2.scrollIntoView({
          block: 'nearest',
          inline: 'nearest'
        });
        if (c.isDragging()) return;
        if (signature === c.signature) {
          if (groupPanel.state === 'open') c.renderGroupList();
          return;
        }
        c.signature = signature;
        const focused = root.contains(doc.activeElement) ? {
          id: doc.activeElement.dataset.id,
          group: doc.activeElement.dataset.group
        } : null;
        const scroll = root.scrollLeft;
        this.clear(root);
        for (const g of this.orderedGroups()) {
          const members = documents.filter(t => this.groupOf(t) === g.id);
          const section = h('div');
          section.className = 'ztg-section';
          section.dataset.group = g.id;
          if (g.color) {
            section.style.setProperty('--ztg-color', g.color);
            section.style.setProperty('--ztg-ink', this.ink(g.color));
          }
          const heading = h('button', `${c.collapsed.has(g.id) ? '▸ ' : '▾ '}${g.name}${options.showGroupCounts ? ` (${members.length})` : ''}`);
          heading.className = 'ztg-heading' + (!g.id ? ' ztg-ungrouped' : '');
          heading.dataset.group = g.id;
          heading.style.width = this.headingWidth(g) + 'px';
          heading.title = g.id ? `${g.name}：点击折叠/展开，拖入文献加入，右键管理和设置颜色` : '未分组：点击折叠/展开，把文献拖到这里移出分组';
          const vertical = c.isVertical(g.id);
          const expanded = vertical ? c.groupListID === g.id && (groupPanel.state === 'open' || groupPanel.state === 'showing') : !c.collapsed.has(g.id);
          if (vertical) {
            heading.textContent = heading.textContent.replace(/^[▸▾]/, expanded ? '▾' : '▸');
            heading.setAttribute('aria-haspopup', 'true');
          }
          heading.setAttribute('aria-expanded', String(expanded));
          heading.onclick = () => c.toggle(g.id);
          heading.oncontextmenu = e => {
            e.preventDefault();
            e.stopPropagation();
            c.groupMenu(e, g);
          };
          heading.draggable = !this.readOnly;
          heading.ondragstart = e => {
            e.stopPropagation();
            c.draggedGroup = g.id;
            c.dragged = null;
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('application/x-ztg-group', g.id || '__ungrouped__');
          };
          heading.ondragend = () => {
            if (c.isDragging()) c.finishDrag();
          };
          c.target(heading, g.id);
          section.append(heading);
          if (!vertical && !c.collapsed.has(g.id)) for (const tab of members) section.append(c.document(tab, g.id));
          if (vertical && activeVertical && this.groupOf(activeVertical) === g.id) section.append(c.document(activeVertical, g.id));
          root.append(section);
        }
        const add = h('button', '＋');
        add.className = 'ztg-add';
        add.title = '新建分组（也可将文献拖到这里）';
        add.setAttribute('aria-label', '新建分组');
        add.disabled = !!this.readOnly;
        add.onclick = () => this.create(win);
        add.ondragover = e => {
          if (c.isDragging()) {
            e.preventDefault();
            e.stopPropagation();
          }
        };
        add.ondrop = e => {
          e.preventDefault();
          e.stopPropagation();
          if (c.draggedGroup !== null) {
            const id = c.draggedGroup;
            c.finishDrag();
            const last = this.orderedGroups().slice(-1)[0];
            this.moveGroup(id, last.id, true);
            return;
          }
          const tab = tabs._tabs.find(t => t.id === c.dragged);
          c.finishDrag();
          if (tab) {
            const id = this.create(win);
            if (id) this.assign(tab, id);
          }
        };
        root.append(add);
        root.scrollLeft = scroll;
        if (focused) {
          const target = [...root.querySelectorAll('[tabindex],.ztg-heading')].find(n => focused.id ? n.dataset.id === focused.id : n.dataset.group === focused.group);
          target === null || target === void 0 || target.focus({
            preventScroll: true
          });
        }
        if (selectedChanged) (_root$querySelector3 = root.querySelector('.ztg-document.selected')) === null || _root$querySelector3 === void 0 || _root$querySelector3.scrollIntoView({
          block: 'nearest',
          inline: 'nearest'
        });
        if (groupPanel.state === 'open') c.renderGroupList();
      }
    };
    suggestions.addEventListener('command', () => {
      const r = suggestions.getBoundingClientRect();
      c.openSuggestions({
        screenX: win.mozInnerScreenX + r.right,
        screenY: win.mozInnerScreenY + r.bottom
      });
    });
    groupPanel.addEventListener('popuphidden', event => {
      if (event.target !== groupPanel) return;
      const heading = [...root.querySelectorAll('.ztg-heading')].find(n => n.dataset.group === c.groupListID);
      if (heading && c.isVertical(c.groupListID)) {
        heading.setAttribute('aria-expanded', 'false');
        heading.textContent = heading.textContent.replace(/^▾/, '▸');
      }
      const pending = c.pendingGroup;
      c.pendingGroup = null;
      if (pending && !c.disposed) win.setTimeout(() => {
        if (!c.disposed) c.openGroupList(pending.id, pending.force, pending.temporary);
      }, 0);
    });
    groupList.addEventListener('keydown', event => {
      var _rows$next;
      if (event.key === 'Escape') {
        groupPanel.hidePopup();
        return;
      }
      if (!['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      const rows = [...groupList.querySelectorAll('.ztg-document')],
        index = rows.indexOf(doc.activeElement);
      const step = event.key === 'ArrowRight' ? Number(groupList.dataset.rows) : event.key === 'ArrowLeft' ? -Number(groupList.dataset.rows) : event.key === 'ArrowDown' ? 1 : -1;
      const next = Math.max(0, Math.min(rows.length - 1, index + step));
      event.preventDefault();
      (_rows$next = rows[next]) === null || _rows$next === void 0 || _rows$next.focus();
    });
    searchButton.addEventListener('command', c.openSearch);
    searchPanel.addEventListener('popupshown', e => {
      if (e.target === searchPanel) {
        searchInput.focus();
        searchInput.select();
      }
    });
    searchInput.addEventListener('input', c.renderSearch);
    searchBox.addEventListener('keydown', e => {
      const rows = [...searchResults.querySelectorAll('button')],
        index = rows.indexOf(doc.activeElement);
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        searchPanel.hidePopup();
        searchButton.focus();
      } else if (e.key === 'ArrowDown') {
        var _rows$Math$min;
        e.preventDefault();
        (_rows$Math$min = rows[Math.min(rows.length - 1, index + 1)]) === null || _rows$Math$min === void 0 || _rows$Math$min.focus();
      } else if (e.key === 'ArrowUp') {
        var _rows;
        e.preventDefault();
        if (index <= 0) searchInput.focus();else (_rows = rows[index - 1]) === null || _rows === void 0 || _rows.focus();
      } else if (e.key === 'Enter' && doc.activeElement === searchInput) {
        var _rows$;
        e.preventDefault();
        (_rows$ = rows[0]) === null || _rows$ === void 0 || _rows$.click();
      }
    });
    const menuShowing = e => {
      if (!c.pendingMenu || e.target.parentElement !== doc.querySelector('popupset')) return;
      const tab = tabs._tabs.find(t => t.id === c.pendingMenu);
      c.pendingMenu = null;
      if (!tab || !this.key(tab)) return;
      const menu = this.xul(doc, 'menu');
      menu.setAttribute('label', '加入分组');
      menu.classList.add('ztg-menu');
      const popup = this.xul(doc, 'menupopup');
      menu.append(popup);
      c.fillAssignments(popup, tab);
      const sep = this.xul(doc, 'menuseparator');
      sep.classList.add('ztg-menu');
      const extra = this.xul(doc, 'menupopup');
      const remarkItem = c.item(extra, this.remark(tab).note ? '编辑备注…' : '设置备注…', () => this.editRemark(win, tab), {
        disabled: !!this.readOnly
      });
      remarkItem.classList.add('ztg-menu');
      const display = this.xul(doc, 'menu');
      display.setAttribute('label', '标签显示');
      display.classList.add('ztg-menu');
      const modes = this.xul(doc, 'menupopup');
      display.append(modes);
      for (const [value, label] of [['original', '原文件名'], ['note', '备注'], ['both', '原文件名 + 备注']]) c.item(modes, label, () => this.setDisplay(tab, value), {
        type: 'radio',
        name: 'ztg-display',
        checked: this.remark(tab).mode === value,
        disabled: !!this.readOnly
      });
      e.target.prepend(remarkItem, display, menu, sep);
    };
    doc.addEventListener('popupshowing', menuShowing, true);
    const observer = new win.MutationObserver(records => {
      if (records.some(r => !root.contains(r.target) && r.target !== root)) c.schedule();
    });
    observer.observe(host, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'data-id']
    });
    const notifier = Zotero.Notifier.registerObserver({
      notify: c.schedule
    }, ['tab'], 'tab-groups-inline');
    const ageTimer = win.setInterval(c.schedule, 3600000);
    win.addEventListener('resize', c.schedule);
    c.dispose = () => {
      c.disposed = true;
      observer.disconnect();
      Zotero.Notifier.unregisterObserver(notifier);
      doc.removeEventListener('popupshowing', menuShowing, true);
      win.removeEventListener('resize', c.schedule);
      if (c.timer !== null) win.clearTimeout(c.timer);
      win.clearInterval(ageTimer);
      c.cancelHover();
      hint.remove();
      for (const popup of popups) {
        popup.hidePopup();
        popup.remove();
      }
      doc.querySelectorAll('.ztg-menu').forEach(n => n.remove());
      searchPanel.hidePopup();
      searchPanel.remove();
      searchButton.remove();
      groupPanel.hidePopup();
      groupPanel.remove();
      host.removeAttribute('data-ztg-inline');
      root.remove();
      suggestions.remove();
      legacyActions.remove();
      style.remove();
      this.windows.delete(win);
      if (c.toolsMenu) c.toolsMenu.remove();
    };
    this.windows.set(win, c);
    if (this.attachToolsMenu) c.toolsMenu = this.attachToolsMenu(win);
    c.refresh();
  },
  stop() {
    if (this.stopSettings) this.stopSettings();
    for (const c of [...this.windows.values()]) c.dispose();
  }
};
async function startup() {
  await Zotero.initializationPromise;
  TabGroups.load();
  for (const win of TabGroups.mainWindows()) TabGroups.attach(win);
}
function shutdown() {
  TabGroups.stop();
}
function install() {}
function uninstall() {}
function onMainWindowLoad({
  window
}) {
  TabGroups.attach(window);
}
function onMainWindowUnload({
  window
}) {
  var _TabGroups$windows$ge;
  (_TabGroups$windows$ge = TabGroups.windows.get(window)) === null || _TabGroups$windows$ge === void 0 || _TabGroups$windows$ge.dispose();
}
