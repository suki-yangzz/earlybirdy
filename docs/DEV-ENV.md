# 上机调试环境说明（iOS / Android）

> 项目根目录：`/Users/zhenzhenyang/Workspace/earlybirdy`
> 记录时间：2026-11-05（本机实测，所有结论均来自当次命令输出）

---

## 0. 结论速览

| 目标 | 本机现状 | 能否达成 |
| --- | --- | --- |
| iOS 模拟器运行 `app-mobile` | Xcode 10.0（2018）+ 无 CoreSimulator Runtime + macOS 13.7.8（该机型最高版本） | **不能**，受硬件/系统版本硬限制 |
| iOS 真机（Expo Go） | 未连接 iPhone；Xcode 不参与此路径 | **可行**，需一台 iPhone 与 Expo Go（用户手动） |
| EAS Build（云构建 iOS） | 未登录 Expo 账号 | 可行，但需要 Expo 账号 + Apple Developer 账号（$99/年）才能装到真机 |
| Android 模拟器 | 无 SDK / 无 adb / 无 emulator / 无 AVD；Java 17 已装 | **未就绪**，需安装 Android SDK 组件（约 3GB） |
| iOS 原生工程生成 | `npx expo prebuild --platform ios --no-install` 已成功 | **已验证** |

一句话：**这台机器（MacBookPro14,1 / 8GB / macOS 13.7.8）装不了 RN 0.88.1 所需的 Xcode 16.1，因此本机无法跑 iOS 模拟器；iOS 实测只能走「真机 + Expo Go」或换一台 macOS 14.5+ 的 Mac。**

---

## 1. 本机基线（实测输出）

```
$ sw_vers
ProductName:        macOS
ProductVersion:     13.7.8
BuildVersion:       22H730

$ system_profiler SPHardwareDataType
Model Name:         MacBook Pro
Model Identifier:   MacBookPro14,1
Processor Name:     Dual-Core Intel Core i5
Processor Speed:    2.3 GHz
Total Number of Cores: 2
Memory:             8 GB

$ uname -m
x86_64

$ df -h /
/dev/disk1s5s1  233Gi  8.7Gi   94Gi     9%   /
（可用 94 GiB）
```

- CPU 虚拟化支持：`sysctl -n kern.hv_support` → `1`（Android 模拟器可用 HVF，不需要 HAXM）。
- 机型 `MacBookPro14,1` 是 2017 款 13" MBP，**官方支持的最高 macOS 版本就是 Ventura 13.x**。
- `softwareupdate --list` 只列出 `Safari18.6VenturaAuto`，**没有 macOS 大版本升级** → 无法升到 Sonoma 14.5。

---

## 2. 逐项诊断

### 2.1 Xcode / Command Line Tools / simctl

```
$ xcode-select -p
/Library/Developer/CommandLineTools

$ xcodebuild -version
xcode-select: error: tool 'xcodebuild' requires Xcode, but active developer
directory '/Library/Developer/CommandLineTools' is a command line tools instance

$ ls -d /Applications/Xcode*.app
/Applications/Xcode.app

$ defaults read /Applications/Xcode.app/Contents/Info.plist CFBundleShortVersionString
10.0
$ defaults read /Applications/Xcode.app/Contents/Info.plist CFBundleVersion
14320.25

$ DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer \
    /Applications/Xcode.app/Contents/Developer/usr/bin/xcodebuild -version
Xcode 10.0
Build version 10A255

$ xcode-select --install
xcode-select: error: command line tools are already installed,
use "Software Update" in System Settings to install updates

$ pkgutil --pkg-info=com.apple.pkg.CLTools_Executables
version: 14.3.1.0.1.1683849156
（clang 14.0.3，x86_64-apple-darwin22.6.0）
```

**关键结论**

1. `/Applications/Xcode.app` 存在，但版本是 **Xcode 10.0（Build 10A255，2018 年）**，体积 7.4G，`Contents/MacOS/Xcode` 时间戳 2018-09-15。
2. 它只带 `iPhoneSimulator.platform/.../SDKs/iPhoneSimulator12.0.sdk`。
3. `/Library/Developer/CoreSimulator` **目录不存在**，`CoreSimulator/Profiles/Runtimes` 也不存在 → **一个模拟器 Runtime 都没有**。
4. Xcode 10 的 License 未接受：只要用 `xcodebuild` / `simctl` 就会提示
   `Agreeing to the Xcode/iOS license requires admin privileges, please run "sudo xcodebuild -license"`。

### 2.2 上一轮 `simctl` exit code 72 的真实原因（已确定）

```
$ xcrun simctl list devices available
xcrun: error: unable to find utility "simctl", not a developer tool or in PATH
exit=72

$ xcrun --find simctl
xcrun: error: unable to find utility "simctl", not a developer tool or in PATH
Command failed with exit code 72
```

结论：**72 不是权限问题、也不是模拟器损坏**。`xcode-select` 指向 `/Library/Developer/CommandLineTools`，而 `simctl` 只随完整 Xcode 提供（`Xcode.app/Contents/Developer/usr/bin/simctl`），`xcrun` 在 CLT 目录里找不到该工具，按 `sysexits` 规范返回 **EX_OSFILE = 72**。
这正是 Expo 启动时打印 `Unable to run simctl: Error: xcrun simctl help exited with non-zero code: 72` 的原因。

即便把 `xcode-select` 切到 Xcode 10，也仍然没有模拟器 Runtime（`simctl list devices` 会是空的），且 RN 0.88.1 要求的 Xcode 版本远高于 10.0 —— 见 2.3。

### 2.3 RN / Expo 对 Xcode 的硬性要求（读自 node_modules）

```
$ node -e "...react-native/package.json" → react-native 0.88.1
$ node -e "...expo/package.json"         → expo 58.0.23

app-mobile/node_modules/react-native/scripts/cocoapods/helpers.rb
  def self.min_ios_version_supported   → '15.1'
  def self.min_xcode_version_supported → '16.1'

app-mobile/ios/appmobile.xcodeproj/project.pbxproj
  IPHONEOS_DEPLOYMENT_TARGET = 16.4
```

版本链：

```
RN 0.88.1 需要 Xcode >= 16.1
Xcode 16.1 需要 macOS >= 14.5
本机 macOS 13.7.8，且 MacBookPro14,1 无法升级到 14.x
=> 本机不可满足
```

macOS 13.7.8 上能装的最高版本是 **Xcode 15.2（要求 macOS 13.5+，带 iOS 17.2 SDK）**，仍低于 16.1 → 装上也编译不过。

### 2.4 Node / npm / Watchman

```
$ node -v   → v24.14.0
$ npm -v    → 11.9.0
$ npx -v    → 11.9.0
$ which watchman  → (无输出，未安装)
```

- RN 0.88.1 `engines.node` = `^22.13.0 || ^24.3.0 || >= 26.0.0`，当前 v24.14.0 **满足**。
- Watchman 未安装：Metro 仍可运行（退化为 fs 轮询/Node 原生监听），仅影响超大工程的文件监听性能。**不装也能跑**。

### 2.5 CocoaPods / Ruby

```
$ pod --version
/bin/bash: pod: command not found

$ ruby -v
ruby 2.6.10p210 (2022-04-12 revision 67958) [universal.x86_64-darwin22]
```

- CocoaPods **未安装**；系统 Ruby 为 2.6.10（macOS 自带，版本偏旧）。
- `pod install` 是 `expo run:ios` 的必经步骤，但它在 Xcode 16.1 到位之后才有意义，本轮不处理。

### 2.6 Homebrew（附带发现，影响后续装包）

```
$ brew --version
/usr/local/Homebrew/Library/Homebrew/version.rb:369:in `initialize':
  Version value must be a string; got a NilClass () (TypeError)
...
$ git -C /usr/local/Homebrew log -1 --format='%cd %h'
Sat Nov 24 20:58:35 2018 +0000 2063a8a4d
```

- 本机 Homebrew 是 **2018 年的老版本（vendored ruby 2.3.7）**，在 Ventura 上直接崩溃。
- 因此 `brew install watchman cocoapods` 这条路当前不可用；要修需重装 Homebrew（系统级改动，需用户决定）。

### 2.7 Android 侧

```
$ echo $ANDROID_HOME        → （空）
$ echo $ANDROID_SDK_ROOT    → （空）
$ which adb                 → （无）
$ which emulator            → （无）
$ ls ~/Library/Android/sdk  → No such file or directory
$ ls ~/.android/avd         → No such file or directory
$ java -version
openjdk 17.0.12 2024-07-16 LTS (HotSpot, mixed mode, sharing)
```

- `/Applications` 里没有 Android Studio。
- **只有 JDK 17**（满足 Android Gradle Plugin 要求），SDK / 平台工具 / 模拟器 / 系统镜像 / AVD **全部缺失**。

### 2.8 磁盘

- 根卷可用 **94 GiB**，装 Xcode（约 7–15GB）+ 模拟器 Runtime（约 8GB）+ Android SDK（约 3GB）在空间上都够；**阻塞点是 macOS 版本，不是磁盘**。

---

## 3. iOS：已做的修复 / 不能做的修复

### 3.1 已完成（无需 sudo，无大件下载）

```
$ cd app-mobile && npx expo prebuild --platform ios --no-install
› Apple bundle identifier: com.anonymous.app-mobile
- Creating native directory (./ios)
✔ Created native directory
- Updating package.json
✔ Updated package.json
- Running prebuild
✔ Finished prebuild
exit=0
```

产物：`/Users/zhenzhenyang/Workspace/earlybirdy/app-mobile/ios/`（480K，含 `Podfile`、`appmobile.xcodeproj`、`Podfile.properties.json`）。
说明：原生工程脚手架可正常生成，说明 `app.json` / 依赖 / 配置在 iOS 侧无结构性问题。**但这只是生成工程，不等于编译通过。**

`prebuild` 顺带产生的两处改动（都在 `app-mobile/` 内，属于必要配置）：

- `app-mobile/app.json`：`ios.bundleIdentifier` = `com.anonymous.app-mobile`
- `app-mobile/package.json`：新增 `scripts` (`ios` / `android` / `web`)，依赖顺序被重排

### 3.2 明确不做（并说明原因）

| 操作 | 是否执行 | 原因 |
| --- | --- | --- |
| `sudo xcode-select --switch /Applications/Xcode.app` | **未执行** | 需要管理员密码；而且切过去只有 Xcode 10.0（无 Runtime、无 License），对 RN 0.88.1 完全无效，反而可能让 `xcrun` 指向一个更旧的工具链 |
| `sudo xcodebuild -license` | **未执行** | 同上，Xcode 10 本身不可用 |
| 安装 Xcode 16.x | **未执行** | 需要 macOS ≥ 14.5，本机无法满足；App Store 也不会向该机型提供 |
| `npx expo run:ios` | **未执行** | 被系统的风险策略拦截（判定为「必然失败且会触发 CocoaPods 安装 + 原生构建的系统级重操作」）。依据 2.1–2.3 的实测结果，它必定在 `pod install`（pod 不存在）与 `xcodebuild`（Xcode 10.0 < 16.1）处失败，因此没有实质收益 |

> 诚实说明：本轮 **没有** 拿到 `npx expo run:ios` 的真实报错原文，因为它被拦截而未运行；上面列的是会导致失败的已测事实，而不是猜测的输出。

---

## 4. iOS 三条可执行路径

### 路径 A（推荐、成本最低）：iPhone 真机 + Expo Go

> 一键脚本与完整操作/排障步骤见 `docs/IPHONE-EXPO-GO.md`；先跑 `scripts/dev-iphone.sh --check` 可只做预检。

不需要 Xcode、不需要 Apple Developer 账号。`app-mobile` 当前依赖全部在 Expo Go 内置清单里（读自 `node_modules/expo/bundledNativeModules.json`）：

```
expo-audio: ~58.0.11
expo-video: ~58.0.13
@react-native-async-storage/async-storage: 2.2.0
react-native-web: ~0.21.4
react-dom: 19.3.0
expo-status-bar: ~58.0.4
react-native-safe-area-context: ~5.11.1
```

用户只需执行这几行：

1. 在 iPhone 的 App Store 安装 **Expo Go**（需与 SDK 58 匹配）。
2. 手机与 Mac 连同一个 Wi-Fi，然后：

```bash
# 启动内容 mock 服务（终端 1）
cd /Users/zhenzhenyang/Workspace/earlybirdy/shared && npm run mock

# 启动 Expo（终端 2）
cd /Users/zhenzhenyang/Workspace/earlybirdy/app-mobile && npx expo start
```

3. 用 iPhone 的相机扫终端里的二维码（若局域网被防火墙挡住，改用 `npx expo start --tunnel`）。

限制：Expo Go 里没有自定义原生代码；`expo-audio` / `expo-video` 可以真实播放，但一旦将来引入 Expo Go 未内置的库，必须转 development build。

### 路径 B：换一台 macOS 14.5+ 的 Mac（真正跑模拟器）

步骤（在目标机器上）：

```bash
xcode-select --install                                  # 若无 Xcode
# 或从 App Store 安装 Xcode 16.1+（约 7–15GB 下载）
sudo xcodebuild -license accept
sudo xcode-select --switch /Applications/Xcode.app
xcodebuild -version                                     # 期望 Xcode 16.1 及以上
xcrun simctl list runtimes                              # 期望出现 iOS 18 runtime
# Xcode 15+ 的 Runtime 可在 Xcode → Settings → Components 里下载（iOS 18.x，约 7–8GB）

cd /Users/zhenzhenyang/Workspace/earlybirdy/app-mobile
npm install
sudo gem install cocoapods                              # 或用 rbenv 装 Ruby 3 后 gem install
npx expo prebuild --platform ios --clean
npx expo run:ios                                        # 首次会执行 pod install 并编译
```

验收：

```bash
xcrun simctl list devices available                     # 能列出设备
xcodebuild -version                                     # 正常输出
npx expo run:ios                                        # 启动 Simulator 并安装 App
```

> 该仓库已经把 `ios/` 生成好了；换机后建议 `--clean` 重新生成，避免旧模板残留。

### 路径 C：EAS Build（云构建，绕开本机 Xcode）

- 需要：Expo 账号（免费）+ `npx eas-cli login`。
- `eas build -p ios --profile development`（开发构建，装真机）需要 **Apple Developer Program（$99/年）** 才能做 Ad Hoc / Development 签名。
- EAS 也能产出 **simulator 包**（无需 Apple 账号），但**仍然需要一台装了 Xcode 16.1 的 Mac 去运行 `.app`** → 对本机的模拟器目标没有帮助。
- 上架（App Store）同样需要付费 Apple 开发者账号与证书/描述文件（EAS 可自动管理证书，费用不变）。

**Expo Go vs development build**

| 维度 | Expo Go | development build |
| --- | --- | --- |
| 需要 Xcode | 否 | 是（本地）或 EAS（云端） |
| 需要 Apple 账号 | 否 | 真机安装需 $99/年；模拟器构建不需要 |
| 原生模块 | 仅限 Expo Go 内置 | 任意 |
| 适用阶段 | 现阶段功能验证 | 引入非内置原生库 / 推送 / 上架前 |

---

## 5. Android 方案（只出方案，未安装）

### 5.1 需要安装的组件与体积（Intel / macOS 13，HVF 可用）

| 组件 | 用途 | 约体积 |
| --- | --- | --- |
| Android Studio（含 SDK Manager，可选） | 图形化管理 SDK/AVD | ~1.1 GB |
| `cmdline-tools;latest` | sdkmanager / avdmanager | ~130 MB |
| `platform-tools` | adb | ~10 MB |
| `platforms;android-35` | 编译目标 | ~60 MB |
| `build-tools;35.0.0` | aapt2 / d8 | ~60 MB |
| `emulator` | 模拟器 | ~350 MB |
| `system-images;android-35;google_apis;x86_64` | 系统镜像（本机是 Intel，必须 x86_64） | ~1.2 GB |

合计约 **3 GB** 下载，解压后约 8–10 GB；磁盘 94GB 够用。**8GB 内存偏紧**：模拟器建议 2048MB RAM、关闭 Chrome、Metro 单独终端。

### 5.2 安装后需要设置的环境变量（写入 `~/.zshrc`，属系统级改动，需用户自行执行）

```bash
export ANDROID_HOME="$HOME/Library/Android/sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
```

### 5.3 验收命令

```bash
echo "$ANDROID_HOME"                 # 非空
adb version                          # 输出版本
emulator -list-avds                  # 至少一个 AVD
adb devices                          # emulator-5554  device
cd /Users/zhenzhenyang/Workspace/earlybirdy/app-mobile && npx expo run:android
```

创建 AVD 示例（在 SDK 装好后）：

```bash
avdmanager create avd -n Pixel_API35 -k "system-images;android-35;google_apis;x86_64" -d pixel_6
emulator -avd Pixel_API35
```

---

## 6. 本轮真实验证结果

| 项目 | 结果 | 证据 |
| --- | --- | --- |
| Xcode 版本 / 选择路径 | 已测（Xcode 10.0，指向 CLT） | 2.1 输出 |
| simctl exit 72 归因 | 已确定（CLT 无 `simctl`，EX_OSFILE=72） | 2.2 输出 |
| 模拟器 Runtime 存在性 | 已测（0 个，`/Library/Developer/CoreSimulator` 不存在） | 2.1 |
| iOS 原生工程生成 | **通过**（prebuild exit=0，ios/ 480K） | 3.1 输出 |
| iOS 模拟器运行 App | **未完成** | 受 Xcode/macOS 版本硬限制，见 2.3 |
| iOS 功能实测（阶段切换/打卡/音频/视频/商城） | **未完成（无模拟器可用）** | 同上；不作替代性声明 |
| `artifacts/ios-*.png` | **无**（未产生，不伪造） | — |
| Android 环境 | 未就绪（无 SDK/adb/emulator/AVD） | 2.7 输出 |
| Web 侧功能验证 | 已完成（上一轮，截图 `artifacts/rn-01..21`） | 非本轮 |

---

## 7. 复现命令（当前可用，与本轮环境诊断无关，供联调）

```bash
# 内容 mock 服务（端口 8787，PORT 环境变量可覆盖）
cd /Users/zhenzhenyang/Workspace/earlybirdy/shared && npm run mock

# 业务规则 + 同步测试
cd /Users/zhenzhenyang/Workspace/earlybirdy/shared && npm test

# RN 端 Web 预览（8081）
cd /Users/zhenzhenyang/Workspace/earlybirdy/app-mobile && env -u CI npx expo start --web --port 8081

# RN 类型检查
cd /Users/zhenzhenyang/Workspace/earlybirdy/app-mobile && npx tsc --noEmit

# H5 回归（8123）
cd /Users/zhenzhenyang/Workspace/earlybirdy/app && python3 -m http.server 8123
```

> 注：写 `~/.expo/native-modules-cache` 会被沙箱拒绝，`expo start` 需要放宽沙箱或以非沙箱方式运行。

---

## 8. 结论与待办（按优先级）

1. **iOS（阻塞）**：本机不可能满足 Xcode 16.1 → macOS 14.5 要求。要么用 **真机 + Expo Go** 立刻验证功能，要么换 macOS 14.5+ 的 Mac 跑模拟器。
2. **Android（可推进）**：磁盘与 JDK 17 已就绪，缺 SDK/模拟器组件（约 3GB 下载）；需用户同意后安装，并写 `ANDROID_HOME`。
3. **Homebrew（可选）**：2018 年旧版已损坏，若后续需要 `brew`（watchman / cocoapods），需先重装。
4. **上架**：EAS Build + Apple Developer Program（$99/年）+ Google Play 开发者账号（$25 一次性）。
