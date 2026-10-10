import overrides from '../../../deployment/app-categories.json';
import { isIdle, type Session } from './activity-view';
import type { DeviceState } from './api';

export const CATEGORIES = [
  { id: 'work', label: '工作', state: '工作中', color: 'oklch(78% .12 50)', quote: '妹妹，我不是闲人，我也要工作', sprite: 'juan-mood-work.png', alt: '小卷气鼓鼓地敲电脑，旁边冒着小火苗' },
  { id: 'game', label: '游戏', state: '游戏中', color: 'oklch(77% .13 294)', quote: '这把打完就下，真的', sprite: 'juan-mood-game.png', alt: '小卷握紧游戏手柄，满脸写着这把要赢' },
  { id: 'entertainment', label: '娱乐', state: '娱乐中', color: 'oklch(80% .12 346)', quote: '再看一个，刚才那个不算', sprite: 'juan-mood-entertainment.png', alt: '小卷抱着爆米花看视频，笑得很开心' },
  { id: 'study', label: '学习', state: '学习中', color: 'oklch(83% .10 173)', quote: '知识，快进我脑子里来！', sprite: 'juan-mood-study.png', alt: '小卷趴在书前认真记笔记，旁边堆着书' },
  { id: 'browse', label: '浏览', state: '浏览中', color: 'oklch(83% .10 240)', quote: '我就查个东西，怎么开了这么多页', sprite: 'juan-mood-browse.png', alt: '小卷拿着放大镜，从电脑后面好奇地探头' },
  { id: 'social', label: '聊天', state: '聊天中', color: 'oklch(86% .12 100)', quote: '等一下，群里有瓜', sprite: 'juan-mood-social.png', alt: '小卷拿着手机捂嘴偷笑，旁边冒出聊天气泡' },
  { id: 'tools', label: '工具', state: '折腾中', color: 'oklch(79% .05 260)', quote: '等我把这个调好，马上', sprite: 'juan-mood-tools.png', alt: '小卷拿着扳手和小齿轮，睁着蓝眼睛认真琢磨' },
  { id: 'other', label: '其他', state: '闲逛中', color: 'oklch(82% .035 290)', quote: '让我看看，又点开了什么', sprite: 'juan-mood-other.png', alt: '小卷睁着蓝眼睛，歪头摊手发懵' },
] as const;
export type CategoryId = typeof CATEGORIES[number]['id'];
export const categoryMeta = (id: CategoryId) => CATEGORIES.find(item => item.id === id)!;
export const isCategoryId = (value: unknown): value is CategoryId => CATEGORIES.some(item => item.id === value);
type App = { app_id: string; app_name: string };
type Overrides = { byId?: Record<string, string>; byName?: Record<string, string> };
const normalize = (value: string) => value.normalize('NFKC').toLowerCase().replace(/\.exe$/, '').replace(/[\s_:\-：·]/g, '');

// App identity only: never inspect window titles, documents, URLs or playback.
const groups: Record<CategoryId, string> = {
  work: 'Word|Microsoft Word|WINWORD|Excel|Microsoft Excel|PowerPoint|POWERPNT|Outlook|Microsoft Outlook|WPS|WPS Office|wpspdf|金山文档|飞书|Lark|Feishu|钉钉|DingTalk|企业微信|WeCom|WXWork|Microsoft Teams|Teams|Slack|Zoom|腾讯会议|WeMeet|Notion|Obsidian|OneNote|Microsoft OneNote|VS Code|Visual Studio Code|Code|Visual Studio|devenv|Cursor|Windsurf|Codex|ChatGPT|Claude|DeepSeek|豆包|通义|元宝|PyCharm|IntelliJ IDEA|WebStorm|Android Studio|Jupyter|MATLAB|RStudio|RStudio Desktop|Figma|Photoshop|Illustrator|Adobe Photoshop|Adobe Illustrator|InDesign|Premiere Pro|Adobe Premiere Pro|After Effects|Blender|AutoCAD|SolidWorks|GitHub Desktop|GitKraken|DBeaver|DataGrip|Postman|Xcode|Sublime Text|Vim|Neovim|Emacs|Typora|语雀|幕布|有道云笔记|印象笔记|Evernote|Canva|剪映|CapCut|达芬奇|DaVinci Resolve|Audacity|FL Studio|Ableton Live|com.openai.chatgpt|com.larus.nova|com.lark.suite|com.ss.android.lark|com.alibaba.android.rimet|com.tencent.wework|cn.wps.moffice_eng|com.microsoft.office.word|com.microsoft.office.excel|com.microsoft.office.powerpoint|com.microsoft.office.outlook|com.microsoft.teams|com.anthropic.claude',
  game: 'Steam|Steam Client WebHelper|steamwebhelper|Epic Games|EpicGamesLauncher|Battle.net|Ubisoft Connect|EA App|GOG Galaxy|Xbox|WeGame|Minecraft|我的世界|原神|Genshin Impact|GenshinImpact|YuanShen|崩坏3|Honkai Impact 3rd|崩坏：星穹铁道|Honkai: Star Rail|StarRail|绝区零|Zenless Zone Zero|ZenlessZoneZero|鸣潮|Wuthering Waves|英雄联盟|League of Legends|LeagueClient|LeagueClientUx|王者荣耀|和平精英|VALORANT|无畏契约|Counter-Strike 2|CS2|CSGO|Overwatch|守望先锋|Apex Legends|r5apex|PUBG|TslGame|Elden Ring|艾尔登法环|Roblox|星露谷物语|Stardew Valley|StardewValley|Terraria|泰拉瑞亚|杀戮尖塔|杀戮尖塔2|Slay the Spire|Slay the Spire 2|SlayTheSpire2|sts2|Balatro|小丑牌|明日方舟|Arknights|碧蓝航线|蔚蓝档案|重返未来：1999|恋与深空|第五人格|阴阳师|光遇|蛋仔派对|崩坏学园2|osu!|osu|Muse Dash|雀魂|Mahjong Soul|CLANNAD|Summer Pockets|千恋＊万花|Riddle Joker|Doki Doki Literature Club|Monika|com.mojang.minecraftpe|com.tencent.tmgp.sgame|com.tencent.tmgp.pubgmhd|com.hypergryph.arknights|com.miHoYo.Yuanshen|com.miHoYo.hkrpg|com.miHoYo.Nap',
  entertainment: '哔哩哔哩|bilibili|B站|哔哩哔哩HD|YouTube|YouTube Music|Netflix|爱奇艺|优酷|腾讯视频|芒果TV|抖音|快手|小红书|微博|Twitch|斗鱼|虎牙|Disney+|Prime Video|HBO|VLC|PotPlayer|PotPlayerMini64|mpv|Windows Media Player|Media Player|Spotify|网易云音乐|CloudMusic|QQ音乐|QQMusic|酷狗音乐|酷我音乐|汽水音乐|Apple Music|iTunes|foobar2000|AIMP|洛雪音乐助手|喜马拉雅|哔哩哔哩直播姬|tv.danmaku.bili|com.bilibili.app.in|com.bilibili.app.hd|com.google.android.youtube|com.google.android.apps.youtube.music|com.netease.cloudmusic|com.tencent.qqmusic|com.ss.android.ugc.aweme|com.smile.gifmaker|com.xingin.xhs|com.sina.weibo|com.spotify.music|com.qiyi.video|com.youku.phone|com.tencent.qqlive',
  study: 'Anki|AnkiDroid|Duolingo|多邻国|墨墨背单词|不背单词|百词斩|扇贝单词|扇贝阅读|有道词典|网易有道词典|欧路词典|欧路英语听力|每日英语听力|流利说|知米背单词|Quizlet|Coursera|edX|Khan Academy|学堂在线|中国大学MOOC|慕课网|学习通|雨课堂|智慧树|Zotero|Mendeley|EndNote|知网|ReadPaper|Goodnotes|Notability|微信读书|Kindle|Calibre|Apple Books|Apple Preview|Adobe Acrobat|Adobe Acrobat Reader|Acrobat|SumatraPDF|Foxit Reader|PDF Expert|MarginNote|SuperMemo|com.maimemo.android.momo|com.ichi2.anki|com.duolingo|cn.com.langeasy.LangEasyLexis|com.jiongji.andriod.card|com.shanbay.words|com.tencent.weread|com.youdao.dict|com.eusoft.eudic|com.chaoxing.mobile',
  browse: 'Chrome|Google Chrome|Chromium|Microsoft Edge|Edge|msedge|Firefox|Mozilla Firefox|Safari|Arc|Brave|Opera|Vivaldi|Zen|Zen Browser|Samsung Internet|三星浏览器|QQ浏览器|UC浏览器|夸克|Via|Alook|360安全浏览器|360极速浏览器|搜狗浏览器|百度|微信内置页面|com.android.chrome|org.mozilla.firefox|com.sec.android.app.sbrowser|com.microsoft.emmx|com.quark.browser|com.tencent.mtt|com.UCMobile|mark.via|com.baidu.searchbox',
  social: '微信|WeChat|Weixin|QQ|TIM|Telegram|Telegram Desktop|Discord|WhatsApp|Signal|LINE|Skype|Messages|信息|短信|小宇宙|Soul|贴吧|百度贴吧|Reddit|X|Twitter|Mastodon|Facebook|Messenger|Instagram|Snapchat|com.tencent.mm|com.tencent.mobileqq|com.tencent.tim|org.telegram.messenger|com.discord|com.whatsapp|jp.naver.line.android|com.samsung.android.messaging|com.google.android.apps.messaging',
  tools: 'Windows资源管理器|Windows 资源管理器|文件资源管理器|Explorer|Finder|文件管理|文件管理器|我的文件|系统设置|设置|SystemSettings|三星桌面|One UI Home|桌面|系统桌面|启动器|Windows Terminal|Terminal|PowerShell|pwsh|cmd|命令提示符|任务管理器|Taskmgr|计算器|Calculator|calc|截图工具|SnippingTool|Snipaste|ShareX|Everything|PowerToys|7-Zip|WinRAR|Bandizip|OneDrive|Dropbox|百度网盘|阿里云盘|夸克网盘|无界趣连|ToDesk|向日葵|RustDesk|AnyDesk|Monika Now|Ofton Watching|com.sec.android.app.launcher|com.android.settings|com.sec.android.app.myfiles|com.miui.home|com.huawei.android.launcher',
  other: '',
};
const defaults = new Map<string, CategoryId>();
for (const category of CATEGORIES) for (const app of groups[category.id].split('|').filter(Boolean)) defaults.set(normalize(app), category.id);
function findOverride(entries: Record<string, string> | undefined, key: string) {
  const match = entries && Object.entries(entries).find(([name]) => normalize(name) === key)?.[1];
  return isCategoryId(match) ? match : undefined;
}
export function classifyApp(app: App, custom: Overrides = overrides): CategoryId {
  const id = normalize(app.app_id); const name = normalize(app.app_name);
  // Masked private apps must stay masked even if their executable is recognized.
  if (/^(神秘应用|私密应用|隐私应用|secret|private)$/.test(name)) return 'other';
  return findOverride(custom.byId, id) ?? findOverride(custom.byName, name) ?? defaults.get(name) ?? defaults.get(id) ?? 'other';
}
export type MoodId = CategoryId | 'idle' | 'offline' | 'loading' | 'error';
export function currentMood(device: DeviceState | undefined, connected: boolean, loaded: boolean, error: boolean): MoodId {
  if (error) return 'error';
  if (!loaded) return 'loading';
  if (!connected || !device) return 'offline';
  return isIdle(device) ? 'idle' : classifyApp(device);
}

/** Partition the union, sharing each overlap equally between DISTINCT categories.
 * Two work devices never get twice the share of a single game device. */
export function buildCategoryUsage(sessions: readonly Session[]) {
  const events: { time: number; category: CategoryId; delta: number }[] = [];
  for (const session of sessions) {
    if (isIdle(session) || !Number.isFinite(session.start) || !Number.isFinite(session.end) || session.end <= session.start) continue;
    const category = classifyApp(session);
    events.push({ time: session.start, category, delta: 1 }, { time: session.end, category, delta: -1 });
  }
  events.sort((a, b) => a.time - b.time);
  const counts = new Map<CategoryId, number>(); const totals = new Map<CategoryId, number>();
  let previous = events[0]?.time ?? 0;
  for (let index = 0; index < events.length;) {
    const time = events[index]!.time;
    const active = [...counts].filter(([, count]) => count > 0);
    if (active.length && time > previous) {
      const share = (time - previous) / 1000 / active.length;
      for (const [category] of active) totals.set(category, (totals.get(category) ?? 0) + share);
    }
    while (index < events.length && events[index]!.time === time) {
      const event = events[index++]!;
      counts.set(event.category, (counts.get(event.category) ?? 0) + event.delta);
    }
    previous = time;
  }
  const ranked = CATEGORIES.map(category => ({ ...category, seconds: totals.get(category.id) ?? 0, percent: 0 })).filter(item => item.seconds > 0).sort((a, b) => b.seconds - a.seconds);
  const total = ranked.reduce((sum, item) => sum + item.seconds, 0);
  for (const item of ranked) item.percent = Math.floor(item.seconds / total * 100);
  const remainder = 100 - ranked.reduce((sum, item) => sum + item.percent, 0);
  const fractions = [...ranked].sort((a, b) => (b.seconds / total * 100 - b.percent) - (a.seconds / total * 100 - a.percent));
  for (const item of fractions.slice(0, remainder)) item.percent++;
  return { ranked, total };
}
