/* 业务规则纯函数验证：打卡/连续天数/成长值/购物车/卡片学习。
   运行：node shared/test/rules.test.js */
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
  var clock = new Date(2026, 10, 4, 10, 0, 0); // 2026-11-04
  var core = shared.createAppCore({ storage: storage, now: function () { return clock; } });

  record('切换阶段并持久化', function () {
    assert.ok(core.setStage('pregnancy'));
    assert.strictEqual(core.getStage(), 'pregnancy');
    assert.strictEqual(storage.getItem('yy.v1.stage'), '"pregnancy"');
    return 'stage=pregnancy';
  });

  record('打卡完成与成长值增减', function () {
    core.setStage('toddler');
    var tasks = core.tasksFor('toddler');
    var before = core.coins();
    var r = core.toggleTask(tasks[0]);
    assert.strictEqual(r.done, true);
    assert.strictEqual(core.coins(), before + tasks[0].value);
    assert.strictEqual(core.todayStats().done, 1);
    core.toggleTask(tasks[0]);
    assert.strictEqual(core.coins(), before);
    assert.strictEqual(core.todayStats().done, 0);
    return 'toggle ok, coins restored to ' + before;
  });

  record('连续打卡天数', function () {
    core.setStage('toddler');
    var tasks = core.tasksFor('toddler');
    // 昨天、前天各打一次
    clock = new Date(2026, 10, 3, 10, 0, 0);
    core.toggleTask(tasks[0]);
    clock = new Date(2026, 10, 2, 10, 0, 0);
    core.toggleTask(tasks[0]);
    // 今天也打一次
    clock = new Date(2026, 10, 4, 10, 0, 0);
    core.toggleTask(tasks[0]);
    assert.strictEqual(core.streak('toddler'), 3);
    return 'streak=3 across 11/02-11/04';
  });

  record('购物车加购/改量/结算', function () {
    core.resetAll();
    core.setStage('toddler');
    var p = core.getContent().products[0];
    assert.ok(core.addToCart(p.id, 2));
    assert.strictEqual(core.cartCount(), 2);
    assert.strictEqual(core.cartTotal(), p.price * 2);
    core.setQty(p.id, 1);
    assert.strictEqual(core.cartTotal(), p.price);
    var coins = core.coins();
    var r = core.checkout();
    assert.strictEqual(r.ok, true);
    assert.strictEqual(core.coins(), coins - p.price);
    assert.strictEqual(core.cartCount(), 0);
    assert.strictEqual(core.orders().length, 1);
    return 'order=' + r.order.id + ', coins=' + core.coins();
  });

  record('余额不足结算', function () {
    core.resetAll();
    core.setStage('toddler');
    var expensive = core.getContent().products.filter(function (x) { return x.price > core.coins(); })[0];
    if (!expensive) return 'no product above balance, skipped';
    core.addToCart(expensive.id, 1);
    var r = core.checkout();
    assert.strictEqual(r.ok, false);
    assert.strictEqual(r.reason, 'coins');
    assert.ok(r.need > 0);
    return 'need=' + r.need;
  });

  record('卡片学习进度', function () {
    core.resetAll();
    core.setStage('toddler');
    var deck = core.getContent().decks.toddler;
    var topic = Object.keys(deck)[0];
    var total = deck[topic].length;
    assert.strictEqual(core.learnedCount(topic, total, 'toddler'), 0);
    core.markCardLearned(topic, 0, 'toddler');
    assert.strictEqual(core.learnedCount(topic, total, 'toddler'), 1);
    assert.strictEqual(core.isCardLearned(topic, 0, 'toddler'), true);
    return 'learned 1/' + total + ' in ' + topic;
  });

  console.log('\n=== shared rules verification ===\n');
  var failed = 0;
  results.forEach(function (r) {
    console.log((r.ok ? 'PASS' : 'FAIL') + '  ' + r.name + '  —  ' + r.detail);
    if (!r.ok) failed += 1;
  });
  console.log('\n' + (results.length - failed) + '/' + results.length + ' passed');
  if (failed) process.exit(1);
}

run();
