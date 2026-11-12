/* ============================================================
   shared/search.js —— 跨类型搜索（纯函数）
   - 支持中文子串 + 汉字拼音首字母（如「两只老虎」可用 lz）
   - 覆盖曲目、卡片、视频、商品；结果按类型分组
   ============================================================ */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) {
    root.YYShared = root.YYShared || {};
    for (var k in api) if (Object.prototype.hasOwnProperty.call(api, k)) root.YYShared[k] = api[k];
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  function pinyinModule() {
    try { return require('./pinyin'); } catch (err) { /* 浏览器分支 */ }
    return (root.YYShared && root.YYShared.pinyinInitials) ? { pinyinInitials: root.YYShared.pinyinInitials } : null;
  }

  var PINYIN = pinyinModule();

  function initials(text) {
    return PINYIN && PINYIN.pinyinInitials ? PINYIN.pinyinInitials(text) : '';
  }

  function norm(text) {
    return String(text == null ? '' : text).toLowerCase().replace(/\s+/g, '');
  }

  /** 中文子串命中 OR 首字母子串命中（首字母查询只对纯字母查询生效） */
  function matches(haystack, query) {
    var q = norm(query);
    if (!q) return false;
    var text = norm(haystack);
    if (text.indexOf(q) >= 0) return true;
    if (/^[a-z]+$/.test(q)) {
      var ini = initials(haystack);
      if (ini && ini.indexOf(q) >= 0) return true;
    }
    return false;
  }

  function stageTrackItems(content, stage) {
    return ((content.tracks || {})[stage] || []).map(function (t) {
      return {
        kind: 'audio',
        stage: stage,
        id: t.id,
        title: t.title,
        sub: t.artist || '',
        emoji: t.emoji || '🎵',
        haystack: [t.title, t.artist, t.mood].join(' ')
      };
    });
  }

  function stageCardItems(content, stage) {
    var deck = ((content.decks || {})[stage]) || {};
    var topics = deck.topics || [];
    var out = [];
    topics.forEach(function (topic) {
      (topic.cards || []).forEach(function (card, index) {
        out.push({
          kind: 'card',
          stage: stage,
          id: topic.id + ':' + index,
          topicId: topic.id,
          index: index,
          title: card.word,
          sub: (card.pinyin || '') + ' · ' + (topic.name || ''),
          emoji: card.art || '🃏',
          haystack: [card.word, card.pinyin, topic.name, card.tip].join(' ')
        });
      });
    });
    return out;
  }

  function stageVideoItems(content, stage) {
    return ((content.videos || {})[stage] || []).map(function (v) {
      return {
        kind: 'video',
        stage: stage,
        id: v.id,
        title: v.title,
        sub: v.line || '',
        emoji: v.emoji || '🎬',
        haystack: [v.title, v.line].join(' ')
      };
    });
  }

  function productItems(content) {
    return (content.products || []).map(function (p) {
      return {
        kind: 'product',
        id: p.id,
        title: p.title,
        sub: p.sub || '',
        emoji: p.emoji || '🛍️',
        haystack: [p.title, p.sub, (p.tags || []).join(' '), p.desc].join(' ')
      };
    });
  }

  function searchContent(content, query) {
    var q = String(query || '').trim();
    var groups = { audio: [], card: [], video: [], product: [] };
    if (!q) return { query: q, total: 0, groups: groups };

    var stages = Object.keys(content.tracks || {});
    stages.forEach(function (stage) {
      stageTrackItems(content, stage).forEach(function (it) {
        if (matches(it.haystack, q)) groups.audio.push(it);
      });
      stageCardItems(content, stage).forEach(function (it) {
        if (matches(it.haystack, q)) groups.card.push(it);
      });
      stageVideoItems(content, stage).forEach(function (it) {
        if (matches(it.haystack, q)) groups.video.push(it);
      });
    });
    productItems(content).forEach(function (it) {
      if (matches(it.haystack, q)) groups.product.push(it);
    });

    var total = groups.audio.length + groups.card.length + groups.video.length + groups.product.length;
    return { query: q, total: total, groups: groups };
  }

  /** 单个条目是否命中（供收藏/历史过滤复用） */
  function itemMatches(item, query) {
    return matches([item.title, item.sub, item.emoji].join(' '), query);
  }

  return { searchContent: searchContent, searchMatches: matches, itemMatches: itemMatches, pinyinInitials: initials };
});
