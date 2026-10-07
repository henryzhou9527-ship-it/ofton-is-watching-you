# Build Guide

## 环境要求

- **JDK**: 17+
- **Android SDK**: compileSdk 36, minSdk 26
- **Gradle**: 使用项目自带的 `gradlew` wrapper
- **IDE** (可选): 支持本项目 Android Gradle Plugin 版本的 Android Studio

## 构建步骤

```bash
cd companions/android
./gradlew assembleDebug
```

Windows PowerShell 使用 `./gradlew.bat assembleDebug`。首次构建会下载 Gradle 和 Maven 依赖，需要能够访问对应下载源。

将自己的 Android SDK 路径填入本地 `local.properties` 的 `sdk.dir`，或设置 `ANDROID_HOME`。`local.properties` 已被忽略，不应提交。

APK 输出路径: `app/build/outputs/apk/debug/app-debug.apk`

## 安装到手机

```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

或直接将 APK 传到手机安装。

这是 debug 开发签名包。正式分发可在本地配置 `keystore.properties` 后运行 `assembleRelease`；没有签名配置时，release 产物未签名，不能直接安装。签名文件及密码均不进入版本控制。

## 项目结构

详见 [GUIDE.md](./GUIDE.md)。
