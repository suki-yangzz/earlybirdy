/* ============================================================
   shared/rules.js —— 与渲染无关的业务规则（纯函数 + 可注入 storage）
   - 不依赖 DOM、不依赖浏览器全局
   - storage adapter: { getItem(key), setItem(key, value), removeItem(key) }
     getItem/setItem 允许返回 Promise（AsyncStorage），同步实现也可直接返回字符串
   - now 可注入，便于测试
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

  var KEYS = {
    stage: 'yy.v1.stage',
    checkins: 'yy.v1.checkins',
    coins: 'yy.v1.coins',
    cart: 'yy.v1.cart',
    learned: 'yy.v1.learned',
    fav: 'yy.v1.fav',
    orders: 'yy.v1.orders',
    history: 'yy.v1.history',
    events: 'yy.v1.events',
    courseProgress: 'yy.v1.courseProgress'
  };

  /** 按宝宝隔离的键（打卡 / 学习进度 / 收藏 / 浏览历史 / 学习时长 / 课程进度） */
  var SCOPED_KEYS = [KEYS.checkins, KEYS.learned, KEYS.fav, KEYS.history, KEYS.events, KEYS.courseProgress];
  var HISTORY_LIMIT = 30;

  var STATE_KEYS = Object.keys(KEYS).map(function (k) { return KEYS[k]; });

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function dateKey(d) {
    var x = d || new Date();
    return x.getFullYear() + '-' + pad(x.getMonth() + 1) + '-' + pad(x.getDate());
  }

  function addDays(key, delta) {
    var parts = String(key).split('-').map(Number);
    var d = new Date(parts[0], parts[1] - 1, parts[2]);
    d.setDate(d.getDate() + delta);
    return dateKey(d);
  }

  function parse(raw, fallback) {
    if (raw === null || raw === undefined) return fallback;
    if (typeof raw !== 'string') return raw;
    try { return JSON.parse(raw); } catch (err) { return fallback; }
  }

  function defaultStages() {
    try { return require('./stages').STAGES; } catch (err) { /* 浏览器分支 */ }
    return (root.YYShared && root.YYShared.STAGES) || {};
  }

  function defaultContent() {
    try { return require('./content').CONTENT; } catch (err) { /* 浏览器分支 */ }
    return (root.YYShared && root.YYShared.CONTENT) || {};
  }

  function normalize(raw) {
    var s = raw || {};
    if (!s.checkins || typeof s.checkins !== 'object') s.checkins = {};
    if (!Array.isArray(s.cart)) s.cart = [];
    if (typeof s.coins !== 'number' || isNaN(s.coins)) s.coins = 860;
    if (!Array.isArray(s.orders)) s.orders = [];
    if (!s.learned || typeof s.learned !== 'object') s.learned = {};
    if (!s.learned.cards || typeof s.learned.cards !== 'object') s.learned.cards = {};
    if (!s.fav || typeof s.fav !== 'object') s.fav = {};
    if (!s.fav.audio || typeof s.fav.audio !== 'object') s.fav.audio = {};
    if (!s.fav.video || typeof s.fav.video !== 'object') s.fav.video = {};
    if (!s.fav.card || typeof s.fav.card !== 'object') s.fav.card = {};
    if (!s.fav.course || typeof s.fav.course !== 'object') s.fav.course = {};
    if (!Array.isArray(s.history)) s.history = [];
    if (!s.events || typeof s.events !== 'object') s.events = {};
    if (!s.courseProgress || typeof s.courseProgress !== 'object') s.courseProgress = {};
    if (!s.stage || typeof s.stage !== 'string') s.stage = 'toddler';
    return s;
  }

  function decodeState(bag) {
    return normalize({
      stage: parse(bag[KEYS.stage], 'toddler'),
      checkins: parse(bag[KEYS.checkins], {}),
      coins: parse(bag[KEYS.coins], 860),
      cart: parse(bag[KEYS.cart], []),
      learned: parse(bag[KEYS.learned], {}),
      fav: parse(bag[KEYS.fav], {}),
      orders: parse(bag[KEYS.orders], []),
      history: parse(bag[KEYS.history], []),
      events: parse(bag[KEYS.events], {}),
      courseProgress: parse(bag[KEYS.courseProgress], {})
    });
  }

  /** 同步读：用于 localStorage / 内存 adapter。异步 adapter 请用 hydrate() */
  function hydrateSync(storage) {
    var bag = {};
    STATE_KEYS.forEach(function (k) {
      try { bag[k] = storage ? storage.getItem(k) : null; } catch (err) { bag[k] = null; }
    });
    return decodeState(bag);
  }

  /** 异步读：用于 AsyncStorage。返回可直接传给 createCore 的 state */
  function hydrate(storage) {
    var bag = {};
    return Promise.all(STATE_KEYS.map(function (k) {
      return Promise.resolve(storage ? storage.getItem(k) : null)
        .then(function (v) { bag[k] = v; })
        .catch(function () { bag[k] = null; });
    })).then(function () { return decodeState(bag); });
  }

  function createMemoryStorage(seed) {
    var data = Object.assign({}, seed || {});
    return {
      getItem: function (k) { return k in data ? data[k] : null; },
      setItem: function (k, v) { data[k] = String(v); },
      removeItem: function (k) { delete data[k]; },
      dump: function () { return Object.assign({}, data); }
    };
  }

  /**
   * 宝宝隔离存储适配器：
   * 打卡/学习进度/收藏/历史/学习时长 走 yy.v1.baby.<id>.<base>；
   * 购物车/成长值/订单 原样读写，保持账号共享。
   */
  function createScopedStorage(storage, babyId, prefixBuilder) {
    var prefix = prefixBuilder ? prefixBuilder(babyId) : 'yy.v1.baby.' + String(babyId) + '.';
    function map(key) {
      var base = String(key || '').replace(/^yy\.v1\./, '');
      return SCOPED_KEYS.some(function (k) { return String(k).replace(/^yy\.v1\./, '') === base; })
        ? prefix + base
        : key;
    }
    return {
      getItem: function (k) { return storage.getItem(map(k)); },
      setItem: function (k, v) { return storage.setItem(map(k), v); },
      removeItem: function (k) { return storage.removeItem(map(k)); },
      mapKey: map
    };
  }

  function createCore(opts) {
    opts = opts || {};

    var content = opts.content || defaultContent();
    var stages = opts.stages || defaultStages();
    var stageOrder = opts.stageOrder || Object.keys(stages);
    var storage = opts.storage || null;
    var now = opts.now || function () { return new Date(); };
    /* 阶段是否落盘。默认 true（H5 兼容）；RN 端以宝宝档案为唯一事实来源，传 false 由档案推导 */
    var persistStage = opts.persistStage !== false;
    var pending = [];
    var state = normalize(opts.state || hydrateSync(storage));

    /* 购物车自愈：过滤已下架商品与非法数量 */
    state.cart = state.cart.filter(function (item) {
      return item && (content.products || []).some(function (p) { return p.id === Number(item.id); });
    }).map(function (item) {
      return { id: Number(item.id), qty: Math.max(1, Math.min(99, Number(item.qty) || 1)) };
    });

    function write(key, value) {
      if (!storage) return;
      try {
        var p = storage.setItem(key, JSON.stringify(value));
        if (p && typeof p.then === 'function') pending.push(p);
      } catch (err) { /* 内存态继续 */ }
    }

    function flush() { return Promise.all(pending.splice(0)); }

    function stageId() { return state.stage; }
    function stageData() { return stages[state.stage] || stages.toddler || {}; }
    function tasksFor(stage) { return (content.tasks || {})[stage || stageId()] || []; }
    function tasksById(stage) {
      var map = {};
      tasksFor(stage).forEach(function (t) { map[t.id] = t; });
      return map;
    }
    function dayMap(stage) {
      var s = stage || stageId();
      if (!state.checkins[s]) state.checkins[s] = {};
      return state.checkins[s];
    }
    function todayIds(stage) {
      var list = dayMap(stage)[dateKey(now())];
      return Array.isArray(list) ? list : [];
    }
    function hasCheckin(stage, day) {
      var map = state.checkins[stage || stageId()] || {};
      return !!(map[day] && Array.isArray(map[day]) && map[day].length);
    }
    function isTaskDone(taskId, stage) { return todayIds(stage).indexOf(taskId) !== -1; }

    function toggleTask(task, stage) {
      var s = stage || stageId();
      var map = dayMap(s);
      var key = dateKey(now());
      var list = Array.isArray(map[key]) ? map[key] : [];
      var idx = list.indexOf(task.id);
      var done;
      if (idx >= 0) {
        list.splice(idx, 1);
        done = false;
        state.coins = Math.max(0, state.coins - task.value);
      } else {
        list.push(task.id);
        done = true;
        state.coins += task.value;
      }
      if (list.length) map[key] = list; else delete map[key];
      write(KEYS.checkins, state.checkins);
      write(KEYS.coins, state.coins);
      return { done: done, coins: state.coins };
    }

    function currentStreak(stage) {
      var s = stage || stageId();
      var map = state.checkins[s] || {};
      var has = {};
      Object.keys(map).forEach(function (k) {
        if (Array.isArray(map[k]) && map[k].length) has[k] = true;
      });
      var today = dateKey(now());
      var cursor = has[today] ? today : addDays(today, -1);
      var count = 0;
      while (has[cursor]) { count += 1; cursor = addDays(cursor, -1); }
      return count;
    }

    function todayStats(stage) {
      var s = stage || stageId();
      var tasks = tasksFor(s);
      var doneIds = todayIds(s);
      var done = 0, earned = 0;
      tasks.forEach(function (t) {
        if (doneIds.indexOf(t.id) !== -1) { done += 1; earned += t.value; }
      });
      return {
        done: done, total: tasks.length, earned: earned,
        streak: currentStreak(s),
        percent: tasks.length ? Math.round(done / tasks.length * 100) : 0
      };
    }

    function totalCompleted() {
      var count = 0;
      Object.keys(state.checkins).forEach(function (s) {
        var map = state.checkins[s] || {};
        Object.keys(map).forEach(function (day) {
          if (Array.isArray(map[day])) count += map[day].length;
        });
      });
      return count;
    }

    function setStage(id) {
      if (!stages[id]) return false;
      state.stage = id;
      if (persistStage) write(KEYS.stage, id);
      return true;
    }

    function coins() { return state.coins; }

    function cardKey(s, topicId, index) { return s + ':' + topicId + ':' + index; }
    function isCardLearned(topicId, index, stage) {
      return !!state.learned.cards[cardKey(stage || stageId(), topicId, index)];
    }
    function markCardLearned(topicId, index, stage) {
      var key = cardKey(stage || stageId(), topicId, index);
      if (state.learned.cards[key]) return false;
      state.learned.cards[key] = true;
      write(KEYS.learned, state.learned);
      return true;
    }
    function learnedCount(topicId, total, stage) {
      var s = stage || stageId(), n = 0;
      for (var i = 0; i < total; i++) if (state.learned.cards[cardKey(s, topicId, i)]) n += 1;
      return n;
    }

    /* ---------------- 统一收藏（audio / video / card / course） ---------------- */
    function favBucket(kind) {
      if (kind === 'video') return state.fav.video;
      if (kind === 'card') return state.fav.card;
      if (kind === 'course') return state.fav.course;
      return state.fav.audio;
    }
    function favKey(idValue, stage) { return (stage || stageId()) + ':' + idValue; }

    /** 从当前内容解析条目元信息，供收藏/历史列表展示；内容缺失时返回 null */
    function resolveItem(kind, stage, idValue) {
      var s = stage || stageId();
      if (kind === 'audio') {
        var tracks = (content.tracks || {})[s] || [];
        for (var i = 0; i < tracks.length; i++) {
          if (tracks[i].id === idValue) {
            return { kind: 'audio', stage: s, id: idValue, title: tracks[i].title, sub: tracks[i].artist || '', emoji: tracks[i].emoji || '🎵' };
          }
        }
        return null;
      }
      if (kind === 'video') {
        var videos = (content.videos || {})[s] || [];
        for (var j = 0; j < videos.length; j++) {
          if (videos[j].id === idValue) {
            return { kind: 'video', stage: s, id: idValue, title: videos[j].title, sub: videos[j].line || '', emoji: videos[j].emoji || '🎬' };
          }
        }
        return null;
      }
      if (kind === 'card') {
        var parts = String(idValue).split(':');
        var index = Number(parts.pop());
        var topicId = parts.join(':');
        var deck = ((content.decks || {})[s]) || {};
        var topics = deck.topics || [];
        for (var k = 0; k < topics.length; k++) {
          if (topics[k].id === topicId) {
            var card = (topics[k].cards || [])[index];
            if (!card) return null;
            return {
              kind: 'card', stage: s, id: idValue,
              title: card.word,
              sub: (card.pinyin || '') + ' · ' + (topics[k].name || ''),
              emoji: card.art || '🃏'
            };
          }
        }
        return null;
      }
      if (kind === 'course') {
        var courses = content.courses || [];
        for (var c = 0; c < courses.length; c++) {
          if (courses[c].id === idValue) {
            return { kind: 'course', stage: s, id: idValue, title: courses[c].title, sub: courses[c].categoryLabel || courses[c].category || '', emoji: courses[c].coverEmoji || '📚' };
          }
        }
        return null;
      }
      if (kind === 'story') {
        var stories = content.stories || [];
        for (var st = 0; st < stories.length; st++) {
          if (stories[st].id === idValue || stories[st].slug === idValue) {
            return { kind: 'story', stage: stories[st].stage || s, id: idValue, title: stories[st].title, sub: stories[st].categoryLabel || '胎教故事', emoji: stories[st].coverEmoji || '📖' };
          }
        }
        return null;
      }
      return null;
    }

    function isFav(kind, idValue, stage) {
      return !!favBucket(kind)[favKey(idValue, stage)];
    }

    /** 统一收藏开关；存轻量元信息，内容更新后仍可回退展示 */
    function toggleFav(kind, idValue, stage) {
      var bucket = favBucket(kind);
      var key = favKey(idValue, stage);
      if (bucket[key]) {
        delete bucket[key];
        write(KEYS.fav, state.fav);
        return false;
      }
      var meta = resolveItem(kind, stage, idValue) || {};
      bucket[key] = {
        id: idValue,
        stage: stage || stageId(),
        kind: kind === 'video' ? 'video' : kind === 'card' ? 'card' : kind === 'course' ? 'course' : 'audio',
        title: meta.title || idValue,
        sub: meta.sub || '',
        emoji: meta.emoji || '★'
      };
      write(KEYS.fav, state.fav);
      return true;
    }

    /** 收藏列表：按类型分组，供筛选页展示 */
    function favItems() {
      var out = [];
      ['audio', 'video', 'card', 'course'].forEach(function (kind) {
        var bucket = favBucket(kind);
        Object.keys(bucket).forEach(function (key) {
          var raw = bucket[key];
          var parts = key.split(':');
          var stage = parts.shift();
          var idValue = parts.join(':');
          var resolved = resolveItem(kind, stage, idValue);
          var meta = raw && typeof raw === 'object' ? raw : {};
          out.push({
            kind: kind,
            stage: stage,
            id: idValue,
            title: meta.title || (resolved && resolved.title) || idValue,
            sub: meta.sub || (resolved && resolved.sub) || '',
            emoji: meta.emoji || (resolved && resolved.emoji) || '★'
          });
        });
      });
      return out;
    }
    function favCount() {
      return Object.keys(state.fav.audio).length + Object.keys(state.fav.video).length + Object.keys(state.fav.card).length + Object.keys(state.fav.course).length;
    }

    /* ---------------- 浏览历史（去重、倒序、最多 30 条） ---------------- */
    function recordHistory(kind, idValue, stage) {
      var s = stage || stageId();
      var key = s + ':' + kind + ':' + idValue;
      var meta = resolveItem(kind, s, idValue) || {};
      state.history = state.history.filter(function (x) { return x && x.key !== key; });
      state.history.unshift({
        key: key,
        kind: kind,
        stage: s,
        id: idValue,
        title: meta.title || idValue,
        sub: meta.sub || '',
        emoji: meta.emoji || '🕘',
        at: now().toISOString()
      });
      if (state.history.length > HISTORY_LIMIT) state.history.length = HISTORY_LIMIT;
      write(KEYS.history, state.history);
    }
    function historyItems() {
      return state.history.map(function (x) {
        var resolved = resolveItem(x.kind, x.stage, x.id);
        return {
          kind: x.kind, stage: x.stage, id: x.id, at: x.at,
          title: (resolved && resolved.title) || x.title,
          sub: (resolved && resolved.sub) || x.sub,
          emoji: (resolved && resolved.emoji) || x.emoji
        };
      });
    }
    function clearHistory() {
      state.history = [];
      write(KEYS.history, state.history);
    }

    /* ---------------- 学习时长埋点（按天、按模块累计秒） ---------------- */
    function addStudyTime(module, seconds) {
      var m = module === 'audio' || module === 'video' || module === 'cards' || module === 'tasks' ? module : null;
      var sec = Math.round(Number(seconds));
      if (!m || !(sec > 0)) return false;
      var day = dateKey(now());
      if (!state.events[day] || typeof state.events[day] !== 'object') state.events[day] = {};
      state.events[day][m] = (Number(state.events[day][m]) || 0) + sec;
      write(KEYS.events, state.events);
      return true;
    }
    function studyEvents() { return JSON.parse(JSON.stringify(state.events)); }
    function studyReport(opts) {
      var o = opts || {};
      var builder = null;
      try { builder = require('./report').buildReport; } catch (err) { /* 浏览器分支 */ }
      if (!builder && root.YYShared) builder = root.YYShared.buildReport;
      if (!builder) return null;
      return builder({
        events: state.events,
        checkins: state.checkins,
        stage: stageId(),
        tasksCount: tasksFor().length,
        now: o.now || now(),
        days: o.days || 7,
        range: o.range || '7d',
        streak: currentStreak()
      });
    }

    function productById(idValue) {
      return (content.products || []).filter(function (p) { return p.id === Number(idValue); })[0] || null;
    }
    function cartItems() {
      return state.cart.map(function (item) {
        return { product: productById(item.id), qty: item.qty };
      }).filter(function (x) { return !!x.product; });
    }
    function cartCount() {
      return state.cart.reduce(function (sum, item) { return sum + item.qty; }, 0);
    }
    function cartTotal() {
      return cartItems().reduce(function (sum, x) { return sum + x.product.price * x.qty; }, 0);
    }
    function addToCart(idValue, qty) {
      var idNum = Number(idValue);
      if (!productById(idNum)) return false;
      var item = state.cart.filter(function (x) { return x.id === idNum; })[0];
      var add = Math.max(1, Math.min(99, Number(qty) || 1));
      if (item) item.qty = Math.min(99, item.qty + add);
      else state.cart.push({ id: idNum, qty: add });
      write(KEYS.cart, state.cart);
      return true;
    }
    function setQty(idValue, qty) {
      var idNum = Number(idValue), num = Number(qty);
      if (num <= 0) state.cart = state.cart.filter(function (x) { return x.id !== idNum; });
      else state.cart.forEach(function (x) { if (x.id === idNum) x.qty = Math.min(99, num); });
      write(KEYS.cart, state.cart);
    }
    function removeFromCart(idValue) {
      state.cart = state.cart.filter(function (x) { return x.id !== Number(idValue); });
      write(KEYS.cart, state.cart);
    }
    function clearCart() { state.cart = []; write(KEYS.cart, state.cart); }

    function checkout() {
      var items = cartItems();
      if (!items.length) return { ok: false, reason: 'empty' };
      var total = cartTotal();
      if (state.coins < total) return { ok: false, reason: 'coins', need: total - state.coins };
      var order = {
        id: 'YY' + now().getTime(),
        date: dateKey(now()),
        createdAt: now().toISOString(),
        status: 'done',
        items: items.map(function (x) {
          return { id: x.product.id, title: x.product.title, emoji: x.product.emoji, qty: x.qty, price: x.product.price };
        }),
        total: total
      };
      state.coins -= total;
      state.orders.unshift(order);
      if (state.orders.length > 20) state.orders.length = 20;
      state.cart = [];
      write(KEYS.coins, state.coins);
      write(KEYS.orders, state.orders);
      write(KEYS.cart, state.cart);
      return { ok: true, order: order, coins: state.coins };
    }

    /* ---------------- 课程进度（按宝宝隔离） ---------------- */
    function progressKey(courseId, chapterId) {
      return String(courseId) + ':' + String(chapterId);
    }
    function getCourseProgress(courseId, chapterId) {
      return state.courseProgress[progressKey(courseId, chapterId)] || null;
    }
    function setCourseProgress(courseId, chapterId, patch) {
      if (!courseId || !chapterId) return null;
      var key = progressKey(courseId, chapterId);
      var next = Object.assign({}, state.courseProgress[key] || {}, patch || {}, { updatedAt: new Date().toISOString() });
      state.courseProgress[key] = next;
      write(KEYS.courseProgress, state.courseProgress);
      return next;
    }

    /* ---------------- 稳定 id 迁移（slug -> registry uid） ---------------- */
    function idsModule() {
      try { return require('./ids'); } catch (err) { /* 浏览器分支 */ }
      return root.YYShared && root.YYShared.migrateStateIds ? root.YYShared : null;
    }
    function migrateIds() {
      var mod = idsModule();
      if (!mod || !mod.migrateStateIds) return { fav: 0, history: 0, learned: 0, progress: 0, changed: 0 };
      var stats = mod.migrateStateIds(state, content);
      if (stats.fav) write(KEYS.fav, state.fav);
      if (stats.history) write(KEYS.history, state.history);
      if (stats.learned) write(KEYS.learned, state.learned);
      if (stats.progress) write(KEYS.courseProgress, state.courseProgress);
      return stats;
    }

    function resetAll() {
      if (storage) {
        STATE_KEYS.forEach(function (k) {
          try { storage.removeItem(k); } catch (err) { /* 忽略 */ }
        });
      }
      state.stage = 'toddler';
      state.checkins = {};
      state.coins = 860;
      state.cart = [];
      state.learned = { cards: {} };
      state.fav = { audio: {}, video: {}, card: {}, course: {} };
      state.orders = [];
      state.history = [];
      state.events = {};
      state.courseProgress = {};
    }

    function setContent(next) {
      if (next) content = next;
      return content;
    }

    return {
      /* 内容与阶段 */
      getContent: function () { return content; },
      setContent: setContent,
      stages: function () { return stages; },
      stageOrder: function () { return stageOrder; },
      getStage: function () { return state.stage; },
      stage: stageData,
      setStage: setStage,
      /* 任务与打卡 */
      tasksFor: tasksFor,
      tasksById: tasksById,
      todayIds: todayIds,
      hasCheckin: hasCheckin,
      isTaskDone: isTaskDone,
      toggleTask: toggleTask,
      todayStats: todayStats,
      streak: currentStreak,
      totalCompleted: totalCompleted,
      coins: coins,
      /* 卡片学习 */
      isCardLearned: isCardLearned,
      markCardLearned: markCardLearned,
      learnedCount: learnedCount,
      /* 收藏 */
      isFav: isFav,
      toggleFav: toggleFav,
      favCount: favCount,
      favItems: favItems,
      /* 浏览历史 */
      recordHistory: recordHistory,
      history: historyItems,
      clearHistory: clearHistory,
      /* 学习时长与报告 */
      addStudyTime: addStudyTime,
      studyEvents: studyEvents,
      studyReport: studyReport,
      /* 课程进度 */
      getCourseProgress: getCourseProgress,
      setCourseProgress: setCourseProgress,
      /* 稳定 id 迁移 */
      migrateIds: migrateIds,
      /* 购物车与订单 */
      cart: cartItems,
      cartCount: cartCount,
      cartTotal: cartTotal,
      addToCart: addToCart,
      setQty: setQty,
      removeFromCart: removeFromCart,
      clearCart: clearCart,
      checkout: checkout,
      orders: function () { return state.orders.slice(); },
      /* 维护 */
      snapshot: function () { return JSON.parse(JSON.stringify(state)); },
      flush: flush,
      resetAll: resetAll
    };
  }

  return {
    KEYS: KEYS,
    SCOPED_KEYS: SCOPED_KEYS,
    HISTORY_LIMIT: HISTORY_LIMIT,
    dateKey: dateKey,
    addDays: addDays,
    hydrate: hydrate,
    hydrateSync: hydrateSync,
    createMemoryStorage: createMemoryStorage,
    createScopedStorage: createScopedStorage,
    createCore: createCore
  };
});
