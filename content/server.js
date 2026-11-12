#!/usr/bin/env node
/* ============================================================
   content/server.js —— 本地内容服务（零依赖）
   启动时扫描 content/ 目录，按文件名生成 manifest 与分片：
     /manifest.json
     /shards/{tracks,decks,videos,catalog,courses,stories,stages,tasks}.json
     /audio|/images|/video|/courses|/stories 下的静态素材
   新增文件后重启服务即可被 App 发现。

   运行：node content/server.js
   端口：CONTENT_PORT（默认 8788，统一内容 + 档案 + 管理服务）
   ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname);
const REPO = path.resolve(__dirname, '..');
const STAGES = require(path.join(REPO, 'shared', 'stages.js'));
const CONTENT = require(path.join(REPO, 'shared', 'content.js')).CONTENT;
const COURSE_CATEGORIES = require(path.join(REPO, 'shared', 'courses.js')).COURSE_CATEGORIES;
const STORY_CATEGORIES = require(path.join(REPO, 'shared', 'stories.js')).STORY_CATEGORIES;
const STORY_CATEGORY_LABEL = STORY_CATEGORIES.reduce((map, item) => {
  map[item.id] = item.label;
  return map;
}, {});
const registryLib = require('./registry-lib');
const profileSync = require(path.join(REPO, 'shared', 'profileSync.js'));
const { createProfileStore } = require('./profile-store');
const { createRegistryAdmin } = require('./registry-admin');

/* 稳定 id：注册表在启动时读取，扫描到新 slug 自动写入，对外发布 uid */
const registry = registryLib.loadRegistry();
const parseName = registryLib.parseName;
let registryDirty = false;

function stableUid(kind, slug, meta) {
  const result = registryLib.ensureEntry(registry, kind, slug, meta);
  if (result.dirty) registryDirty = true;
  return result.entry.uid;
}

const PORT = Number(process.env.CONTENT_PORT || 8788);
const STAGE_IDS = Object.keys(STAGES.STAGES || {});
const AUDIO_EXT = ['.mp3', '.m4a', '.wav', '.aac', '.ogg'];
const VIDEO_EXT = ['.mp4', '.webm', '.mov', '.m4v'];
const IMAGE_EXT = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];
const ADMIN_TOKEN = String(process.env.ADMIN_TOKEN || '').trim();
const ADMIN_FILE = path.join(__dirname, 'admin.html');
const MAX_BODY = 512 * 1024;
const CATEGORY_LABEL = {};
COURSE_CATEGORIES.forEach((c) => { CATEGORY_LABEL[c.id] = c.label; });

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    if (entry.name.startsWith('.')) return;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  });
  return out;
}

function extOf(file) {
  return path.extname(file).toLowerCase();
}

function relUrl(file) {
  return '/' + path.relative(ROOT, file).split(path.sep).join('/');
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    console.warn('[content] 跳过无法解析的 JSON: ' + relUrl(file) + ' (' + err.message + ')');
    return null;
  }
}

function normalizeStage(value, fallbackDir) {
  if (STAGE_IDS.indexOf(value) !== -1) return value;
  if (STAGE_IDS.indexOf(fallbackDir) !== -1) return fallbackDir;
  return 'toddler';
}

function byOrder(a, b) {
  if (a.order !== b.order) return a.order - b.order;
  return String(a.slug || a.id).localeCompare(String(b.slug || b.id));
}

function buildShards() {
  const tracks = {};
  const videos = {};
  const decks = {};
  const products = [];
  const courseList = [];
  const storyList = [];

  STAGE_IDS.forEach((stage) => {
    tracks[stage] = [];
    videos[stage] = [];
    decks[stage] = { topics: [] };
  });

  // ---------- 音频 ----------
  walk(path.join(ROOT, 'audio')).forEach((file) => {
    const ext = extOf(file);
    const meta = parseName(file);
    const dirStage = path.basename(path.dirname(file));
    if (ext === '.json') {
      const data = readJson(file);
      if (!data) return;
      const stage = normalizeStage(data.stage, dirStage);
      const slug = meta.id;
      const uid = stableUid('track', slug, { title: data.title || meta.title, path: relUrl(file) });
      tracks[stage].push(Object.assign({}, data, {
        id: uid,
        uid,
        slug,
        legacyId: data.id || slug,
        title: data.title || meta.title,
        sec: data.sec != null ? data.sec : meta.number,
        src: data.src || '',
        emoji: data.emoji || '🎵',
        stage,
        order: data.order != null ? data.order : meta.number,
      }));
      return;
    }
    if (AUDIO_EXT.indexOf(ext) === -1) return;
    const stage = normalizeStage('', dirStage);
    const uid = stableUid('track', meta.id, { title: meta.title, path: relUrl(file) });
    tracks[stage].push({
      id: uid,
      uid,
      slug: meta.id,
      legacyId: meta.id,
      title: meta.title,
      artist: meta.tag,
      sec: meta.number,
      src: relUrl(file),
      emoji: '🎵',
      stage,
      order: meta.order != null ? meta.order : 9999,
    });
  });

  // ---------- 视频 ----------
  walk(path.join(ROOT, 'video')).forEach((file) => {
    const relVideo = path.relative(path.join(ROOT, 'video'), file);
    /* video/courses 只作为课程章节素材，不进入阶段视频列表 */
    if (relVideo.split(path.sep)[0] === 'courses') return;
    const ext = extOf(file);
    const meta = parseName(file);
    const dirStage = path.basename(path.dirname(file));
    if (ext === '.json') {
      const data = readJson(file);
      if (!data) return;
      const stage = normalizeStage(data.stage, dirStage);
      const slug = meta.id;
      const uid = stableUid('video', slug, { title: data.title || meta.title, path: relUrl(file) });
      videos[stage].push(Object.assign({}, data, {
        id: uid,
        uid,
        slug,
        legacyId: data.id || slug,
        title: data.title || meta.title,
        sec: data.sec != null ? data.sec : meta.number,
        src: data.src || '',
        emoji: data.emoji || '🎬',
        stage,
        order: data.order != null ? data.order : meta.number,
      }));
      return;
    }
    if (VIDEO_EXT.indexOf(ext) === -1) return;
    const stage = normalizeStage('', dirStage);
    const uid = stableUid('video', meta.id, { title: meta.title, path: relUrl(file) });
    videos[stage].push({
      id: uid,
      uid,
      slug: meta.id,
      legacyId: meta.id,
      title: meta.title,
      sec: meta.number,
      src: relUrl(file),
      emoji: '🎬',
      stage,
      order: meta.order != null ? meta.order : 9999,
    });
  });

  Object.keys(tracks).forEach((stage) => tracks[stage].sort(byOrder));
  Object.keys(videos).forEach((stage) => videos[stage].sort(byOrder));

  // ---------- 认知卡：JSON topic 描述 + 图片文件 ----------
  const topicMap = {};

  function topicFor(stage, topicId) {
    topicMap[stage] = topicMap[stage] || {};
    if (!topicMap[stage][topicId]) {
      const uid = stableUid('topic', topicId, { title: topicId, path: '' });
      topicMap[stage][topicId] = {
        id: uid,
        uid,
        slug: topicId,
        legacyId: topicId,
        name: topicId,
        emoji: '🖼️',
        order: 0,
        cards: [],
      };
    }
    return topicMap[stage][topicId];
  }

  walk(path.join(ROOT, 'images', 'cards')).forEach((file) => {
    const ext = extOf(file);
    const meta = parseName(file);
    const dirStage = path.basename(path.dirname(file));
    const stage = normalizeStage('', dirStage);
    if (ext === '.json') {
      const data = readJson(file);
      if (!data) return;
      const topicId = meta.id;
      const topic = topicFor(stage, topicId);
      topic.legacyId = data.id || topicId;
      topic.name = data.name || meta.title;
      topic.emoji = data.emoji || '🃏';
      topic.order = data.order != null ? data.order : meta.number;
      topic.cards = Array.isArray(data.cards) ? data.cards : [];
      return;
    }
    if (IMAGE_EXT.indexOf(ext) === -1) return;
    const topicId = path.basename(path.dirname(file));
    const topic = topicFor(stage, topicId);
    topic.cards.push({
      art: '🖼️',
      word: meta.title,
      pinyin: meta.tag,
      image: relUrl(file),
      tip: '指着图片说出名称，等宝宝看向图片。',
      fact: '每天认 3～5 张，重复比数量更重要。',
      sentence: meta.title + '。',
    });
  });
  Object.keys(topicMap).forEach((stage) => {
    decks[stage] = { topics: Object.values(topicMap[stage]).sort(byOrder) };
  });

  // ---------- 商品 ----------
  walk(path.join(ROOT, 'images', 'products')).forEach((file) => {
    if (extOf(file) !== '.json') return;
    const data = readJson(file);
    if (!data) return;
    const meta = parseName(file);
    if (data.id == null) data.id = Number(meta.id) || meta.number;
    products.push(Object.assign({ order: meta.number }, data));
  });
  products.sort(byOrder);

  // ---------- 课程 ----------
  walk(path.join(ROOT, 'courses')).forEach((file) => {
    if (extOf(file) !== '.json') return;
    const data = readJson(file);
    if (!data) return;
    const meta = parseName(file);
    const slug = meta.id;
    const uid = stableUid('course', slug, { title: data.title || meta.title, path: relUrl(file) });
    const course = Object.assign({}, data);
    course.id = uid;
    course.uid = uid;
    course.slug = slug;
    course.legacyId = data.id || slug;
    course.title = data.title || meta.title;
    course.category = data.category || meta.tag;
    course.categoryLabel = course.categoryLabel || CATEGORY_LABEL[course.category] || '课程';
    course.order = data.order != null ? data.order : meta.number;
    /* 章节也登记稳定 id：key 用 courseUid/chapterSlug，课程改名不影响章节 uid */
    course.chapters = (Array.isArray(data.chapters) ? data.chapters : []).map((ch, index) => {
      const base = ch || {};
      const chSlug = String(base.id || ('ch' + (index + 1)));
      const chUid = stableUid('chapter', uid + '/' + chSlug, { title: base.title || chSlug, path: relUrl(file) });
      return Object.assign({}, base, {
        id: chUid,
        uid: chUid,
        slug: chSlug,
        legacyId: base.legacyId || chSlug,
      });
    });
    courseList.push(course);
  });
  courseList.sort(byOrder);

  // ---------- 胎教故事 ----------
  walk(path.join(ROOT, 'stories')).forEach((file) => {
    if (extOf(file) !== '.json') return;
    const data = readJson(file);
    if (!data) return;
    const meta = parseName(file);
    const slug = meta.id;
    const uid = stableUid('story', slug, { title: data.title || meta.title, path: relUrl(file) });
    const story = Object.assign({}, data);
    story.id = uid;
    story.uid = uid;
    story.slug = slug;
    story.legacyId = data.id || slug;
    story.title = data.title || meta.title;
    story.stage = data.stage || meta.tag || 'pregnancy';
    story.category = data.category || 'bedtime';
    story.categoryLabel = data.categoryLabel || STORY_CATEGORY_LABEL[story.category] || '胎教故事';
    story.order = data.order != null ? data.order : meta.number;
    story.pages = Array.isArray(data.pages) ? data.pages : [];
    storyList.push(story);
  });
  storyList.sort(byOrder);

  return {
    stages: { STAGES: STAGES.STAGES, INTERACTIONS: STAGES.INTERACTIONS, STAGE_ORDER: STAGES.STAGE_ORDER },
    tasks: CONTENT.tasks || {},
    tracks,
    decks,
    videos,
    catalog: { categories: CONTENT.categories || [], products },
    courses: courseList,
    stories: storyList,
  };
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function buildManifest(shards) {
  const entries = [];
  const bodies = {};
  Object.keys(shards).forEach((name) => {
    const text = JSON.stringify(shards[name]);
    bodies[name] = text;
    entries.push({
      name,
      url: '/shards/' + name + '.json',
      sha256: sha256(text),
      bytes: Buffer.byteLength(text),
    });
  });
  const version = sha256(entries.map((e) => e.name + ':' + e.sha256).join('|')).slice(0, 12);
  return {
    version,
    generatedAt: new Date().toISOString(),
    shards: entries,
    _bodies: bodies,
  };
}

function counts(shards) {
  const sum = (obj) => Object.values(obj || {}).reduce((n, list) => n + (Array.isArray(list) ? list.length : 0), 0);
  const cards = Object.values(shards.decks || {}).reduce(
    (n, deck) => n + (deck.topics || []).reduce((m, t) => m + (t.cards || []).length, 0),
    0,
  );
  const topics = Object.values(shards.decks || {}).reduce((n, deck) => n + (deck.topics || []).length, 0);
  return {
    version: '',
    tracks: sum(shards.tracks),
    videos: sum(shards.videos),
    topics,
    cards,
    products: (shards.catalog.products || []).length,
    courses: (shards.courses || []).length,
    chapters: (shards.courses || []).reduce((n, c) => n + (c.chapters || []).length, 0),
    stories: (shards.stories || []).length,
    storyPages: (shards.stories || []).reduce((n, s) => n + (s.pages || []).length, 0),
  };
}

let shards = null;
let manifest = null;
let stats = null;

/** 注册表变化后重建分片与 manifest（管理接口改名/新增/删除时调用） */
function rebuildContent() {
  shards = buildShards();
  if (registryDirty) {
    registryLib.saveRegistry(registry);
    registryDirty = false;
    console.log('[content] registry.json 已更新：' + Object.keys(registry.items).length + ' 条稳定 id');
  }
  manifest = buildManifest(shards);
  stats = counts(shards);
  stats.version = manifest.version;
  stats.registry = Object.keys(registry.items).length;
  return stats;
}

rebuildContent();

const profileStore = createProfileStore();
const registryAdmin = createRegistryAdmin({
  registry: registry,
  persist: () => {
    registryLib.saveRegistry(registry);
    registryDirty = false;
  },
  rebuild: rebuildContent,
});

const MIME = {
  '.json': 'application/json; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

function send(res, status, body, type) {
  res.writeHead(status, {
    'Content-Type': type || 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function sendJson(res, status, value) {
  return send(res, status, JSON.stringify(value, null, 2));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        const err = new Error('请求体过大');
        err.status = 413;
        err.code = 'payload_too_large';
        reject(err);
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8').trim();
      if (!text) return resolve({});
      try {
        resolve(JSON.parse(text));
      } catch (err) {
        const bad = new Error('请求体不是合法 JSON');
        bad.status = 400;
        bad.code = 'invalid_json';
        reject(bad);
      }
    });
    req.on('error', reject);
  });
}

function adminTokenOf(req, urlObj) {
  const header = String(req.headers.authorization || '');
  const bearer = /^Bearer\s+(.+)$/i.exec(header);
  if (bearer) return bearer[1].trim();
  return String(urlObj.searchParams.get('token') || '').trim();
}

function adminAllowed(req, urlObj) {
  return !!ADMIN_TOKEN && adminTokenOf(req, urlObj) === ADMIN_TOKEN;
}

function sendError(res, err) {
  return sendJson(res, err && err.status ? err.status : 500, {
    error: (err && err.code) || 'internal',
    message: (err && err.message) || '服务端错误',
  });
}

/* 二进制素材支持 Range（206）：浏览器 / expo-video 需要它才能 seek */
function sendFile(req, res, filePath, type) {
  const total = fs.statSync(filePath).size;
  const headers = {
    'Content-Type': type,
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
    'Accept-Ranges': 'bytes',
  };
  const range = req.headers.range;
  if (!range) {
    res.writeHead(200, Object.assign({}, headers, { 'Content-Length': total }));
    return res.end(fs.readFileSync(filePath));
  }
  const match = /^bytes=(\d*)-(\d*)$/.exec(String(range).trim());
  if (!match || (match[1] === '' && match[2] === '')) {
    res.writeHead(416, Object.assign({}, headers, { 'Content-Range': 'bytes */' + total }));
    return res.end();
  }
  let start = match[1] === '' ? null : Number(match[1]);
  let end = match[2] === '' ? null : Number(match[2]);
  if (start === null) {
    const len = Math.min(end, total);
    start = total - len;
    end = total - 1;
  } else if (end === null || end >= total) {
    end = total - 1;
  }
  if (start > end || start >= total) {
    res.writeHead(416, Object.assign({}, headers, { 'Content-Range': 'bytes */' + total }));
    return res.end();
  }
  res.writeHead(206, Object.assign({}, headers, {
    'Content-Range': 'bytes ' + start + '-' + end + '/' + total,
    'Content-Length': end - start + 1,
  }));
  const stream = fs.createReadStream(filePath, { start, end });
  stream.on('error', () => res.destroy());
  stream.pipe(res);
}

const server = http.createServer(async (req, res) => {
  let urlObj;
  try {
    urlObj = new URL(req.url || '/', 'http://127.0.0.1');
  } catch (err) {
    return sendJson(res, 400, { error: 'bad_url' });
  }
  const url = decodeURIComponent(urlObj.pathname);
  const method = req.method || 'GET';

  if (method === 'OPTIONS') return send(res, 204, '', 'text/plain');

  try {
    if (url === '/manifest.json') {
      const { _bodies, ...plain } = manifest;
      return send(res, 200, JSON.stringify(plain));
    }

    if (url === '/__content/stats') {
      return sendJson(res, 200, Object.assign({}, stats, { profiles: profileStore.stats() }));
    }

    const shardMatch = /^\/shards\/([a-zA-Z0-9_-]+)\.json$/.exec(url);
    if (shardMatch) {
      const name = shardMatch[1];
      if (!manifest._bodies[name]) return sendJson(res, 404, { error: 'shard not found' });
      return send(res, 200, manifest._bodies[name]);
    }

    /* ---------------- 管理页面（token 保护） ---------------- */
    if (url === '/admin' || url === '/admin/') {
      if (!adminAllowed(req, urlObj)) {
        return send(res, 401,
          '<!doctype html><meta charset="utf-8"><title>401</title>' +
          '<body style="font-family:-apple-system,sans-serif;background:#FFF8EE;color:#3B2B22;padding:48px">' +
          '<h1 style="font-size:20px">401 未授权</h1>' +
          '<p style="color:#A08876">访问 /admin 需要有效的 ADMIN_TOKEN。用法：/admin?token=&lt;ADMIN_TOKEN&gt;</p>' +
          (ADMIN_TOKEN ? '' : '<p style="color:#FF6B4A">服务端未配置 ADMIN_TOKEN，请以 ADMIN_TOKEN=... 启动。</p>') +
          '</body>', 'text/html; charset=utf-8');
      }
      if (!fs.existsSync(ADMIN_FILE)) return send(res, 500, 'admin.html missing', 'text/plain; charset=utf-8');
      return send(res, 200, fs.readFileSync(ADMIN_FILE), 'text/html; charset=utf-8');
    }
    /* 管理页本身只允许走 /admin 的 token 校验，禁止直接静态访问 */
    if (url === '/admin.html') return sendJson(res, 404, { error: 'not_found' });

    /* ---------------- 注册表管理 API ---------------- */
    if (url === '/api/admin' || url.startsWith('/api/admin/')) {
      if (!adminAllowed(req, urlObj)) {
        return sendJson(res, 401, {
          error: 'unauthorized',
          message: ADMIN_TOKEN ? 'token 不正确或缺失' : '服务端未配置 ADMIN_TOKEN',
        });
      }
      if (method === 'GET' && url === '/api/admin/registry') return sendJson(res, 200, registryAdmin.list());
      if (method === 'GET' && url === '/api/admin/registry/check') return sendJson(res, 200, registryAdmin.check());
      if (method === 'POST' && url === '/api/admin/registry') {
        const body = await readJsonBody(req);
        return sendJson(res, 201, registryAdmin.add(body));
      }
      const renameMatch = /^\/api\/admin\/registry\/([^/]+)\/(.+)$/.exec(url);
      if (renameMatch) {
        const kind = renameMatch[1];
        const slug = renameMatch[2];
        if (method === 'PATCH') {
          const body = await readJsonBody(req);
          return sendJson(res, 200, registryAdmin.rename({ kind: kind, from: slug, to: body && body.slug }));
        }
        if (method === 'DELETE') {
          return sendJson(res, 200, registryAdmin.remove({ kind: kind, slug: slug }));
        }
      }
      return sendJson(res, 405, { error: 'method_not_allowed' });
    }

    /* ---------------- 设备档案 API ---------------- */
    if (url.startsWith('/api/devices/')) {
      const profileMatch = /^\/api\/devices\/([^/]+)\/profile$/.exec(url);
      if (profileMatch) {
        const deviceId = profileMatch[1];
        if (!profileSync.isValidDeviceId(deviceId)) return sendJson(res, 400, { error: 'invalid_device_id' });
        if (method === 'GET') {
          /* 未知设备返回 200 + profile:null：新设备首次启动不应产生 404 噪声 */
          const profile = profileStore.get(deviceId);
          return sendJson(res, 200, { profile: profile || null });
        }
        if (method === 'PUT') {
          const body = await readJsonBody(req);
          const out = profileStore.applySnapshot(deviceId, body);
          return sendJson(res, out.created ? 201 : 200, out);
        }
        return sendJson(res, 405, { error: 'method_not_allowed' });
      }

      const babiesMatch = /^\/api\/devices\/([^/]+)\/babies$/.exec(url);
      if (babiesMatch) {
        const deviceId = babiesMatch[1];
        if (!profileSync.isValidDeviceId(deviceId)) return sendJson(res, 400, { error: 'invalid_device_id' });
        if (method === 'POST') {
          const body = await readJsonBody(req);
          return sendJson(res, 201, profileStore.upsertBaby(deviceId, body));
        }
        return sendJson(res, 405, { error: 'method_not_allowed' });
      }

      const babyMatch = /^\/api\/devices\/([^/]+)\/babies\/([^/]+)$/.exec(url);
      if (babyMatch) {
        const deviceId = babyMatch[1];
        const babyId = babyMatch[2];
        if (!profileSync.isValidDeviceId(deviceId)) return sendJson(res, 400, { error: 'invalid_device_id' });
        if (method === 'PATCH') {
          const body = await readJsonBody(req);
          return sendJson(res, 200, profileStore.patchBaby(deviceId, babyId, body));
        }
        if (method === 'DELETE') {
          const at = urlObj.searchParams.get('updatedAt') || undefined;
          return sendJson(res, 200, profileStore.deleteBaby(deviceId, babyId, at));
        }
        return sendJson(res, 405, { error: 'method_not_allowed' });
      }
      return sendJson(res, 404, { error: 'not_found' });
    }
  } catch (err) {
    return sendError(res, err);
  }

  const filePath = path.join(ROOT, path.normalize(url).replace(/^([/\\])+/, ''));
  if (!filePath.startsWith(ROOT) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return sendJson(res, 404, { error: 'not found', url: url });
  }
  const ext = extOf(filePath);
  return sendFile(req, res, filePath, MIME[ext] || 'application/octet-stream');
});

server.listen(PORT, () => {
  console.log('[content] 扫描完成: ' + JSON.stringify(stats));
  console.log('[content] manifest: http://127.0.0.1:' + PORT + '/manifest.json');
  console.log('[content] 档案 API: /api/devices/:deviceId/profile（存储 ' + profileStore.filePath + '）');
  console.log('[content] 管理页面: http://127.0.0.1:' + PORT + '/admin?token=***' +
    (ADMIN_TOKEN ? '' : '（未配置 ADMIN_TOKEN，管理接口将一律 401）'));
  console.log('[content] 静态素材: /audio /images /video /courses；新增文件后重启服务生效');
});
