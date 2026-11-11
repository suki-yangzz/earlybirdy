# content/ —— 素材目录与本地内容服务

本目录是 App 的素材来源。内容服务启动时扫描目录并自动生成 manifest，**不需要手工维护曲目/卡片列表**。

## 1. 目录约定

```
content/
├── audio/<stage>/        # 胎教音乐、儿歌（mp3 / m4a / wav / aac / ogg）
├── images/
│   ├── cards/<stage>/    # 认知卡：JSON topic 描述，或图片文件
│   ├── products/         # 商品：JSON 描述（可含 image 字段）
│   └── covers/           # 课程 / 视频封面（png / jpg / webp）
├── video/<stage>/        # 动画视频（mp4 / webm / mov）
│   └── courses/          # 课程章节视频（不进阶段视频列表，由 courses/*.json 的 src 引用）
├── courses/              # 课程 JSON（每个文件一门课）
│   ├── audio/            # 课程章节音频（由 courses/*.json 的 src 引用）
│   └── images/           # 课程图文页配图（由 pages[].image 引用）
├── stories/              # 胎教故事 JSON（每个文件一个故事，pages 内嵌）
│   └── audio/            # 故事音频（由 stories/*.json 的 audio.src 引用）
├── registry.json         # 稳定 id 注册表（服务自动维护，勿手写 uid）
├── registry-lib.js       # 注册表读写（服务与 CLI 共用）
├── registry.js           # 注册表维护命令：check / list / rename
├── server.js             # 零依赖内容服务
└── scripts/              # 迁移与数量核对脚本
```

`<stage>` 取值：`pregnancy` / `baby` / `toddler` / `preschool` / `kid`。放错目录会回落到 `toddler`。

## 2. 命名规则

### 音视频（推荐）

```
<id>_<标题>_<分类>_<时长秒>[_<排序>].<扩展名>
```

示例：`audio/taijiao-01_晨间胎教_胎教_180_1.mp3`

- `id`：只允许小写字母、数字、短横线，作为稳定 id（见第 4 节）。
- `标题`：展示给用户的中文/英文标题，不能包含下划线。
- `分类`：音频填「胎教 / 儿歌」等；视频填「动画 / 儿歌」等。
- `时长秒`：整数秒，用于列表展示。
- `排序`：可选，数字越小越靠前；缺省按 9999 处理。已有内容由 JSON 描述文件里的 `order` 保证原顺序。

### 已有内容的 JSON 描述文件

仓库里的存量内容原本是「远端 URL + emoji」，没有本地二进制素材。迁移脚本把它们写成了 JSON 描述文件，例如：

```
content/audio/pregnancy/p1_小星星摇篮曲_pregnancy_204.json
```

服务优先读取 JSON 里的 `id/title/sec/src/emoji/order`，因此条目数量、顺序和封面与迁移前一致。**新增真实音视频时直接放媒体文件即可，不必再写 JSON。**

### 认知卡

- 一个 JSON 文件 = 一个主题（topic），内容格式沿用 `{ id, name, emoji, cards: [...] }`。
- 也可以直接放图片：`images/cards/toddler/水果/apple_苹果_apple.jpg`，服务会按所在文件夹归入 `水果` 主题，并将图片路径写入卡片的 `image` 字段（App 加载失败时回落 emoji）。

### 商品 / 课程

- 商品：`images/products/<id>_<标题>_<序号>.json`，字段同现有商品对象（商品 id 写在 JSON 内，改名不影响订单）。
- 课程：`courses/<id>_<标题>_<分类>_<序号>.json`，字段同 `shared/courses.js` 的课程对象。
- 胎教故事：`stories/<id>_<标题>_<阶段>_<序号>.json`，字段同 `shared/stories.js` 的故事对象（`category/categoryLabel/title/intro/pages`，可选 `audio: { src, sec }`）。故事列表按 `stage` 与 `category` 筛选，详情按 `pages` 翻页；有 `audio.src` 时复用 App 音频播放器。

课程章节支持三种类型，`type` 与 `kind` 同义（保留 `kind` 兼容旧版 H5）：

```json
{
  "id": "ch4",
  "title": "音频精讲：三段式胎教流程",
  "type": "audio",
  "duration": "45 秒试听",
  "locked": false,
  "src": "/courses/audio/taijiao-flow.wav",
  "sec": 45
}
```

```json
{
  "id": "ch1",
  "title": "宝宝什么时候能听见",
  "type": "article",
  "duration": "6 分钟",
  "locked": false,
  "pages": [
    { "title": "声音怎么到宝宝耳朵", "body": "……", "image": "/courses/images/taijiao-ch1.png" },
    { "title": "声音会被衰减", "body": "……" }
  ]
}
```

- 没有 `pages` 的图文章节会把 `body` 按空行自动拆页，长段落按句号切分，保证可上下翻页。
- 课程封面用 `cover` 字段引用 `images/covers/` 下的图片；缺失时 App 回落 emoji 色块并标注「封面缺失」。
- `locked: true` 的章节即使有 `src` 也不会被播放，点击只给 `lockText` 提示。

视频章节的 `src` 指向 `content/video/courses/` 下的文件（服务对外路径仍是 `/video/courses/...`）：

```json
{
  "id": "ch5",
  "title": "视频跟练：三分钟胎教实操",
  "type": "video",
  "duration": "6 秒样片",
  "locked": false,
  "src": "/video/courses/taijiao-demo.mp4",
  "sec": 6
}
```

`video/courses/` 只作为课程素材，不会出现在各阶段的「动画」列表里，也不单独注册素材 id；如果视频文件缺失或加载失败，播放器显示占位封面和明确提示，进度与左右 10 秒控件仍可用。

## 3. 新增一首歌（完整示例）

```bash
# 1. 复制文件并按命名规则改名（180 秒，排在 pregnancy 第 1 位）
cp ~/Music/晨间胎教.mp3 "content/audio/pregnancy/taijiao-99_晨间胎教_胎教_180_1.mp3"

# 2. 重启内容服务
CONTENT_PORT=8788 node content/server.js

# 3. App 中的位置
#    首页「胎教音乐」/ 底部「音乐」→ 孕期阶段列表 → 第一首「晨间胎教」
```

一张卡片同理：把图片放到 `content/images/cards/toddler/水果/`，重启服务，卡片页「水果」主题下会出现该卡片。

## 4. 稳定 id 与注册表

### 机制

- 服务启动时按 `<kind>:<slug>` 查 `content/registry.json`：
  - 已存在：沿用原有 `uid`；
  - 不存在：自动生成一个 uuid 并写入注册表。
- 目前纳入注册表的 `kind`：`track`（音频）、`video`（阶段视频）、`topic`（认知卡主题）、`course`（课程）、`chapter`（课程章节）、`story`（胎教故事）。
  - 课程章节的 key 是 `chapter:<courseUid>/<chapterSlug>`：章节 slug 只在课程内唯一，用课程 uid 做前缀，课程改名后章节 uid 不会变化。
- 对外 manifest 里每个条目：
  - `id`：**稳定 uid**，App 的收藏 / 浏览历史 / 卡片学习记录 / 课程进度都存这个值；
  - `slug`：文件名派生 slug，仅用于排查与迁移；
  - `legacyId`：旧 JSON 描述文件里的显式 id（如 `p1`、`c-taijiao-01`、`ch4`），仅用于升级迁移。
- App 启动后会把旧版本里基于 slug 的收藏 / 历史 / 学习记录 / 课程进度（`courseProgress` 的 `<courseSlug>:<chapterSlug>` 键）自动改写成 uid（`shared/ids.js`），不需要用户手动操作。

注册表条目示例：

```json
{
  "track:p1": {
    "uid": "0f6d9a2e-…",
    "slug": "p1",
    "kind": "track",
    "title": "小星星摇篮曲",
    "path": "/audio/pregnancy/p1_小星星摇篮曲_pregnancy_204.json",
    "aliases": ["p1-old"],
    "createdAt": "2026-11-10T…"
  },
  "course:c-taijiao-01": {
    "uid": "9c1f…",
    "slug": "c-taijiao-01",
    "kind": "course",
    "title": "胎教音乐怎么听才有效",
    "path": "/courses/c-taijiao-01_胎教音乐怎么听才有效_taijiao_01.json",
    "aliases": [],
    "createdAt": "2026-11-10T…"
  },
  "chapter:9c1f…/ch4": {
    "uid": "a72b…",
    "slug": "9c1f…/ch4",
    "kind": "chapter",
    "title": "音频精讲：三段式胎教流程",
    "path": "/courses/c-taijiao-01_胎教音乐怎么听才有效_taijiao_01.json",
    "aliases": [],
    "createdAt": "2026-11-10T…"
  }
}
```

### 重命名素材（保持收藏不丢）

先停服务，再改文件名，最后用 `rename` 把注册表条目改指到新 id（uid 不变）：

```bash
# 1. 停止内容服务
# 2. 改文件名：p1_小星星摇篮曲_pregnancy_204.json -> p1b_小星星摇篮曲_pregnancy_204.json
# 3. 注册表改指（kind 可选 track / video / topic / course / chapter / story）
node content/registry.js rename track:p1 track:p1b
# 4. 重启服务
CONTENT_PORT=8788 node content/server.js
```

`rename` 会把旧 slug 记进 `aliases`，之后 App 里的收藏、历史仍然指向同一个 uid，能正常跳转。

课程改名同理，只改文件名的第一段，再重指 `course` 条目：

```bash
# 文件：c-taijiao-01_胎教音乐怎么听才有效_taijiao_01.json
#   -> c-taijiao-01b_胎教音乐怎么听才有效_taijiao_01.json
node content/registry.js rename course:c-taijiao-01 c-taijiao-01b
# 重启服务
```

章节 key 以课程 uid 为前缀，课程改名后章节 uid 与 `courseProgress` 键都不变；只有章节 id 本身改名时才需要处理章节条目：

```bash
# 章节 id 从 ch4 改成 ch5（第一个参数是 chapter:<courseUid>/<旧章节 id>）
node content/registry.js rename chapter:9c1f…/ch4 9c1f…/ch5
```

`rename course:...` 还会自动把同一课程文件的章节条目 `path` 同步到新文件，`check` 不会误报「文件已不在」。

### 检查与误改处理

```bash
# 列出未注册 / 文件已不在 / uid 重复的条目（有未注册条目时退出码为 1）
node content/registry.js check

# 查看全部注册条目
node content/registry.js list
```

- **改了文件名但忘了改注册表**：`check` 会把它列为「未注册」；重启服务会生成一个新 uid，旧收藏会降级为「按标题展示」。此时用 `rename track:<新slug> <旧slug>` 把新条目改回旧 uid，或手工把 `registry.json` 里旧条目的 `slug` / `path` 指向新文件。
- **误把 `uid` 改坏**：从备份恢复 `registry.json` 即可；所有收藏都按 uid 关联，uid 变了就无法自动还原。
- **删除素材**：注册表条目保留（`check` 会显示「文件已不在」），App 列表不再展示该条，收藏/历史降级为标题展示，不会崩溃或白屏。

### 约束

- `uid` 由服务生成，不要手工编造或复用。
- `slug` 仍要求只含小写字母、数字、短横线；重命名时只改第一段。
- 商品使用 JSON 内的显式数字 `id`，不参与注册表；课程与章节已纳入注册表，文件改名请按上面的 `rename` 流程操作。

## 5. 素材缺失与降级

| 场景 | 表现 |
| --- | --- |
| 音频文件不存在 / 播放失败 | 播放器停止并 Toast 提示，不无限转圈 |
| 课程章节音频缺失 / 加载失败 | 播放器显示「静默演示」，进度、收藏、切章节仍可用，页面不卡死 |
| 课程章节视频缺失 / 加载失败 | 显示占位封面 + 明确提示，进度与左右 10 秒控件仍可用，不白屏 |
| 课程图文页缺失 | 显示「图文整理中」提示，不出现空白章节 |
| 封面图片 404 | 课程卡片回落 emoji 色块，并显示「封面缺失」角标 |
| 卡片图片 404 | 回落 emoji + 拼音 |
| 整条素材被删除 | 列表不再出现；收藏/历史保留标题，点击提示内容已下架 |
| 内容服务未启动 | App 使用缓存或内置内容，不白屏 |

## 6. 支持的格式与大小建议

- 音频：mp3 / m4a / wav / aac / ogg；单曲建议 ≤ 8 MB，码率 96～192 kbps。
- 视频：mp4 / webm / mov；单条建议 ≤ 50 MB，720p 足够。
- 图片：png / jpg / jpeg / webp / gif；封面建议 800×600、≤ 500 KB；认知卡建议 1:1、≤ 300 KB。
- 课程：JSON 文本，无大小限制；长图文建议拆成多个章节。

## 7. 运行与验收

```bash
# 启动服务（默认 8787；端口被占用时指定其他端口）
CONTENT_PORT=8788 node content/server.js

# 查看自动统计
curl http://127.0.0.1:8788/__content/stats

# 数量核对（迁移前 content.js vs 迁移后目录）
node content/scripts/count.js

# 重新从 shared/content.js 生成描述文件（会覆盖同名描述，不删除多余文件）
node content/scripts/migrate-existing.js
```

manifest 结构：

```
GET /manifest.json
{
  "version": "<内容哈希前 12 位>",
  "generatedAt": "...",
  "shards": [{ "name": "tracks", "url": "/shards/tracks.json", "sha256": "...", "bytes": 1234 }]
}
```

App 默认读取 8787；验证新服务时可设置 `EXPO_PUBLIC_CONTENT_URL=http://127.0.0.1:8788/manifest.json` 后重启 Expo Web。
