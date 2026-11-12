/* ============================================================
   shared/test/notify.test.js —— 打卡提醒设置（纯函数）
   运行：node shared/test/notify.test.js
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
  record('提醒设置：默认关闭 19:00，仅 enabled=true 才开启', function () {
    var s = shared.normalizeReminder(undefined);
    assert.deepStrictEqual(s, { enabled: false, hour: 19, minute: 0 });
    assert.strictEqual(shared.normalizeReminder({ enabled: 'true' }).enabled, false, '字符串 true 不应开启');
    assert.strictEqual(shared.formatTime(s), '19:00');
    return 'default off 19:00';
  });

  record('提醒设置：小时/分钟越界与小数回落默认值', function () {
    assert.strictEqual(shared.normalizeReminder({ enabled: true, hour: 25, minute: 70 }).hour, 19);
    assert.strictEqual(shared.normalizeReminder({ enabled: true, hour: -1, minute: 30 }).minute, 30);
    assert.strictEqual(shared.normalizeReminder({ enabled: true, hour: 8.5 }).hour, 19);
    assert.strictEqual(shared.normalizeReminder({ enabled: true, hour: 0, minute: 0 }).hour, 0);
    return 'fallback ok';
  });

  record('下一次提醒：当天未到 → 今天；已过 → 明天', function () {
    var early = new Date(2026, 10, 5, 8, 0, 0);
    var late = new Date(2026, 10, 5, 20, 0, 0);
    var at = shared.nextReminderAt({ enabled: true, hour: 19, minute: 0 }, early);
    assert.strictEqual(at.getFullYear(), 2026);
    assert.strictEqual(at.getMonth(), 10);
    assert.strictEqual(at.getDate(), 5);
    assert.strictEqual(at.getHours(), 19);
    var next = shared.nextReminderAt({ enabled: true, hour: 19, minute: 0 }, late);
    assert.strictEqual(next.getDate(), 6, '20:00 时应排到明天');
    return 'today/tomorrow boundary ok';
  });

  record('提醒设置：同一时刻按分钟边界顺延', function () {
    var exact = new Date(2026, 10, 5, 19, 0, 0);
    var next = shared.nextReminderAt({ enabled: true, hour: 19, minute: 0 }, exact);
    assert.strictEqual(next.getDate(), 6, '恰好 19:00 视为已到点，排明天');
    return 'exact minute rolls to next day';
  });

  console.log('\n=== shared notify verification ===\n');
  var failed = 0;
  results.forEach(function (r) {
    console.log((r.ok ? 'PASS' : 'FAIL') + '  ' + r.name + '  —  ' + r.detail);
    if (!r.ok) failed += 1;
  });
  console.log('\n' + (results.length - failed) + '/' + results.length + ' passed');
  if (failed) process.exit(1);
}

run();
