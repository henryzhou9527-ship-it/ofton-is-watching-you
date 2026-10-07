export type MediaKind = 'music' | 'video';
export interface MediaSource { name: string; kind: MediaKind }

// Only media-session sources, never a general browser or document window title.
export const MEDIA_SOURCES: Array<[string, MediaKind, string[]]> = [
  ['Spotify', 'music', ['spotify.exe', 'com.spotify.music']],
  ['网易云音乐', 'music', ['cloudmusic.exe', 'com.netease.cloudmusic', 'netease-cloud-music', 'yesplaymusic']],
  ['QQ音乐', 'music', ['qqmusic.exe', 'com.tencent.qqmusic', 'com.tencent.qqmusiclite', 'qqmusic']],
  ['Apple Music', 'music', ['applemusic.exe', 'itunes.exe', 'com.apple.android.music', 'com.apple.Music']],
  ['YouTube Music', 'music', ['com.google.android.apps.youtube.music']],
  ['酷狗音乐', 'music', ['kugou.exe', 'com.kugou.android']],
  ['酷我音乐', 'music', ['kwmusic.exe', 'cn.kuwo.player']],
  ['Amazon Music', 'music', ['com.amazon.mp3']],
  ['汽水音乐', 'music', ['com.luna.music']],
  ['咪咕音乐', 'music', ['cmccwm.mobilemusic']],
  ['哔哩哔哩', 'video', ['bilibili', 'bilibili.exe', 'tv.danmaku.bili', 'com.bilibili.app.in', 'com.bilibili.app.blue']],
  ['YouTube', 'video', ['com.google.android.youtube', 'com.google.android.apps.youtube.kids']],
  ['腾讯视频', 'video', ['com.tencent.qqlive', 'qqlive.exe']],
  ['爱奇艺', 'video', ['com.qiyi.video', 'iqiyi.exe']],
  ['优酷', 'video', ['com.youku.phone', 'youku.exe']],
  ['芒果TV', 'video', ['com.hunantv.imgo.activity']],
  ['抖音', 'video', ['com.ss.android.ugc.aweme']],
  ['快手', 'video', ['com.smile.gifmaker']],
  ['Netflix', 'video', ['com.netflix.mediaclient']],
  ['Disney+', 'video', ['com.disney.disneyplus']],
  ['Prime Video', 'video', ['com.amazon.avod.thirdpartyclient']],
  ['Twitch', 'video', ['tv.twitch.android.app']],
  ['niconico', 'video', ['jp.nicovideo.android']],
  ['AcFun', 'video', ['tv.acfun.video']],
  ['咪咕视频', 'video', ['com.cmcc.cmvideo']],
  ['西瓜视频', 'video', ['com.ss.android.article.video']],
  ['斗鱼', 'video', ['air.tv.douyu.android']],
  ['虎牙', 'video', ['com.duowan.kiwi']],
  ['HBO', 'video', ['com.hbo.hbonow', 'com.wbd.stream']],
];

const byAlias = new Map<string, MediaSource>();
for (const [name, kind, aliases] of MEDIA_SOURCES) {
  for (const alias of [name, ...aliases]) byAlias.set(alias.toLowerCase(), { name, kind });
}

export function resolveMediaSource(value: unknown): MediaSource | undefined {
  return typeof value === 'string' ? byAlias.get(value.trim().toLowerCase()) : undefined;
}
