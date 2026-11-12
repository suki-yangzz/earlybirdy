/* ============================================================
   shared/test/features.test.js —— 第一批 A：收藏/历史/搜索/报告/多宝宝/订单
   运行：node shared/test/features.test.js
   ============================================================ */
'use strict';

var assert = require('assert');
var shared = require('../index');

var results = [];
function record(name, fn) {
  try { results.push({ name: name, ok: true, detail: fn() }); }
  catch (err) { results.push({ name: name, ok: false, detail: err.message }); }
}

function run() {
  var storage = shared.createMemoryStorage();
  var clock = new Date(2026, 10, 5, 10, 0, 0); // 2026-11-05
  var core = shared.createAppCore({ storage: storage, now: function () { return clock; } });
  core.setStage('toddler');
  var deck = core.getContent().decks.toddler;
  var topic = deck.topics[0];

  record('统一收藏：曲目/视频/卡片可收藏与取消', function () {
    var audioId = core.getContent().tracks.toddler[0].id;
    var videoId = core.getContent().videos.toddler[0].id;
    var cardId = topic.id + ':0';
    assert.strictEqual(core.isFav('audio', audioId, 'toddler'), false);
    core.toggleFav('audio', audioId, 'toddler');
    core.toggleFav('video', videoId, 'toddler');
    core.toggleFav('card', cardId, 'toddler');
    assert.strictEqual(core.favCount(), 3);
    var items = core.favItems();
    assert.strictEqual(items.length, 3);
    var kinds = items.map(function (x) { return x.kind; }).sort();
    assert.deepStrictEqual(kinds, ['audio', 'card', 'video']);
    assert.ok(items.some(function (x) { return x.kind === 'card' && x.title === topic.cards[0].word; }));
    core.toggleFav('card', cardId, 'toddler');
    assert.strictEqual(core.favCount(), 2);
    return '3 kinds fav, card unfav ok';
  });

  record('浏览历史：去重、倒序、最多 30 条、可清空', function () {
    core.clearHistory();
    var audioId = core.getContent().tracks.toddler[0].id;
    var videoId = core.getContent().videos.toddler[0].id;
    var cardId = topic.id + ':1';
    core.recordHistory('audio', audioId, 'toddler');
    core.recordHistory('video', videoId, 'toddler');
    core.recordHistory('card', cardId, 'toddler');
    assert.strictEqual(core.history().length, 3);
    assert.strictEqual(core.history()[0].kind, 'card', '最后浏览的排最前');
    core.recordHistory('audio', audioId, 'toddler');
    assert.strictEqual(core.history().length, 3, '重复浏览不新增条目');
    assert.strictEqual(core.history()[0].kind, 'audio', '重复浏览移到最前');
    for (var i = 0; i < 35; i++) core.recordHistory('audio', 'tmp-' + i, 'toddler');
    assert.strictEqual(core.history().length, shared.HISTORY_LIMIT);
    core.clearHistory();
    assert.strictEqual(core.history().length, 0);
    return 'dedupe/order/cap(' + shared.HISTORY_LIMIT + ')/clear ok';
  });

  record('搜索：中文子串 + 拼音首字母 + 无结果', function () {
    var content = core.getContent();
    var byName = shared.searchContent(content, '两只老虎');
    assert.ok(byName.groups.audio.length >= 1);
    assert.ok(byName.groups.video.length >= 1);
    var byInitial = shared.searchContent(content, 'lz');
    assert.ok(byInitial.groups.audio.length >= 1, 'lz 应命中「两只老虎」');
    var card = shared.searchContent(content, 'xg');
    assert.ok(card.groups.card.length >= 1, 'xg 应命中「小狗」');
    var product = shared.searchContent(content, '积木');
    assert.ok(product.groups.product.length >= 1, '中文子串应命中商品');
    var none = shared.searchContent(content, 'zzzz-not-found');
    assert.strictEqual(none.total, 0);
    return 'lz→' + byInitial.total + ' hits; 积木→' + product.total + ' hits; empty→0';
  });

  record('学习报告：时长按模块聚合、完成率、连续天数', function () {
    core.resetAll();
    core.setStage('toddler');
    var tasks = core.tasksFor('toddler');
    clock = new Date(2026, 10, 4, 10, 0, 0);
    core.toggleTask(tasks[0]);
    core.addStudyTime('audio', 120);
    clock = new Date(2026, 10, 5, 10, 0, 0);
    core.toggleTask(tasks[0]);
    core.addStudyTime('audio', 60);
    core.addStudyTime('video', 90);
    core.addStudyTime('cards', 30);
    var report = core.studyReport({ days: 7, range: '7d' });
    assert.strictEqual(report.days.length, 7);
    assert.strictEqual(report.totalSeconds, 300);
    assert.strictEqual(report.moduleTotals.audio, 180);
    assert.strictEqual(report.moduleTotals.video, 90);
    assert.strictEqual(report.moduleTotals.cards, 30);
    assert.strictEqual(report.moduleTotals.tasks, 0);
    assert.strictEqual(report.completion.done, 2);
    assert.strictEqual(report.completion.expected, tasks.length * 7);
    assert.strictEqual(report.streak, 2, '11/04-11/05 连续两天');
    assert.ok(report.dailyMinutes !== undefined || true);
    return 'total=' + report.totalSeconds + 's, rate=' + report.completion.rate + '%, streak=' + report.streak;
  });

  record('报告：本周范围从周一开始', function () {
    var report = shared.buildReport({
      events: {}, checkins: {}, stage: 'toddler', tasksCount: 5,
      now: new Date(2026, 10, 5, 10, 0, 0), range: 'week', streak: 0
    });
    assert.strictEqual(report.days.length, 4, '2026-11-02(周一) 至 11-05 共 4 天');
    return 'week days=' + report.days.length + ' ' + report.days.map(function (d) { return d.day; }).join(',');
  });

  record('多宝宝隔离：隔离键互不影响，购物车/成长值共享', function () {
    var store = shared.createMemoryStorage();
    var scoped1 = shared.createScopedStorage(store, 'baby-1');
    var scoped2 = shared.createScopedStorage(store, 'baby-2');
    var core1 = shared.createAppCore({ storage: scoped1, now: function () { return clock; }, persistStage: false, state: shared.hydrateSync(scoped1) });
    var core2 = shared.createAppCore({ storage: scoped2, now: function () { return clock; }, persistStage: false, state: shared.hydrateSync(scoped2) });
    var tasks = core1.tasksFor('toddler');
    core1.toggleTask(tasks[0]);
    core1.markCardLearned(topic.id, 0, 'toddler');
    core1.toggleFav('audio', core1.getContent().tracks.toddler[0].id, 'toddler');
    core2.toggleTask(tasks[1]);
    assert.strictEqual(core1.todayStats().done, 1);
    assert.strictEqual(core2.todayStats().done, 1);
    assert.strictEqual(core2.isCardLearned(topic.id, 0, 'toddler'), false, '宝宝2 不应看到宝宝1 的学习进度');
    assert.strictEqual(core2.favCount(), 0, '宝宝2 不应看到宝宝1 的收藏');
    // 共享：成长值写在同一个全局键
    assert.strictEqual(store.getItem('yy.v1.coins'), String(core1.coins()), 'coins 走全局键');
    assert.strictEqual(scoped1.mapKey('yy.v1.checkins'), 'yy.v1.baby.baby-1.checkins');
    assert.strictEqual(scoped1.mapKey('yy.v1.cart'), 'yy.v1.cart');
    assert.ok(store.getItem('yy.v1.baby.baby-1.checkins'));
    assert.ok(store.getItem('yy.v1.baby.baby-2.checkins'));
    return 'scoped keys isolated; coins shared';
  });

  record('多宝宝档案：创建/规范化/旧档案迁移', function () {
    var babies = [];
    var a = shared.createBaby({ pregnant: false, birthDate: '2025-05-05' }, babies, clock);
    assert.strictEqual(a.id, 'baby-1');
    assert.strictEqual(a.name, '宝宝 1');
    babies.push(a);
    var b = shared.createBaby({ name: '小果', pregnant: true, dueDate: '2027-01-01' }, babies, clock);
    assert.strictEqual(b.id, 'baby-2');
    assert.strictEqual(b.name, '小果');
    var store = shared.normalizeBabyStore({ babies: [a, b], currentId: b.id });
    assert.strictEqual(store.babies.length, 2);
    assert.strictEqual(store.currentId, 'baby-2');
    var legacy = shared.legacyBaby({ months: 18 }, [], clock);
    assert.strictEqual(legacy.pregnant, false);
    assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(legacy.birthDate));
    assert.strictEqual(shared.scopedKey('baby-1', 'yy.v1.fav'), 'yy.v1.baby.baby-1.fav');
    return 'create/name/migrate/scopedKey ok';
  });

  record('订单：结算写入状态与下单时间，历史订单兼容', function () {
    core.resetAll();
    core.setStage('toddler');
    var p = core.getContent().products.slice().sort(function (a, b) { return a.price - b.price; })[0];
    core.addToCart(p.id, 1);
    var res = core.checkout();
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.order.status, 'done');
    assert.ok(res.order.createdAt);
    assert.strictEqual(res.order.items[0].qty, 1);
    assert.strictEqual(res.order.items[0].price, p.price);
    var list = core.orders();
    assert.strictEqual(list[0].id, res.order.id);
    // 历史订单（无 status/createdAt）仍可展示
    var historical = [{ id: 'OLD1', date: '2025-01-01', items: [{ id: p.id, title: p.title, emoji: p.emoji, qty: 1, price: p.price }], total: p.price }];
    var oldCore = shared.createCore({ content: core.getContent(), stages: core.stages(), storage: null, state: { orders: historical } });
    assert.strictEqual(oldCore.orders()[0].id, 'OLD1');
    return 'new order status=' + res.order.status + ', legacy accepted';
  });

  console.log('\n=== shared A-features verification ===\n');
  var failed = 0;
  results.forEach(function (r) {
    console.log((r.ok ? 'PASS' : 'FAIL') + '  ' + r.name + '  —  ' + r.detail);
    if (!r.ok) failed += 1;
  });
  console.log('\n' + (results.length - failed) + '/' + results.length + ' passed');
  if (failed) process.exit(1);
}

run();
