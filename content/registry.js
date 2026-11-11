#!/usr/bin/env node
/* ============================================================
   content/registry.js —— 稳定 id 注册表维护命令

   node content/registry.js check
       列出未注册 / 可疑（文件已不在）条目，便于改名后排查
   node content/registry.js list
       打印全部注册条目
   node content/registry.js rename track:p1 track:p1new
       把注册表里的 track:p1 改指到新 id（uid 不变），文件可同步改名
   ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');
const lib = require('./registry-lib');

function cmdCheck() {
  const registry = lib.loadRegistry();
  const scanned = lib.scanEntries(registry);
  const seen = {};
  const unregistered = [];
  scanned.forEach((item) => {
    const key = lib.keyOf(item.kind, item.slug);
    if (seen[key]) return;
    seen[key] = true;
    if (!registry.items[key]) unregistered.push(item);
  });

  const stale = [];
  const byUid = {};
  Object.keys(registry.items).forEach((key) => {
    const entry = registry.items[key];
    if (entry.uid) {
      byUid[entry.uid] = byUid[entry.uid] || [];
      byUid[entry.uid].push(key);
    }
    if (entry.path) {
      const full = path.join(__dirname, entry.path.replace(/^\//, ''));
      if (!fs.existsSync(full)) stale.push({ key, path: entry.path });
    }
  });
  const duplicates = Object.keys(byUid).filter((uid) => byUid[uid].length > 1).map((uid) => ({ uid, keys: byUid[uid] }));

  console.log('注册表条目：' + Object.keys(registry.items).length);
  console.log('扫描到素材：' + Object.keys(seen).length);
  console.log('\n未注册（' + unregistered.length + '）：');
  unregistered.forEach((x) => console.log('  - ' + lib.keyOf(x.kind, x.slug) + '  ' + x.title + '  ' + x.path));
  console.log('\n文件已不在（' + stale.length + '）：');
  stale.forEach((x) => console.log('  - ' + x.key + '  ' + x.path + '（收藏/历史会降级为标题展示）'));
  console.log('\nuid 重复（' + duplicates.length + '）：');
  duplicates.forEach((x) => console.log('  - ' + x.uid + ' -> ' + x.keys.join(', ')));

  if (unregistered.length) {
    console.log('\n提示：重启内容服务会自动注册新条目；若这是改名，请改用 rename 保留旧 uid。');
    process.exitCode = 1;
  }
}

function cmdList() {
  const registry = lib.loadRegistry();
  const keys = Object.keys(registry.items).sort();
  console.log('共 ' + keys.length + ' 条');
  keys.forEach((key) => {
    const e = registry.items[key];
    console.log(key.padEnd(28) + ' ' + e.uid + '  ' + e.title + (e.aliases && e.aliases.length ? '  (aliases: ' + e.aliases.join(',') + ')' : ''));
  });
}

function cmdRename(from, to) {
  if (!from || !to) {
    console.error('用法：node content/registry.js rename <kind:oldSlug> <newSlug>');
    process.exit(2);
  }
  const idx = String(from).indexOf(':');
  if (idx <= 0) {
    console.error('from 需要形如 track:p1');
    process.exit(2);
  }
  const kind = from.slice(0, idx);
  const oldSlug = from.slice(idx + 1);
  /* 兼容多写了一次 kind: 的用法，如 rename track:p1 track:p1b */
  let newSlug = String(to);
  if (newSlug.indexOf(kind + ':') === 0) newSlug = newSlug.slice(kind.length + 1);
  if (!newSlug || newSlug.indexOf(':') !== -1) {
    console.error('新 id 只写 slug（如 p1b），不要带 kind: 前缀或冒号');
    process.exit(2);
  }
  const registry = lib.loadRegistry();
  const oldKey = lib.keyOf(kind, oldSlug);
  const newKey = lib.keyOf(kind, newSlug);
  const entry = registry.items[oldKey];
  if (!entry) {
    console.error('注册表里没有 ' + oldKey + '，请先用 check 查看现有条目');
    process.exit(1);
  }
  if (registry.items[newKey]) {
    console.error(newKey + ' 已存在，不能覆盖；如需合并请手工编辑 registry.json');
    process.exit(1);
  }
  const oldPath = entry.path;
  entry.aliases = Array.isArray(entry.aliases) ? entry.aliases : [];
  if (entry.aliases.indexOf(oldSlug) === -1) entry.aliases.push(oldSlug);
  entry.slug = newSlug;
  delete registry.items[oldKey];
  registry.items[newKey] = entry;

  const match = lib.scanEntries(registry).filter((x) => x.kind === kind && x.slug === newSlug)[0];
  if (match) {
    entry.title = match.title || entry.title;
    entry.path = match.path;
    /* 课程文件改名后，同文件的章节条目同步 path，避免 check 误报「文件已不在」 */
    if (kind === 'course') {
      Object.keys(registry.items).forEach((key) => {
        const item = registry.items[key];
        if (item && item.kind === 'chapter' && item.path === oldPath) item.path = match.path;
      });
    }
  }

  lib.saveRegistry(registry);
  console.log('已把 ' + oldKey + ' 改指到 ' + newKey);
  console.log('uid 保持不变：' + entry.uid);
  if (!match) console.log('提示：目录里暂未找到 ' + newKey + ' 对应文件，改好文件名后重启服务即可。');
  console.log('下一步：重启内容服务（node content/server.js），App 里收藏/历史会继续用同一 uid。');
}

const [cmd, a, b] = process.argv.slice(2);
if (cmd === 'check') cmdCheck();
else if (cmd === 'list') cmdList();
else if (cmd === 'rename') cmdRename(a, b);
else {
  console.log('用法：node content/registry.js <check|list|rename>');
  process.exit(2);
}
