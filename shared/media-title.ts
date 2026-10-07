import { resolveMediaSource, type MediaKind } from './media-sources';

export const PRIVATE_FILE_TITLE = /(?:file:\/\/|[a-z]:[\\/]|\\\\[^\\]+\\|(?:^|\s)\/[\w.-]+\/|\.(?:pdf|docx?|xlsx?|pptx?|odt|ods|odp|txt|md|csv|json|xml|ya?ml|py|tsx?|jsx?|cpp|h|rs|go|java|cs|sql|psd|ai|blend|dwg|zip|7z|rar|mp[34]|mkv|avi|flac|wav)(?:\b|$))/i;
const BROWSERS = /^(?:chrome(?:\.exe)?|google chrome|msedge(?:\.exe)?|microsoft edge|firefox(?:\.exe)?|mozilla firefox|brave(?:\.exe)?|brave browser|opera(?:\.exe)?|safari|arc(?:\.exe)?|vivaldi(?:\.exe)?|360se\.exe|360chrome\.exe)$/i;
const SITE_SUFFIX = /(?:\s[-–—|]\s|_)(哔哩哔哩(?:_bilibili)?|bilibili|YouTube(?: Music)?|Netflix|爱奇艺|优酷|腾讯视频|Twitch|niconico|AcFun|芒果TV|咪咕视频|西瓜视频|斗鱼|虎牙|Spotify|网易云音乐|QQ音乐)\s*$/i;

export interface MediaMetadata { app: string; kind: MediaKind; title: string; artist?: string }

/** Compatibility with desktop clients that still send a foreground window caption. */
export function mediaFromWindow(appId: string, appName: string, rawTitle: unknown): MediaMetadata | undefined {
  if (typeof rawTitle !== 'string' || PRIVATE_FILE_TITLE.test(rawTitle)) return undefined;
  let title = rawTitle.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
  if (!title || /^(?:DevTools|开发者工具)\b/i.test(title)) return undefined;
  let source = resolveMediaSource(appId) || resolveMediaSource(appName);
  if (BROWSERS.test(appId) || BROWSERS.test(appName)) {
    title = title.replace(/\s[-–—|]\s(?:Google Chrome|Microsoft\s*Edge|Mozilla Firefox|Brave|Opera|Safari|Arc|Vivaldi)$/i, '')
      .replace(/\s*(?:和另外\s*\d+\s*个页面|and\s+\d+\s+more\s+pages?)\s*$/i, '').trim();
    // Edge can append a profile name. Only accept it after an identifiable site suffix.
    title = title.replace(/((?:\s[-–—|]\s|_)(?:YouTube|哔哩哔哩(?:_bilibili)?|bilibili))\s-\s[^-]+$/i, '$1');
    const match = SITE_SUFFIX.exec(title);
    if (!match) return undefined;
    source = resolveMediaSource(match[1].replace(/_bilibili$/i, ''));
    title = title.slice(0, match.index).trim();
  } else if (source) {
    const match = SITE_SUFFIX.exec(title);
    if (match) title = title.slice(0, match.index).trim();
  }
  if (!source || !title || title.toLowerCase() === source.name.toLowerCase()) return undefined;
  if (/^(?:首页|登录|注册|搜索|播放列表|个人中心|账号设置|我的收藏|历史记录|home|sign in|login|search|watch history|account)(?:\s|[-–—|:：]|$)/i.test(title)) return undefined;
  return { app: source.name, kind: source.kind, title: title.slice(0, 256) };
}
