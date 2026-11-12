# 档案与内容注册表服务端化 · 交付

> 验证范围：**仅 Expo Web**（Chrome headless，390×844）+ 真实 HTTP 请求；未在 iOS / Android 真机验证。
> 上一轮 Bug1 / Bug2 修复未回退；`app/`（H5）与 `prototype/` 未改动。

## 1. 结论

- 宝宝档案改为**服务端为准、本地缓存**：新增设备档案 REST API，客户端离线优先同步（先本地后异步推送、失败进 pending、网络恢复补推）。
- 内容注册表维护从 CLI 迁到服务端：新增列表 / 新增 / 改名 / 删除 / 一致性校验 API，以及受 `ADMIN_TOKEN` 保护的 `/admin` 管理页。
- 客户端取内容方式未变：仍通过 `/manifest.json` 动态获取。
- 注册表最终 82 条（chapter 21 / course 6 / story 3 / topic 10 / track 25 / video 17），`check` 全绿。
- `shared` 测试全部通过、`app-mobile` `tsc --noEmit` 通过、正常入口 `consoleErrors` 为空。
- 端口已全仓库统一为 **8788**（`CONTENT_PORT` 默认值、客户端兜底、脚本与文档一致；旧 mock 仅保留给单测），详见 `PORT-8788-DELIVERY.md`。

## 2. 架构与存储选型

### 2.1 单服务

`content/server.js` 一个 Node 进程同时提供：

- 内容：`/manifest.json`、`/shards/*`、静态素材；
- 档案：`/api/devices/:deviceId/*`；
- 管理：`/api/admin/registry*`、`/admin`。

选择单服务的原因：改名/新增后需要**立即**重建 manifest 与 shards；与注册表同进程可同步完成，否则要多进程共享文件并处理热更新。零第三方依赖（Node 内置 `http`/`fs`/`crypto`）。

### 2.2 存储

| 数据 | 位置 | 形式 |
| --- | --- | --- |
| 设备档案 | `server/data/profiles.json`（可用 `PROFILE_STORE_PATH` 覆盖，已 gitignore） | 单 JSON 文件 |
| 内容注册表 | `content/registry.json` | 单 JSON 文件 |

写入方式：进程内串行 + 临时文件 `*.tmp-<pid>-<rand>` 写完后 `rename` 原子替换；损坏文件先备份 `.corrupt-<ts>` 再从空档案启动。

取舍：内测/单机场景无需安装数据库，备份就是复制文件；但**写操作只在当前进程内串行**，多实例/多进程并发会互相覆盖。上线应换 SQLite（单机）或 Postgres（多实例），并把「读-合并-写」放进事务。

### 2.3 身份

- 首次启动生成 `crypto.randomUUID()`，持久化到 `yy.v1.deviceId`（沿用 `yy.v1.*` 前缀）。
- 档案以设备 ID 为键；服务端档案结构保留 `accountId: null`。
- 将来绑定账号：登录后新增 `POST /api/devices/:deviceId/bind`（本轮未实现），把 `accountId` 写入设备档案并建立 `accountId → deviceId[]` 索引；之后鉴权中间件用账号会话解析出可访问的设备，而不是信任 URL 里的设备 ID。

## 3. API 清单

### 3.1 设备档案（匿名设备 ID，无鉴权）

| 方法 | 路径 | 请求体 | 成功响应 |
| --- | --- | --- | --- |
| GET | `/api/devices/:deviceId/profile` | — | `200 { profile: {...} \| null }`（未知设备返回 `profile:null`，不产生 404 噪声） |
| PUT | `/api/devices/:deviceId/profile` | `{ babies, currentId, currentIdUpdatedAt, deletedBabies, updatedAt }` | 首次 `201`，否则 `200`；`{ profile, conflicts, dropped, created }` |
| POST | `/api/devices/:deviceId/babies` | 宝宝对象（`id` 可省略，服务端生成 `baby-N`） | `201 { profile, baby, created }` |
| PATCH | `/api/devices/:deviceId/babies/:babyId` | 局部字段 `{ name?, nickname?, pregnant?, dueDate?, birthDate?, updatedAt? }` | `200 { profile, baby }`；更旧时间戳 `409 stale` |
| DELETE | `/api/devices/:deviceId/babies/:babyId?updatedAt=<ISO>` | — | `200 { profile, deleted: { id, updatedAt } }`；更旧时间戳 `409 stale` |

`deviceId` 校验为 8–128 位 `[A-Za-z0-9_-]`；未知设备返回 `200 { profile: null }`。`babies` 上限 20。

### 3.2 内容注册表（需 token）

token 读取顺序：`Authorization: Bearer <ADMIN_TOKEN>` 或 `?token=<ADMIN_TOKEN>`。未配置 `ADMIN_TOKEN` 时一律 401。

| 方法 | 路径 | 请求体 | 响应 |
| --- | --- | --- | --- |
| GET | `/api/admin/registry` | — | `{ total, byKind, entries[] }` |
| GET | `/api/admin/registry/check` | — | `{ totalEntries, scanned, unregistered[], missing[], duplicateUids[], ok }` |
| POST | `/api/admin/registry` | `{ kind, slug, title?, path? }` | `201 { entry, key }`；重复 `409 exists` |
| PATCH | `/api/admin/registry/:kind/:slug` | `{ slug }` | `200 { entry, oldKey, newKey, fileRenamed, warning }`；保留 uid、追加旧 slug 到 `aliases`，按约定重命名文件 |
| DELETE | `/api/admin/registry/:kind/:slug` | — | `200 { deleted }`；文件仍在时 `409 file_exists` |
| GET | `/admin?token=…` | — | 管理页 HTML；无/错 token `401` |

管理页只允许走 `/admin` 的 token 校验；`/admin.html` 直接访问返回 404。

## 4. 离线与冲突策略

### 4.1 读取与写入

1. 启动先读 `yy.v1.babies` 本地缓存并立刻上屏，随后后台同步档案，再同步内容；网络失败只保持本地，不阻塞、不报错。
2. 所有档案写操作先写本地 AsyncStorage，再 `queueProfileChange()` 串行 PUT（2500ms 超时）。
3. 推送失败：`yy.v1.sync.pending = true`，记录 `lastError`；界面保持已写入的本地数据。
4. 补推触发：下次启动、Web `window online`、原生 `AppState` 回到 active。
5. 首次升级（本地已有档案、从未注册）：发现 `registered=false` 且本地有宝宝，直接整包 PUT 注册，避免先 GET；成功后置 `registered=true`，二次启动不会重复上传。
6. 新设备：不写服务端，等用户第一次添加宝宝时创建。
7. 清空本地缓存但保留 `yy.v1.deviceId`：启动 GET 从服务端恢复；若连设备 ID 一起清空，则视为全新设备，旧档案无法找回（见第 7 节）。

### 4.2 冲突：per-baby `updatedAt` LWW

- 合并基准：服务端为 base，客户端快照为 incoming；每个宝宝独立比较 `updatedAt`，较大者保留。
- `updatedAt` 相同但内容不同：**保留服务端**，并在响应 `conflicts` 里记录 `reason: "same-updatedAt"`（不静默改写）。
- 删除：写墓碑 `{ id, updatedAt }`；合并时墓碑与宝宝取更晚的一方，墓碑并集保留，避免“删了又被旧副本加回来”。
- `currentId`：用独立的 `currentIdUpdatedAt` 做 LWW；指向已删除宝宝时回落到第一个宝宝。
- 数据损失边界：同一条宝宝记录被两端**同时**修改时，LWW 会整条丢弃较旧一方（不同字段的并发修改也会一起丢）。多宝宝之间互不影响。没有字段级合并，也不会把旧值写回去。要消除该风险需改为服务端版本号 + 字段级合并或冲突人工处理。
- 本地比服务端新但 pending 标记丢失（例如同步元数据被清）：GET 合并后发现 `serverStale`，会用合并结果补推一次。

## 5. 安全风险与上线前待办

**设备 ID 不是认证。** 它是“知道即可读写”的 bearer 标识：

- 任何人拿到某设备 ID，就能读取/覆盖该设备的宝宝档案；
- 服务端没有账号、会话、签名，也没有按设备的所有权校验；
- 当前为明文 HTTP、CORS `*`、无速率限制，适合**内测 / 单机 / 本机开发**，不能直接公网部署。

上线前必须补：

1. 账号体系 + 设备/档案归属校验（`accountId` 绑定，服务端从会话推导可访问设备，禁止客户端任意指定别人的 ID）。
2. HTTPS 与鉴权中间件；管理 token 定期轮换、不要出现在日志/前端 bundle。
3. 接口限流、请求体上限（已限 512KB）、审计日志。
4. 存储换 SQLite/Postgres，事务化“读-合并-写”，多实例部署。
5. 备份与恢复演练；设备 ID 丢失/换机迁移方案（账号绑定后即可跨设备恢复）。

`ADMIN_TOKEN` 只从环境变量读取，仓库不含真实 token；示例见 `.env.example`。

## 6. 验证结果（真实输出）

### 6.1 单元测试与类型检查

```text
11/11 passed    # shared/babies（多宝宝与阶段切换）
12/12 通过      # shared/profileSync（并集 / LWW 双向 / 同时间冲突 / 墓碑 / currentId）
4/4 passed      # shared/courses
ids.test.js: 稳定 id 映射与迁移用例通过

$ cd app-mobile && npx tsc --noEmit
tsc_exit=0
```

### 6.2 档案 API（真实 HTTP）

```json
"1_get_unknown":            { "status": 200, "body": { "profile": null } },
"2_put_snapshot":           { "status": 201, "created": true, "profile": { "accountId": null, "currentId": "baby-1", "babies": ["baby-1 满满", "baby-2 禾禾"] } },
"4_post_baby":              { "status": 201, "created": true, "babyCount": 3 },
"5_patch_baby":             { "status": 200, "baby": { "id": "baby-3", "nickname": "芽芽Plus", "updatedAt": "2026-11-11T09:20:00.000Z" } },
"6_delete_baby":            { "status": 200, "deleted": { "id": "baby-3", "updatedAt": "2026-11-11T09:30:00.000Z" }, "babyCount": 2 },
"7_get_after_delete":       { "status": 200, "babyIds": ["baby-1", "baby-2"], "deletedBabies": [{ "id": "baby-3", "updatedAt": "2026-11-11T09:30:00.000Z" }] }
```

### 6.3 档案链路：改档案 → 落库 → 清缓存 → 重启恢复

演示设备 `11111111-2222-4333-8444-666666666666`，真实输出节选：

```json
"registered": {
  "meta": { "registered": true, "pending": false, "lastError": null },
  "remote": { "status": 200, "babyCount": 2, "nickname": "满满", "accountId": null }
},
"secondLoad": { "remote": { "deviceUpdatedAt": "2026-11-11T08:37:49.761Z" } },
"afterEdit": {
  "local":  { "nickname": "满满Plus", "updatedAt": "2026-11-11T08:38:03.632Z" },
  "remote": { "nickname": "满满Plus", "babyUpdatedAt": "2026-11-11T08:38:03.632Z" }
},
"cleared": { "removed": 6, "deviceId": "11111111-2222-4333-8444-666666666666" },
"restored": {
  "local":  { "nickname": "满满Plus", "updatedAt": "2026-11-11T08:38:03.632Z" },
  "bodyHasPlus": true,
  "errors": []
}
```

`secondLoad` 的 `deviceUpdatedAt` 与首次注册完全一致，说明已注册设备二次启动没有重复上传。

### 6.4 离线 → 恢复

```json
"offline": {
  "local": { "nickname": "离线昵称" },
  "meta": { "pending": true, "lastError": "Failed to fetch" },
  "bodyHasOffline": true,
  "remote": { "nickname": "满满Plus" }
},
"online": {
  "meta": { "pending": false, "lastError": null },
  "remote": { "nickname": "离线昵称", "babyUpdatedAt": "2026-11-11T08:38:16.112Z" }
}
```

断网期间界面正常显示新昵称，服务端保持旧值；恢复网络后 pending 清空、服务端更新为本地值。界面本身没有同步状态徽标，pending 状态只在 `yy.v1.sync` 中。

### 6.5 冲突（LWW）

```json
"afterA": { "localNickname": "服务端较新", "localUpdatedAt": "2026-11-11T10:00:00.000Z", "remote": { "nickname": "服务端较新", "updatedAt": "2026-11-11T10:00:00.000Z" }, "pending": false },
"afterB": { "localNickname": "本地较新", "localUpdatedAt": "2026-11-11T11:00:00.000Z", "remote": { "nickname": "本地较新", "updatedAt": "2026-11-11T11:00:00.000Z" }, "pending": false },
"errors": []
```

场景 A：服务端 10:00 > 本地 09:00，保留服务端并合并回本地；场景 B：本地 11:00 > 服务端 10:00，保留本地并补推服务端。

### 6.6 注册表管理 API

```json
"9_admin_no_token":       { "status": 401, "body": { "error": "unauthorized" } },
"10_admin_add":           { "status": 201, "uid": "514d6300-71d8-4681-ba94-9ac59b12850b" },
"11_admin_rename":        { "status": 200, "oldKey": "track:demo-admin", "newKey": "track:demo-admin-renamed", "uidUnchanged": true, "aliases": ["demo-admin"], "fileRenamed": true },
"12_admin_check_after_add": { "status": 200, "totalEntries": 83, "scanned": 83, "ok": true },
"13_admin_delete_file_exists": { "status": 409, "body": { "error": "file_exists" } },
"14_admin_delete_ok":     { "status": 200, "body": { "deleted": "track:demo-admin-renamed" } },
"15_admin_check_final":   { "status": 200, "totalEntries": 82, "scanned": 82, "ok": true },
"16_admin_list":          { "status": 200, "total": 82, "byKind": { "chapter": 21, "course": 6, "story": 3, "topic": 10, "track": 25, "video": 17 } }
```

管理页：

```text
/admin                         → 401
/admin?token=<ADMIN_TOKEN>     → 200
管理页列表                     → 82 / 82 条；一致性校验“全部一致”
```

截图：`artifacts/server-admin-list.png`、`artifacts/server-admin-check.png`。

### 6.7 入口回归

```json
{ "deviceId": "11111111-2222-4333-8444-666666666666", "sync": { "registered": true, "pending": false, "lastError": null }, "errors": [] }
```

### 6.8 截图

- `artifacts/server-sync-home.png`（首次注册后首页）
- `artifacts/server-edit-pushed.png`（改昵称后已推送）
- `artifacts/server-restored.png`（清缓存重启后从服务端恢复）
- `artifacts/server-offline-pending.png` / `artifacts/server-online-recovered.png`（断网写入 / 恢复补推；界面无同步徽标，pending 证据见 6.4）
- `artifacts/server-conflict.png`（LWW 冲突后）
- `artifacts/server-admin-list.png` / `artifacts/server-admin-check.png`（管理页与校验）

## 7. 启动方式

```bash
# 1) 服务端（内容 + 档案 + 管理）
cd /Users/zhenzhenyang/Workspace/earlybirdy
cp .env.example .env            # 至少把 ADMIN_TOKEN 改成随机长串
node --env-file=.env content/server.js   # 默认端口 8788，无需写 CONTENT_PORT

# 2) Expo Web
cd app-mobile
EXPO_PUBLIC_CONTENT_URL=http://127.0.0.1:8788/manifest.json npx expo start --web --port 8081
```

- 管理页：`http://127.0.0.1:8788/admin?token=<ADMIN_TOKEN>`（进入后 token 从地址栏移除，存 sessionStorage；401 会回登录门）。
- 档案文件：`server/data/profiles.json`；注册表：`content/registry.json`。
- 未配置 `ADMIN_TOKEN` 时服务端仍启动，但管理接口与管理页一律 401。

## 8. 已知限制

- **仅 Expo Web 验证**；iOS / Android 真机、后台/杀进程补推未验证。
- `topic`（来自目录名）与 `chapter`（来自课程 JSON）不支持在管理页改名，接口返回 400。
- 删除只允许清理“文件已不在”的条目；文件仍在时会 409，避免服务重启扫描后自动注册出新 uid。
- 手动往 `content/` 放新文件仍需重启服务；通过管理接口新增会立即重建 manifest。
- 存储为单进程 JSON 文件，不支持多实例并发；没有压缩与清理策略。
- 匿名设备 ID 泄露即可读写；设备 ID 丢失（连 `yy.v1.deviceId` 一起清空）无法恢复旧档案。
- 同步状态没有 UI 指示；离线修改只在本地 `yy.v1.sync.pending` 可见。
- 服务端未做接口级限流与审计，公网部署前必须补齐第 5 节事项。

---

> 环境提示：本轮运行 `npx tsc` / `npm test` 时，沙箱把两条 npm 日志移到了废纸篓（`~/.npm/_logs/`）。需要找回请在 Finder 打开废纸篓，先查看 `sboxbackup`，再手动拖回原目录。
