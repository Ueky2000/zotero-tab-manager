/* MIT. This loader intentionally uses syntax supported by Firefox 60 / Zotero 6. */
var TMCore = null;
var TabGroups = null;
var TMWindowListener = null;
var TMReadyListener = null;
var TMReadyResolve = null;
var TMRoot = null;
var TMStopped = false;
var TMServices = typeof Services !== 'undefined' ? Services : ChromeUtils.import('resource://gre/modules/Services.jsm').Services;

function tmZotero() {
  if (typeof Zotero !== 'undefined') return Zotero;
  return Components.classes['@zotero.org/Zotero;1'].getService(Components.interfaces.nsISupports).wrappedJSObject;
}
function tmDOMWindow(xulWindow) {
  if (xulWindow.docShell && xulWindow.docShell.domWindow) return xulWindow.docShell.domWindow;
  return xulWindow.QueryInterface(Components.interfaces.nsIInterfaceRequestor).getInterface(Components.interfaces.nsIDOMWindow);
}
function tmReadyZotero() {
  if (typeof Zotero !== 'undefined') return Promise.resolve(Zotero);
  // Zotero 6 starts restartless add-ons before its hidden DOM window exists.
  // Creating the Zotero XPCOM service here would break the entire app startup.
  return new Promise(function(resolve) {
    function inspect(window) {
      if (!window.Zotero || !window.Zotero_Tabs) return;
      if (TMReadyListener) TMServices.wm.removeListener(TMReadyListener);
      TMReadyListener = null; TMReadyResolve = null;
      resolve(window.Zotero);
    }
    TMReadyResolve = resolve;
    TMReadyListener = {
      onOpenWindow:function(xulWindow) {
        var window = tmDOMWindow(xulWindow);
        window.addEventListener('load',function(){inspect(window);},{once:true});
      },
      onCloseWindow:function(){}, onWindowTitleChange:function(){}
    };
    TMServices.wm.addListener(TMReadyListener);
    var windows=TMServices.wm.getEnumerator(null);
    while(windows.hasMoreElements())inspect(windows.getNext());
  });
}
function tmAttach(window) {
  if (TMStopped || !TabGroups || !window.Zotero_Tabs) return;
  var attempts = 0;
  function attempt() {
    if (TMStopped || window.closed || !TabGroups) return;
    try {
      if (window.document.querySelector('#tab-bar-container .tab-bar-inner-container')) {
        TabGroups.attach(window); return;
      }
    } catch (error) { tmZotero().logError(error); }
    if (++attempts < 120) window.setTimeout(attempt, 250);
  }
  attempt();
}
async function startup(data) {
  TMStopped = false;
  var zotero = await tmReadyZotero();
  if (!zotero || TMStopped) return;
  await zotero.initializationPromise;
  if (TMStopped) return;
  TMRoot = data.rootURI || data.resourceURI.spec;
  TMCore = { Zotero:zotero, Services:TMServices };
  // Both engines execute the same reviewed source; legacy syntax is generated
  // at build time, without modifying browser globals.
  var major = parseInt(zotero.version, 10);
  TMServices.scriptloader.loadSubScript(TMRoot + (major < 7 ? 'core-legacy.js' : 'core.js'), TMCore, 'UTF-8');
  TMServices.scriptloader.loadSubScript(TMRoot + (major < 7 ? 'features-legacy.js' : 'features.js'), TMCore, 'UTF-8');
  TabGroups = TMCore.TabGroups;
  TabGroups.load();
  try { await TabGroups.registerSettings(TMRoot); } catch(error) { zotero.logError(error); }
  TMWindowListener = {
    onOpenWindow:function(xulWindow) {
      var window = tmDOMWindow(xulWindow);
      window.addEventListener('load',function(){tmAttach(window);},{once:true});
    },
    onCloseWindow:function(xulWindow) {
      var window;
      try { window=tmDOMWindow(xulWindow); } catch(e){return;}
      if(TabGroups && TabGroups.windows.has(window))TabGroups.windows.get(window).dispose();
    },
    onWindowTitleChange:function(){}
  };
  TMServices.wm.addListener(TMWindowListener);
  TabGroups.mainWindows().forEach(tmAttach);
}
function shutdown() {
  TMStopped = true;
  if(TMReadyListener)TMServices.wm.removeListener(TMReadyListener);
  TMReadyListener=null;
  if(TMReadyResolve)TMReadyResolve(null);
  TMReadyResolve=null;
  if(TMWindowListener)TMServices.wm.removeListener(TMWindowListener);
  TMWindowListener=null;
  if(TabGroups)TabGroups.stop();
  TMCore=null; TabGroups=null;
}
function install(){}
function uninstall(){}
function onMainWindowLoad(data){tmAttach(data.window);}
function onMainWindowUnload(data){if(TabGroups && TabGroups.windows.has(data.window))TabGroups.windows.get(data.window).dispose();}
