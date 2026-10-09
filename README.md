# お布団巻き is watching you

一个可以自己部署的个人活动状态页。看看设备此刻在做什么，再翻一页，看看今天的时间去了哪里。界面以お布団巻き和《Monitoring》为主题，设备上报和状态识别基于 [Monika-Dream/live-dashboard](https://github.com/Monika-Dream/live-dashboard)。

每个人部署自己的服务、配置自己的设备和昵称。网站只负责展示；是否分享、分享给谁，由部署者决定。

- 实时应用、在线状态、电量和播放器信息。
- 跨设备去重的每日时长、软件饼图、小时分布和活动回放。
- 整屏眨眼转场、滚轮翻页、十种 Q 版彩蛋，可关闭动态效果。
- Android 配套 App，可设置网站昵称，按需同步 Health Connect 数据。
- [Windows 独立客户端](companions/windows/README.md)，支持当前账号登录启动、异常恢复与手动停止。

播放信息会分别显示歌名、歌手或视频标题，并标注设备和来源。手机兼容系统媒体会话里的应用包名；电脑兼容原版客户端的播放器信息和已知视频站标题。普通网页、文档及本地文件名继续隐藏。具体支持方式见 [桌面播放信息适配](companions/windows/README.md)。

**开始使用：[部署说明](deployment/README.md) · [Android 安装与配置](companions/android/README.md) · [下载版本](https://github.com/henryzhou9527-ship-it/ofton-is-watching-you/releases)**

当前完整后端使用飞书妙搭的 NestJS 运行环境与 PostgreSQL。只预览前端可以在本机运行；连接自己的兼容后端后才能显示设备数据。GitHub 提供源码与安装包，不提供公共采集服务器。

## 页面与交互

手机上滑进入「今天」，下滑回到「此刻」，沿用同一套转场。长列表优先滚动内容，到边界后重新滑动才翻页；轻点、横向滑动、双指缩放和表单操作保留原有行为。

网页顶部用眼睛和统计图标切换「此刻」与「今天」，也可用鼠标滚轮上下整屏切换；今天的统计、软件、回放与健康各自切换。回放按可用空间分页，日期与筛选会保留。同一设备、同一软件在两分钟内短暂切出后回来，且使用占比达到八成时，会合并展示；中间切出的时间不计入时长。打开「细分记录」可查看原来的小段。特效可以关闭，也会遵循系统的减少动态效果设置。

## 在 Android App 设置网站昵称

网站只提供浏览，不显示昵称编辑入口。配套 Android App 的源码在 `companions/android`。

部署者先在 App 的「设置」里保存自己的服务器地址和设备 Token，再在同一页的「网站昵称」输入名字，点击「保存昵称」。网站会在 30 秒内读取新名字，刷新网页也会立即更新。昵称保存在自己部署的服务器上，对访客一致，不依赖某个浏览器。

「读取当前昵称」可查看服务器上已保存的名字。此功能使用已有设备密钥验证身份，不需要注册账号，也不会在每次心跳时重新覆盖昵称。

新部署的数据库初始化脚本已包含昵称表；升级已有服务器时，先应用 `deployment/migrations/001-site-nickname.sql`，再部署新版后端。旧版后端或旧版 App 不具备此设置功能。

## 配置自己的数据源

源码不预设个人昵称、地址或设备。复制 `.env.example` 为 `.env.local`，仅在前后端分开部署时填写自己的后端地址：

```dotenv
VITE_API_BASE_URL="https://你的状态页服务器"
```

地址填后端根地址，不加 `/api`。前后端在同一个应用时留空。`.env.local` 已被 Git 忽略，不进入源码包。`VITE_DISPLAY_NAME`、后端 `DISPLAY_NAME` 可以提供第一次设置前的默认名字；App 保存的昵称始终优先。

`VITE_` 变量属于公开网页配置。设备 Token、数据库密钥等只放在 App 的安全存储或服务器环境变量里。

## 使用已有后端

需要 Node.js 24。先填好上面的配置，再运行：

```sh
npm ci
npm run dev:preview
npm run build:preview
```

将生成的 `preview-dist` 部署为自己的妙搭 HTML 应用。后端需提供兼容的 `/api/current`、`/api/timeline`、`/api/config` 接口，并允许前端读取。

## 自己部署完整服务

新建自己的妙搭全栈应用，使用本项目的前端与后端源码。将 `VITE_API_BASE_URL` 和 `apiBaseUrl` 留空，在自己的数据库初始化 `deployment/schema-postgres.sql`，通过服务器环境变量配置 `HASH_SECRET` 和 `DEVICE_TOKEN_N`，然后运行 `npm run build` 并发布。

每个设备使用独立随机 Token。`DEVICE_TOKEN_N` 的格式为 `token:device_id:device_name:platform`，支持 android、windows、macos、linux。采集客户端继续使用 `/api/report` 与 `/api/consent`。请配置自己的服务器和设备，不复制示例站的连接信息。

## 源码与素材

代码采用 [MIT](LICENSE) 许可，保留 [上游许可](LICENSE-original-dashboard)。主题图片不在代码的 MIT 授权范围内，不能当作可任意再分发或商用的素材。图片、字体、图标的来源与许可说明见 [素材与致谢](ASSETS.md)，其中也列出了尚需权利人确认的图片使用范围。设计约定见 [DESIGN.md](DESIGN.md)。

这些说明只存在于项目文档中，网页不展示部署教程或源码入口。

小字使用本地托管的霞鹜文楷屏幕阅读版，字体与网页字体打包的许可保留在 `client/src/fonts/wenkai`，分发副本位于 `client/public/licenses`。Q 版彩蛋使用透明图集，十种动作随机轮换，沿用页面的特效开关。

## 开发与验证

```sh
npm ci
npm test
npm run type:check
npm run eslint
npm run stylelint
npm run build:preview
```

Android 构建见 [BUILD.md](companions/android/BUILD.md)。桌面采集端可参考上游的 [Windows](https://github.com/Monika-Dream/live-dashboard/tree/windows-source)、[macOS](https://github.com/Monika-Dream/live-dashboard/tree/macos-source) 与 [Linux](https://github.com/Monika-Dream/live-dashboard/tree/linux-source) 分支，配置成自己的服务器与设备 Token；活动上报需要先通过 `/api/consent` 授权。

## 分享源码

本仓库从干净快照开始，不包含个人实例的历史、设备记录或连接配置。`.env.local`、`.env.*.local`、`.spark/`、构建目录、Android 签名文件与私人设备配置不应提交。发布自己修改过的版本前，也请检查这些内容。
