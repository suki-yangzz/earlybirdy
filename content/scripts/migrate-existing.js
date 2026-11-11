#!/usr/bin/env node
/* ============================================================
   content/scripts/migrate-existing.js
   把 shared/content.js 里现有的曲目/视频/认知卡/商品 + shared/courses.js 课程
   落成 content/ 下的素材描述文件。

   说明：现有内容本身是「远端 URL + emoji」，仓库里没有本地二进制素材。
   迁移保留原始字段（src/emoji/sec 等），因此条目数量与迁移前一致；
   新增真实音视频时按同名文件名规则放入即可被扫描。
   运行：node content/scripts/migrate-existing.js
   ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const CONTENT_DIR = path.join(ROOT, 'content');
const content = require(path.join(ROOT, 'shared', 'content.js')).CONTENT;
const courses = require(path.join(ROOT, 'shared', 'courses.js'));

function safe(text) {
  return String(text || '')
    .replace(/[\\/:*?"<>|\n\r\t]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 24);
}

function writeJSON(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function countExisting() {
  const tracks = Object.values(content.tracks || {}).reduce((n, list) => n + list.length, 0);
  const videos = Object.values(content.videos || {}).reduce((n, list) => n + list.length, 0);
  const topics = Object.values(content.decks || {}).reduce((n, deck) => n + (deck.topics || []).length, 0);
  const cards = Object.values(content.decks || {}).reduce(
    (n, deck) => n + (deck.topics || []).reduce((m, t) => m + (t.cards || []).length, 0),
    0,
  );
  return {
    tracks,
    videos,
    topics,
    cards,
    products: (content.products || []).length,
    courses: courses.COURSES.length,
    chapters: courses.COURSES.reduce((n, c) => n + (c.chapters || []).length, 0),
  };
}

function migrate() {
  const before = countExisting();

  Object.entries(content.tracks || {}).forEach(([stage, list]) => {
    list.forEach((track, index) => {
      const name = `${track.id}_${safe(track.title)}_${stage}_${track.sec || 0}.json`;
      writeJSON(path.join(CONTENT_DIR, 'audio', stage, name), Object.assign({}, track, { stage, order: index + 1 }));
    });
  });

  Object.entries(content.videos || {}).forEach(([stage, list]) => {
    list.forEach((video, index) => {
      const name = `${video.id}_${safe(video.title)}_${stage}_${video.sec || 0}.json`;
      writeJSON(path.join(CONTENT_DIR, 'video', stage, name), Object.assign({}, video, { stage, order: index + 1 }));
    });
  });

  Object.entries(content.decks || {}).forEach(([stage, deck]) => {
    (deck.topics || []).forEach((topic, index) => {
      const name = `${topic.id}_${safe(topic.name)}_${stage}_${String(index + 1).padStart(2, '0')}.json`;
      writeJSON(
        path.join(CONTENT_DIR, 'images', 'cards', stage, name),
        Object.assign({ id: topic.id, name: topic.name, emoji: topic.emoji, stage }, { cards: topic.cards || [] }),
      );
    });
  });

  (content.products || []).forEach((product, index) => {
    const name = `${product.id}_${safe(product.title)}_${String(index + 1).padStart(2, '0')}.json`;
    writeJSON(path.join(CONTENT_DIR, 'images', 'products', name), product);
  });

  courses.COURSES.forEach((course, index) => {
    const name = `${course.id}_${safe(course.title)}_${course.category}_${String(index + 1).padStart(2, '0')}.json`;
    writeJSON(path.join(CONTENT_DIR, 'courses', name), course);
  });

  fs.mkdirSync(path.join(CONTENT_DIR, 'images', 'covers'), { recursive: true });
  const keep = path.join(CONTENT_DIR, 'images', 'covers', '.gitkeep');
  if (!fs.existsSync(keep)) fs.writeFileSync(keep, '', 'utf8');

  const after = countExisting();
  console.log('迁移前:', JSON.stringify(before));
  console.log('迁移后（源数据统计）:', JSON.stringify(after));
  console.log('描述文件已写入 content/');
}

migrate();
