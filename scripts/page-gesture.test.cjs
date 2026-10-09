const fs = require('node:fs');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: filename,
}).outputText, filename);
const { createPageGesture, createTouchPageGesture, wheelPixels } = require('../client/src/lib/page-gesture.ts');

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

const noScroll = { previous: false, next: false };
test('finger up and down turn one scene on release, not on every move', () => {
  const gate = createTouchPageGesture();
  gate.begin(120, 500, 0, noScroll);
  assert.equal(gate.move(122, 430), 'hold');
  assert.equal(gate.move(120, 300), 'hold');
  assert.equal(gate.end(120, 250, 400), 'next');
  assert.equal(gate.end(120, 200, 450), 'native', 'one touchend cannot turn twice');
  gate.begin(120, 200, 800, noScroll);
  assert.equal(gate.end(120, 400, 1000), 'previous');
});
test('taps, small finger jitter, horizontal drags and diagonal drags keep native behavior', () => {
  for (const [x, y] of [[100, 100], [103, 102], [100, 150], [250, 110], [190, 180]]) {
    const gate = createTouchPageGesture();
    gate.begin(100, 100, 0, noScroll);
    assert.equal(gate.end(x, y, 200), 'native');
  }
});
test('a list keeps its whole gesture; a fresh swipe at its edge can turn the scene', () => {
  const gate = createTouchPageGesture();
  gate.begin(100, 200, 0, { previous: true, next: true });
  assert.equal(gate.move(100, 280), 'native');
  assert.equal(gate.move(100, 500), 'native');
  assert.equal(gate.end(100, 550, 500), 'native');
  gate.begin(100, 200, 600, { previous: false, next: true });
  assert.equal(gate.end(100, 400, 850), 'previous');
});
test('a gesture which began horizontally or in a scrolling direction is never reassigned', () => {
  const gate = createTouchPageGesture();
  gate.begin(100, 300, 0, noScroll);
  gate.move(160, 300);
  assert.equal(gate.end(160, 100, 300), 'native');
  gate.begin(100, 300, 500, { previous: false, next: true });
  gate.move(100, 280);
  assert.equal(gate.end(100, 500, 800), 'native');
});
test('touch cancellation and pinch cancellation leave no pending page turn', () => {
  const gate = createTouchPageGesture();
  gate.begin(100, 400, 0, noScroll);
  gate.move(100, 300);
  gate.cancel();
  assert.equal(gate.end(100, 100, 250), 'native');
  gate.begin(100, 400, 300, noScroll);
  assert.equal(gate.end(100, 300, 500), 'next');
});
test('an initially diagonal finger movement can settle into a clear vertical swipe', () => {
  const gate = createTouchPageGesture();
  gate.begin(100, 400, 0, noScroll);
  assert.equal(gate.move(110, 390), 'native');
  assert.equal(gate.end(115, 250, 300), 'next');
});
test('rapid separate swipes do not reverse the scene while its transition is settling', () => {
  const gate = createTouchPageGesture();
  gate.begin(100, 400, 0, noScroll);
  assert.equal(gate.end(100, 200, 200), 'next');
  gate.begin(100, 200, 250, noScroll);
  assert.equal(gate.end(100, 400, 500), 'native');
  gate.begin(100, 200, 600, noScroll);
  assert.equal(gate.end(100, 400, 900), 'previous');
});
