# 部署自己的状态页

这份源码包括 React 前端、妙搭 NestJS 后端和 Android 采集端。数据存储接入的是妙搭平台 PostgreSQL；当前没有独立 Docker 或 SQLite 启动方案。

## 完整部署到飞书妙搭

需要自己的妙搭账号、可发布的全栈应用，以及该应用的数据库权限。应用地址和密钥都从自己的账号取得。

1. 在妙搭创建一个全栈应用，用妙搭提供的本地开发流程初始化项目。如果使用已安装并登录的 `lark-cli`，对应命令为：

   ```sh
   lark-cli auth login --domain apps
   lark-cli apps +create --name "お布団巻き is watching you" --app-type full_stack --as user
   lark-cli apps +init --app-id YOUR_APP_ID --dir ./my-ofton --as user
   ```

   将 `YOUR_APP_ID` 换成创建结果里的应用 ID。保留新项目的 `.git`、`.spark/` 和平台生成的 `.env.local`。

2. 下载本仓库源码，将源码文件复制到该项目目录。不要复制另一个仓库的 `.git`、`node_modules` 或任何个人环境文件。`VITE_API_BASE_URL` 与 `deployment/site.config.json` 中的 `apiBaseUrl` 保持空白，前后端便使用同一个应用。

3. 在自己的应用开发数据库执行 [schema-postgres.sql](schema-postgres.sql)。这是空库初始化脚本，没有任何示例用户数据。通过妙搭数据库工具执行；开发数据库的结构随应用发布进入线上环境。升级已有的旧版状态页时，先备份，再按需执行 [昵称迁移](migrations/001-site-nickname.sql)。

4. 在应用的**服务端环境变量**中配置下表。发布环境必须有这些值；需要本地调试时，也为开发环境配置。平台数据库连接由妙搭管理。

   | 变量 | 填写方式 |
   | --- | --- |
   | `HASH_SECRET` | 自己生成的至少 32 字符随机字符串，设置后保持稳定 |
   | `DEVICE_TOKEN_1` | `随机设备密钥:phone:我的手机:android` |
   | `DEVICE_TOKEN_2` | 可选，例如 `另一条随机密钥:desktop:我的电脑:windows` |
   | `DISPLAY_NAME` | 可选，第一次用 App 保存昵称之前的默认名字 |
   | `REQUIRE_EXPLICIT_CONSENT` | 保持默认 `1`，客户端需要先确认上报授权 |

   每个设备密钥至少 32 字符，设备 ID 只能使用字母、数字、下划线和短横线。平台支持 `android`、`windows`、`macos`、`linux`。设备密钥也用于修改网站昵称，只交给自己信任的采集设备。

   可在本机分别运行下面的命令生成独立随机值，再填入环境变量管理页：

   ```sh
   node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
   ```

5. 安装依赖并检查构建，然后将源码提交到自己妙搭项目的工作分支：

   ```sh
   npm ci
   npm test
   npm run build
   git add .
   git commit -m "Install ofton dashboard"
   git push origin sprint/default
   lark-cli apps +release-create --app-id YOUR_APP_ID --branch sprint/default --as user
   lark-cli apps +release-get --app-id YOUR_APP_ID --release-id YOUR_RELEASE_ID --as user
   ```

   用发布返回的 ID 替换 `YOUR_RELEASE_ID`，等状态为 `finished`，使用结果中的 `online_url`。妙搭会管理发布分支，不需要直接推送其 `main`。

6. 安装并配置 [Android App](../companions/android/README.md)。服务器地址填写上一步的完整应用地址，保留地址中的应用路径；Token 只填 `DEVICE_TOKEN_1` 第一个冒号前的随机字符串。

7. 在妙搭管理台按自己的意愿设置访问范围。对外开放后，访客可以看到页面与读取接口提供的应用记录、设备状态，以及你选择同步的健康数据。设备 Token 验证的是写入身份，不是访客查看密码。

## 只运行前端

使用 Node.js 24。复制根目录 `.env.example` 为 `.env.local`，设置自己的兼容后端根地址：

```dotenv
VITE_API_BASE_URL="https://your-dashboard.example"
```

不要在地址末尾加 `/api`。然后运行：

```sh
npm ci
npm run dev:preview
```

终端会显示本地地址，默认端口是 `4176`。没有配置后端时，不会自动连接任何人的设备，也不会编造活动数据。

`npm run build:preview` 生成 `preview-dist/`，可发布到自己的妙搭 HTML 应用。独立前端需要后端提供 `/api/current`、`/api/timeline`、`/api/config` 和按需使用的 `/api/health-data`，并允许跨域读取。网页 API 地址与手机采集地址都指向自己的后端。

`VITE_` 开头的变量会进入公开网页。设备密钥、数据库密码和 `HASH_SECRET` 都不能放在这里。

## 常见问题

| 现象 | 检查 |
| --- | --- |
| 网站显示离线 | 看 App 的最新心跳日志；连接测试成功不代表已经持续上报。确认开启监听、应用使用情况权限和后台运行权限。 |
| 上报返回 401 | 检查服务端 `DEVICE_TOKEN_N` 与 App Token 是否一致，是否含有多余空格。 |
| 上报返回 403 | 检查客户端是否已确认活动或健康数据授权，设备的 `/api/consent` 记录是否存在。 |
| 服务启动或 API 返回存储错误 | 检查发布环境的 `HASH_SECRET`、平台数据库初始化与表结构。 |
| 健康数据一直为零 | 手环或健康应用需要先把数据写入 Health Connect；只有读取授权不会产生数据。 |
| 改名后没有马上变化 | 网页约 30 秒更新一次配置，刷新可立即读取。旧后端需要先做昵称迁移。 |

设备记录默认保留约 7 天。清理逻辑也会删除已不在设备配置中的记录；改设备 ID 或移除 Token 前，先确认是否需要保留历史。
