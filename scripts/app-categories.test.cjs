const fs = require('node:fs');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }, fileName: filename,
}).outputText, filename);
const { CATEGORIES, classifyApp, buildCategoryUsage, currentMood } = require('../client/src/lib/app-categories.ts');
const app = (id, name = id) => ({ app_id: id, app_name: name });
const session = (name, start, end, device_id = 'pc') => ({ ...app(name), start: start * 1000, end: end * 1000, seconds: end - start, device_id });
const seconds = sessions => Object.fromEntries(buildCategoryUsage(sessions).ranked.map(item => [item.id, item.seconds]));

test('desktop names and Android packages map to the same six everyday categories', () => {
  for (const [category, names] of Object.entries({ work: ['EXCEL.EXE', 'Codex', 'com.openai.chatgpt', '飞书'], game: ['sts2.exe', '杀戮尖塔2', 'com.tencent.tmgp.sgame', 'StarRail.exe'], entertainment: ['tv.danmaku.bili', '网易云音乐', 'YouTube'], study: ['com.maimemo.android.momo', 'AnkiDroid', 'Zotero'], browse: ['msedge.exe', 'com.android.chrome', '三星浏览器'], social: ['com.tencent.mm', 'QQ', 'Discord'], tools: ['com.sec.android.app.launcher', '无界趣连', 'explorer.exe'] })) {
    for (const name of names) assert.equal(classifyApp(app(name)), category, name);
  }
});
test('unknown apps and browser pages never invent user intent from titles', () => {
  assert.equal(classifyApp({ ...app('chrome.exe', 'Chrome'), display_title: '数学课程', status_text: '正在工作' }), 'browse');
  assert.equal(classifyApp(app('unrecognized-game-like-name')), 'other');
});
test('reusable overrides prefer executable/package, then app label, and reject invalid categories', () => {
  assert.equal(classifyApp(app('tool.exe', 'Custom Tool'), { byId: { 'TOOL.EXE': 'study' }, byName: { 'Custom Tool': 'work' } }), 'study');
  assert.equal(classifyApp(app('unknown', 'Custom Tool'), { byName: { 'Custom Tool': 'work' } }), 'work');
  assert.equal(classifyApp(app('excel.exe'), { byId: { excel: 'invalid' } }), 'work');
});
test('private labels cannot leak the app category even through a custom override', () => {
  assert.equal(classifyApp(app('genshinimpact.exe', '私密应用'), { byId: { genshinimpact: 'game' } }), 'other');
});
test('offline, idle, loading and API failure never display a stale working meme', () => {
  const device = app('Excel');
  assert.equal(currentMood(device, true, true, false), 'work');
  assert.equal(currentMood(device, false, true, false), 'offline');
  assert.equal(currentMood(device, true, true, true), 'error');
  assert.equal(currentMood(device, false, false, false), 'loading');
  assert.equal(currentMood(app('idle'), true, true, false), 'idle');
});
test('two simultaneous devices are counted once and different categories share overlap', () => {
  const list = [session('Excel', 0, 600), session('Steam', 300, 900, 'phone')];
  assert.deepEqual(seconds(list), { work: 450, game: 450 });
  assert.equal(buildCategoryUsage(list).total, 900);
});
test('more devices of one category do not bias the shared time', () => {
  assert.deepEqual(seconds([session('Word', 0, 600), session('Excel', 0, 600, 'laptop'), session('Steam', 0, 600, 'phone')]), { work: 300, game: 300 });
});
test('idle and gaps stay empty, nested intervals and exact boundaries remain correct', () => {
  assert.deepEqual(seconds([session('Excel', 0, 60), session('Word', 10, 20), session('idle', 60, 120), session('Anki', 180, 240), session('Anki', 240, 300)]), { study: 120, work: 60 });
  assert.equal(buildCategoryUsage([session('idle', 0, 60), session('Excel', 10, 10), session('Steam', NaN, 100)]).total, 0);
});
test('visible percentages sum to 100 without rounding the underlying time', () => {
  const result = buildCategoryUsage([session('Excel', 0, 1), session('Steam', 1, 2), session('Anki', 2, 3)]);
  assert.deepEqual(result.ranked.map(item => item.percent), [34, 33, 33]);
  assert.equal(result.total, 3);
});
test('independent one-second occupancy oracle validates overlap totals across 100 generated timelines', () => {
  let seed = 82;
  const random = n => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed % n; };
  const names = ['Excel', 'Steam', 'Anki', 'Chrome', 'idle'];
  for (let run = 0; run < 100; run++) {
    const list = Array.from({ length: 12 }, () => { const start = random(120); return session(names[random(names.length)], start, start + random(60)); });
    let occupied = 0; const expected = {};
    for (let second = 0; second < 180; second++) {
      const active = new Set(list.filter(item => item.app_id !== 'idle' && item.start <= second * 1000 && item.end > second * 1000).map(classify => classifyApp(classify)));
      if (active.size) occupied++;
      for (const category of active) expected[category] = (expected[category] || 0) + 1 / active.size;
    }
    const result = buildCategoryUsage(list);
    assert.ok(Math.abs(result.total - occupied) < 1e-7);
    for (const item of result.ranked) assert.ok(Math.abs(item.seconds - expected[item.id]) < 1e-7);
  }
});

test('all eight categories have their own independent reaction illustration', () => {
  assert.equal(CATEGORIES.length, 8);
  assert.equal(new Set(CATEGORIES.map(category => category.sprite)).size, 8);
  for (const category of CATEGORIES) assert.equal(category.sprite, `juan-mood-${category.id}.png`);
});
