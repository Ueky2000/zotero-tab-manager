/* Test-only bootstrap. Compatible with Firefox 60. Never install in a real profile. */
var HS=typeof Services!=='undefined'?Services:ChromeUtils.import('resource://gre/modules/Services.jsm').Services;
async function ready() {
  if(typeof Zotero!=='undefined')return Zotero;
  return new Promise(function(resolve){
    var listener={
      onOpenWindow:function(x){
        var w=x.docShell&&x.docShell.domWindow?x.docShell.domWindow:x.QueryInterface(Components.interfaces.nsIInterfaceRequestor).getInterface(Components.interfaces.nsIDOMWindow);
        w.addEventListener('load',function(){inspect(w);},{once:true});
      },onCloseWindow:function(){},onWindowTitleChange:function(){}
    };
    function inspect(w){if(w.Zotero&&w.Zotero_Tabs){HS.wm.removeListener(listener);resolve(w.Zotero);}}
    HS.wm.addListener(listener);
    var windows=HS.wm.getEnumerator(null);while(windows.hasMoreElements())inspect(windows.getNext());
  });
}
async function startup(data) {
  var Z=await ready();
  // Keep unrelated remote repository notices from opening modal dialogs and
  // taking focus during an isolated UI test. Preserve all update payload data.
  var request=Z.HTTP.request;
  Z.HTTP.request=async function(method,url){
    var response=await request.apply(this,arguments);
    if(/^https:\/\/repo\.zotero\.org\/repo\/updated/.test(String(url))&&response.responseXML)
      Array.from(response.responseXML.querySelectorAll('message')).forEach(function(node){node.remove();});
    return response;
  };
  await Z.initializationPromise;
  var root=data.rootURI||data.resourceURI.spec,scope={ChromeUtils:ChromeUtils,Components:Components};
  HS.scriptloader.loadSubScript(root+'run-legacy.js',scope,'UTF-8');
  if(Z.Prefs.get('extensions.tabManager.testSuite',true)==='groups')
    await scope.runGroupListHarness(Z,HS,Z.Prefs.get('extensions.tabManager.testOutput',true),Z.Prefs.get('extensions.tabManager.testFixtures',true));
  else if(Z.Prefs.get('extensions.tabManager.testSuite',true)==='settings')
    await scope.runSettingsHarness(Z,HS,Z.Prefs.get('extensions.tabManager.testOutput',true),Z.Prefs.get('extensions.tabManager.testFixtures',true));
  else await scope.runCompatHarness(Z,HS,Z.Prefs.get('extensions.tabManager.testRoot',true),Z.Prefs.get('extensions.tabManager.testOutput',true),Z.Prefs.get('extensions.tabManager.testFixtures',true));
}
function shutdown(){}
function install(){}
function uninstall(){}
