# iPhone + Expo Go 联调 Runbook

> 适用：`app-mobile/`（Expo SDK 58 / RN 0.88.1）在本机（macOS 13.7.8 Intel，无可用 Xcode 16）上的真机验证。
> 本机已确认：**无法跑 iOS 模拟器**（Xcode 10.0 + 无 Runtime + macOS 无法升级），真机路径是唯一 iOS 实测方式。详见 `docs/DEV-ENV.md`。

---

## 0. 一次性准备

| 项 | 要求 | 验收现象 |
| --- | --- | --- |
| iPhone | iOS 15.1 及以上 | — |
| Expo Go | App Store 装**最新版**（Expo Go 只内置与自身版本匹配的 SDK；SDK 58 需最新 Expo Go） | 打开 Expo Go 能进首页，不提示 "SDK 版本不兼容" |
| 网络 | iPhone 与 Mac **同一 Wi-Fi**（关闭手机 VPN/代理） | 见步骤 2 的 `ping`/访问验证 |
| Node | v24（已满足） | `node -v` → `v24.14.0` |
| 内容服务 | 必须监听 `0.0.0.0`，不能用 `127.0.0.1` | 见步骤 3 |

---

## 1. 查 Mac 局域网 IP

```bash
ipconfig getifaddr en0
```

- **验收**：输出一个非空 IP，例如 `172.16.95.189`。
- 空输出 = 没连 Wi-Fi（或有线/USB 共享网络），需先连 Wi-Fi；也可从「系统设置 → Wi-Fi → 详情」查看 IP。

> 后面所有 `<LAN_IP>` 都指这个值。`scripts/dev-iphone.sh` 会自动取，不用手填。

---

## 2. 一条命令启动（推荐）

```bash
cd /Users/zhenzhenyang/Workspace/earlybirdy
scripts/dev-iphone.sh
```

脚本做三件事：

1. 取 `en0` 的局域网 IP（取不到会明确报错并给出手动覆盖方式）；
2. 以统一内容服务（`content/server.js`，默认 `8788`，监听所有网卡）启动 manifest + 档案 API + 注册表 + `/admin`；
3. 注入 `EXPO_PUBLIC_CONTENT_URL=http://<LAN_IP>:8788/manifest.json` 后运行 `npx expo start`（**不是** `--web`）。

**预期终端输出**（真实样例）：

```
[dev-iphone] 局域网 IP: 172.16.95.189
[dev-iphone] 统一内容服务已启动: 0.0.0.0:8788 (pid …, 日志 /tmp/earlybirdy-content-8788.log)
[dev-iphone] 档案 API: /api/devices/:deviceId/profile · 注册表: /api/admin/registry · 管理页: /admin?token=<ADMIN_TOKEN>
[dev-iphone] EXPO_PUBLIC_CONTENT_URL = http://172.16.95.189:8788/manifest.json
[dev-iphone] 局域网可达性验证通过: http://172.16.95.189:8788/manifest.json
[dev-iphone] 启动 Expo（LAN 模式，端口 8081）…
› Metro waiting on exp://172.16.95.189:8081
› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)
```

**验收**：终端出现二维码 + `exp://<LAN_IP>:<port>`；App 内首页角标显示 `内容已更新 · <version>`，页脚显示 `内容源：remote · 版本 <version>`（version 由服务端内容哈希生成）。

可选环境变量：

| 变量 | 默认 | 说明 |
| --- | --- | --- |
| `CONTENT_PORT` | `8788` | 统一内容服务端口（manifest + 档案 + 注册表 + /admin） |
| `EXPO_PORT` | `8081` | Expo 端口；被占用时脚本自动顺延并明确提示 |
| `LAN_IP_OVERRIDE` | 空 | 手动指定 IP（多网卡/有线时用） |

### 只做预检（不起 Expo，便于先确认注入）

```bash
scripts/dev-iphone.sh --check
```

输出即验证结论：`EXPO_PUBLIC_CONTENT_URL` 实际值 + 一条「局域网可达性验证通过」。退出码 0 = 通过，1 = 不通。

### 手动方式（不想用脚本）

```bash
# 终端 1：统一内容服务必须监听所有网卡（默认端口 8788）
cd /Users/zhenzhenyang/Workspace/earlybirdy
node content/server.js

# 终端 2：把 IP 换成自己机器的
cd /Users/zhenzhenyang/Workspace/earlybirdy/app-mobile
EXPO_PUBLIC_CONTENT_URL=http://172.16.95.189:8788 npx expo start -c
```

或用 `.env`（模板见 `app-mobile/.env.example`）：

```bash
cd /Users/zhenzhenyang/Workspace/earlybirdy/app-mobile
cp .env.example .env    # 然后把地址改成 http://<LAN_IP>:8788
npx expo start -c
```

---

## 3. 手机扫码

1. iPhone 打开**相机**，对准终端二维码 → 点击弹出的「在 Expo Go 中打开」。
2. 或打开 Expo Go → `Scan QR code`。
3. 扫码失败时用 Expo Go 的 `Enter URL manually`，输入 `exp://<LAN_IP>:8081`。

**验收**：进入 App 首页（问候语 + 阶段 chips + 主推卡片），无红屏。

---

## 4. 配置是否生效的三种确认方式

| 方式 | 命令/位置 | 期望 |
| --- | --- | --- |
| A. 启动日志（推荐） | Metro 终端 / Web 控制台 / `npx expo start` 输出 | 出现 `[content] manifestUrl = http://<LAN_IP>:8788/manifest.json  (source: env:EXPO_PUBLIC_CONTENT_URL)` |
| B. 预检 | `scripts/dev-iphone.sh --check` | 打印实际 URL + `局域网可达性验证通过` |
| C. App 内 | 首页角标 / 页脚 | `内容已更新 · <version>` / `内容源：remote`（若是 `本地缓存` 说明正在用缓存；若是 `内置内容` 说明完全没连上） |

不设变量时的行为：兜底 `http://127.0.0.1:8788/manifest.json`（统一服务的默认端口）；在原生端会额外打印一条警告（真机访问不到 127.0.0.1）。

---

## 5. 常见故障

| 现象 | 原因 | 处理 | 验收 |
| --- | --- | --- | --- |
| 手机扫码后一直转圈 / `Could not connect to development server` | 不在同一 Wi-Fi；路由器开启了 AP 隔离；Mac 防火墙拦 node；手机开了 VPN | ① 手机浏览器访问 `http://<LAN_IP>:8081` 能否出内容；② 关手机 VPN；③ 系统设置 → 网络 → 防火墙：允许 node 或临时关闭；④ 换热点再试 | 手机浏览器能打开 `http://<LAN_IP>:8081` |
| 首页显示「内置内容」，没有「内容已更新」 | 内容服务只监听 `127.0.0.1`；或 `EXPO_PUBLIC_CONTENT_URL` 未注入 | 用脚本启动（自动监听所有网卡）；`--check` 看是否有旧的 127.0.0.1 实例占端口 | 首页出现 `内容源：remote` |
| `内容端口 8788 被 pid … 占用，且只监听 127.0.0.1` | 之前手动起的服务只绑本机 | `kill <pid>` 再跑脚本；或 `CONTENT_PORT=8790 scripts/dev-iphone.sh` | 脚本打印 `EXPO_PUBLIC_CONTENT_URL = …` 且 curl 通过 |
| 端口被其他程序占用 | 常见为旧 Metro/浏览器调试器 | 脚本对 Expo 端口会自动顺延并提示；内容端口冲突会直接给出 `kill`/换端口两种做法 | 启动成功并打印实际端口 |
| 改了 env 但 App 里还是旧地址 | `EXPO_PUBLIC_*` 在编译期注入，Metro 缓存了旧 bundle | `npx expo start -c`（脚本不自动清缓存，这是有意的：清缓存慢）；必要时删 `app-mobile/.expo` | 启动日志里的 `[content] manifestUrl` 变成新地址 |
| QR 扫不到 / 相机不弹 | 二维码在终端被截断；或屏幕缩放 | Expo Go 里 `Enter URL manually` 输入 `exp://<LAN_IP>:8081` | 能进入 App |
| `--tunnel` 用不了 | 未安装 `@expo/ngrok`；或公司网络封锁 | `npx expo start --tunnel`（首次会提示安装）；或 `npm i -g @expo/ngrok` 后重试 | 输出 `Tunnel ready`，得到 `exp://…` 公网 URL |
| 用了 `--tunnel` 但仍无内容 | tunnel 只解决 **Metro 连接**，内容服务仍是局域网地址 | 手机仍需与 Mac 同一 Wi-Fi；或把统一内容服务部署到公网（如临时内网穿透）后改 `EXPO_PUBLIC_CONTENT_URL` | 首页出现 `内容源：remote` |
| `SDK 版本不兼容` | Expo Go 版本低于项目 SDK 58 | App Store 更新 Expo Go 到最新版；否则只能走 development build | 能正常加载项目 |
| `Unable to run simctl: … exit code: 72`（启动时出现） | 本机 `xcode-select` 指向 CLT，无完整 Xcode（见 `docs/DEV-ENV.md`） | **忽略**，不影响 Expo Go 联调；只有要用模拟器时才需处理 | App 仍能扫码打开 |
| 红屏 `Unable to resolve module …` | 依赖缺失 / Metro 缓存 | `npm install`；`npx expo start -c` | 首页正常 |
| iOS 明文 HTTP 被拦 | Expo Go 允许 http；**正式包（development/release build）默认 ATS 禁止明文** | 上架/正式包阶段内容服务必须 HTTPS | — |

---

## 6. 真机验证清单（拿到 iPhone 后逐项打勾）

> 说明：`Expo Go` = 用 Expo Go 就能验；`Dev build` = 必须自有原生工程（`expo run:ios` / EAS Build）才能验。

| # | 验证项 | 操作 | 期望现象 | 可验环境 |
| --- | --- | --- | --- | --- |
| 1 | 阶段切换 | 首页依次点 5 个阶段 chip | 主题色/首页主推/底部导航/互动页类型联动；杀掉重开仍保持 | Expo Go ✅ |
| 2 | 真实音频播放 | 孕期 → 音乐 → 点播放 | 能听到声音；无「静默演示」标记（`engine.mode === 'real'`）；进度随播放推进 | Expo Go ✅（`https://www.soundhelix.com/...` 需手机能访问外网） |
| 3 | 音频锁屏 / 切后台 | 播放中按 Home / 锁屏 | **预期会暂停或停止**：Expo Go 无法配置 `UIBackgroundModes: audio`，也未调用 `setAudioModeAsync({ shouldPlayInBackground: true })` | 前台 ✅；**后台播放 = Dev build**（需 Info.plist 后台音频 + Audio Session 配置） |
| 4 | 真实视频画面 | 3-6 岁 → 动画 → 进入播放页 | 出现真实画面（无「静默演示 · 控件可用」）；进度按视频时长走 | Expo Go ✅（示例源 `media.w3.org` 在国内网络可能不可达，不可达即降级为动画演示，需如实记为「未验证真实画面」） |
| 5 | 卡片朗读 | 0-6 月 → 图片卡 → 点🔊 | 原生**没有 TTS 依赖**：Toast 显示「当前平台没有语音朗读，可以看拼音：…」，不崩溃 | Expo Go ✅（这是当前预期行为；要真朗读需加 `expo-speech`，属新依赖，需另行评估） |
| 6 | 杀掉 App 重开，打卡持久化 | 打卡 1 项 → 上滑杀掉 Expo Go → 重新扫码打开 | 打卡状态、连续天数、成长值仍在（AsyncStorage 按 project 隔离） | Expo Go ✅ |
| 7 | 停掉内容服务后离线缓存 | Ctrl+C 停统一内容服务 → App 内 Reload（Expo Go 摇一摇 → Reload） | 首页角标「离线 · 本地缓存」，内容与版本仍在；不白屏 | Expo Go ✅ |
| 8 | 商城加购 → 结算 | 商城 → 商品详情 → 加购 → 购物车 → 结算 | 成长值被扣减，出现订单弹窗；余额不足时提示去完成任务 | Expo Go ✅ |
| 9 | 内容更新（版本升级） | 新增/修改 `content/` 素材 → 重启统一内容服务 → App 重开 | 首页角标版本号变化，`内容源：remote` | Expo Go ✅（分片 sha256 由服务端重建，无需手工改） |
| 10 | 推送通知 | — | **不可验**：Expo Go 不支持远程推送（SDK 53+ 起移除）；需 Dev build + APNs 证书 | **Dev build** |
| 11 | 自定义 Bundle ID / 图标 / 启动屏 / ATS 白名单 | — | 需 `app.json` 打包配置生效；Expo Go 一律忽略 | **Dev build** |
| 12 | 后台定位 / 蓝牙 / 自定义原生模块 | — | 需 Dev build | **Dev build** |

---

## 7. 停止与清理

- 脚本前台运行：`Ctrl+C` 会同时停掉统一内容服务（脚本有 trap）。
- 残留进程排查：

```bash
lsof -nP -iTCP:8788 -sTCP:LISTEN   # 统一内容服务
lsof -nP -iTCP:8081 -sTCP:LISTEN   # Metro
```

- 清缓存：`cd app-mobile && npx expo start -c`（或删除 `app-mobile/.expo`）。

---

## 8. 已知限制（必须如实记录）

1. 本机**没有可用 iOS 模拟器**，所有 iOS 结论只能来自真机。
2. 真机前的验证只覆盖「配置注入 + 局域网可达 + Web 端按同一 URL 拉取内容」，**不等于真机已验证**。
3. Expo Go 不加载 `app.json` 的原生配置（Bundle ID、后台模式、ATS、推送），相关项必须 development build 才能验。
4. 音频/视频示例源为公网第三方资源，国内网络可能不可达；失败会降级为静默演示，这属于已有降级策略，不是崩溃。
