/* 稳定 id 迁移：slug -> registry uid，不丢收藏 / 历史 / 卡片学习记录 */
'use strict';

const assert = require('assert');
const { buildContentIdMap, migrateStateIds } = require('../ids');

function item(id, slug, legacyId) {
  return { id, slug, legacyId: legacyId || slug };
}

const content = {
  tracks: {
    pregnancy: [item('uid-p1', 'p1'), item('uid-p2', 'p2', 'old-p2')],
  },
  videos: {
    toddler: [item('uid-v1', 'v1')],
  },
  decks: {
    toddler: {
      topics: [{ id: 'uid-t1', slug: 'animals', legacyId: 'animals', cards: [] }],
    },
  },
  courses: [
    {
      id: 'uid-c1', slug: 'c1', legacyId: 'c-taijiao-01',
      chapters: [
        { id: 'uid-ch1', slug: 'ch1', legacyId: 'ch1' },
        { id: 'uid-ch4', slug: 'ch4', legacyId: 'ch4' },
      ],
    },
  ],
};

// 映射同时覆盖 slug 与 legacyId
const map = buildContentIdMap(content);
assert.strictEqual(map.p1, 'uid-p1');
assert.strictEqual(map.p2, 'uid-p2');
assert.strictEqual(map['old-p2'], 'uid-p2');
assert.strictEqual(map.animals, 'uid-t1');
assert.strictEqual(map.v1, 'uid-v1');
assert.strictEqual(map.c1, 'uid-c1');
assert.strictEqual(map['c-taijiao-01'], 'uid-c1');

// 收藏：key 与值里的 id 一起迁移
const state = {
  fav: {
    audio: {
      'pregnancy:p1': { id: 'p1', stage: 'pregnancy', kind: 'audio', title: '小星星' },
      'pregnancy:uid-p2': { id: 'uid-p2', stage: 'pregnancy', kind: 'audio', title: '已迁移' },
    },
    video: { 'toddler:v1': { id: 'v1', stage: 'toddler', kind: 'video', title: '动画' } },
    card: {},
    course: { 'pregnancy:c-taijiao-01': { id: 'c-taijiao-01', stage: 'pregnancy', kind: 'course', title: '胎教音乐' } },
  },
  history: [
    { id: 'p1', stage: 'pregnancy', kind: 'audio', key: 'pregnancy:audio:p1' },
    { id: 'uid-p2', stage: 'pregnancy', kind: 'audio', key: 'pregnancy:audio:uid-p2' },
    { id: 'c-taijiao-01', stage: 'pregnancy', kind: 'course', key: 'pregnancy:course:c-taijiao-01' },
  ],
  learned: { cards: { 'toddler:animals:3': true } },
  courseProgress: {
    'c1:ch4': { sec: 7 },
    'c-taijiao-01:ch1': { page: 1 },
    'uid-c1:uid-ch4': { sec: 9 },
  },
};

const stats = migrateStateIds(state, content);
assert.deepStrictEqual(stats, { fav: 3, history: 2, learned: 1, progress: 2, changed: 8 });
assert.ok(state.fav.audio['pregnancy:uid-p1']);
assert.strictEqual(state.fav.audio['pregnancy:uid-p1'].id, 'uid-p1');
assert.ok(!state.fav.audio['pregnancy:p1']);
assert.ok(state.fav.video['toddler:uid-v1']);
assert.strictEqual(state.history.length, 3);
assert.strictEqual(state.history[0].id, 'uid-p1');
assert.strictEqual(state.history[0].key, 'pregnancy:audio:uid-p1');
assert.ok(state.learned.cards['toddler:uid-t1:3']);
assert.ok(!state.learned.cards['toddler:animals:3']);
assert.ok(state.fav.course['pregnancy:uid-c1']);
assert.strictEqual(state.fav.course['pregnancy:uid-c1'].id, 'uid-c1');
assert.ok(state.courseProgress['uid-c1:uid-ch4']);
assert.strictEqual(state.courseProgress['uid-c1:uid-ch4'].sec, 9);
assert.deepStrictEqual(state.courseProgress['uid-c1:uid-ch1'], { page: 1 });
assert.ok(!state.courseProgress['c1:ch4']);
assert.ok(!state.courseProgress['c-taijiao-01:ch1']);

// 幂等：再跑一次不应产生变化
const again = migrateStateIds(state, content);
assert.strictEqual(again.changed, 0);
assert.strictEqual(state.history.length, 3);

// 空内容 / 旧数据缺字段时安全返回
assert.deepStrictEqual(buildContentIdMap({}), {});
assert.strictEqual(migrateStateIds(null, content).changed, 0);
assert.strictEqual(migrateStateIds({ fav: {} }, {}).changed, 0);

console.log('ids.test.js: 稳定 id 映射与迁移用例通过');
