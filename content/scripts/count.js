#!/usr/bin/env node
/* 对比「迁移前 shared/content.js」与「迁移后 content/ 目录」的条目数量 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const CONTENT = require(path.join(ROOT, 'shared', 'content.js')).CONTENT;
const COURSES = require(path.join(ROOT, 'shared', 'courses.js')).COURSES;

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  fs.readdirSync(dir, { withFileTypes: true }).forEach((e) => {
    if (e.name.startsWith('.')) return;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else out.push(full);
  });
  return out;
}

function read(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return null; }
}

const before = {
  tracks: Object.values(CONTENT.tracks).reduce((n, l) => n + l.length, 0),
  videos: Object.values(CONTENT.videos).reduce((n, l) => n + l.length, 0),
  topics: Object.values(CONTENT.decks).reduce((n, d) => n + d.topics.length, 0),
  cards: Object.values(CONTENT.decks).reduce((n, d) => n + d.topics.reduce((m, t) => m + t.cards.length, 0), 0),
  products: CONTENT.products.length,
  courses: COURSES.length,
  chapters: COURSES.reduce((n, c) => n + c.chapters.length, 0),
};

const audioFiles = walk(path.join(ROOT, 'content', 'audio')).filter((f) => f.endsWith('.json'));
const videoFiles = walk(path.join(ROOT, 'content', 'video')).filter((f) => f.endsWith('.json'));
const cardTopicFiles = walk(path.join(ROOT, 'content', 'images', 'cards')).filter((f) => f.endsWith('.json'));
const productFiles = walk(path.join(ROOT, 'content', 'images', 'products')).filter((f) => f.endsWith('.json'));
const courseFiles = walk(path.join(ROOT, 'content', 'courses')).filter((f) => f.endsWith('.json'));

const after = {
  tracks: audioFiles.length,
  videos: videoFiles.length,
  topics: cardTopicFiles.length,
  cards: cardTopicFiles.reduce((n, f) => { const d = read(f); return n + (d && d.cards ? d.cards.length : 0); }, 0),
  products: productFiles.length,
  courses: courseFiles.length,
  chapters: courseFiles.reduce((n, f) => { const d = read(f); return n + (d && d.chapters ? d.chapters.length : 0); }, 0),
};

console.log('迁移前:', JSON.stringify(before));
console.log('迁移后:', JSON.stringify(after));
const keys = Object.keys(before);
const mismatches = keys.filter((k) => before[k] !== after[k]);
if (mismatches.length) {
  console.log('数量不一致:', mismatches.map((k) => k + ' ' + before[k] + '->' + after[k]).join(', '));
  process.exit(1);
}
console.log('数量一致 ✓');
