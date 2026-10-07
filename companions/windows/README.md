# 桌面播放信息适配

上游 Windows / macOS / Linux 客户端上报的 `extra.music` 仍然兼容。后端也可以从已知音乐、视频软件以及带明确站点后缀的浏览器标题中提取播放内容，其他窗口标题不显示。

如果自己的采集端在发送前就清空 `window_title`，可以把本目录的 `media_metadata.py` 和 `media-sources.json` 放在采集端旁边，在本地先提取播放信息：

```python
from media_metadata import media_from_window, protect_media_extra

extra = protect_media_extra(extra)
media = media_from_window(app_id, app_name, window_title)
if media:
    channel = 'video' if media['kind'] == 'video' else 'music'
    if not extra.get(channel, {}).get('title'):
        extra[channel] = media
payload = {'app_id': app_id, 'window_title': '', 'extra': extra}
```

这个模块本身不采集、不联网、不保存数据，也没有预设服务器。普通网页、文档名、文件路径和本地媒体文件名不会被当作视频名发送。浏览器方案与上游一样依据当前页面标题，无法据此确认视频是否暂停，也不能读取所有后台标签页。

手机沿用系统媒体会话信息，需要开启 App 的通知访问权限，且播放器本身提供媒体信息。部分 App 或视频不提供这些信息时，网页只显示正在使用的软件。

支持来源维护在 `shared/media-sources.ts`。修改后运行 `node scripts/sync-media-sources.cjs` 更新本目录的 JSON。网站会同时显示不同设备的播放内容，同一台电脑的背景音乐和前台视频也分别显示。
