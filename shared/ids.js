/* ============================================================
   shared/ids.js —— 素材稳定 id 迁移
   远端 manifest 里的条目同时带：
     id      对外稳定 id（content/registry.json 里的 uid）
     slug    文件名派生的 slug（旧 id）
     legacyId 旧 JSON 描述文件里的显式 id
   本模块把本地收藏 / 浏览历史 / 卡片学习记录里基于旧 slug 的引用
   改成 uid，避免改名后丢失跳转。纯函数，不依赖 DOM。
   ============================================================ */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) {
    root.YYShared = root.YYShared || {};
    for (var k in api) if (Object.prototype.hasOwnProperty.call(api, k)) root.YYShared[k] = api[k];
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function remember(map, item) {
    if (!item || !item.id) return;
    var uid = String(item.id);
    var olds = [item.slug, item.legacyId];
    for (var i = 0; i < olds.length; i++) {
      var old = olds[i] == null ? '' : String(olds[i]);
      if (old && old !== uid && !map[old]) map[old] = uid;
    }
  }

  /** 旧 slug / legacyId -> 稳定 uid */
  function buildContentIdMap(content) {
    var map = {};
    var c = content || {};
    Object.keys(c.tracks || {}).forEach(function (stage) {
      (c.tracks[stage] || []).forEach(function (x) { remember(map, x); });
    });
    Object.keys(c.videos || {}).forEach(function (stage) {
      (c.videos[stage] || []).forEach(function (x) { remember(map, x); });
    });
    Object.keys(c.decks || {}).forEach(function (stage) {
      ((c.decks[stage] || {}).topics || []).forEach(function (t) { remember(map, t); });
    });
    (c.courses || []).forEach(function (course) { remember(map, course); });
    return map;
  }

  /**
   * 课程进度 key 映射：旧 <courseSlug>:<chapterSlug> -> <courseUid>:<chapterUid>
   * 章节 slug 只在课程内唯一，所以必须按课程维度成对映射。
   */
  function buildCourseProgressMap(content) {
    var map = {};
    ((content && content.courses) || []).forEach(function (course) {
      if (!course || !course.id) return;
      var newCourse = String(course.id);
      var oldCourses = [course.slug, course.legacyId];
      (course.chapters || []).forEach(function (ch) {
        if (!ch || !ch.id) return;
        var newCh = String(ch.id);
        var oldChs = [ch.slug, ch.legacyId];
        for (var i = 0; i < oldCourses.length; i++) {
          for (var j = 0; j < oldChs.length; j++) {
            var oc = oldCourses[i] == null ? '' : String(oldCourses[i]);
            var oa = oldChs[j] == null ? '' : String(oldChs[j]);
            if (!oc || !oa) continue;
            var oldKey = oc + ':' + oa;
            var newKey = newCourse + ':' + newCh;
            if (oldKey !== newKey && !map[oldKey]) map[oldKey] = newKey;
          }
        }
      });
    });
    return map;
  }

  /**
   * 就地迁移 state 里的内容引用。
   * 返回 { fav, history, learned, progress, changed }
   */
  function migrateStateIds(state, content) {
    var stats = { fav: 0, history: 0, learned: 0, progress: 0, changed: 0 };
    if (!state) return stats;
    var map = buildContentIdMap(content);
    var progressMap = buildCourseProgressMap(content);
    if (!Object.keys(map).length && !Object.keys(progressMap).length) return stats;

    // 收藏：key = stage:oldId，值里也带 id
    if (state.fav && typeof state.fav === 'object') {
      ['audio', 'video', 'card', 'course'].forEach(function (kind) {
        var bucket = state.fav[kind];
        if (!bucket || typeof bucket !== 'object') return;
        Object.keys(bucket).forEach(function (key) {
          var parts = String(key).split(':');
          var stage = parts.shift();
          var oldId = parts.join(':');
          var next = map[oldId];
          if (!next || next === oldId) return;
          var nextKey = stage + ':' + next;
          var value = bucket[key];
          if (value && typeof value === 'object') value.id = next;
          if (!bucket[nextKey]) bucket[nextKey] = value;
          delete bucket[key];
          stats.fav += 1;
        });
      });
    }

    // 浏览历史：key = stage:kind:id
    if (Array.isArray(state.history)) {
      var out = [];
      var seen = {};
      state.history.forEach(function (item) {
        if (!item) return;
        var next = map[item.id];
        if (next && next !== item.id) {
          item.id = next;
          item.key = item.stage + ':' + item.kind + ':' + next;
          stats.history += 1;
        }
        if (!seen[item.key]) {
          seen[item.key] = true;
          out.push(item);
        }
      });
      state.history = out;
    }

    // 卡片学习记录：key = stage:topicId:index
    var cards = state.learned && state.learned.cards;
    if (cards && typeof cards === 'object') {
      Object.keys(cards).forEach(function (key) {
        var m = /^([^:]+):(.+):(\d+)$/.exec(key);
        if (!m) return;
        var next = map[m[2]];
        if (!next || next === m[2]) return;
        var nextKey = m[1] + ':' + next + ':' + m[3];
        if (!cards[nextKey]) cards[nextKey] = cards[key];
        delete cards[key];
        stats.learned += 1;
      });
    }

    // 课程进度：key = <courseId>:<chapterId>
    var progress = state.courseProgress;
    if (progress && typeof progress === 'object') {
      Object.keys(progress).forEach(function (key) {
        var next = progressMap[key];
        if (!next || next === key) return;
        if (!progress[next]) progress[next] = progress[key];
        delete progress[key];
        stats.progress += 1;
      });
    }

    stats.changed = stats.fav + stats.history + stats.learned + stats.progress;
    return stats;
  }

  return {
    buildContentIdMap: buildContentIdMap,
    buildCourseProgressMap: buildCourseProgressMap,
    migrateStateIds: migrateStateIds
  };
});
