# Windows 配套客户端

Windows 客户端包含独立 Python 运行环境，不依赖终端、编辑器或外部 Python 安装。

## 安装和日常使用

从 [Releases](https://github.com/henryzhou9527-ship-it/ofton-is-watching-you/releases) 下载 Windows 压缩包，完整解压后运行：

```powershell
powershell -NoProfile -File .\Install.ps1
```

安装程序只为当前账号创建计划任务，使用普通用户权限，不保存 Windows 登录密码。服务器地址和设备 Token 由自己填写，后端需要已为该设备启用 `activity_reporting` 授权。已有配置可以通过 `-ConfigPath` 参数导入；配置文件不会打进安装包。

通常安装在 `%LOCALAPPDATA%\OftonWatching`。如果安装程序运行在会虚拟化 AppData 的 MSIX 应用里，会自动改用 `%USERPROFILE%\Documents\OftonWatching`，避免计划任务看不到文件。也可通过 `-InstallDirectory` 指定独立目录。安装最后会实际通过 Windows 计划任务启动一次，检查启动结果。

- 登录当前账号后自动启动；每分钟检查一次守护进程是否需要重启。
- 采集进程意外退出后自动重启，采集循环约两分钟没有响应时重启。
- 网络失败持续重试，最长重试间隔为 30 秒；只有服务端明确确认后才记录成功时间。
- 笔记本切换到电池供电不会被计划任务停止，也没有默认三天运行时限。
- 睡眠期间不唤醒电脑；恢复后继续采集。关机、睡眠或断网期间不会编造在线状态。

在安装目录双击 `Start.cmd`、`Stop.cmd`、`Status.cmd`，或使用开始菜单的对应入口。**手动停止会一直保持停止，包括重新登录之后；恢复时再点启动。** 托盘里的「停止上报并退出」也是同样行为。

本机配置、最近成功上报时间和滚动日志保存在安装目录的 `data` 文件夹，限制当前账号与 SYSTEM 访问。诊断记录不保存设备 Token、文档名或窗口原文。

卸载自动启动入口时运行 `Uninstall.ps1`。使用自定义目录安装的，卸载也传入相同的 `-InstallDirectory`。卸载保留配置和旧程序备份。

## 从源码构建

使用 Windows 和 Python 3.12，安装 `requirements-build.txt` 后运行 `build.ps1`。构建先运行自动恢复测试，再生成独立客户端和安装脚本。不要把自己的 `data`、`config.json`、日志或安装任务 XML 提交到仓库。

采集代码基于 [Monika-Dream/live-dashboard 的 windows-source 分支](https://github.com/Monika-Dream/live-dashboard/tree/windows-source)，原 MIT 许可保留在 [LICENSE](LICENSE)。本版本增加独立进程守护、持久停止状态、循环健康检查和本地标题过滤。

## 播放信息适配

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
