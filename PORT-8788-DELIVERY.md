# 端口统一到 8788 · 交付

> 验证范围：**仅 Expo Web**（8082，无 `EXPO_PUBLIC_CONTENT_URL` 注入）+ 本机真实 HTTP / LAN 请求；未在 iPhone 真机验证。
> `app/`（H5）与 `prototype/` 未改动；上一轮档案同步与 bug 修复未回退。

## 1. 结论

- 全仓库的**服务默认端口统一为 8788**：统一服务（manifest + 档案 API + 注册表 API + `/admin`）、客户端兜底、`scripts/dev-iphone.sh`、`.env.example` 与文档全部一致。
- `dev-iphone.sh` 不再启动旧的 mock，改为启动 `content/server.js`，默认 `8788`，自动监听所有网卡并做局域网可达性验证。
- 未注入 `EXPO_PUBLIC_CONTENT_URL` 时，客户端默认连接 `http://127.0.0.1:8788/manifest.json`，实测 `source: default`，`consoleErrors: []`。
- 最终 grep `8787` 仅剩 **2 处**，都在 `shared/mock/server.js`（legacy 单测 mock），已标注“不要用于真机”。
- 顺带修复：`dev-iphone.sh` 的“是否监听所有网卡”判断原先取错 lsof 列，导致 8788 被误判为只监听 127.0.0.1；已改为取第 9 列。
- 顺带修复：未知设备 `GET profile` 由 `404` 改为 `200 { profile: null }`，消除新设备二次启动时的控制台 404（客户端同步逻辑已兼容新旧两种返回）。

## 2. 8787 命中清单与改动

改动前全仓库命中 **34 行**，逐项如下（行号为改动前）：

| 文件 | 行号 | 原值 | 现值为 8788 / 处理 |
| --- | --- | --- | --- |
| `.env.example` | 6–7 | `默认 8787` / `CONTENT_PORT=8787` | `默认 8788` / `CONTENT_PORT=8788` |
| `app-mobile/.env.example` | 9, 14, 17, 19 | 兜底与示例地址 `:8787` | 全部 `:8788` |
| `app-mobile/src/sharedAdapter.ts` | 8 | `DEFAULT_MANIFEST_URL = 'http://127.0.0.1:8787/manifest.json'` | `8788` |
| `app-mobile/src/sharedAdapter.ts` | 10, 21, 22 | 注释中的 `:8787`、Android 模拟器 `10.0.2.2:8787` | 全部 `8788` |
| `content/server.js` | 11 | 注释 `默认 8787` | `默认 8788` |
| `content/server.js` | 46 | `process.env.CONTENT_PORT \|\| 8787` | `\|\| 8788` |
| `scripts/dev-iphone.sh` | 18 | `CONTENT_PORT="${CONTENT_PORT:-8787}"` | `:-8788` |
| `content/README.md` | 255 | 注释 `默认 8787` | `默认 8788` |
| `content/README.md` | 279 | `App 默认读取 8787` | `App 默认读取 8788` |
| `docs/DEV-ENV.md` | 379 | `内容 mock 服务（端口 8787…）` | 改为统一服务 8788 启动命令 |
| `docs/IPHONE-EXPO-GO.md` | 43–44, 50–52, 64, 81, 85, 92, 112, 116, 126, 166 | 端口 8787 / mock 文案 | 全部改为 8788 / 统一内容服务 |
| `MIGRATION-DELIVERY.md` | 26 | `mock/server.js … 默认 8787` | 标为 legacy 单测 mock |
| `MIGRATION-DELIVERY.md` | 132 | `内容 mock 服务（端口 8787…）` | 统一服务 8788 |
| `MIGRATION-DELIVERY.md` | 149 | `SERVICE_URL 默认 …8787…` | 默认 8788（注明端口已统一） |
| `shared/mock/server.js` | 4, 94 | 注释 / 默认端口 8787 | **保留 8787**（legacy 单测专用，见第 3 节） |

额外调整（非 8787 字面量，但属于同一收敛）：

- `docs/DEV-ENV.md:259`、`MIGRATION-DELIVERY.md:134-135`：启动命令由 `shared/mock/server.js` 改为 `content/server.js`；mock 仅作为 v1→v2 增量验证的 legacy 选项。
- `shared/sync.js` 本身没有硬编码端口；`shared/test/sync.test.js:32` 用 `mock.listen(0)` 随机端口，因此无需改动，也不会受 8787/8788 影响。
- 仓库根目录没有 `README.md`；本轮“README”指 `content/README.md`，已更新。
- `SERVER-SYNC-DELIVERY.md`：启动命令去掉显式 `CONTENT_PORT`（默认即 8788），补充端口统一说明；`GET profile` 未知设备改为 `200 { profile: null }`。
- `docs/IPHONE-EXPO-GO.md`：验收文案里写死的旧内容版本号改为 `<version>`（版本由服务端内容哈希生成）。

## 3. 旧 mock 的处置与理由

**保留** `shared/mock/server.js`，但明确标为 **legacy**：

- 仍被 `shared/test/sync.test.js` 使用（以 `listen(0)` 随机端口启动，验证增量同步 / sha256 / 缓存），删除会破坏单测；
- 也用于手工验证 v1→v2 manifest 增量（见 `MIGRATION-DELIVERY.md`）；
- 它只提供静态 manifest，**没有**档案 API / 注册表 API / `/admin`，因此：
  - 默认端口保留 `8787`，避免与统一服务 8788 混淆、也不会被 `dev-iphone.sh` 误复用；
  - 文件头与启动日志都打印 `[mock][legacy] … 真机/联调请用 content/server.js（默认 8788）`；
  - 文档统一写明“不要用于真机”。

日常联调/真机只有一条启动路径：`node content/server.js`（默认 8788），不再有两套启动方式并存。

## 4. 验证真实输出

### 4.1 统一服务默认端口（未设置 `CONTENT_PORT`）

```text
$ ADMIN_TOKEN=dev-admin-token-2026 node content/server.js
[content] 扫描完成: {"version":"3a7cf0bca696","tracks":25,"videos":17,"topics":10,"cards":62,"products":10,"courses":6,"chapters":21,"stories":3,"storyPages":12,"registry":82}
[content] manifest: http://127.0.0.1:8788/manifest.json
[content] 档案 API: /api/devices/:deviceId/profile（存储 /Users/zhenzhenyang/Workspace/earlybirdy/server/data/profiles.json）
[content] 管理页面: http://127.0.0.1:8788/admin?token=***
[content] 静态素材: /audio /images /video /courses；新增文件后重启服务生效

$ ps eww -p <pid> | tr ' ' '\n' | grep '^CONTENT_PORT='
CONTENT_PORT 未设置（走默认值）

$ lsof -nP -iTCP:8788 -sTCP:LISTEN
node 4064 … TCP *:8788 (LISTEN)
```

### 4.2 8788 上的四类入口

```text
manifest            200
GET 未知设备档案     200  {"profile": null}
/admin 无 token      401
/admin?token=…       200
```

```bash
curl -s -o /dev/null -w 'manifest:%{http_code}\n' http://127.0.0.1:8788/manifest.json
curl -s -w '\n%{http_code}\n' http://127.0.0.1:8788/api/devices/22222222-3333-4444-8555-777777777777/profile
curl -s -o /dev/null -w 'no-token:%{http_code} ' http://127.0.0.1:8788/admin
curl -s -o /dev/null -w 'token:%{http_code}\n' 'http://127.0.0.1:8788/admin?token=dev-admin-token-2026'
```

### 4.3 客户端默认地址（不注入环境变量）

以 `env -u CI -u EXPO_PUBLIC_CONTENT_URL npx expo start --web --port 8082` 启动，浏览器控制台真实输出：

```text
[content] manifestUrl = http://127.0.0.1:8788/manifest.json  (source: default)
```

同一页面：

```json
{
  "cache": { "version": "3a7cf0bca696", "shards": ["stages","tasks","tracks","decks","videos","catalog","courses","stories"] },
  "errors": []
}
```

`source: default` 证明未注入时走 8788；`yy.v1.contentCache` 已写入统一服务提供的内容版本；`consoleErrors` 为空。截图：`artifacts/port-8788-default.png`。

### 4.4 `dev-iphone.sh --check`

```text
[dev-iphone] 局域网 IP: 172.16.95.189
[dev-iphone] 内容端口 8788 上已有一个可复用的统一内容服务（pid 4064，监听所有网卡），直接复用
[dev-iphone] EXPO_PUBLIC_CONTENT_URL = http://172.16.95.189:8788/manifest.json
[dev-iphone] 局域网可达性验证通过: http://172.16.95.189:8788/manifest.json
[dev-iphone] 预检完成（未启动 Expo）。真机上把这条 URL 配进 EXPO_PUBLIC_CONTENT_URL 即可。
```

### 4.5 端口被占用时的提示

```text
$ CONTENT_PORT=8082 scripts/dev-iphone.sh --check
[dev-iphone] 局域网 IP: 172.16.95.189
[dev-iphone] 内容端口 8082 被其他程序占用（pid 3378，不是本项目的统一内容服务）。
  请执行：kill 3378  或  CONTENT_PORT=8790 scripts/dev-iphone.sh
exit=1
```

### 4.6 测试与类型检查

```text
11/11 passed    # shared/babies
12/12 通过      # shared/profileSync
4/4 passed      # shared/courses
ids.test.js: 稳定 id 映射与迁移用例通过

$ cd app-mobile && npx tsc --noEmit
tsc_exit=0
```

### 4.7 最终 grep

```text
$ grep -rn '8787' --exclude-dir=node_modules --exclude-dir=.git .
./shared/mock/server.js:6:   端口：默认 8787（可用 PORT 环境变量覆盖；单测以随机端口启动）
./shared/mock/server.js:96:  var port = Number(process.env.PORT || 8787);
```

`git status` 中 `app/`、`prototype/` 无改动。

## 5. 剩余命中解释

只剩 `shared/mock/server.js` 的 2 处：

1. 第 6 行注释：声明这是 legacy mock，默认 8787，仅单测使用；
2. 第 96 行：默认端口实现。

保留 8787 是**有意为之**：它只提供静态 manifest，不作为任何联调/真机入口；与 8788 统一服务保持不同端口，避免被 `dev-iphone.sh` 的“可复用服务”逻辑误判。除这两处外，全仓库默认值、兜底与文档均指向 8788。

## 6. 已知限制

- 仅 Expo Web 验证；iPhone 真机未在本轮实测（`--check` 只证明 Mac 侧从局域网 IP 能取到 manifest）。
- legacy mock 仍可用 `npm run mock` 启动在 8787，仅限单测/增量验证；若误用于真机，缺少档案与管理接口。
- 统一服务当前为后台会话启动；重启机器/终端后按第 4.1 节命令启动即可，默认就是 8788。
- `GET profile` 未知设备改为 `200 { profile: null }` 是本轮为消除控制台 404 做的契约调整；如外部已有消费者依赖 404，需要同步适配。
- 服务端仍为单进程 JSON 文件存储，端口统一不改变上一轮记录的多实例/鉴权限制。

---

> 环境提示：本轮 `npm test` / `npx tsc` 时沙箱又把 3 条 npm 日志移入废纸篓（`~/.npm/_logs/`）。如需找回：Finder 打开废纸篓，先查看 `sboxbackup`，再手动拖回原目录。
