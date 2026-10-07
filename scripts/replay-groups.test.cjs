const fs = require('node:fs');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const ts = require('typescript');
process.env.TZ = 'Asia/Shanghai';
require.extensions['.ts'] = (module, filename) => {
  const result = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: filename,
  });
  module._compile(result.outputText, filename);
};
const { groupReplaySessions } = require('../client/src/lib/replay-groups.ts');
const { buildActivityView, clockText } = require('../client/src/lib/activity-view.ts');
const day = new Date(2026, 9, 7).getTime();
const stamp = second => new Date(day + second * 1000).toISOString();
const part = (app, start, end, device = 'pc', name = app) => ({
  app_id: app, app_name: name, device_id: device, device_name: device,
  started_at: stamp(start), ended_at: stamp(end), duration_minutes: (end - start) / 60,
  start: day + start * 1000, end: day + end * 1000, seconds: end - start, color: 'blue', status_text: '正在使用软件喵~',
});
const appGroups = (context, app = 'Game') => groupReplaySessions(context.filter(row => row.app_id === app), context);

test('brief returns consolidate a session without charging the intervening apps', () => {
  const context = [part('Game', 0, 90), part('Search', 90, 95), part('Game', 95, 2650), part('Chat', 2650, 2727), part('Game', 2727, 2732), part('Chat', 2732, 2778), part('Game', 2778, 3600)];
  const groups = appGroups(context);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].parts.length, 4);
  assert.equal(groups[0].seconds, 3472);
  assert.equal(groups[0].interruptionSeconds, 128);
  assert.equal(groups[0].end - groups[0].start, 3600000);
  const all = groupReplaySessions(context);
  assert.ok(all.some(row => row.app_id === 'Chat'));
  assert.ok(all.some(row => row.app_id === 'Search'));
  assert.equal(all.reduce((sum, row) => sum + row.parts.length, 0), context.length);
});

test('two-minute return boundary and minimum active share limit chaining', () => {
  assert.equal(appGroups([part('Game', 0, 600), part('Chat', 600, 720), part('Game', 720, 1200)]).length, 1);
  assert.equal(appGroups([part('Game', 0, 600), part('Chat', 600, 721), part('Game', 721, 1200)]).length, 2);
  assert.equal(appGroups([part('Game', 0, 120), part('Chat', 120, 180), part('Game', 180, 300)]).length, 1);
  assert.equal(appGroups([part('Game', 0, 120), part('Chat', 120, 180), part('Game', 180, 299)]).length, 2);
  assert.equal(appGroups([part('Game', 0, 20), part('Chat', 20, 40), part('Game', 40, 60), part('Chat', 60, 80), part('Game', 80, 100)]).length, 3);
});

test('idle and missing observations block a merge even when hidden by the app filter', () => {
  assert.equal(appGroups([part('Game', 0, 600), part('idle', 600, 601), part('Game', 601, 1200)]).length, 2);
  assert.equal(appGroups([part('Game', 0, 600), part('Game', 610, 1200)]).length, 2);
  assert.equal(appGroups([part('Game', 0, 600), part('Chat', 600, 630, 'phone'), part('Game', 630, 1200)]).length, 2);
  const shortGap = appGroups([part('Game', 0, 600), part('Game', 601, 1200)]);
  assert.equal(shortGap.length, 1);
  assert.equal(shortGap[0].seconds, 1199);
  assert.equal(shortGap[0].interruptionSeconds, 1);
});

test('devices, mapped apps, IDs and days remain separate', () => {
  assert.equal(groupReplaySessions([part('Game', 0, 600), part('Game', 600, 1200, 'phone')]).length, 2);
  assert.equal(groupReplaySessions([part('first.exe', 0, 600, 'pc', 'Game'), part('second.exe', 600, 1200, 'pc', 'Game')]).length, 2);
  assert.equal(groupReplaySessions([part('host.exe', 0, 600, 'pc', 'First'), part('host.exe', 600, 1200, 'pc', 'Second')]).length, 2);
  assert.equal(appGroups([part('Game', 86300, 86399), part('Chat', 86399, 86401), part('Game', 86401, 86500)]).length, 2);
  assert.equal(appGroups([part('Game', 0, 600), part('idle', 0, 1200, 'phone'), part('Chat', 600, 630), part('Game', 630, 1200)]).length, 1);
});

test('duplicate and overlapping observations count actual activity only once', () => {
  const groups = groupReplaySessions([part('Game', 0, 600), part('Game', 0, 600), part('Game', 300, 900)]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].seconds, 900);
  assert.equal(groups[0].interruptionSeconds, 0);
  assert.equal(groups[0].ended_at, stamp(900));
});

test('grouping does not mutate source sessions or affect any time statistics', () => {
  const raw = [part('Game', 0, 600), part('Chat', 600, 630), part('Game', 630, 1200)];
  const view = buildActivityView(raw, [], '2026-10-07', null, day + 86400000);
  const before = JSON.stringify(view);
  const frozen = Object.freeze(view.sessions.map(row => Object.freeze({ ...row })));
  const groups = groupReplaySessions(frozen);
  assert.equal(JSON.stringify(view), before);
  assert.equal(groups.find(row => row.app_id === 'Game').seconds, 1170);
  assert.equal(view.total, 1200);
  assert.equal(view.ranked.find(row => row.name === 'Game').seconds, 1170);
});

test('newest activity sorts first and short raw ranges display seconds', () => {
  const groups = groupReplaySessions([part('Game', 0, 600), part('Chat', 600, 630), part('Game', 630, 1200)]);
  assert.equal(groups[0].app_id, 'Game');
  assert.equal(clockText(stamp(20 * 3600 + 51 * 60 + 56), true), '20:51:56');
  assert.equal(clockText(stamp(20 * 3600 + 52 * 60 + 1), true), '20:52:01');
  assert.deepEqual(groupReplaySessions([]), []);
});
