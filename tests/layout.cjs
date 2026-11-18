/* State regression checks; run with node tests/layout.cjs. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
for (const file of ['core.js', 'core-legacy.js']) {
  let pref;
  const sandbox = { Zotero: { Prefs: { get: () => pref, set: (_key, value) => { pref = value; } }, logError: e => { throw e; } } };
  vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname, '../src', file), 'utf8'), sandbox);
  const p = sandbox.TabGroups;
  const ids = () => Array.from(p.orderedGroups(), g => g.id);
  const groups = [{id:'a',name:'Short',color:'#3977d5'}, {id:'b',name:'更长的研究主题',color:'#21866a'}];
  p.state.groups = groups;
  assert.deepEqual(ids(), ['a','b','']);
  pref = JSON.stringify({version:1,groups,assignments:{paper:'a'},order:['','b','a'],collapsed:['a'],remarks:{paper:{note:'keep'}},ungroupedColor:'#aabbcc'});
  p.load();
  assert.deepEqual(ids(), ['b','a','']);
  assert.equal(p.state.assignments.paper, 'a');
  assert.equal(p.state.remarks.paper.note, 'keep');
  assert.equal(p.state.ungroupedColor, '#aabbcc');
  assert.deepEqual(Array.from(p.state.collapsed), ['a']);
  p.moveGroup('', 'b'); p.load();
  assert.deepEqual(ids(), ['','b','a']); // A deliberate drag survives restart.
  p.moveGroup('', 'a', true);
  p.state.groups.push({id:'c',name:'New',color:'#3977d5'});
  assert.deepEqual(ids(), ['b','a','c','']); // New groups precede ungrouped.
  p.save(); p.load();
  assert.deepEqual(ids(), ['b','a','c','']); // Including after a restart.
  assert.equal(p.headingWidth(groups[0], 0), p.headingWidth(groups[0], 10000));
  assert.ok(p.headingWidth(groups[1]) > p.headingWidth(groups[0]));
  assert.equal(p.headingWidth({name:'研究主题'.repeat(100)}), 280);
  console.log(file + ': 12 layout/state assertions passed');
}
