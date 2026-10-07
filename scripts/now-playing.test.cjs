const fs = require('node:fs');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { spawnSync } = require('node:child_process');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }, fileName: filename,
  }).outputText, filename);
};
const { protectExtra, protectDetails, protectProxyPayload } = require('../server/dashboard/core/services/title-protection.ts');
const { getNowPlaying } = require('../client/src/lib/now-playing.ts');
const { mediaFromWindow } = require('../shared/media-title.ts');
const { MEDIA_SOURCES } = require('../shared/media-sources.ts');

test('Android package IDs keep song and artist metadata and normalize to readable sources', () => {
  const result = protectExtra({ music: { app: 'com.netease.cloudmusic', title: '演示歌曲', artist: '测试歌手' } });
  assert.deepEqual(result.music, { app: '网易云音乐', kind: 'music', title: '演示歌曲', artist: '测试歌手' });
  for (const [name, kind, aliases] of MEDIA_SOURCES) {
    for (const app of [name, ...aliases]) {
      assert.deepEqual(protectExtra({ music: { app, title: '演示内容' } }).music, { app: name, kind, title: '演示内容' });
    }
  }
});

test('video metadata works through old Android music payloads and the separate video channel', () => {
  const video = { app: 'tv.danmaku.bili', title: '测试视频：小猫伸了个懒腰', artist: '测试 UP 主' };
  const result = protectExtra({ music: video, video });
  assert.equal(result.music.kind, 'video');
  assert.deepEqual(result.music, result.video);
  assert.deepEqual(protectExtra(result), result, 'the read-side filter keeps already-normalized metadata');
});

test('documents, paths, generic browsers and unrecognized players keep their existing protection', () => {
  for (const title of ['C:\\private\\plan.pdf', 'report.docx', 'file:///private/meeting', 'budget.xlsx', 'movie.mp4']) {
    assert.equal(protectExtra({ music: { app: 'Spotify', title } }).music.title, undefined);
  }
  for (const app of ['Chrome', 'VLC', 'private-editor', 'com.unknown.player']) {
    assert.equal(protectExtra({ music: { app, title: '私人文档' } }).music.title, undefined);
  }
  assert.equal(protectDetails('私人文档'), '');
  const proxy = protectProxyPayload({ window_title: '私人文档', display_title: '私人文档', extra: { music: { app: 'com.spotify.music', title: '演示歌曲' } } });
  assert.equal(proxy.window_title, undefined);
  assert.equal(proxy.display_title, '');
  assert.equal(proxy.extra.music.title, '演示歌曲');
});

const captionCases = [
  ['chrome.exe', 'Chrome', '演示视频_哔哩哔哩_bilibili - Google Chrome', '哔哩哔哩', '演示视频'],
  ['msedge.exe', 'Edge', '演示视频 - YouTube - Profile - Microsoft Edge', 'YouTube', '演示视频'],
  ['firefox.exe', 'Firefox', '演示视频 - YouTube — Mozilla Firefox', 'YouTube', '演示视频'],
  ['qqlive.exe', '腾讯视频', '演示剧集 - 腾讯视频', '腾讯视频', '演示剧集'],
  ['chrome.exe', 'Chrome', '演示歌曲 - YouTube Music - Google Chrome', 'YouTube Music', '演示歌曲'],
  ['code.exe', 'VS Code', '客户名单 - VS Code', null],
  ['chrome.exe', 'Chrome', '我的报告 - Google Docs - Google Chrome', null],
  ['chrome.exe', 'Chrome', '关于 YouTube 的私人笔记 - Google Chrome', null],
  ['chrome.exe', 'Chrome', 'DevTools - YouTube - Google Chrome', null],
  ['chrome.exe', 'Chrome', '登录 - YouTube - Google Chrome', null],
  ['chrome.exe', 'Chrome', 'private.pdf - YouTube - Google Chrome', null],
];
test('desktop compatibility extracts identified media captions without general page or file titles', () => {
  for (const [id, name, title, app, expected] of captionCases) {
    const result = mediaFromWindow(id, name, title);
    if (app === null) assert.equal(result, undefined, title);
    else { assert.equal(result.app, app); assert.equal(result.title, expected); }
  }
});

const now = Date.parse('2026-10-07T12:00:00Z');
const device = (id, extra, overrides = {}) => ({ device_id: id, device_name: id, app_id: 'idle', app_name: 'idle', platform: 'android', is_online: 1, last_seen_at: new Date(now).toISOString(), extra, ...overrides });
test('all devices and concurrent music/video remain visible even if the foreground app is idle', () => {
  const result = getNowPlaying([
    device('pc', { music: { app: 'Spotify', title: '歌曲 A' }, video: { app: 'YouTube', title: '视频 B' } }),
    device('phone', { music: { app: 'tv.danmaku.bili', title: '视频 C' } }),
  ], now);
  assert.deepEqual(result.map(item => item.title), ['歌曲 A', '视频 B', '视频 C']);
  assert.deepEqual(result.map(item => item.kind), ['music', 'video', 'video']);
  assert.equal(new Set(result.map(item => item.key)).size, 3);
});
test('offline, stale, stopped and duplicate playback is not shown as current', () => {
  const music = { app: 'YouTube', title: '演示视频' };
  const result = getNowPlaying([
    device('offline', { music }, { is_online: 0 }),
    device('stale', { music }, { last_seen_at: new Date(now - 120000).toISOString() }),
    device('invalid', { music }, { last_seen_at: '' }),
    device('stopped', {}),
    device('live', { music, video: music }),
  ], now);
  assert.equal(result.length, 1);
  assert.equal(result[0].deviceId, 'live');
});

test('optional Python desktop filter follows the same caption rules', context => {
  const result = spawnSync('python', ['-X', 'utf8', '-c', "import sys,json;sys.path.insert(0,'companions/windows');from media_metadata import media_from_window;print(json.dumps([media_from_window(*v[:3]) for v in json.load(sys.stdin)]))"], { input: JSON.stringify(captionCases), encoding: 'utf8' });
  if (result.error?.code === 'ENOENT') return context.skip('Python is not installed');
  assert.equal(result.status, 0, result.stderr);
  const actual = JSON.parse(result.stdout);
  captionCases.forEach((item, index) => assert.deepEqual(actual[index], mediaFromWindow(...item.slice(0, 3)) || null));
});
