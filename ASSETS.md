# 素材与致谢

核对日期：2026-10-08。本页区分软件许可与主题素材来源；出处不等于授权。根目录 MIT 许可适用于项目代码，不包含第三方角色形象、美术、字体或依赖的再授权。

## 代码

本项目基于 [Monika-Dream/live-dashboard](https://github.com/Monika-Dream/live-dashboard) 的设备上报、状态识别和数据处理能力，改造前端界面，并接入飞书妙搭 PostgreSQL 与 App 昵称设置。代码按根目录 [MIT License](LICENSE) 分发，原始版权声明保留在 [LICENSE-original-dashboard](LICENSE-original-dashboard)。

Android 源码来自上游 `android-source` 分支，具体版本及改动见 [UPSTREAM.md](companions/android/UPSTREAM.md)，原许可保留在 [Android LICENSE](companions/android/LICENSE)。npm 与 Gradle 依赖遵循各自的许可证。

## 字体

霞鹜文楷屏幕阅读版的字体许可为 SIL Open Font License，见 [OFL.txt](client/src/fonts/wenkai/OFL.txt)。网页字体包装代码许可见同目录 [LICENSE](client/src/fonts/wenkai/LICENSE)。分发副本保存在 `client/public/licenses/`。

字体来源：[LXGW WenKai Screen](https://github.com/lxgw/LxgwWenKai-Screen)，网页字体打包来源：[chawyehsu/lxgw-wenkai-webfont](https://github.com/chawyehsu/lxgw-wenkai-webfont)。已保留字体文件内的 LXGW 与 Klee Project 版权声明，并提供 [字体版权信息](client/public/licenses/FONT-COPYRIGHT.txt)。系统字体仅按名称引用，不附带系统字体文件。

## 图标与软件依赖

界面图标使用 [Lucide](https://lucide.dev/license)，许可为 ISC，Feather 衍生部分为 MIT。完整声明随网站分发在 [Lucide 许可](client/public/licenses/LUCIDE.txt)。网页依赖的许可原文和已安装版本记录见 [第三方软件声明](client/public/licenses/THIRD-PARTY-NOTICES.txt)。各依赖保留自己的许可，不统一改为本项目 MIT。

Android 原始图标来自上述上游代码仓库；App 附带的第三方软件许可见 [Android notices](companions/android/app/src/main/assets/licenses/THIRD-PARTY-NOTICES.txt)。本项目绘制的简单眼睛 SVG 图标随代码许可。

## 主题美术

角色主题为 [お布団巻き](https://space.bilibili.com/19206492)，画面构图参考 DECO*27 的 [《Monitoring》官方 PV](https://www.youtube.com/watch?v=kbNdx0yqbZE)。本项目是非官方同人主题，不代表角色、创作者或音乐作品的官方产品。

《Monitoring》原作信息：[OTOIRO 官方发布页](https://otoiro.co.jp/topics/104605/)。音乐：DECO*27；MV 制作：OTOIRO；导演与角色设计：kee；图形设计：yuka fujii。视觉参考署名：**© OTOIRO / DECO*27**。

[OTOIRO 二次创作规则](https://otoiro.co.jp/terms/)允许符合条件的个人非商业二创在网上公开，并要求版权标注；该规则不允许直接复制或改造官方原图，也不是对任意使用方式的授权。本项目当前封面参考了 PV 的具体构图，仅凭生成式重绘不能确认它一定属于获准的二创范围。需要权利人确认，或改为与原封面明显不同的独立构图。

お布団巻き的角色形象及参考画稿仍由相应权利人享有权利。项目维护者于 2026-10-08 确认已得到お布団巻き本人同意发布；没有公开授权链接。本项目按该同意作非商业发布，不将其扩大为对公众的通用素材授权、MIT 授权或商用授权。独立画师对参考画稿享有的权利也不由本仓库另行授权。

`client/public/art/` 中的封面、夜景与 Q 版图集为根据参考生成的主题插画，不是官方原画。原始角色设定图和 PV 图像不随仓库分发。根目录的代码 MIT 许可不为角色形象、商标、音乐或其他第三方创作另行授予权利；替换主题时可一并替换这些图片。

| 文件 | 用途和来源 |
| --- | --- |
| `monitoring-juan-cover.png` | 当前封面；角色参考お布団巻き，构图参考《Monitoring》PV，AI 生成同人图 |
| `juan-chibi-atlas.png` | 十种 Q 版彩蛋；根据角色参考生成 |
| `juan-chibi-shark.png` | 抱鲨鱼彩蛋；根据角色及用户提供的鲨鱼玩偶参考生成 |
| `night-window-character-v2.png`、`night-window.png` | 早期主题插画，当前组件不引用；仍随素材目录分发 |

这些主题图不按 MIT、CC0 或其他自由美术许可分发。仓库不宣称拥有角色或参考作品的再授权权利。准备商用或向他人分发主题图时，需另行取得适用许可；去掉主题图后，代码的 MIT 许可不受影响。

项目没有打包原曲音频、MV 文件、歌词或官方原始设定图。播放状态功能展示设备提供的文字元数据，不提供作品下载。

设计和素材文件用途见 [DESIGN.md](DESIGN.md)。
