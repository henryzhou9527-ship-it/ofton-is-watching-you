"""Cloud destination/privacy adapters. No OS capture occurs on import or in these helpers."""
import json
import os
from pathlib import Path
import re
import time
from urllib.parse import urlparse
import ipaddress
from media_metadata import protect_media_extra

FILE_OR_PATH = re.compile(r'(?:file://|[a-z]:[\\/]|\\\\[^\\]+\\|(?:^|\s)/[\w.-]+/|\.(?:pdf|docx?|xlsx?|pptx?|odt|ods|odp|txt|md|csv|json|xml|ya?ml|py|tsx?|jsx?|cpp|h|rs|go|java|cs|sql|psd|ai|blend|dwg|zip|7z|rar|mp[34]|mkv|avi|flac|wav)(?:\b|$))', re.I)
MUSIC_SOURCES = {'spotify', 'qq音乐', '网易云音乐', 'apple music', 'youtube music', '酷狗音乐', '酷我音乐', 'amazon music'}
HOST_NAMES = ['Minecraft', 'JQuake', 'Ghidra', 'jadx', 'JDownloader', 'Burp Suite', 'RuneLite', 'DBeaver', 'JMeter', 'VisualVM', 'Arduino IDE', 'JD-GUI']


def validate_server_url(value):
    parsed = urlparse(value)
    if not parsed.hostname or parsed.username or parsed.password or parsed.query or parsed.fragment:
        return '请填写完整服务器地址，不要包含用户名、密码或查询参数'
    if parsed.scheme == 'https':
        return None
    if parsed.scheme == 'http':
        if parsed.hostname == 'localhost':
            return None
        try:
            address = ipaddress.ip_address(parsed.hostname)
            if address.is_private or address.is_loopback:
                return None
        except ValueError:
            pass
    return '公网服务器需要 HTTPS；HTTP 仅用于本机或局域网 IP'


def host_label(app_id, title):
    if app_id.lower() not in {'javaw.exe', 'java.exe', 'javaw', 'java'}:
        return None
    for name in HOST_NAMES:
        signature = 'arduino' if name == 'Arduino IDE' else name.lower()
        if signature in (title or '').lower():
            return name
    return 'Java 应用'  # Never guess an application name from arbitrary document text.


def blocked_activity(app_id, title):
    blocklist = json.loads((Path(__file__).parent / 'nsfw-blocklist.json').read_text('utf-8'))
    if app_id.lower() in {a.lower() for a in blocklist['app_ids']}:
        return True
    text = (title or '').lower()
    if any(word.lower() in text for word in blocklist['keywords']):
        return True
    domains = re.findall(r'(?:https?://)?(?:www\.|m\.)?([a-z0-9][-a-z0-9]*(?:\.[a-z0-9][-a-z0-9]*)+)', text)
    return any(domain == blocked or domain.endswith('.' + blocked)
               for domain in domains for blocked in blocklist['domains'])


def protect_extra(raw):
    return protect_media_extra(raw)


def watch_control(shutdown_event, tray):
    value = os.environ.get('SHIJIAN_AGENT_CONTROL_PATH')
    if not value:
        return
    control = Path(value)
    while not shutdown_event.is_set():
        try:
            if control.read_text('utf-8').strip() == 'stop':
                shutdown_event.set()
                if tray and tray._icon:
                    tray._icon.stop()
                return
        except OSError:
            pass
        time.sleep(0.5)
