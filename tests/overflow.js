// Stress actual Zotero tab layout, selection and menus using fixture attachments only.
async function testOverflow(Zotero, p, w, check, wait, itemID) {
  const d=w.document,tabs=w.Zotero_Tabs,c=p.windows.get(w),root=c.root;
  const host=d.getElementById('tab-bar-container');
  const bar=d.getElementById('zotero-title-bar')||host,saved=bar.getAttribute('style');
  const extra=[];
  const rect=n=>n.getBoundingClientRect();
  const visible=n=>{const r=rect(n),b=rect(bar);return r.width>0&&r.left>=b.left-1&&r.right<=b.right+1;};
  try {
    for(let i=0;i<60;i++)extra.push(tabs.add({type:'reader-unloaded',title:'Overflow fixture '+i,data:{itemID},select:false}).id);
    for(const group of p.orderedGroups())p.setCollapsed(group.id,false);
    await wait(200);
    const toolbar=d.getElementById('zotero-tabs-toolbar')||d.getElementById('ztg-suggestions').parentElement;
    const menu=d.getElementById('zotero-tb-tabs-menu');
    for(const width of [960,1280,1920]) {
      bar.style.setProperty('width',width+'px','important');bar.style.setProperty('max-width',width+'px','important');
      bar.style.setProperty('min-width','0','important');await wait(60);
      if(menu)check(width+'px: native tab dropdown remains visible',visible(menu));
      check(width+'px: search and suggestions remain visible',visible(d.getElementById('ztg-search'))&&visible(d.getElementById('ztg-suggestions')));
      const library=d.querySelector('#tab-bar-container .pinned-tabs [data-id="zotero-pane"]');
      check(width+'px: original library tab is visible before groups',library&&visible(library)&&rect(library).right<=rect(root).left+1);
      const edge=toolbar===bar?rect(d.getElementById('ztg-search')).left:rect(toolbar).left;
      check(width+'px: document strip stays before toolbar',rect(root).width>50&&rect(root).right<=edge+1);
      check(width+'px: overflow is inside document strip',root.scrollWidth>root.clientWidth+100&&(host===bar||rect(host).right<=edge+1));
    }
    bar.style.setProperty('width','960px','important');bar.style.setProperty('max-width','960px','important');await wait(60);
    // Open before selecting unloaded reader fixtures, whose asynchronous load
    // can itself dismiss a popup. Zotero 8 changed this method's signature.
    if(menu&&typeof tabs.showTabsMenu==='function') {
      if(parseInt(Zotero.version,10)>=8)tabs.showTabsMenu(true,menu);else tabs.showTabsMenu(menu);
      const nativePanel=tabs.tabsMenuPanel||d.getElementById('zotero-tabs-menu-panel');
      for(let i=0;i<20&&!nativePanel.visible&&nativePanel.state!=='open';i++)await wait(50);
      check('Native dropdown opens with many papers',nativePanel.visible||nativePanel.state==='open');
      nativePanel.hidePopup();
    }
    root.scrollLeft=0;
    root.dispatchEvent(new w.WheelEvent('wheel',{deltaY:200,bubbles:true,cancelable:true}));
    await wait(60);check('Wheel scroll reaches offscreen tabs',root.scrollLeft>0);
    const last=extra[extra.length-1];
    c.reveal(last);await wait(250);
    const selected=root.querySelector('.ztg-document.selected');
    check('Selecting last overflowing tab scrolls it into view',tabs.selectedID===last&&selected&&rect(selected).left>=rect(root).left-1&&rect(selected).right<=rect(root).right+1);
    check('Revealing last tab does not move toolbar offscreen',(!menu||visible(menu))&&visible(d.getElementById('ztg-search'))&&visible(d.getElementById('ztg-suggestions')));
    const first=extra[0];tabs.select(first);await wait(250);
    const nativeSelected=root.querySelector('.ztg-document.selected');
    check('Native selection also reveals an overflowing tab',nativeSelected&&nativeSelected.dataset.id===first&&rect(nativeSelected).left>=rect(root).left-1&&rect(nativeSelected).right<=rect(root).right+1);
    const library=d.querySelector('#tab-bar-container .pinned-tabs [data-id="zotero-pane"]');
    // Zotero selects tabs on mousedown; click alone only tests its auxiliary action.
    library.dispatchEvent(new w.MouseEvent('mousedown',{bubbles:true,cancelable:true,button:0}));
    library.dispatchEvent(new w.MouseEvent('mouseup',{bubbles:true,cancelable:true,button:0}));
    library.click();await wait(250);
    check('Native library control returns from reader to library',tabs.selectedID==='zotero-pane'&&tabs.selectedType==='library');
    check('Library control stays fixed after scrolling',visible(library)&&rect(library).right<=rect(root).left+1);
    c.openSearch();await wait(80);
    check('Search lists overflowing open papers',d.querySelectorAll('#ztg-search-panel .ztg-search-result').length>=60);
    d.getElementById('ztg-search-panel').hidePopup();
  } finally {
    d.getElementById('ztg-search-panel').hidePopup();
    const panel=d.getElementById('zotero-tabs-menu-panel');if(panel)panel.hidePopup();
    if(saved===null)bar.removeAttribute('style');else bar.setAttribute('style',saved);
    const remaining=extra.filter(id=>tabs._tabs.some(t=>t.id===id));if(remaining.length)tabs.close(remaining);
    await wait(100);
  }
}
