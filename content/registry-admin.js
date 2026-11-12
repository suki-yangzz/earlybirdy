/* ============================================================
   content/registry-admin.js —— 注册表管理（服务端 API 复用 CLI 逻辑）
   - list / check / add / rename / remove
   - rename 会尽量同步重命名文件，保留 uid 与 aliases
   ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const lib = require('./registry-lib');

const ROOT = __dirname;
const ALL_KINDS = ['track', 'video', 'topic', 'course', 'chapter', 'story'];
const FILE_KINDS = ['track', 'video', 'course', 'story'];
const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;
const CHAPTER_SLUG_RE = /^[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+$/;

function fail(status, code, message) {
  const err = new Error(message || code);
  err.status = status;
  err.code = code;
  return err;
}

function relPath(file) {
  return '/' + path.relative(ROOT, file).split(path.sep).join('/');
}

function resolveInside(value) {
  const full = path.resolve(ROOT, String(value || '').replace(/^\/+/, ''));
  if (full !== ROOT && !full.startsWith(ROOT + path.sep)) {
    throw fail(400, 'invalid_path', '路径必须位于 content/ 目录内');
  }
  return full;
}

function fileExists(entry) {
  if (!entry || !entry.path) return false;
  try {
    return fs.existsSync(resolveInside(entry.path));
  } catch (err) {
    return false;
  }
}

function keyOf(entry) {
  return lib.keyOf(entry.kind, entry.slug);
}

function createRegistryAdmin(opts) {
  const registry = opts.registry;
  const persist = opts.persist || (() => lib.saveRegistry(registry));
  const rebuild = opts.rebuild || (() => {});

  function entryList() {
    return Object.keys(registry.items).sort().map((key) => {
      const entry = registry.items[key];
      return {
        key: key,
        uid: entry.uid,
        kind: entry.kind,
        slug: entry.slug,
        title: entry.title,
        path: entry.path || '',
        aliases: Array.isArray(entry.aliases) ? entry.aliases : [],
        createdAt: entry.createdAt || null,
        fileExists: fileExists(entry),
        canRename: FILE_KINDS.indexOf(entry.kind) !== -1,
      };
    });
  }

  function list() {
    const entries = entryList();
    const byKind = {};
    entries.forEach((entry) => { byKind[entry.kind] = (byKind[entry.kind] || 0) + 1; });
    return { total: entries.length, byKind: byKind, entries: entries };
  }

  /** 一致性校验：未注册 / 文件缺失 / uid 重复（与 CLI check 同源） */
  function check() {
    const scanned = lib.scanEntries(registry);
    const seen = {};
    const unregistered = [];
    scanned.forEach((item) => {
      const key = lib.keyOf(item.kind, item.slug);
      if (seen[key]) return;
      seen[key] = true;
      if (!registry.items[key]) unregistered.push(item);
    });

    const missing = [];
    const byUid = {};
    Object.keys(registry.items).forEach((key) => {
      const entry = registry.items[key];
      if (entry.uid) {
        byUid[entry.uid] = byUid[entry.uid] || [];
        byUid[entry.uid].push(key);
      }
      if (entry.path && !fileExists(entry)) missing.push({ key: key, path: entry.path });
    });
    const duplicateUids = Object.keys(byUid)
      .filter((uid) => byUid[uid].length > 1)
      .map((uid) => ({ uid: uid, keys: byUid[uid] }));

    return {
      totalEntries: Object.keys(registry.items).length,
      scanned: Object.keys(seen).length,
      unregistered: unregistered,
      missing: missing,
      duplicateUids: duplicateUids,
      ok: unregistered.length === 0 && missing.length === 0 && duplicateUids.length === 0,
    };
  }

  function validateSlug(kind, slug) {
    if (kind === 'chapter') {
      if (!CHAPTER_SLUG_RE.test(String(slug || ''))) {
        throw fail(400, 'invalid_slug', '章节 slug 需形如 <courseUid>/<chapterSlug>');
      }
      return;
    }
    if (!SLUG_RE.test(String(slug || ''))) {
      throw fail(400, 'invalid_slug', 'slug 只允许小写字母、数字、短横线，且以字母或数字开头');
    }
  }

  function add(input) {
    const kind = String((input && input.kind) || '');
    const slug = String((input && input.slug) || '');
    if (ALL_KINDS.indexOf(kind) === -1) throw fail(400, 'invalid_kind', 'kind 必须是 ' + ALL_KINDS.join(' / '));
    validateSlug(kind, slug);
    const key = lib.keyOf(kind, slug);
    if (registry.items[key]) throw fail(409, 'exists', key + ' 已注册');

    let filePath = '';
    if (input && input.path) {
      const full = resolveInside(input.path);
      filePath = relPath(full);
    }
    const entry = {
      uid: crypto.randomUUID(),
      slug: slug,
      kind: kind,
      title: (input && input.title) || slug,
      path: filePath,
      aliases: [],
      createdAt: new Date().toISOString(),
    };
    registry.items[key] = entry;
    persist();
    rebuild();
    return { entry: entry, key: key };
  }

  function rename(input) {
    const kind = String((input && input.kind) || '');
    const from = String((input && input.from) || '');
    const to = String((input && input.to) || '');
    if (FILE_KINDS.indexOf(kind) === -1) {
      throw fail(400, 'unsupported_kind', '仅支持重命名 ' + FILE_KINDS.join(' / ') + '；topic 来自目录名、chapter 来自课程 JSON');
    }
    validateSlug(kind, to);
    const oldKey = lib.keyOf(kind, from);
    const newKey = lib.keyOf(kind, to);
    const entry = registry.items[oldKey];
    if (!entry) throw fail(404, 'not_found', '注册表里没有 ' + oldKey);
    if (registry.items[newKey]) throw fail(409, 'exists', newKey + ' 已存在');

    const oldPath = entry.path || '';
    entry.aliases = Array.isArray(entry.aliases) ? entry.aliases : [];
    if (entry.aliases.indexOf(from) === -1) entry.aliases.push(from);
    entry.slug = to;
    delete registry.items[oldKey];
    registry.items[newKey] = entry;

    let fileRenamed = false;
    let warning = '';
    const full = oldPath ? resolveInside(oldPath) : '';
    if (full && fs.existsSync(full)) {
      const dir = path.dirname(full);
      const base = path.basename(full);
      const ext = path.extname(base);
      const matchesConvention = base.indexOf(from + '_') === 0 || base === from + ext;
      if (matchesConvention) {
        const nextBase = to + base.slice(from.length);
        const nextFull = path.join(dir, nextBase);
        if (fs.existsSync(nextFull)) throw fail(409, 'file_exists', '目标文件已存在：' + relPath(nextFull));
        fs.renameSync(full, nextFull);
        entry.path = relPath(nextFull);
        fileRenamed = true;
        if (kind === 'course') {
          Object.keys(registry.items).forEach((key) => {
            const item = registry.items[key];
            if (item && item.kind === 'chapter' && item.path === oldPath) item.path = entry.path;
          });
        }
      } else {
        warning = '文件名不符合 <slug>_<标题> 约定，已只改注册表，未移动文件';
      }
    } else {
      const match = lib.scanEntries(registry).filter((x) => x.kind === kind && x.slug === to)[0];
      if (match) {
        entry.title = match.title || entry.title;
        entry.path = match.path;
      } else {
        warning = '目录里暂未找到 ' + to + ' 对应文件；放好文件后重启服务即可';
      }
    }

    persist();
    rebuild();
    return { entry: entry, oldKey: oldKey, newKey: newKey, fileRenamed: fileRenamed, warning: warning };
  }

  /** 删除只允许清理「文件已不在」的条目；文件仍在时拒绝，避免重启后自动重新注册成新 uid */
  function remove(input) {
    const kind = String((input && input.kind) || '');
    const slug = String((input && input.slug) || '');
    const key = lib.keyOf(kind, slug);
    const entry = registry.items[key];
    if (!entry) throw fail(404, 'not_found', '注册表里没有 ' + key);
    if (fileExists(entry)) {
      throw fail(409, 'file_exists', key + ' 对应文件仍在；请先移走文件，否则服务重启会自动重新注册（uid 会变）');
    }
    delete registry.items[key];
    persist();
    rebuild();
    return { deleted: key };
  }

  return {
    list: list,
    check: check,
    add: add,
    rename: rename,
    remove: remove,
    kindKeys: keyOf,
  };
}

module.exports = { createRegistryAdmin, ALL_KINDS, FILE_KINDS };
