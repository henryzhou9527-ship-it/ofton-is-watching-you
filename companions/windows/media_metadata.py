"""Optional local media-title filter for desktop collectors. No OS capture or networking."""
import json
from pathlib import Path
import re

SOURCES = json.loads(Path(__file__).with_name('media-sources.json').read_text('utf-8'))
BY_ALIAS = {alias.lower(): (name, kind) for name, kind, aliases in SOURCES for alias in [name, *aliases]}
PRIVATE_FILE = re.compile(r'(?:file://|[a-z]:[\\/]|\\\\[^\\]+\\|(?:^|\s)/[\w.-]+/|\.(?:pdf|docx?|xlsx?|pptx?|odt|ods|odp|txt|md|csv|json|xml|ya?ml|py|tsx?|jsx?|cpp|h|rs|go|java|cs|sql|psd|ai|blend|dwg|zip|7z|rar|mp[34]|mkv|avi|flac|wav)(?:\b|$))', re.I)
BROWSER = re.compile(r'^(?:chrome(?:\.exe)?|google chrome|msedge(?:\.exe)?|microsoft edge|firefox(?:\.exe)?|mozilla firefox|brave(?:\.exe)?|brave browser|opera(?:\.exe)?|safari|arc(?:\.exe)?|vivaldi(?:\.exe)?|360se\.exe|360chrome\.exe)$', re.I)
SITE_SUFFIX = re.compile(r'(?:\s[-–—|]\s|_)(哔哩哔哩(?:_bilibili)?|bilibili|YouTube(?: Music)?|Netflix|爱奇艺|优酷|腾讯视频|Twitch|niconico|AcFun|芒果TV|咪咕视频|西瓜视频|斗鱼|虎牙|Spotify|网易云音乐|QQ音乐)\s*$', re.I)


def media_from_window(app_id, app_name, raw_title):
    if not isinstance(raw_title, str) or PRIVATE_FILE.search(raw_title):
        return None
    title = re.sub(r'[\u200B-\u200D\uFEFF]', '', raw_title).strip()
    if not title or re.match(r'^(?:DevTools|开发者工具)\b', title, re.I):
        return None
    source = BY_ALIAS.get(app_id.lower()) or BY_ALIAS.get(app_name.lower())
    if BROWSER.fullmatch(app_id) or BROWSER.fullmatch(app_name):
        title = re.sub(r'\s[-–—|]\s(?:Google Chrome|Microsoft\s*Edge|Mozilla Firefox|Brave|Opera|Safari|Arc|Vivaldi)$', '', title, flags=re.I)
        title = re.sub(r'\s*(?:和另外\s*\d+\s*个页面|and\s+\d+\s+more\s+pages?)\s*$', '', title, flags=re.I).strip()
        title = re.sub(r'((?:\s[-–—|]\s|_)(?:YouTube|哔哩哔哩(?:_bilibili)?|bilibili))\s-\s[^-]+$', r'\1', title, flags=re.I)
        match = SITE_SUFFIX.search(title)
        if not match:
            return None
        source = BY_ALIAS.get(re.sub(r'_bilibili$', '', match[1], flags=re.I).lower())
        title = title[:match.start()].strip()
    elif source:
        match = SITE_SUFFIX.search(title)
        if match:
            title = title[:match.start()].strip()
    if not source or not title or title.lower() == source[0].lower():
        return None
    if re.match(r'^(?:首页|登录|注册|搜索|播放列表|个人中心|账号设置|我的收藏|历史记录|home|sign in|login|search|watch history|account)(?:\s|[-–—|:：]|$)', title, re.I):
        return None
    return {'app': source[0], 'kind': source[1], 'title': title[:256]}


def protect_media_extra(raw):
    result = {key: raw[key] for key in ['battery_percent', 'battery_charging'] if key in raw}
    for channel in ['music', 'video']:
        item = raw.get(channel)
        if not isinstance(item, dict) or not isinstance(item.get('app'), str):
            continue
        app = item['app'].strip()
        source = BY_ALIAS.get(app.lower())
        if not source and PRIVATE_FILE.search(app):
            continue
        media = {'app': app[:64]}
        if source:
            media.update(app=source[0], kind=source[1])
            for key in ['title', 'artist']:
                value = item.get(key)
                if isinstance(value, str) and not PRIVATE_FILE.search(value):
                    media[key] = value[:256]
        result[channel] = media
    return result
