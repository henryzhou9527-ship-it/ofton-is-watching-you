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
const { buildActivityView } = require('../client/src/lib/activity-view.ts');
const date = '2026-10-07';
const time = (hour, minute = 0, second = 0) => new Date(2026, 9, 7, hour, minute, second).toISOString();
const now = Date.parse(time(20));
const segment = (device, app, start, end) => ({
  device_id: device, device_name: device, app_id: app, app_name: app,
  started_at: start, ended_at: end, status_text: '', duration_minutes: 999,
});
const view = (segments, device = null, devices = []) => buildActivityView(segments, devices, date, device, now);
const hourTotal = value => value.hourly.reduce((sum, seconds) => sum + seconds, 0);

test('simultaneous devices count once for total and hourly time', () => {
  const segments = [segment('phone', 'Reader', time(10), time(11)), segment('pc', 'Editor', time(10), time(11))];
  const result = view(segments);
  assert.equal(result.total, 3600);
  assert.equal(result.hourly[10], 3600);
  assert.equal(hourTotal(result), result.total);
  assert.equal(view(segments, 'phone').total, 3600);
  assert.equal(view(segments, 'pc').total, 3600);
  assert.equal(result.sessions.length, 2, 'Replay keeps both device records');
});

test('partial, nested, duplicate and chained overlaps form one union', () => {
  const segments = [
    segment('phone', 'Reader', time(9, 50), time(10, 10)),
    segment('pc', 'Editor', time(10), time(10, 20)),
    segment('tablet', 'Chat', time(10, 5), time(10, 15)),
    segment('pc', 'Editor', time(10), time(10, 20)),
    segment('phone', 'Chat', time(10, 30), time(10, 40)),
    segment('phone', 'idle', time(10, 40), time(11)),
  ];
  const result = view(segments.reverse());
  assert.equal(result.total, 40 * 60);
  assert.equal(result.hourly[9], 10 * 60);
  assert.equal(result.hourly[10], 30 * 60);
  assert.equal(hourTotal(result), result.total);
  assert.ok(result.hourly.every(seconds => seconds <= 3600));
  assert.equal(result.ranked.some(app => app.name === 'idle'), false);
});

test('same-app overlap is deduplicated without inventing which different app had attention', () => {
  const result = view([
    segment('phone', 'Chat', time(10), time(11)),
    segment('pc', 'Chat', time(10, 30), time(11, 30)),
    segment('tablet', 'Reader', time(10), time(11)),
  ]);
  assert.equal(result.total, 90 * 60);
  assert.equal(result.ranked.find(app => app.name === 'Chat').seconds, 90 * 60);
  assert.equal(result.ranked.find(app => app.name === 'Reader').seconds, 60 * 60);
});

test('idle and unknown gaps remain uncounted, even gaps shorter than a second', () => {
  const start = Date.parse(time(10));
  const stamp = milliseconds => new Date(start + milliseconds).toISOString();
  const result = view([
    segment('phone', 'Reader', stamp(0), stamp(1000)),
    segment('phone', 'Reader', stamp(1800), stamp(2800)),
    segment('pc', 'idle', stamp(0), stamp(10000)),
  ]);
  assert.equal(result.total, 2);
  assert.equal(result.ranked[0].seconds, 2);
  assert.equal(result.sessions.filter(session => session.app_id === 'Reader').length, 2);
  assert.equal(view([segment('phone', 'idle', time(9), time(11))]).total, 0);
});

test('midnight, current heartbeat and device filters bound confirmed intervals', () => {
  const result = view([
    segment('phone', 'Reader', new Date(2026, 9, 6, 23, 55).toISOString(), time(0, 10)),
    segment('pc', 'Editor', time(0, 5), time(0, 15)),
  ]);
  assert.equal(result.total, 15 * 60);
  assert.equal(hourTotal(result), result.total);
  const device = { device_id: 'phone', app_id: 'Chat', last_seen_at: time(12, 3), is_online: 0 };
  assert.equal(view([segment('phone', 'Chat', time(12), null)], null, [device]).total, 180);
  assert.equal(view([segment('phone', 'Chat', time(12), null)], null, [{ ...device, app_id: 'Other' }]).total, 0);
  assert.equal(view([segment('phone', 'Reader', time(23), time(23, 30))]).total, 0);
});

test('random overlapping records match an independent per-second occupancy count', () => {
  let seed = 17;
  const random = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;
  for (let run = 0; run < 100; run++) {
    const occupied = new Set();
    const segments = Array.from({ length: 30 }, (_, index) => {
      const start = Math.floor(random() * 60);
      const end = start + Math.floor(random() * (61 - start));
      const app = index % 5 === 0 ? 'idle' : `App${index % 3}`;
      if (app !== 'idle') for (let second = start; second < end; second++) occupied.add(second);
      return segment(`device${index % 4}`, app, time(10, 0, start), time(10, 0, end));
    });
    const result = view(segments);
    assert.equal(result.total, occupied.size);
    assert.equal(result.hourly[10], occupied.size);
    assert.equal(hourTotal(result), result.total);
  }
});
