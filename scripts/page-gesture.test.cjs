const fs = require('node:fs');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: filename,
}).outputText, filename);
const { createPageGesture, wheelPixels } = require('../client/src/lib/page-gesture.ts');

test('one mouse-wheel movement turns exactly one page despite its momentum', () => {
  const gate = createPageGesture();
  assert.equal(gate.next(100, 0, false), 'next');
  for (let time = 16; time < 1200; time += 16) assert.equal(gate.next(30, time, false), 'hold');
  assert.equal(gate.next(-100, 1500, false), 'previous');
});
test('small touchpad deltas accumulate and direction changes clear noise', () => {
  const gate = createPageGesture();
  assert.equal(gate.next(12, 0, false), 'hold');
  assert.equal(gate.next(15, 16, false), 'hold');
  assert.equal(gate.next(16, 32, false), 'next');
  const reverse = createPageGesture();
  assert.equal(reverse.next(35, 0, false), 'hold');
  assert.equal(reverse.next(-20, 16, false), 'hold');
  assert.equal(reverse.next(-25, 32, false), 'previous');
});
test('scrolling long details does not unexpectedly turn a page at the boundary', () => {
  const gate = createPageGesture();
  assert.equal(gate.next(-100, 0, true), 'native');
  assert.equal(gate.next(-80, 32, true), 'native');
  assert.equal(gate.next(-60, 64, false), 'hold');
  assert.equal(gate.next(-40, 96, false), 'hold');
  assert.equal(gate.next(-100, 400, false), 'previous');
});
test('momentum cannot scroll the destination after turning a page', () => {
  const gate = createPageGesture();
  assert.equal(gate.next(100, 0, false), 'next');
  assert.equal(gate.next(100, 200, true), 'hold');
  assert.equal(gate.next(100, 500, true), 'native');
});
test('rapid separate gestures wait for the short transition to finish', () => {
  const gate = createPageGesture();
  assert.equal(gate.next(100, 0, false), 'next');
  assert.equal(gate.next(-100, 220, false), 'hold');
  assert.equal(gate.next(-100, 370, false), 'previous');
});
test('pixel, line and page wheel modes are normalized', () => {
  assert.equal(wheelPixels(100, 0, 720), 100);
  assert.equal(wheelPixels(3, 1, 720), 48);
  assert.equal(wheelPixels(-1, 2, 720), -720);
  const gate = createPageGesture();
  assert.equal(gate.next(NaN, 0, false), 'native');
  assert.equal(gate.next(0, 0, false), 'native');
});
