/* ============================================================
   content/registry-lib.js —— 素材稳定 id 注册表
   形态：content/registry.json
   {
     "version": 1,
     "updatedAt": "...",
     "items": {
       "track:p1": { "uid": "<uuid>", "slug": "p1", "kind": "track",
                     "title": "小星星摇篮曲", "path": "/audio/pregnancy/p1_....json",
                     "aliases": ["old-slug"], "createdAt": "..." }
     }
   }
   服务扫描目录时按 kind+slug 查表；没有就自动注册，对外发布 uid。
   ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const REGISTRY_PATH = path.join(__dirname, 'registry.json');

function emptyRegistry() {
  return {
    version: 1,
    updatedAt: '',
    note: '素材稳定 id 注册表：由 content/server.js 自动维护；重命名请用 node content/registry.js rename <kind:old> <new>',
    items: {},
  };
}

function loadRegistry() {
  try {
    const raw = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
    if (!raw || typeof raw !== 'object') return emptyRegistry();
    if (!raw.items || typeof raw.items !== 'object') raw.items = {};
    if (!raw.version) raw.version = 1;
    return raw;
  } catch (err) {
    return emptyRegistry();
  }
}

function saveRegistry(registry) {
  registry.updatedAt = new Date().toISOString();
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2) + '\n');
}

function keyOf(kind, slug) {
  return String(kind) + ':' + String(slug);
}

/**
 * 查表/注册一个素材。返回 { entry, dirty }。
 * dirty=true 表示注册表有变化，调用方负责保存。
 */
function ensureEntry(registry, kind, slug, meta) {
  const key = keyOf(kind, slug);
  const info = meta || {};
  let entry = registry.items[key];
  let dirty = false;
  if (!entry) {
    entry = {
      uid: crypto.randomUUID(),
      slug: String(slug),
      kind: String(kind),
      title: info.title || String(slug),
      path: info.path || '',
      aliases: [],
      createdAt: new Date().toISOString(),
    };
    registry.items[key] = entry;
    return { entry, dirty: true };
  }
  if (!entry.uid) { entry.uid = crypto.randomUUID(); dirty = true; }
  if (!Array.isArray(entry.aliases)) { entry.aliases = []; dirty = true; }
  if (info.title && entry.title !== info.title) { entry.title = info.title; dirty = true; }
  if (info.path && entry.path !== info.path) { entry.path = info.path; dirty = true; }
  if (entry.slug !== String(slug)) { entry.slug = String(slug); dirty = true; }
  return { entry, dirty };
}

/** 文件名约定：<slug>_<标题>_<分类或阶段>_<时长秒/序号>[_<排序>].ext */
function parseName(file) {
  const base = path.basename(file, path.extname(file));
  const parts = base.split('_');
  const slug = (parts[0] || '').trim();
  const title = (parts[1] || slug).trim();
  const tag = (parts[2] || '').trim();
  const num = Number(parts[3]);
  const order = Number(parts[4]);
  return {
    id: slug,
    title,
    tag,
    number: Number.isFinite(num) ? num : 0,
    order: Number.isFinite(order) ? order : null,
  };
}

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

function relPath(file) {
  return '/' + path.relative(__dirname, file).split(path.sep).join('/');
}

/** 按 kind+slug 查条目（兼容 cases：别名、历史 key） */
function findEntryBySlug(registry, kind, slug) {
  if (!registry || !registry.items) return null;
  const direct = registry.items[keyOf(kind, slug)];
  if (direct) return direct;
  const keys = Object.keys(registry.items);
  for (let i = 0; i < keys.length; i++) {
    const entry = registry.items[keys[i]];
    if (!entry || entry.kind !== kind) continue;
    if (entry.slug === slug) return entry;
    if (Array.isArray(entry.aliases) && entry.aliases.indexOf(slug) !== -1) return entry;
  }
  return null;
}

/** 扫描目录里会被内容服务收录的 slug（用于 check / rename 定位文件） */
function scanEntries(registry) {
  const out = [];
  const AUDIO_EXT = ['.mp3', '.m4a', '.wav', '.aac', '.ogg'];
  const VIDEO_EXT = ['.mp4', '.webm', '.mov', '.m4v'];
  const IMAGE_EXT = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];

  walk(path.join(__dirname, 'audio')).forEach((file) => {
    const ext = path.extname(file).toLowerCase();
    const meta = parseName(file);
    if (ext === '.json') {
      let data = null;
      try { data = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (err) { return; }
      out.push({ kind: 'track', slug: meta.id, title: data.title || meta.title, path: relPath(file) });
      return;
    }
    if (AUDIO_EXT.indexOf(ext) === -1) return;
    out.push({ kind: 'track', slug: meta.id, title: meta.title, path: relPath(file) });
  });

  walk(path.join(__dirname, 'video')).forEach((file) => {
    const rel = path.relative(path.join(__dirname, 'video'), file);
    /* video/courses 是课程章节素材，不进入阶段视频列表，也不算独立素材 */
    if (rel.split(path.sep)[0] === 'courses') return;
    const ext = path.extname(file).toLowerCase();
    const meta = parseName(file);
    if (ext === '.json') {
      let data = null;
      try { data = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (err) { return; }
      out.push({ kind: 'video', slug: meta.id, title: data.title || meta.title, path: relPath(file) });
      return;
    }
    if (VIDEO_EXT.indexOf(ext) === -1) return;
    out.push({ kind: 'video', slug: meta.id, title: meta.title, path: relPath(file) });
  });

  const cardRoot = path.join(__dirname, 'images', 'cards');
  walk(cardRoot).forEach((file) => {
    const ext = path.extname(file).toLowerCase();
    const meta = parseName(file);
    if (ext === '.json') {
      let data = null;
      try { data = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (err) { return; }
      out.push({ kind: 'topic', slug: meta.id, title: data.name || meta.title, path: relPath(file) });
      return;
    }
    if (IMAGE_EXT.indexOf(ext) === -1) return;
    const topicId = path.basename(path.dirname(file));
    out.push({ kind: 'topic', slug: topicId, title: topicId, path: relPath(file) });
  });

  /* 课程与章节：章节 key 用 courseUid/chapterSlug，课程改名不影响章节 uid */
  walk(path.join(__dirname, 'courses')).forEach((file) => {
    if (path.extname(file).toLowerCase() !== '.json') return;
    let data = null;
    try { data = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (err) { return; }
    const meta = parseName(file);
    const slug = meta.id;
    out.push({ kind: 'course', slug: slug, title: data.title || meta.title, path: relPath(file) });
    const courseEntry = findEntryBySlug(registry, 'course', slug);
    const scope = courseEntry && courseEntry.uid ? courseEntry.uid : slug;
    const chapters = Array.isArray(data.chapters) ? data.chapters : [];
    chapters.forEach((ch, i) => {
      const chSlug = String((ch && ch.id) || ('ch' + (i + 1)));
      out.push({
        kind: 'chapter',
        slug: scope + '/' + chSlug,
        title: (ch && ch.title) || chSlug,
        path: relPath(file),
      });
    });
  });

  /* 胎教故事：kind=story，slug 取文件名前缀；pages 内嵌在同一个 JSON */
  walk(path.join(__dirname, 'stories')).forEach((file) => {
    if (path.extname(file).toLowerCase() !== '.json') return;
    let data = null;
    try { data = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (err) { return; }
    const meta = parseName(file);
    out.push({ kind: 'story', slug: meta.id, title: data.title || meta.title, path: relPath(file) });
  });

  return out;
}

module.exports = {
  REGISTRY_PATH,
  loadRegistry,
  saveRegistry,
  keyOf,
  ensureEntry,
  findEntryBySlug,
  parseName,
  walk,
  relPath,
  scanEntries,
};
