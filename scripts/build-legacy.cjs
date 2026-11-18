/* Run with a pinned @babel/standalone build file as the first argument. */
const fs = require('fs');
const path = require('path');
const babel = require(process.argv[2] ? path.resolve(process.argv[2]) : '@babel/standalone');
const root = path.resolve(__dirname,'..');
const src = path.join(root,'src');
for (const name of ['core','features']) {
  const result = babel.transform(fs.readFileSync(path.join(src,name+'.js'),'utf8'), {
    presets:[['env',{targets:{firefox:'60'},modules:false,useBuiltIns:false}]],
    sourceType:'script', comments:true, compact:false
  });
  fs.writeFileSync(path.join(src,name+'-legacy.js'),result.code+'\n');
}
fs.writeFileSync(path.join(root,'tests/harness/run-legacy.js'),babel.transform(
  fs.readFileSync(path.join(root,'tests/compat-harness.js'),'utf8'),{
    presets:[['env',{targets:{firefox:'60'},modules:false,useBuiltIns:false}]],
    sourceType:'script',comments:true,compact:false
  }).code+'\n');
