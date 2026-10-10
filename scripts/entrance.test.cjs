const fs = require('node:fs');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: filename,
}).outputText, filename);
const { entranceCanClose, entranceSwipe } = require('../client/src/lib/entrance.ts');
test('cached data and image still get a readable entrance, then release immediately', () => {
  assert.equal(entranceCanClose(0, true, true), false);
  assert.equal(entranceCanClose(1349, true, true), false);
  assert.equal(entranceCanClose(1350, true, true), true);
});
test('slow data and failed imagery cannot hold the website indefinitely', () => {
  assert.equal(entranceCanClose(1500, false, true), false);
  assert.equal(entranceCanClose(1500, true, false), false);
  for (const [data, image] of [[false,false],[false,true],[true,false]]) {
    assert.equal(entranceCanClose(3200, data, image), true);
  }
});
test('only a deliberate upward swipe skips, not a tap, horizontal gesture or downward drag', () => {
  assert.equal(entranceSwipe(5, -80), true);
  for (const [x,y] of [[0,0],[2,-10],[0,-50],[80,-60],[0,100],[-120,-80]]) {
    assert.equal(entranceSwipe(x,y), false);
  }
});
