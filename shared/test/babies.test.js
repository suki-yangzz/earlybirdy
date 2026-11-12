/* ============================================================
   shared/test/babies.test.js —— 宝宝昵称 / 家长身份 / 老数据迁移
   运行：node shared/test/babies.test.js
   ============================================================ */
'use strict';

var assert = require('assert');
var shared = require('../index');

var results = [];
function record(name, fn) {
  try { results.push({ name: name, ok: true, detail: fn() }); }
  catch (err) { results.push({ name: name, ok: false, detail: err.message }); }
}

function legacyBaby(extra) {
  return Object.assign(
    { id: 'baby-1', name: '宝宝 1', pregnant: false, birthDate: '2025-01-01', createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
    extra || {}
  );
}

function run() {
  record('称呼规则：三种身份', function () {
    assert.strictEqual(shared.displayName({ nickname: '小花生', parentRole: 'mom' }), '小花生妈妈');
    assert.strictEqual(shared.displayName({ nickname: '小花生', parentRole: 'dad' }), '小花生爸爸');
    assert.strictEqual(shared.displayName({ nickname: '小花生', parentRole: 'other' }), '小花生家长');
    assert.strictEqual(shared.displayName({ nickname: '小花生', parentRole: 'unknown' }), '小花生妈妈');
    return 'mom/dad/other + 非法值兜底 mom';
  });

  record('称呼规则：空昵称与空白昵称兜底「宝宝」', function () {
    assert.strictEqual(shared.displayName({ nickname: '', parentRole: 'mom' }), '宝宝妈妈');
    assert.strictEqual(shared.displayName({ nickname: '   ', parentRole: 'dad' }), '宝宝爸爸');
    assert.strictEqual(shared.displayName({ parentRole: 'other' }), '宝宝家长');
    assert.strictEqual(shared.displayName({}), '宝宝妈妈');
    return '空/空白/缺省均兜底';
  });

  record('称呼规则：超长截断（8 个汉字 / 16 个半角字符）', function () {
    assert.strictEqual(shared.displayName({ nickname: '一二三四五六七八', parentRole: 'mom' }), '一二三四五六七八妈妈');
    assert.strictEqual(shared.displayName({ nickname: '一二三四五六七八九', parentRole: 'mom' }), '一二三四五六七八…妈妈');
    assert.strictEqual(shared.displayName({ nickname: 'abcdefghijklmnop', parentRole: 'mom' }), 'abcdefghijklmnop妈妈');
    assert.strictEqual(shared.displayName({ nickname: 'abcdefghijklmnopq', parentRole: 'mom' }), 'abcdefghijklmnop…妈妈');
    return '中文 9 字与英文 17 字符均截断';
  });

  record('称呼规则：中英混排按字宽截断', function () {
    assert.strictEqual(shared.displayName({ nickname: '小花生Baby', parentRole: 'mom' }), '小花生Baby妈妈');
    assert.strictEqual(shared.displayName({ nickname: '小花生BabyLovers', parentRole: 'mom' }), '小花生BabyLovers妈妈');
    assert.strictEqual(shared.displayName({ nickname: '小花生BabyLoversX', parentRole: 'mom' }), '小花生BabyLovers…妈妈');
    return '3 汉字 + 8 半角 = 7 单位；再加 1 半角后截断';
  });

  record('老数据迁移：缺 nickname/parentRole 补默认值且保留其他字段', function () {
    var baby = shared.normalizeBaby(legacyBaby(), 0);
    assert.strictEqual(baby.nickname, '');
    assert.strictEqual(baby.parentRole, 'mom');
    assert.strictEqual(baby.birthDate, '2025-01-01');
    assert.strictEqual(baby.name, '宝宝 1');
    assert.strictEqual(shared.displayName(baby), '宝宝妈妈');

    var pregnant = shared.normalizeBaby({ id: 'baby-2', name: '二宝', pregnant: true, dueDate: '2026-12-01' }, 1);
    assert.strictEqual(pregnant.nickname, '');
    assert.strictEqual(pregnant.parentRole, 'mom');
    assert.strictEqual(pregnant.dueDate, '2026-12-01');
    return '缺字段补 mom / 空昵称，日期与名称不变';
  });

  record('多宝宝迁移：normalizeBabyStore 逐个补字段并保留 currentId', function () {
    var store = shared.normalizeBabyStore({
      babies: [
        legacyBaby({ id: 'baby-1', nickname: '小花生', parentRole: 'dad' }),
        legacyBaby({ id: 'baby-2', nickname: '小豆丁' }),
      ],
      currentId: 'baby-2',
    });
    assert.strictEqual(store.babies[0].parentRole, 'dad');
    assert.strictEqual(store.babies[0].nickname, '小花生');
    assert.strictEqual(store.babies[1].parentRole, 'mom');
    assert.strictEqual(store.currentId, 'baby-2');
    return '各自独立字段，currentId 不变';
  });

  record('新增/编辑：昵称与身份独立于 name 与日期', function () {
    var created = shared.createBaby({ nickname: '小花生', parentRole: 'dad', pregnant: false, birthDate: '2025-02-02' }, [], new Date(2026, 0, 1));
    assert.strictEqual(created.nickname, '小花生');
    assert.strictEqual(created.parentRole, 'dad');
    var updated = shared.updateBaby(created, { nickname: '小豆丁', parentRole: 'other' }, new Date(2026, 0, 2));
    assert.strictEqual(updated.nickname, '小豆丁');
    assert.strictEqual(updated.parentRole, 'other');
    assert.strictEqual(updated.birthDate, '2025-02-02');
    assert.strictEqual(updated.name, created.name);
    return 'id/日期/name 保持，称呼字段可单独更新';
  });

  record('阶段切换：孕期 → 已出生 → 孕期，始终只保留一个日期', function () {
    var pregnant = shared.createBaby({ pregnant: true, dueDate: '2026-12-01', nickname: '小花生', parentRole: 'dad' }, [], new Date(2026, 0, 1));
    assert.strictEqual(pregnant.pregnant, true);
    assert.strictEqual(pregnant.dueDate, '2026-12-01');
    assert.ok(!('birthDate' in pregnant));

    var born = shared.updateBaby(pregnant, { pregnant: false, birthDate: '2026-11-01', dueDate: null }, new Date(2026, 10, 8));
    assert.strictEqual(born.pregnant, false);
    assert.strictEqual(born.birthDate, '2026-11-01');
    assert.ok(!('dueDate' in born), '切换已出生后不应残留预产期');
    assert.strictEqual(born.nickname, '小花生');
    assert.strictEqual(born.parentRole, 'dad');

    var back = shared.updateBaby(born, { pregnant: true, dueDate: '2027-01-20', birthDate: null }, new Date(2026, 10, 9));
    assert.strictEqual(back.pregnant, true);
    assert.strictEqual(back.dueDate, '2027-01-20');
    assert.ok(!('birthDate' in back), '切回孕期后不应残留生日');
    assert.strictEqual(back.nickname, '小花生');
    return '双向往返后仅保留当前阶段日期，称呼不变';
  });

  record('脏状态归一化：同时存在 dueDate 与 birthDate 时只留当前阶段日期', function () {
    var pregnant = shared.normalizeBaby({ id: 'baby-1', name: '宝宝', pregnant: true, dueDate: '2026-12-01', birthDate: '2026-01-01' }, 0);
    assert.strictEqual(pregnant.pregnant, true);
    assert.strictEqual(pregnant.dueDate, '2026-12-01');
    assert.ok(!('birthDate' in pregnant));

    var born = shared.normalizeBaby({ id: 'baby-1', name: '宝宝', pregnant: false, dueDate: '2026-12-01', birthDate: '2026-01-01' }, 0);
    assert.strictEqual(born.pregnant, false);
    assert.strictEqual(born.birthDate, '2026-01-01');
    assert.ok(!('dueDate' in born));
    return '两个日期都合法时按 pregnant 取一侧';
  });

  record('脏状态归一化：阶段与唯一有效日期冲突时以日期为准', function () {
    var fromBirth = shared.normalizeBaby({ id: 'baby-1', name: '宝宝', pregnant: true, birthDate: '2026-01-01' }, 0);
    assert.strictEqual(fromBirth.pregnant, false);
    assert.strictEqual(fromBirth.birthDate, '2026-01-01');

    var fromDue = shared.normalizeBaby({ id: 'baby-2', name: '二宝', pregnant: false, dueDate: '2026-12-01' }, 0);
    assert.strictEqual(fromDue.pregnant, true);
    assert.strictEqual(fromDue.dueDate, '2026-12-01');

    assert.strictEqual(shared.normalizeBaby({ id: 'baby-3', name: '三宝', pregnant: true }, 0), null);
    return '孕期误填生日归一化为已出生；已出生只填预产期归一化为孕期';
  });

  record('切换阶段不清空其他字段；未显式清对侧日期也不会双写', function () {
    var born = shared.createBaby({ pregnant: false, birthDate: '2025-02-02', nickname: '小豆丁', parentRole: 'other', name: '大宝' }, [], new Date(2026, 0, 1));
    var switched = shared.updateBaby(born, { pregnant: true, dueDate: '2027-02-02' }, new Date(2026, 10, 8));
    assert.strictEqual(switched.pregnant, true);
    assert.strictEqual(switched.dueDate, '2027-02-02');
    assert.ok(!('birthDate' in switched));
    assert.strictEqual(switched.nickname, '小豆丁');
    assert.strictEqual(switched.parentRole, 'other');
    assert.strictEqual(switched.name, '大宝');
    assert.strictEqual(switched.id, born.id);
    return '切换后 id/name/昵称/身份保持，仅阶段日期变化';
  });

  var failed = results.filter(function (r) { return !r.ok; });
  results.forEach(function (r) {
    console.log((r.ok ? 'PASS' : 'FAIL') + '  ' + r.name + (r.ok ? '  -> ' + r.detail : '  -> ' + r.detail));
  });
  console.log('\n' + (results.length - failed.length) + '/' + results.length + ' passed');
  if (failed.length) process.exit(1);
}

run();
