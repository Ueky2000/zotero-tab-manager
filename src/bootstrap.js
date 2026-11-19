/* SPDX-License-Identifier: MIT. Zotero 7–10 bootstrap. */
var TMCore = null;
var TabGroups = null;
var TMStopped = false;

function tmAttach(window) {
  if (TMStopped || !TabGroups || !window.Zotero_Tabs) return;
  let attempts = 0;
  function attempt() {
    if (TMStopped || window.closed || !TabGroups) return;
    try {
      if (window.document.querySelector('#tab-bar-container .tab-bar-inner-container')) {
        TabGroups.attach(window); return;
      }
    } catch (error) { Zotero.logError(error); }
    if (++attempts < 120) window.setTimeout(attempt, 250);
  }
  attempt();
}
async function startup(data) {
  TMStopped = false;
  await Zotero.initializationPromise;
  if (TMStopped) return;
  const root = data.rootURI || data.resourceURI.spec;
  TMCore = { Zotero, Services };
  Services.scriptloader.loadSubScript(root + 'core.js', TMCore, 'UTF-8');
  Services.scriptloader.loadSubScript(root + 'features.js', TMCore, 'UTF-8');
  const plugin = TMCore.TabGroups;
  TabGroups = plugin;
  plugin.load();
  try { await plugin.registerSettings(root, data.version); }
  catch (error) { Zotero.logError(error); }
  if (TMStopped) { plugin.stop(); return; }
  plugin.mainWindows().forEach(tmAttach);
}
function shutdown() {
  TMStopped = true;
  if (TabGroups) TabGroups.stop();
  TMCore = null; TabGroups = null;
}
function install() {}
function uninstall() {}
function onMainWindowLoad({window}) { tmAttach(window); }
function onMainWindowUnload({window}) { TabGroups?.windows.get(window)?.dispose(); }
