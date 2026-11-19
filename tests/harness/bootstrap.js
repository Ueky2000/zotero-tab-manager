/* Test-only bootstrap for Zotero 7–10. Never install in a real profile. */
var HS=Services;
async function startup(data) {
  var Z=Zotero;
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
  HS.scriptloader.loadSubScript(root+'run.js',scope,'UTF-8');
  if(Z.Prefs.get('extensions.tabManager.testSuite',true)==='workspace')
    await scope.runWorkspaceHarness(Z,HS,Z.Prefs.get('extensions.tabManager.testOutput',true),Z.Prefs.get('extensions.tabManager.testFixtures',true));
  else if(Z.Prefs.get('extensions.tabManager.testSuite',true)==='groups')
    await scope.runGroupListHarness(Z,HS,Z.Prefs.get('extensions.tabManager.testOutput',true),Z.Prefs.get('extensions.tabManager.testFixtures',true));
  else if(Z.Prefs.get('extensions.tabManager.testSuite',true)==='settings')
    await scope.runSettingsHarness(Z,HS,Z.Prefs.get('extensions.tabManager.testOutput',true),Z.Prefs.get('extensions.tabManager.testFixtures',true));
  else await scope.runCompatHarness(Z,HS,Z.Prefs.get('extensions.tabManager.testRoot',true),Z.Prefs.get('extensions.tabManager.testOutput',true),Z.Prefs.get('extensions.tabManager.testFixtures',true));
}
function shutdown(){}
function install(){}
function uninstall(){}
