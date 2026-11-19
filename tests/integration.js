// Execute inside Zotero with a preview controller. Caller must restore preferences,
// selected tab and original plugin after testing (including failures).
async function testSavedGroups(Zotero) {
  const w = Zotero.getMainWindow(), doc = w.document, tabs = w.Zotero_Tabs;
  const p = w.__ztgPreview.scope.TabGroups, c = p.windows.get(w);
  const original = tabs._tabs.map(t => t.id).sort().join(',');
  const result = [];
  const check = (name, passed) => { result.push({ name, passed: !!passed }); if (!passed) throw new Error(name); };
  const wait = () => Zotero.Promise.delay(150);
  const members = tabs._tabs.filter(t => p.key(t));
  const selected = tabs._tabs.find(t => t.id === tabs.selectedID && p.key(t)) || members[0];
  const other = members.find(t => p.key(t) !== p.key(selected));
  const node = id => [...doc.querySelectorAll('#ztg-inline .ztg-document')].find(n => n.dataset.id === id);
  const head = id => [...doc.querySelectorAll('#ztg-inline .ztg-heading')].find(n => n.dataset.group === id);
  try {
    check('Existing v1 preferences migrated without losing groups', p.state.version === 1 && !!p.state.groups.length);
    check('Old independent toolbar absent', !doc.getElementById('ztg-root'));
    check('Library and groups occupy one row', Math.abs(doc.querySelector('.pinned-tabs').getBoundingClientRect().top - c.root.getBoundingClientRect().top) < 12 && doc.getElementById('zotero-title-bar').getBoundingClientRect().height < 50);
    p.state.groups.push({ id: 'inline-test-a', name: '临时测试 A', color: '#3977d5' }, { id: 'inline-test-b', name: '临时测试 B', color: '#21866a' });
    c.refresh();
    const beforePress = node(other.id);
    beforePress.dispatchEvent(new w.MouseEvent('mousedown', { bubbles: true, button: 0 }));
    await wait();
    check('Pressing background tab preserves DOM for physical drag', beforePress === node(other.id) && beforePress.isConnected && tabs.selectedID === other.id);
    p.assign(selected, 'inline-test-a');
    check('Documents appear directly after their group heading', node(selected.id)?.previousElementSibling === head('inline-test-a'));
    head('inline-test-a').click();
    check('Click collapses only that group', !node(selected.id) && !!node(other.id) && head('inline-test-a').getAttribute('aria-expanded') === 'false');
    head('inline-test-a').click(); check('Click expands group', !!node(selected.id));
    p.assign(other, '');
    head('').click();
    check('Ungrouped heading collapses its documents independently', !node(other.id) && !!node(selected.id) && head('').getAttribute('aria-expanded') === 'false');
    head('').click(); check('Ungrouped heading expands documents', !!node(other.id));
    const group = p.state.groups.find(g => g.id === 'inline-test-a');
    const event = { screenX: w.mozInnerScreenX + 400, screenY: w.mozInnerScreenY + 80 };
    let colorPopup = c.groupMenu(event, group);
    const yellow = [...colorPopup.querySelectorAll('menuitem')].find(n => n.getAttribute('label') === '黄色');
    yellow.dispatchEvent(new w.Event('command')); colorPopup.hidePopup();
    check('Preset color updates the group immediately', group.color === '#f5d547' && head(group.id).parentElement.style.getPropertyValue('--ztg-color') === '#f5d547');
    check('Light colors use dark text and dark colors use white text', p.ink('#ffffff') !== '#ffffff' && p.ink('#000000') === '#ffffff');
    const previousColor = group.color;
    check('Invalid color leaves preferences unchanged', p.setColor(group.id, 'not-a-color') === false && group.color === previousColor);
    const scope = w.__ztgPreview.scope, services = scope.Services;
    let prompts = 0, alerts = 0;
    try {
      scope.Services = { prompt: { prompt: (_w, _t, _m, v) => { v.value = prompts++ === 0 ? 'invalid' : '#AbC'; return prompts < 4; }, alert: () => alerts++ } };
      colorPopup = c.groupMenu(event, group);
      const custom = [...colorPopup.querySelectorAll('menuitem')].find(n => n.getAttribute('label') === '自定义颜色…');
      custom.dispatchEvent(new w.Event('command')); colorPopup.hidePopup();
      check('Custom color menu validates and expands shorthand HEX', group.color === '#aabbcc' && prompts === 2 && alerts === 1);
      scope.Services = { prompt: { prompt: () => false } };
      p.customColor(w, group);
      check('Cancelling custom color preserves original color', group.color === '#aabbcc');
    } finally { scope.Services = services; }
    const dt = { effectAllowed: '', dropEffect: '', setData() {} };
    const drag = (target, type) => { const event = new w.Event(type, { bubbles: true, cancelable: true }); Object.defineProperty(event, 'dataTransfer', { value: dt }); const r = target.getBoundingClientRect(); Object.defineProperty(event, 'clientX', {value: r.left + (target.classList.contains('ztg-document') ? 0.05 : 0.5) * r.width}); target.dispatchEvent(event); };
    drag(node(other.id), 'dragstart');
    drag(head('inline-test-b'), 'dragover');
    check('Dragging highlights group drop target', head('inline-test-b').getAttribute('data-ztg-drop') === 'join');
    drag(head('inline-test-b'), 'drop');
    check('Dropping joins group', p.groupOf(other) === 'inline-test-b' && !!node(other.id));
    c.toggle('inline-test-a');
    drag(node(other.id), 'dragstart'); drag(head('inline-test-a'), 'drop');
    check('Drop into collapsed group expands and joins', p.groupOf(other) === 'inline-test-a' && !c.collapsed.has('inline-test-a'));
    c.toggle('');
    drag(node(other.id), 'dragstart'); drag(head(''), 'drop');
    check('Drop on collapsed ungrouped removes assignment and expands it', p.groupOf(other) === '' && !c.collapsed.has('') && !!node(other.id));
    c.reveal(selected.id); c.toggle(''); tabs.select(other.id);
    for (let attempt = 0; attempt < 20 && c.collapsed.has(''); attempt++) await wait();
    check('Native selection reveals collapsed ungrouped', !c.collapsed.has('') && !!node(other.id));
    c.reveal(selected.id);
    // A right-clicked background tab must be affected without changing selection.
    c.openTabMenu({ screenX: w.mozInnerScreenX + 400, screenY: w.mozInnerScreenY + 80, preventDefault() {}, stopPropagation() {} }, other.id);
    for(let i=0;i<20&&!doc.querySelector('menu.ztg-menu[label="加入分组"]');i++)await wait();
    const menu = doc.querySelector('menu.ztg-menu[label="加入分组"]');
    check('Native right-click menu gains grouping submenu', !!menu && menu.parentElement.children.length > 3);
    const command = [...menu.querySelectorAll('menuitem')].find(n => n.getAttribute('label') === '临时测试 B');
    command.dispatchEvent(new w.Event('command'));
    menu.parentElement.hidePopup();
    check('Right-click joins the clicked background tab', p.groupOf(other) === 'inline-test-b' && p.groupOf(selected) === 'inline-test-a');
    const fresh = { Zotero, Services: w.__ztgPreview.scope.Services };
    fresh.Services.scriptloader.loadSubScriptWithOptions(w.__ztgPreview.bootstrapURL, { target: fresh, ignoreCache: true });
    fresh.TabGroups.load();
    check('Assignment persists across reload', fresh.TabGroups.groupOf(other) === 'inline-test-b');
    check('Custom color persists across reload', fresh.TabGroups.state.groups.find(g => g.id === group.id).color === '#aabbcc');
    drag(node(other.id), 'dragstart'); drag(node(selected.id), 'drop');
    check('Drop on a document joins group and orders before it', p.groupOf(other) === 'inline-test-a' && tabs._tabs.indexOf(other) < tabs._tabs.indexOf(selected));
    c.reveal(other.id); c.toggle('inline-test-a'); tabs.select(selected.id);
    for (let attempt = 0; attempt < 20 && c.collapsed.has('inline-test-a'); attempt++) await wait();
    check('Native selection reveals collapsed group', !c.collapsed.has('inline-test-a') && !!node(selected.id));
    check('Original open tabs are retained', original === tabs._tabs.map(t => t.id).sort().join(','));
    // Return the real configuration to the preview for inspection before final cleanup.
  } catch (error) { result.push({ error: String(error) }); }
  return { version: '0.2.1', zoteroVersion: Zotero.version, passed: result.every(r => r.passed === true), results: result };
}


async function testInlineGroups(Zotero) {
  const w = Zotero.getMainWindow(), doc = w.document, tabs = w.Zotero_Tabs;
  const preview = w.__ztgPreview, p = preview.scope.TabGroups;
  const scriptServices = preview.scope.Services;
  let c = p.windows.get(w);
  const result = [];
  const check = (name, passed) => { result.push({ name, passed: !!passed }); if (!passed) throw new Error(name); };
  const wait = ms => Zotero.Promise.delay(ms);
  const node = id => [...doc.querySelectorAll('#ztg-inline .ztg-document')].find(n => n.dataset.id === id);
  const head = id => [...doc.querySelectorAll('#ztg-inline .ztg-heading')].find(n => n.dataset.group === id);
  const docs = tabs._tabs.filter(t => p.key(t));
  const a = docs.find(t => t.id === tabs.selectedID) || docs.find(t => t.type === 'reader');
  const b = docs.find(t => t.type === 'reader' && p.key(t) !== p.key(a)) || docs.find(t => p.key(t) !== p.key(a));
  const originalIDs = tabs._tabs.map(t => t.id).sort().join(',');
  const dt = { effectAllowed: '', dropEffect: '', setData() {} };
  const drag = (target, type, ratio = 0.5) => {
    const e = new w.Event(type, { bubbles: true, cancelable: true });
    Object.defineProperty(e, 'dataTransfer', { value: dt });
    if (target) { const r = target.getBoundingClientRect(); Object.defineProperty(e, 'clientX', { value: r.left + ratio * r.width }); target.dispatchEvent(e); }
  };
  const event = { screenX: w.mozInnerScreenX + 400, screenY: w.mozInnerScreenY + 80 };
  const command = (popup, label) => [...popup.querySelectorAll('menuitem')].find(n => n.getAttribute('label').includes(label));
  const fresh = () => {
    const scope = { Zotero, Services: scriptServices };
    scope.Services.scriptloader.loadSubScriptWithOptions(preview.bootstrapURL, { target: scope, ignoreCache: true });
    scope.TabGroups.load(); return scope.TabGroups;
  };
  try {
    check('Old groups and document assignments load', !p.readOnly && p.state.groups.length >= 1);
    check('One-row layout retained', doc.getElementById('zotero-title-bar').getBoundingClientRect().height < 50);
    const suggestion = doc.getElementById('ztg-suggestions'), toolbar = doc.getElementById('zotero-tabs-toolbar');
    check('Suggestion control is native toolbarbutton at far right', suggestion.localName === 'toolbarbutton' && suggestion.classList.contains('zotero-tb-button') && toolbar.lastElementChild === suggestion);
    check('Suggestion control is outside scrolling document strip', !c.root.contains(suggestion));
    const label = suggestion.querySelector('.toolbarbutton-text');
    check('Suggestion button always has an explicit Chinese text label', suggestion.getAttribute('label').includes('建议关闭 (') && label && (label.value || label.textContent).includes('建议关闭'));
    check('Suggestion text is visibly laid out rather than tooltip-only', label.getBoundingClientRect().width > 35 && label.getBoundingClientRect().height > 8 && w.getComputedStyle(label).visibility === 'visible' && suggestion.getBoundingClientRect().width >= 104);
    const icon = suggestion.querySelector('.toolbarbutton-icon');
    check('Suggestion icon uses explicit blue colors instead of context-fill', w.getComputedStyle(icon).listStyleImage.includes('%233977d5') && !w.getComputedStyle(icon).listStyleImage.includes('context-fill'));
    const right = suggestion.getBoundingClientRect();
    check('Suggestion control aligns with native controls and right edge', Math.abs(right.height - doc.getElementById('zotero-tb-sync').getBoundingClientRect().height) < 1 && Math.abs(toolbar.getBoundingClientRect().right - right.right) < 10);
    const previousScroll = c.root.scrollLeft; c.root.scrollLeft = 100000; await wait(30);
    check('Suggestion button stays fixed while document strip scrolls', Math.abs(suggestion.getBoundingClientRect().left - right.left) < 1);
    c.root.scrollLeft = previousScroll;
    const priorPopups = new Set(doc.querySelectorAll('popupset > menupopup'));
    suggestion.dispatchEvent(new w.Event('command'));
    const suggestionPopup = [...doc.querySelectorAll('popupset > menupopup')].find(n => !priorPopups.has(n));
    check('Native toolbar command opens suggestion menu', !!suggestionPopup && !!command(suggestionPopup, '设置天数阈值'));
    suggestionPopup.hidePopup();
    p.state.groups.push({ id: 'test-A', name: '临时 A', color: '#3977d5' }, { id: 'test-B', name: '临时 B', color: '#21866a' });
    p.save(); p.assign(a, 'test-A'); p.assign(b, 'test-B'); p.setCollapsed('', false); c.reveal(a.id);
    const gA = () => p.orderedGroups().find(g => g.id === 'test-A');
    let popup = c.groupMenu(event, p.orderedGroups().find(g => g.id === ''));
    check('Ungrouped menu contains only applicable options in order', JSON.stringify([...popup.children].map(n => n.getAttribute('label'))) === JSON.stringify(['分组颜色', '组内标签显示', '关闭分组下所有文献']));
    check('Ungrouped has color menu', !!command(popup, '黄色'));
    command(popup, '黄色').dispatchEvent(new w.Event('command')); popup.hidePopup();
    check('Ungrouped color applies immediately', p.state.ungroupedColor === '#f5d547' && head('').parentElement.style.getPropertyValue('--ztg-color') === '#f5d547');
    p.setColor('', '#abc');
    check('Ungrouped custom color persists', fresh().state.ungroupedColor === '#aabbcc');
    popup = c.groupMenu(event, gA());
    check('Group menu follows requested four-option order', JSON.stringify([...popup.children].map(n => n.getAttribute('label'))) === JSON.stringify(['重命名此分组', '解散该分组', '分组颜色', '组内标签显示', '关闭分组下所有文献']));
    const colorMenu = [...popup.children].find(n => n.getAttribute('label') === '分组颜色');
    const palette = colorMenu.querySelector('menupopup');
    palette.openPopup(colorMenu, 'end_before'); await wait(100);
    const swatches = [...palette.querySelectorAll('.ztg-color-option')];
    check('All nine colors have a dedicated preview independent of selection', swatches.length === 9 && swatches.every(n => !n.hasAttribute('type') && n.style.getPropertyValue('--ztg-swatch')));
    const painted = swatches.map(n => n.querySelector('.menu-iconic-icon'));
    check('All nine preview swatches have visible rendered geometry', painted.every(n => n && n.getBoundingClientRect().width >= 12 && n.getBoundingClientRect().height >= 12 && w.getComputedStyle(n).backgroundColor !== 'rgba(0, 0, 0, 0)' && w.getComputedStyle(n).visibility === 'visible'));
    check('Selected color uses separate right-side checkmark', swatches.filter(n => n.getAttribute('acceltext') === '✓').length === 1);
    palette.hidePopup(); popup.hidePopup();
    check('Invalid colors do not overwrite settings', !p.setColor('', 'bad-color') && p.state.ungroupedColor === '#aabbcc');
    check('Text contrast follows background', p.ink('#000000') === '#ffffff' && p.ink('#ffffff') !== '#ffffff');
    const beforeWidth = head('test-A').getBoundingClientRect().width;
    p.assign(b, 'test-A');
    check('Group heading stays the same width as document count rises', head('test-A').getBoundingClientRect().width === beforeWidth);
    check('Heading width is bounded for long names', p.headingWidth({name:'长分组名'.repeat(60)}, 1000) === 280);
    p.assign(b, 'test-B');
    head('test-A').click(); head('').click();
    check('Custom groups and ungrouped collapse independently', !node(a.id) && c.collapsed.has('') && !!node(b.id));
    let reloaded = fresh();
    check('Collapsed state serializes for restart', reloaded.state.collapsed.includes('test-A') && reloaded.state.collapsed.includes(''));
    p.stop(); p.attach(w); c = p.windows.get(w);
    check('Recreated UI restores collapse state', c.collapsed.has('test-A') && c.collapsed.has('') && !node(a.id));
    c.toggle('test-A');
    let aNode = node(a.id);
    aNode.dispatchEvent(new w.MouseEvent('mousedown', { bubbles: true, button: 0 })); await wait(100);
    check('Selecting tab preserves drag source DOM', node(a.id) === aNode && aNode.isConnected);
    c.toggle('test-B');
    aNode = node(a.id);
    drag(node(a.id), 'dragstart'); drag(head('test-B'), 'dragover');
    check('Group center gives join marker and explicit label', head('test-B').getAttribute('data-ztg-drop') === 'join' && doc.querySelector('.ztg-drop-hint').textContent.includes('加入'));
    await wait(180); check('Collapsed group does not open immediately', c.collapsed.has('test-B'));
    await wait(520);
    check('Dwell opens collapsed group without removing source', !c.collapsed.has('test-B') && !!node(b.id) && node(a.id) === aNode);
    check('Hover opening is temporary in saved settings', fresh().state.collapsed.includes('test-B'));
    drag(aNode, 'dragend');
    check('Cancelled drag restores collapsed target and clears hints', c.collapsed.has('test-B') && !node(b.id) && !doc.querySelector('[data-ztg-drop]') && doc.querySelector('.ztg-drop-hint').hidden);
    drag(node(a.id), 'dragstart'); drag(head('test-B'), 'dragover'); drag(head('test-B'), 'dragleave'); await wait(700);
    check('Leaving target cancels delayed expansion', c.collapsed.has('test-B'));
    drag(node(a.id), 'dragend');
    drag(node(a.id), 'dragstart'); drag(head('test-B'), 'drop');
    check('Drop joins and persistently opens target group', p.groupOf(a) === 'test-B' && !c.collapsed.has('test-B') && !fresh().state.collapsed.includes('test-B'));
    drag(node(b.id), 'dragstart'); drag(node(a.id), 'dragover', 0.05);
    check('Left edge displays before insertion marker', node(a.id).getAttribute('data-ztg-drop') === 'before' && doc.querySelector('.ztg-drop-hint').textContent.includes('之前'));
    drag(node(a.id), 'drop', 0.05);
    check('Before drop updates native tab order', tabs._tabs.indexOf(b) < tabs._tabs.indexOf(a));
    drag(node(b.id), 'dragstart'); drag(node(a.id), 'dragover', 0.95);
    check('Right edge displays after insertion marker', node(a.id).getAttribute('data-ztg-drop') === 'after');
    drag(node(a.id), 'drop', 0.95);
    check('After drop updates native tab order', tabs._tabs.indexOf(b) > tabs._tabs.indexOf(a));
    drag(node(b.id), 'dragstart'); drag(node(a.id), 'dragover', 0.5);
    check('Document center means join rather than reorder', node(a.id).getAttribute('data-ztg-drop') === 'join');
    drag(node(a.id), 'drop', 0.5);
    check('Center drop preserves relative order', tabs._tabs.indexOf(b) > tabs._tabs.indexOf(a));
    drag(node(a.id), 'dragstart'); drag(head(''), 'drop');
    check('Dropping onto collapsed ungrouped expands and removes assignment', p.groupOf(a) === '' && !c.collapsed.has(''));
    const orderBefore = p.orderedGroups().map(g => g.id);
    drag(head('test-B'), 'dragstart'); drag(head(''), 'dragover', 0.05);
    check('Group drag has a distinct order insertion marker', head('').getAttribute('data-ztg-drop') === 'group-before');
    drag(head(''), 'drop', 0.05);
    check('Dragging heading moves entire group before target', p.orderedGroups().map(g => g.id).indexOf('test-B') < p.orderedGroups().map(g => g.id).indexOf(''));
    drag(head(''), 'dragstart'); drag(head('test-A'), 'drop', 0.95);
    check('Ungrouped can also be reordered', p.orderedGroups().map(g => g.id).indexOf('') > p.orderedGroups().map(g => g.id).indexOf('test-A'));
    check('Group order survives settings reload', JSON.stringify(fresh().orderedGroups().map(g => g.id)) === JSON.stringify(p.orderedGroups().map(g => g.id)) && JSON.stringify(orderBefore) !== JSON.stringify(p.orderedGroups().map(g => g.id)));
    const originalClose = tabs.close, calls = [];
    const assignments = JSON.stringify(p.state.assignments);
    try {
      tabs.close = ids => calls.push(Array.isArray(ids) ? ids : [ids]);
      popup = c.groupMenu(event, p.orderedGroups().find(g => g.id === 'test-B'));
      command(popup, '关闭分组下所有文献').dispatchEvent(new w.Event('command')); popup.hidePopup();
      check('Group close menu targets only matching document tabs', JSON.stringify(calls[0]) === JSON.stringify(tabs._tabs.filter(t => t.type !== 'library' && p.groupOf(t) === 'test-B').map(t => t.id)));
      popup = c.groupMenu(event, p.orderedGroups().find(g => g.id === ''));
      command(popup, '关闭分组下所有文献').dispatchEvent(new w.Event('command')); popup.hidePopup();
      check('Ungrouped close excludes library and other groups', calls[1].includes(a.id) && !calls[1].includes(b.id) && !calls[1].includes('zotero-pane'));
      popup = c.groupMenu(event, gA());
      check('Empty group close is disabled', command(popup, '关闭分组下所有文献').getAttribute('disabled') === 'true'); popup.hidePopup();
    } finally { tabs.close = originalClose; }
    check('Closing group preserves assignments', JSON.stringify(p.state.assignments) === assignments);
    const now = Date.now(), day = 86400000;
    p.state.suggestDays = 7;
    c.reveal(a.id);
    p.state.history[p.key(b)] = { firstSeen: now - 20 * day, lastViewed: now - 12 * day };
    let candidates = p.suggestions(tabs, now);
    check('Suggestion reports exact days for tracked views', candidates.some(x => x.tab.id === b.id && x.days === 12 && !x.uncertain));
    p.state.history[p.key(a)] = { firstSeen: now - 20 * day, lastViewed: now - 15 * day };
    check('Currently selected document is excluded from suggestions', !p.suggestions(tabs, now).some(x => x.tab.id === a.id));
    p.state.history[p.key(b)] = { firstSeen: now - 9 * day, lastViewed: null };
    check('Unknown prior history is marked as lower bound', p.suggestions(tabs, now).some(x => x.tab.id === b.id && x.days === 9 && x.uncertain));
    p.state.history[p.key(b)] = { firstSeen: now, lastViewed: null };
    check('Old untracked documents are not falsely aged on first install', !p.suggestions(tabs, now).some(x => x.tab.id === b.id));
    p.state.history[p.key(b)] = { firstSeen: now - 20 * day, lastViewed: now - 12 * day };
    p.save(); c.refresh(); popup = c.openSuggestions(event);
    check('Suggestion menu displays days and has no automatic closure', popup.textContent !== undefined && [...popup.querySelectorAll('menu')].some(n => n.getAttribute('label').includes('12 天未查看')) && tabs._tabs.map(t => t.id).sort().join(',') === originalIDs);
    const closeAgain = tabs.close; let suggestionIDs;
    try { tabs.close = ids => { suggestionIDs = ids; }; command(popup, '关闭以上建议').dispatchEvent(new w.Event('command')); }
    finally { tabs.close = closeAgain; popup.hidePopup(); }
    check('Suggested batch close excludes selected and recent documents', suggestionIDs.includes(b.id) && !suggestionIDs.includes(a.id));
    c.reveal(b.id); c.reveal(a.id);
    check('Viewing a suggested paper resets its age', p.state.history[p.key(b)].lastViewed >= now && !p.suggestions(tabs).some(x => x.tab.id === b.id));
    const scope = preview.scope, oldServices = scope.Services;
    try {
      let prompts = 0;
      scope.Services = { prompt: { prompt: (_w, _t, _m, v) => { v.value = prompts++ ? '3' : '0'; return true; }, alert() {} } };
      p.setSuggestDays(w);
      check('Suggestion threshold validates and persists', p.state.suggestDays === 3 && prompts === 2 && fresh().state.suggestDays === 3);
    } finally { scope.Services = oldServices; }
    check('Open document set is unchanged by tests', tabs._tabs.map(t => t.id).sort().join(',') === originalIDs);
  } catch (error) { result.push({ error: String(error), stack: error.stack }); }
  return { version: '0.4.1', zoteroVersion: Zotero.version, passed: result.every(r => r.passed === true), results: result };
}

async function testRemarks(Zotero) {
  const w = Zotero.getMainWindow(), doc = w.document, tabs = w.Zotero_Tabs;
  const scope = w.__ztgPreview.scope, p = scope.TabGroups, c = p.windows.get(w);
  const S = scope.Services, results = [];
  const check = (name, ok) => { results.push({ name, passed: !!ok }); if (!ok) throw new Error(name); };
  const papers = tabs._tabs.filter(t => p.key(t));
  const a = papers[0], b = papers.find(t => p.key(t) !== p.key(a));
  const original = { title: a.title, filename: Zotero.Items.get(a.data.itemID).attachmentFilename };
  const node = id => [...doc.querySelectorAll('#ztg-inline .ztg-document')].find(n => n.dataset.id === id);
  try {
    check('Default remarks are compatible with old settings', p.state.remarks && typeof p.state.remarks === 'object');
    p.setRemark(a, 'TM备注 Alpha <b>对比</b>'); p.setRemark(b, '另一个 TM备注 Beta'); p.setDisplay(b,'original');
    p.setDisplay(a, 'original');
    check('Original mode shows actual attachment filename', node(a.id).querySelector('.ztg-title').textContent === original.filename);
    p.setDisplay(a, 'note');
    check('Remark-only mode shows literal safe text', node(a.id).querySelector('.ztg-title').textContent === 'TM备注 Alpha <b>对比</b>' && !node(a.id).querySelector('.ztg-title b'));
    p.setDisplay(a, 'both');
    check('Combined mode shows original and remark', node(a.id).textContent.includes(original.filename) && node(a.id).textContent.includes('TM备注 Alpha'));
    check('Tooltip retains both names', node(a.id).title.includes(original.filename) && node(a.id).title.includes('TM备注 Alpha'));
    check('Display settings are per attachment', p.remark(b).mode === 'original');
    check('Invalid display mode rejected', !p.setDisplay(a, 'bad-mode') && p.remark(a).mode === 'both');
    check('Overlong remark rejected without overwriting', !p.setRemark(a, 'a'.repeat(301)) && p.remark(a).note.startsWith('TM备注'));
    const duplicate = { ...a, id: 'test-duplicate' };
    check('Reopened and duplicate tabs share attachment remark', p.remark(duplicate).note === p.remark(a).note);
    const fresh = { Zotero, Services: S };
    S.scriptloader.loadSubScriptWithOptions(w.__ztgPreview.bootstrapURL, { target:fresh, ignoreCache:true }); fresh.TabGroups.load();
    check('Remark and display mode persist after preferences reload', fresh.TabGroups.remark(a).note === p.remark(a).note && fresh.TabGroups.remark(a).mode === 'both');
    check('Remark search ignores case', p.search(tabs, 'alpha').some(t => t.id === a.id));
    check('Search supports multiple words and Unicode normalization', p.search(tabs, 'ＴＭ备注 ALPHA').some(t => t.id === a.id) && !p.search(tabs, 'TM备注 ALPHA').some(t => t.id === b.id));
    check('Original filename remains searchable in remark mode', p.search(tabs, original.filename).some(t => t.id === a.id));
    check('Unknown search has no results', p.search(tabs, '__nonexistent_marker_8496__').length === 0);
    check('Empty search lists all open documents, excluding library', p.search(tabs, '').length === papers.length);
    c.reveal(b.id);
    c.openTabMenu({screenX:w.mozInnerScreenX+400,screenY:w.mozInnerScreenY+80,preventDefault(){},stopPropagation(){}},a.id);
    await Zotero.Promise.delay(100);
    const display = doc.querySelector('menu.ztg-menu[label="标签显示"]');
    check('Native right-click menu has all three display modes', !!display && JSON.stringify([...display.querySelectorAll('menuitem')].map(n=>n.getAttribute('label'))) === JSON.stringify(['原文件名','备注','原文件名 + 备注']));
    const popup = display.parentElement;
    const edit = popup.querySelector('menuitem.ztg-menu');
    scope.Services = { prompt:{ prompt:(_w,_t,_m,v)=>{v.value='TM跳转备注 Gamma';return true;} } };
    edit.dispatchEvent(new w.Event('command')); scope.Services = S;
    check('Right-click edit affects background tab without switching reader', p.remark(a).note === 'TM跳转备注 Gamma' && tabs.selectedID === b.id);
    const mode = [...display.querySelectorAll('menuitem')].find(n=>n.getAttribute('label')==='备注');
    mode.dispatchEvent(new w.Event('command')); popup.hidePopup();
    check('Right-click display mode updates label immediately', p.remark(a).mode === 'note' && node(a.id).querySelector('.ztg-title').textContent === 'TM跳转备注 Gamma');
    let prompts = 0;
    scope.Services = { prompt:{ prompt:(_w,_t,_m,v)=>{v.value=prompts++===0?'x'.repeat(301):'TM跳转备注 Gamma';return true;},alert(){} } };
    p.editRemark(w,a); scope.Services = S;
    check('Remark editor validates maximum length', prompts===2 && p.remark(a).note === 'TM跳转备注 Gamma');
    scope.Services={prompt:{prompt:()=>false}};p.editRemark(w,a);scope.Services=S;
    check('Cancelling editor preserves remark',p.remark(a).note==='TM跳转备注 Gamma');
    const group = p.groupOf(a); p.setCollapsed(group,true);
    check('Collapsed documents remain searchable', !node(a.id) && p.search(tabs,'Gamma').some(t=>t.id===a.id));
    const button=doc.getElementById('ztg-search');button.dispatchEvent(new w.Event('command'));
    await Zotero.Promise.delay(120);
    const panel=doc.getElementById('ztg-search-panel'), input=panel.querySelector('input');
    check('Visible search control opens anchored search panel',button.getAttribute('label')==='搜索文献' && panel.state==='open' && input.getBoundingClientRect().width>100);
    input.value='Gamma';input.dispatchEvent(new w.Event('input'));
    let rows=[...panel.querySelectorAll('.ztg-search-result')];
    check('Live search lists matching remark and original filename',rows.length===1 && rows[0].dataset.id===a.id && rows[0].textContent.includes(original.filename) && rows[0].textContent.includes('TM跳转备注 Gamma'));
    input.focus(); input.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true,cancelable:true}));
    check('Search supports keyboard result navigation',doc.activeElement===rows[0]);
    rows[0].click();await Zotero.Promise.delay(100);
    check('Search result opens paper and expands its group',tabs.selectedID===a.id && !c.collapsed.has(group) && !!node(a.id) && panel.state==='closed');
    c.openSearch();await Zotero.Promise.delay(60);input.value='__nonexistent_marker_8496__';input.dispatchEvent(new w.Event('input'));
    check('Search panel handles no matches',panel.querySelectorAll('.ztg-search-result').length===0 && panel.textContent.includes('没有匹配'));
    input.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));await Zotero.Promise.delay(80);
    check('Escape dismisses search',panel.state==='closed');
    p.setRemark(a,'  ');
    check('Clearing remark safely falls back to original name',p.remark(a).note==='' && p.label(a)===original.filename);
    check('Original item title and filename are unchanged',a.title===original.title && Zotero.Items.get(a.data.itemID).attachmentFilename===original.filename);
  } catch(error) { results.push({error:String(error),stack:error.stack}); }
  finally { scope.Services=S; doc.getElementById('ztg-search-panel')?.hidePopup(); }
  return results;
}

async function testGroupDisplayAndLayout(Zotero) {
  const w=Zotero.getMainWindow(),doc=w.document,tabs=w.Zotero_Tabs,preview=w.__ztgPreview,p=preview.scope.TabGroups,c=p.windows.get(w),results=[];
  const check=(name,passed)=>{results.push({name,passed:!!passed});if(!passed)throw new Error(name);};
  const papers=tabs._tabs.filter(t=>p.key(t)),a=papers[0],b=papers.find(t=>p.key(t)!==p.key(a)),outside=papers.find(t=>p.key(t)!==p.key(a)&&p.key(t)!==p.key(b));
  const event={screenX:w.mozInnerScreenX+400,screenY:w.mozInnerScreenY+80};
  try {
    const g={id:'bulk-fixture',name:'批量显示测试',color:'#3977d5'};p.state.groups.push(g);p.assign(a,g.id);p.assign(b,g.id);
    p.setRemark(a,'组内备注 A');p.setRemark(b,'组内备注 B');
    if(outside)p.setDisplay(outside,'original');
    let popup=c.groupMenu(event,g),display=[...popup.children].find(n=>n.getAttribute('label')==='组内标签显示');
    check('Group menu offers three bulk display modes',!!display&&display.querySelectorAll('menuitem').length===3);
    [...display.querySelectorAll('menuitem')].find(n=>n.getAttribute('label')==='备注').dispatchEvent(new w.Event('command'));popup.hidePopup();
    check('Group command switches every member to remarks without editing notes',p.remark(a).mode==='note'&&p.remark(b).mode==='note'&&p.label(a)==='组内备注 A'&&p.label(b)==='组内备注 B');
    check('Group display does not affect other groups',!outside||p.remark(outside).mode==='original');
    p.setCollapsed(g.id,true);p.setGroupDisplay(g.id,'both');
    check('Bulk display also applies while group is collapsed',c.collapsed.has(g.id)&&p.remark(a).mode==='both'&&p.remark(b).mode==='both');
    p.setDisplay(a,'original');check('Single document display remains independently adjustable',p.remark(a).mode==='original'&&p.remark(b).mode==='both');
    p.setGroupDisplay(g.id,'note');check('Another group command overrides earlier individual modes',p.remark(a).mode==='note'&&p.remark(b).mode==='note');
    p.setRemark(a,'');check('Missing note still falls back after bulk change',p.label(a)===p.originalName(a));
    p.assign(a,'');p.setGroupDisplay('','both');
    check('Ungrouped supports bulk display',p.remark(a).mode==='both');
    p.assign(a,g.id);check('Newly joining document follows configured group mode',p.remark(a).mode==='note');
    const fresh={Zotero,Services:preview.scope.Services};fresh.Services.scriptloader.loadSubScriptWithOptions(preview.bootstrapURL,{target:fresh,ignoreCache:true});fresh.TabGroups.load();
    check('Group defaults and member settings persist',fresh.TabGroups.state.groupDisplay[g.id]==='note'&&fresh.TabGroups.remark(a).mode==='note');
    p.setRemark(a,'长备注布局测试'.repeat(35));p.setRemark(b,'第二条备注布局测试');c.openSearch();await Zotero.Promise.delay(120);
    const panel=doc.getElementById('ztg-search-panel'),input=panel.querySelector('input');input.value='';input.dispatchEvent(new w.Event('input'));
    const rows=[...panel.querySelectorAll('.ztg-search-result')];
    check('Search results contain multiple test rows',rows.length>=2);
    check('Search result cards never overlap',rows.every((row,i)=>!i||row.getBoundingClientRect().top>=rows[i-1].getBoundingClientRect().bottom+4));
    check('Each card contains both lines without overflow',rows.every(row=>{const r=row.getBoundingClientRect(),a=row.children[0].getBoundingClientRect(),b=row.children[1].getBoundingClientRect();return a.top>=r.top&&b.top>=a.bottom+3&&b.bottom<=r.bottom&&r.height>=64;}));
    const long=rows.find(n=>n.dataset.id===a.id);
    check('Long remarks wrap and expand card height',long.children[0].getBoundingClientRect().height>35&&long.getBoundingClientRect().height>85);
    // Emulate a theme imposing a fixed button height, the original overlap cause.
    const theme=doc.createElementNS('http://www.w3.org/1999/xhtml','style');theme.textContent='button {height:26px !important;max-height:26px;white-space:nowrap}';doc.documentElement.append(theme);
    try{check('Fixed-height theme cannot collapse search result cards',rows.every(row=>row.getBoundingClientRect().height>=64&&row.children[1].getBoundingClientRect().bottom<=row.getBoundingClientRect().bottom));}
    finally{theme.remove();}
    panel.hidePopup();
  }catch(error){results.push({error:String(error),stack:error.stack});}
  finally{doc.getElementById('ztg-search-panel')?.hidePopup();}
  return results;
}

async function runInlineTests(Zotero, Services, bootstrapURL, env) {
  const w = Zotero.getMainWindow();
  const { AddonManager } = ChromeUtils.import('resource://gre/modules/AddonManager.jsm');
  const old = await AddonManager.getAddonByID('tab-groups@local.zotero');
  const oldActive = !!old?.isActive;
  const pref = Zotero.Prefs.get('extensions.tabGroups.state', true);
  const selected = w.Zotero_Tabs.selectedID;
  const order = w.Zotero_Tabs._tabs.map(t => t.id);
  const scope = { Zotero, Services };
  Services.scriptloader.loadSubScriptWithOptions(bootstrapURL, { target: scope, ignoreCache: true });
  let restored = false;
  const cleanup = async () => {
    if (restored) return;
    restored = true; scope.TabGroups.stop();
    if (pref === undefined) Zotero.Prefs.clear('extensions.tabGroups.state', true);
    else Zotero.Prefs.set('extensions.tabGroups.state', pref, true);
    for (let j = 1; j < order.length; j++) {
      const index = w.Zotero_Tabs._tabs.findIndex(t => t.id === order[j]);
      if (index > 0) w.Zotero_Tabs.move(order[j], index < j ? j + 1 : j);
    }
    w.Zotero_Tabs.select(selected);
    if (oldActive) await old.enable();
    // Enabling 0.3.x records the currently visible document. Restore the exact
    // pre-test stored preferences after this normal startup activity as well.
    if (pref === undefined) Zotero.Prefs.clear('extensions.tabGroups.state', true);
    else Zotero.Prefs.set('extensions.tabGroups.state', pref, true);
    delete w.__ztgPreview;
  };
  env?.addUndoStep(cleanup);
  let result;
  try {
    if (oldActive) await old.disable();
    await scope.startup();
    w.__ztgPreview = { scope, cleanup, bootstrapURL };
    result = await testInlineGroups(Zotero);
    if (result.passed) {
      const saved = await testSavedGroups(Zotero);
      result.results.push(...saved.results.map(r => ({...r, name: r.name ? 'Regression: ' + r.name : undefined})));
    }
    if (result.results.every(r=>r.passed===true)) result.results.push(...await testRemarks(Zotero));
    if (result.results.every(r=>r.passed===true)) result.results.push(...await testGroupDisplayAndLayout(Zotero));
    scope.TabGroups.stop();
    result.results.push({ name: 'Disable removes inline UI and restores native strip', passed: !w.document.getElementById('ztg-inline') && !w.document.querySelector('[data-ztg-inline]') });
    result.results.push({ name:'Disable removes search control and panel',passed:!w.document.getElementById('ztg-search')&&!w.document.getElementById('ztg-search-panel') });
  } finally { await cleanup(); }
  result.results.push({ name: 'Original plugin, preferences and tab order restored', passed: !!old?.isActive === oldActive && Zotero.Prefs.get('extensions.tabGroups.state', true) === pref && w.Zotero_Tabs._tabs.map(t => t.id).join(',') === order.join(',') });
  result.passed = result.results.every(x => x.passed === true);
  return result;
}
