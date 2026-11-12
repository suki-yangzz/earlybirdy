/* 出生日期驱动的宝宝档案与阶段推导验证。运行：node shared/test/profile.test.js */
'use strict';

var assert = require('assert');
var shared = require('../index');

var results = [];
function record(name, fn) {
  try { results.push({ name: name, ok: true, detail: fn() }); }
  catch (err) { results.push({ name: name, ok: false, detail: err.message }); }
}

function run() {
  record('月龄边界：5→baby，6→toddler，35→toddler，36→preschool，71→preschool，72→kid', function () {
    assert.strictEqual(shared.stageFromMonths(0), 'baby');
    assert.strictEqual(shared.stageFromMonths(5), 'baby');
    assert.strictEqual(shared.stageFromMonths(6), 'toddler');
    assert.strictEqual(shared.stageFromMonths(35), 'toddler');
    assert.strictEqual(shared.stageFromMonths(36), 'preschool');
    assert.strictEqual(shared.stageFromMonths(71), 'preschool');
    assert.strictEqual(shared.stageFromMonths(72), 'kid');
    return '5→baby, 6→toddler, 36→preschool, 72→kid';
  });

  record('满月按自然月：1/15 出生，2/14=0，2/15=1', function () {
    assert.strictEqual(shared.ageFromBirthdate('2026-01-15', '2026-02-14').months, 0);
    assert.strictEqual(shared.ageFromBirthdate('2026-01-15', '2026-02-15').months, 1);
    assert.strictEqual(shared.ageFromBirthdate('2026-01-15', '2026-02-16').months, 1);
    return '2/14→0, 2/15→1';
  });

  record('闰年 2/29 出生：2/28 未满月，3/29 满 1 个月，次年 2/28 满 12 个月', function () {
    assert.strictEqual(shared.ageFromBirthdate('2024-02-29', '2024-02-28').months, 0);
    assert.strictEqual(shared.ageFromBirthdate('2024-02-29', '2024-03-29').months, 1);
    assert.strictEqual(shared.ageFromBirthdate('2024-02-29', '2025-02-28').months, 12);
    assert.strictEqual(shared.ageFromBirthdate('2024-02-29', '2025-03-01').months, 12);
    return '2/28→0, 3/29→1, 次年 2/28→12';
  });

  record('月末收敛：8/31 出生与 1/31 出生', function () {
    assert.strictEqual(shared.ageFromBirthdate('2025-08-31', '2025-09-29').months, 0);
    assert.strictEqual(shared.ageFromBirthdate('2025-08-31', '2025-09-30').months, 1);
    assert.strictEqual(shared.ageFromBirthdate('2026-01-31', '2026-02-27').months, 0);
    assert.strictEqual(shared.ageFromBirthdate('2026-01-31', '2026-02-28').months, 1);
    return '8/31→9/30 满月；1/31→2/28 满月';
  });

  record('跨年：12/20 出生，次年 1/20 满 1 个月', function () {
    assert.strictEqual(shared.ageFromBirthdate('2025-12-20', '2026-01-19').months, 0);
    assert.strictEqual(shared.ageFromBirthdate('2025-12-20', '2026-01-20').months, 1);
    assert.strictEqual(shared.ageFromBirthdate('2025-12-20', '2026-12-20').months, 12);
    return '1/19→0, 1/20→1, 次年 12/20→12';
  });

  record('本地日期不变性：23:59 仍是当天，非法日期被拒绝', function () {
    assert.strictEqual(shared.dateKey(new Date(2026, 1, 14, 23, 59, 59)), '2026-02-14');
    assert.strictEqual(shared.ageFromBirthdate('2026-01-15', new Date(2026, 1, 14, 23, 59, 59)).months, 0);
    assert.strictEqual(shared.ageFromBirthdate('2026-01-15', new Date(2026, 1, 15, 0, 1, 0)).months, 1);
    assert.strictEqual(shared.isDateKey('2026-02-30'), false);
    assert.strictEqual(shared.isDateKey('2026-02-14'), true);
    return '23:59→当天，00:01→次日，2/30 非法';
  });

  record('now 注入：同一出生日期，相隔 6 个月自动推进阶段', function () {
    var birth = '2026-01-15';
    assert.strictEqual(shared.ageFromBirthdate(birth, '2026-05-15').months, 4);
    assert.strictEqual(shared.stageFromProfile({ pregnant: false, birthDate: birth }, '2026-05-15'), 'baby');
    assert.strictEqual(shared.ageFromBirthdate(birth, '2026-11-15').months, 10);
    assert.strictEqual(shared.stageFromProfile({ pregnant: false, birthDate: birth }, '2026-11-15'), 'toddler');
    return '2026-05-15→4 个月 baby；2026-11-15→10 个月 toddler';
  });

  record('预产期倒计时：82 天 / 当天 / 逾期', function () {
    assert.strictEqual(shared.daysUntil('2027-01-26', '2026-11-05'), 82);
    assert.strictEqual(shared.daysUntil('2026-11-05', '2026-11-05'), 0);
    assert.strictEqual(shared.daysUntil('2026-11-04', '2026-11-05'), -1);
    assert.strictEqual(shared.profileAgeLabel({ pregnant: true, dueDate: '2027-01-26' }, '2026-11-05'), '距预产期 82 天');
    assert.strictEqual(shared.profileAgeLabel({ pregnant: true, dueDate: '2026-11-01' }, '2026-11-05'), '已过预产期 4 天');
    assert.strictEqual(shared.profileIsOverdue({ pregnant: true, dueDate: '2026-11-01' }, '2026-11-05'), true);
    return '82 天 / 已过 4 天';
  });

  record('档案归一化：新结构、旧 months、非法日期', function () {
    assert.deepStrictEqual(shared.normalizeProfile({ pregnant: true, dueDate: '2027-01-26' }), { pregnant: true, dueDate: '2027-01-26' });
    assert.deepStrictEqual(shared.normalizeProfile({ pregnant: false, birthDate: '2024-02-29' }), { pregnant: false, birthDate: '2024-02-29' });
    assert.deepStrictEqual(shared.normalizeProfile({ months: '18' }), { pregnant: false, months: 18 });
    assert.strictEqual(shared.isLegacyMonthsProfile({ months: 18 }), true);
    assert.strictEqual(shared.isLegacyMonthsProfile({ birthDate: '2024-02-29' }), false);
    assert.strictEqual(shared.normalizeProfile({ pregnant: false, birthDate: '2026-02-30' }), null);
    assert.strictEqual(shared.normalizeProfile({ pregnant: true, dueDate: '2026-02-30' }).dueDate, undefined);
    assert.strictEqual(shared.normalizeProfile('not-json'), null);
    assert.strictEqual(shared.normalizeProfile({}), null);
    return 'new shape / months / invalid date';
  });

  record('旧月龄迁移：今天往回推 N 个月，月末收敛', function () {
    assert.strictEqual(shared.legacyBirthDateFromMonths(18, '2026-11-05'), '2025-05-05');
    assert.strictEqual(shared.legacyBirthDateFromMonths(1, '2026-03-31'), '2026-02-28');
    assert.strictEqual(shared.legacyBirthDateFromMonths(5, '2026-11-05'), '2026-06-05');
    return '18→2025-05-05，3/31 回推 1 月→2/28';
  });

  record('展示文案：生日 + 月龄 / 预产期 + 倒计时', function () {
    assert.strictEqual(shared.profileDateLabel({ birthDate: '2026-08-05' }), '生日 2026-08-05');
    assert.strictEqual(shared.profileAgeLabel({ birthDate: '2026-08-05' }, '2026-11-05'), '3 个月');
    assert.strictEqual(shared.profileDateLabel({ pregnant: true, dueDate: '2027-01-26' }), '预产期 2027-01-26');
    assert.strictEqual(shared.profileLabel({ pregnant: false, birthDate: '2026-08-05' }, '2026-11-05'), '生日 2026-08-05 · 3 个月');
    assert.strictEqual(shared.profileAgeLabel({ pregnant: true }, '2026-11-05'), '预产期未设置');
    return '生日 2026-08-05 · 3 个月 / 距预产期 82 天';
  });

  record('persistStage=false 时阶段只改内存，不写 yy.v1.stage', function () {
    var storage = shared.createMemoryStorage();
    var core = shared.createCore({ storage: storage, persistStage: false });
    assert.ok(core.setStage('preschool'));
    assert.strictEqual(core.getStage(), 'preschool');
    assert.strictEqual(storage.getItem('yy.v1.stage'), null);
    return 'in-memory only, storage keeps no stage key';
  });

  record('persistStage 默认仍落盘（H5 兼容）', function () {
    var storage = shared.createMemoryStorage();
    var core = shared.createCore({ storage: storage });
    assert.ok(core.setStage('baby'));
    assert.strictEqual(storage.getItem('yy.v1.stage'), '"baby"');
    return 'storage yy.v1.stage = "baby"';
  });

  console.log('\n=== shared profile verification ===\n');
  var failed = 0;
  results.forEach(function (r) {
    console.log((r.ok ? 'PASS' : 'FAIL') + '  ' + r.name + '  —  ' + r.detail);
    if (!r.ok) failed += 1;
  });
  console.log('\n' + (results.length - failed) + '/' + results.length + ' passed');
  if (failed) process.exit(1);
}

run();
