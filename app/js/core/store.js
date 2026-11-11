/* ============================================================
   状态层：阶段、打卡、连续天数、成长值、收藏、购物车、订单
   全部持久化到 localStorage，读写失败时自动退回内存态。
   ============================================================ */
(function () {
  'use strict';
  window.YY = window.YY || {};

  var KEYS = {
    stage: 'yy.v1.stage',
    checkins: 'yy.v1.checkins',
    coins: 'yy.v1.coins',
    cart: 'yy.v1.cart',
    learned: 'yy.v1.learned',
    fav: 'yy.v1.fav',
    orders: 'yy.v1.orders'
  };

  function read(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (err) {
      return fallback;
    }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (err) { /* 内存态继续 */ }
  }
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

  var savedStage = read(KEYS.stage, 'toddler');
  if (!YY.STAGES[savedStage]) savedStage = 'toddler';

  var state = {
    stage: savedStage,
    checkins: read(KEYS.checkins, {}),
    coins: read(KEYS.coins, 860),
    cart: read(KEYS.cart, []),
    learned: read(KEYS.learned, {}),
    fav: read(KEYS.fav, {}),
    orders: read(KEYS.orders, [])
  };

  if (!state.checkins || typeof state.checkins !== 'object') state.checkins = {};
  if (!Array.isArray(state.cart)) state.cart = [];
  if (typeof state.coins !== 'number' || isNaN(state.coins)) state.coins = 860;
  if (!Array.isArray(state.orders)) state.orders = [];
  if (!state.learned || typeof state.learned !== 'object') state.learned = {};
  if (!state.learned.cards || typeof state.learned.cards !== 'object') state.learned.cards = {};
  if (!state.fav || typeof state.fav !== 'object') state.fav = {};
  if (!state.fav.audio || typeof state.fav.audio !== 'object') state.fav.audio = {};
  if (!state.fav.video || typeof state.fav.video !== 'object') state.fav.video = {};

  /* 购物车数据自愈：过滤不存在的商品与非法数量 */
  state.cart = state.cart.filter(function (item) {
    return item && YY.CONTENT.products.some(function (p) { return p.id === Number(item.id); });
  }).map(function (item) {
    return { id: Number(item.id), qty: Math.max(1, Math.min(99, Number(item.qty) || 1)) };
  });

  function stageId() { return state.stage; }

  function stageData() { return YY.STAGES[state.stage] || YY.STAGES.toddler; }

  function tasksFor(stage) {
    return YY.CONTENT.tasks[stage || stageId()] || [];
  }

  function dayMap(stage) {
    var s = stage || stageId();
    if (!state.checkins[s]) state.checkins[s] = {};
    return state.checkins[s];
  }

  function todayIds(stage) {
    var map = dayMap(stage);
    var list = map[dateKey()];
    return Array.isArray(list) ? list : [];
  }

  function hasCheckin(stage, day) {
    var map = state.checkins[stage || stageId()] || {};
    return !!(map[day] && Array.isArray(map[day]) && map[day].length);
  }

  function isTaskDone(taskId, stage) {
    return todayIds(stage).indexOf(taskId) !== -1;
  }

  function persistCheckins() { write(KEYS.checkins, state.checkins); }

  function toggleTask(task, stage) {
    var s = stage || stageId();
    var map = dayMap(s);
    var key = dateKey();
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
    if (list.length) map[key] = list;
    else delete map[key];
    persistCheckins();
    write(KEYS.coins, state.coins);
    return { done: done, coins: state.coins };
  }

  function todayStats(stage) {
    var s = stage || stageId();
    var tasks = tasksFor(s);
    var doneIds = todayIds(s);
    var done = 0;
    var earned = 0;
    tasks.forEach(function (t) {
      if (doneIds.indexOf(t.id) !== -1) { done += 1; earned += t.value; }
    });
    return {
      done: done, total: tasks.length, earned: earned,
      streak: currentStreak(s), percent: tasks.length ? Math.round(done / tasks.length * 100) : 0
    };
  }

  function currentStreak(stage) {
    var s = stage || stageId();
    var map = state.checkins[s] || {};
    var has = {};
    Object.keys(map).forEach(function (k) {
      if (Array.isArray(map[k]) && map[k].length) has[k] = true;
    });
    var today = dateKey();
    var cursor = has[today] ? today : addDays(today, -1);
    var count = 0;
    while (has[cursor]) {
      count += 1;
      cursor = addDays(cursor, -1);
    }
    return count;
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
    if (!YY.STAGES[id]) return false;
    state.stage = id;
    write(KEYS.stage, id);
    return true;
  }

  function coins() { return state.coins; }

  /* ---------- 卡片学习 ---------- */
  function cardKey(s, topicId, index) { return s + ':' + topicId + ':' + index; }
  function isCardLearned(topicId, index, stage) {
    var s = stage || stageId();
    return !!state.learned.cards[cardKey(s, topicId, index)];
  }
  function markCardLearned(topicId, index, stage) {
    var key = cardKey(stage || stageId(), topicId, index);
    if (state.learned.cards[key]) return false;
    state.learned.cards[key] = true;
    write(KEYS.learned, state.learned);
    return true;
  }
  function learnedCount(topicId, total, stage) {
    var s = stage || stageId();
    var n = 0;
    for (var i = 0; i < total; i++) {
      if (state.learned.cards[cardKey(s, topicId, i)]) n += 1;
    }
    return n;
  }

  /* ---------- 收藏（音频/视频） ---------- */
  function favKey(kind, idValue, stage) { return (stage || stageId()) + ':' + idValue; }
  function isFav(kind, idValue, stage) {
    var bucket = state.fav[kind === 'video' ? 'video' : 'audio'];
    return !!bucket[favKey(kind, idValue, stage)];
  }
  function toggleFav(kind, idValue, stage) {
    var bucket = state.fav[kind === 'video' ? 'video' : 'audio'];
    var key = favKey(kind, idValue, stage);
    if (bucket[key]) { delete bucket[key]; write(KEYS.fav, state.fav); return false; }
    bucket[key] = true;
    write(KEYS.fav, state.fav);
    return true;
  }
  function favCount() {
    return Object.keys(state.fav.audio).length + Object.keys(state.fav.video).length;
  }

  /* ---------- 购物车 / 订单 ---------- */
  function productById(idValue) {
    return YY.CONTENT.products.filter(function (p) { return p.id === Number(idValue); })[0] || null;
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
    var idNum = Number(idValue);
    var num = Number(qty);
    if (num <= 0) {
      state.cart = state.cart.filter(function (x) { return x.id !== idNum; });
    } else {
      state.cart.forEach(function (x) { if (x.id === idNum) x.qty = Math.min(99, num); });
    }
    write(KEYS.cart, state.cart);
  }
  function removeFromCart(idValue) {
    state.cart = state.cart.filter(function (x) { return x.id !== Number(idValue); });
    write(KEYS.cart, state.cart);
  }
  function clearCart() {
    state.cart = [];
    write(KEYS.cart, state.cart);
  }
  function checkout() {
    var items = cartItems();
    if (!items.length) return { ok: false, reason: 'empty' };
    var total = cartTotal();
    if (state.coins < total) {
      return { ok: false, reason: 'coins', need: total - state.coins };
    }
    var order = {
      id: 'YY' + Date.now(),
      date: dateKey(),
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

  function resetAll() {
    Object.keys(KEYS).forEach(function (k) {
      try { localStorage.removeItem(KEYS[k]); } catch (err) {}
    });
    state.stage = 'toddler';
    state.checkins = {};
    state.coins = 860;
    state.cart = [];
    state.learned = { cards: {} };
    state.fav = { audio: {}, video: {} };
    state.orders = [];
  }

  YY.store = {
    dateKey: dateKey,
    addDays: addDays,
    getStage: function () { return state.stage; },
    setStage: setStage,
    stage: stageData,
    stages: YY.STAGE_ORDER,
    tasksFor: tasksFor,
    todayIds: todayIds,
    hasCheckin: hasCheckin,
    isTaskDone: isTaskDone,
    toggleTask: toggleTask,
    todayStats: todayStats,
    streak: currentStreak,
    totalCompleted: totalCompleted,
    coins: coins,
    isCardLearned: isCardLearned,
    markCardLearned: markCardLearned,
    learnedCount: learnedCount,
    isFav: isFav,
    toggleFav: toggleFav,
    favCount: favCount,
    cart: cartItems,
    cartCount: cartCount,
    cartTotal: cartTotal,
    addToCart: addToCart,
    setQty: setQty,
    removeFromCart: removeFromCart,
    clearCart: clearCart,
    checkout: checkout,
    orders: function () { return state.orders.slice(); },
    resetAll: resetAll
  };
})();
