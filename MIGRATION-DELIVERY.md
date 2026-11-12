# 芽芽成长：数据层剥离 + RN 骨架交付说明

日期：2026-11-04

## 一、结论

| 阶段 | 完成程度 | 说明 |
| --- | --- | --- |
| 阶段 1：数据层剥离 | **已完成并验证** | `shared/` 独立于 DOM/浏览器；manifest 协议 + 增量同步 + 降级链跑通；自动化测试 11/11 通过 |
| 阶段 2：RN 工程骨架 | **代码完成，已在 Expo Web 实机验证** | 阶段切换、每日打卡两个闭包在 390×844 视口真实点击通过，含刷新持久化与断网缓存；**未在 iOS 模拟器/真机/Android 上验证**（本机环境不具备） |
| H5 兼容性 | **无回归** | `app/`、`prototype/` 一行未改；390×844 实点阶段切换 + 打卡正常，控制台 0 错误、0 请求失败 |

## 二、新增目录与结构

```
shared/                     # 阶段 1 产物，H5 与 RN 共用（UMD，Node/Metro/浏览器均可）
├── stages.js               # 由 H5 自动提炼：INTERACTIONS / STAGE_ORDER / STAGES(含 theme 纯数据)
├── content.js              # 由 H5 自动提炼：tracks / decks / videos / tasks / categories / products
├── rules.js                # 业务规则纯函数工厂 createCore()，存储通过 adapter 注入
├── sync.js                 # 内容同步：manifest 比对 / 增量下载 / SHA-256 校验 / 缓存 / 内置兜底
├── index.js                # 汇总入口 + createAppCore() 便捷工厂
├── storage/web.js          # createWebStorage()（localStorage）/ createMemoryStorage()（测试）
├── manifest.schema.json    # manifest 的 JSON Schema（draft-07）
├── scripts/extract-from-h5.js   # 从 app/js/data 生成 stages.js / content.js
├── scripts/build-mock.js        # 生成 mock 静态分片 + v1/v2 manifest（含 sha256/bytes）
├── mock/server.js               # 本地 mock 内容服务（默认 8787）
├── mock/assets/v1|v2/*.json     # 6 个内容分片 + 两版 manifest
└── test/{rules,sync}.test.js    # 11 个自动化用例

app-mobile/                 # 阶段 2 产物，Expo + TypeScript
├── App.tsx                      # 启动：hydrate → 先渲染缓存 → 后台 sync → 状态重建
├── src/sharedAdapter.ts         # 桥接 shared（Metro watchFolders 指向 ../shared）
├── src/storage.ts               # AsyncStorage → shared storage adapter
├── src/theme.ts                 # 设计语言 + 阶段主题 + icon→emoji 映射
├── src/components/TabBar.tsx
└── src/screens/{HomeScreen,TasksScreen}.tsx
```

`app/`、`prototype/` 均未改动。

## 三、关键接口

### 1. manifest.json

```json
{
  "schemaVersion": 1,
  "version": "2026.11.04.1",
  "updatedAt": "2026-11-04T13:59:15.032Z",
  "shards": [
    { "name": "stages",  "url": "assets/v1/stages.json", "sha256": "…", "bytes": 14137 },
    { "name": "tasks",   "url": "assets/v1/tasks.json",  "sha256": "…", "bytes": 4403 }
  ]
}
```

分片名固定 6 个：`stages` / `tracks` / `decks` / `videos` / `tasks` / `catalog`；`minAppVersion` 可选。

### 2. storage adapter

```js
{ getItem(key) → string | null | Promise, setItem(key, value) → void | Promise, removeItem(key) → void | Promise }
```

H5 用 `createWebStorage()`（localStorage），RN 用 AsyncStorage，测试用 `createMemoryStorage()`。
`hydrate(adapter)` 异步读状态，`hydrateSync()` 供同步场景；业务状态键沿用 H5：`yy.v1.stage / checkins / coins / cart / learned / fav / orders`，内容缓存键 `yy.v1.contentCache`。

### 3. 同步流程

```
getCachedBundle()  → 立即出画面（cache 或 builtin）
sync():
  manifest 拉取失败 ──→ 本地缓存 ──→ 内置兜底   (source: cache / builtin, offline: true)
  version 与缓存一致 ──→ updated=false，不再下载分片
  version 有变化     ──→ 只下载 sha256 变化的分片 → 校验 → 写缓存 → 返回新 bundle
返回值：{ updated, source, offline, version, fetched[], bundle, error? }
```

## 四、实际验证结果

### 阶段 1：`cd shared && npm test`

```
=== shared rules verification ===
PASS  切换阶段并持久化 — stage=pregnancy
PASS  打卡完成与成长值增减 — toggle ok, coins restored to 860
PASS  连续打卡天数 — streak=3 across 11/02-11/04
PASS  购物车加购/改量/结算 — order=YY1793757600000, coins=360
PASS  余额不足结算 — need=340
PASS  卡片学习进度 — learned 1/5 in title
6/6 passed

=== shared sync verification ===
PASS 1 首次拉取成功 — version=2026.11.04.1, fetched=6 个分片, cache=yes
PASS 2 版本相同不重复下载 — updated=false, shardRequests=0
PASS 3 版本升级触发增量 — version=2026.11.04.2, fetched=tasks, shardRequests=1
PASS 4 断网回落缓存 — offline=true, source=cache, version=2026.11.04.2
PASS 5 无缓存回落内置兜底 — offline=true, source=builtin, tasks.toddler=5
5/5 passed
```

同步用例走的是**真实 HTTP mock 服务 + Node fetch + 真实 SHA-256**，不是桩。

### 阶段 2：headless Chrome CDP，390×844 @2x 真实鼠标点击

| 验证项 | 结果 |
| --- | --- |
| 首屏渲染 | 通过，`390x844 dpr2`，内容源「内容已更新 · 2026.11.04.1」 |
| 阶段切换（点「🎨 3-6岁」） | 通过，note 变为「当前阶段：3-6岁 · 看动画、听故事、学表达」，hero 文案与页面底色同步变为 `rgb(247, 252, 251)`，`yy.v1.stage = "preschool"` |
| 进入任务页并打卡「看一集成长动画」 | 通过，`0 / 5 → 1 / 5`，连续打卡 `0 → 1 天`，今日成长值 `+0 → +20`，写入 `yy.v1.checkins`、`yy.v1.coins=880` |
| 刷新（模拟杀进程重开） | 通过，仍为 3-6 岁、`1/5 已完成`，阶段与打卡状态均保持 |
| 停掉 mock 服务后重新加载 | 通过，徽标变「离线 · 本地缓存」，内容、阶段、`1/5` 全部照常渲染 |
| 类型检查 `npx tsc --noEmit` | 通过（exit 0） |

截图（绝对路径）：

- `/Users/zhenzhenyang/Workspace/earlybirdy/artifacts/app-mobile-01-home-390x844.png` 首屏
- `/Users/zhenzhenyang/Workspace/earlybirdy/artifacts/app-mobile-02-stage-preschool.png` 阶段切换
- `/Users/zhenzhenyang/Workspace/earlybirdy/artifacts/app-mobile-03-tasks.png` 任务页
- `/Users/zhenzhenyang/Workspace/earlybirdy/artifacts/app-mobile-04-task-checked.png` 打卡后
- `/Users/zhenzhenyang/Workspace/earlybirdy/artifacts/app-mobile-05-persisted-after-reload.png` 刷新持久化
- `/Users/zhenzhenyang/Workspace/earlybirdy/artifacts/app-mobile-06-offline-cache.png` 断网走缓存
- `/Users/zhenzhenyang/Workspace/earlybirdy/artifacts/h5-home-390x844.png` H5 回归

### H5 回归（390×844 实际点击）

标题「芽芽成长 · 早教内容」正常；点阶段 chip → `当前阶段：3-6岁`；进 `#/tasks` 点打卡 → `1 / 5 项`、连续 1 天、`+20`，`yy.v1.checkins` 落盘；`consoleErrors: []`、`requestFailures: []`。

## 五、运行命令

```bash
# 1) 内容 mock 服务（端口 8787，默认返回 assets/v1/manifest.json）
cd /Users/zhenzhenyang/Workspace/earlybirdy
node shared/mock/server.js
#    切到 v2 验证增量：MANIFEST=assets/v2/manifest.json node shared/mock/server.js

# 2) shared 测试
cd shared && npm test

# 3) RN（Expo）
cd app-mobile
npx expo start          # 手机 Expo Go 扫码
npx expo start --web    # 浏览器 8081（本次验证所用）

# 4) 现有 H5
cd app && python3 -m http.server 8123   # 打开 http://127.0.0.1:8123/index.html
```

`SERVICE_URL` 默认 `http://127.0.0.1:8787/manifest.json`，可用 `EXPO_PUBLIC_CONTENT_URL` 覆盖：
Android 模拟器需改 `10.0.2.2`，真机需改局域网 IP；上线前必须换 HTTPS（目前是明文 HTTP）。

## 六、环境限制与阻塞点（如实说明）

1. **没有 Xcode / iOS 模拟器**：`xcodebuild` 报 `requires Xcode, but active developer directory is Command Line Tools`；`xcrun simctl` 不存在。**没有 Android 模拟器**（无 `adb`/`emulator`）。
   → 因此阶段 2 **只在 Expo Web（Chromium）跑过**，原生侧仅保证 `tsc` 通过、Metro 打包成功；**未在真机/模拟器验证**，不能视为已验证 iOS/Android 上架就绪。
2. Expo 需要 SDK 58 + 新架构下的原生编译才能上架，这一步依赖 Xcode/Android SDK，本机无法完成（建议走 EAS Build）。
3. Expo 默认在 `CI=true` 下关闭 watch（本环境 CI 变量被置真），启动时需要 `env -u CI npx expo start` 才能热更新；已在命令里规避。
4. 浏览器内只验证了「缓存兜底」；**「无缓存回落内置内容」只在 Node 单测里验证过**（浏览器每次都有缓存），未单独构造浏览器首次冷启动断网场景。
5. 依赖安装曾遇到 `EIDLETIMEOUT`（registry 网络超时），已用 `npm install --fetch-timeout=600000 --fetch-retries=4` 装成，后续如重装可能再次超时。
6. 阶段 2 只做了两个闭环；卡片/音乐/视频/商城/我的页面**未迁移**，`app/` 仍是线上形态。
