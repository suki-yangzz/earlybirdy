/* ============================================================
   shared/test/profileSync.test.js —— 设备档案 LWW 合并 / 墓碑 / currentId
   运行：node shared/test/profileSync.test.js
   ============================================================ */
'use strict';

var assert = require('assert');
var shared = require('../index');

var results = [];
function record(name, fn) {
  try { results.push({ name: name, ok: true, detail: fn() }); }
  catch (err) { results.push({ name: name, ok: false, detail: err.message }); }
}

function baby(id, updatedAt, extra) {
  return Object.assign({
    id: id,
    name: '宝宝 ' + id,
    nickname: '',
    parentRole: 'mom',
    pregnant: false,
    birthDate: '2025-01-01',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: updatedAt,
  }, extra || {});
}

function store(list, currentId) {
  return { babies: list, currentId: currentId === undefined ? (list[0] && list[0].id) || null : currentId };
}

function run() {
  record('合并：本地独有 + 远端独有多宝宝取并集', function () {
    var local = store([baby('baby-1', '2026-01-01T00:00:00.000Z')]);
    var remote = {
      babies: [baby('baby-2', '2026-01-02T00:00:00.000Z')],
      currentId: 'baby-2',
      currentIdUpdatedAt: '2026-01-02T00:00:00.000Z',
    };
    var out = shared.mergeProfile(remote, local, {});
    assert.strictEqual(out.store.babies.length, 2);
    assert.deepStrictEqual(out.store.babies.map(function (b) { return b.id; }).sort(), ['baby-1', 'baby-2']);
    assert.strictEqual(out.store.currentId, 'baby-2');
    assert.strictEqual(out.changedFromClient, true);
    return '两个宝宝都在，currentId 用远端时间';
  });

  record('LWW：同一个宝宝 updatedAt 较新的一方保留（本地新）', function () {
    var local = store([baby('baby-1', '2026-02-01T00:00:00.000Z', { nickname: '本地版' })]);
    var remote = {
      babies: [baby('baby-1', '2026-01-01T00:00:00.000Z', { nickname: '远端旧版' })],
      currentId: 'baby-1',
    };
    var out = shared.mergeProfile(remote, local, {});
    assert.strictEqual(out.store.babies[0].nickname, '本地版');
    assert.strictEqual(out.conflicts[0].kept, 'client');
    assert.strictEqual(out.changedFromClient, false);
    return '本地 2 月 > 远端 1 月，保留本地';
  });

  record('LWW：远端较新时覆盖本地', function () {
    var local = store([baby('baby-1', '2026-01-01T00:00:00.000Z', { nickname: '本地旧版' })]);
    var remote = {
      babies: [baby('baby-1', '2026-03-01T00:00:00.000Z', { nickname: '远端新版' })],
      currentId: 'baby-1',
    };
    var out = shared.mergeProfile(remote, local, {});
    assert.strictEqual(out.store.babies[0].nickname, '远端新版');
    assert.strictEqual(out.conflicts[0].kept, 'server');
    assert.strictEqual(out.changedFromClient, true);
    return '远端 3 月 > 本地 1 月，保留远端';
  });

  record('LWW：updatedAt 相同但内容不同 → 保留服务端并记录冲突', function () {
    var at = '2026-04-01T00:00:00.000Z';
    var local = store([baby('baby-1', at, { nickname: '本地' })]);
    var remote = { babies: [baby('baby-1', at, { nickname: '远端' })], currentId: 'baby-1' };
    var out = shared.mergeProfile(remote, local, {});
    assert.strictEqual(out.store.babies[0].nickname, '远端');
    assert.strictEqual(out.conflicts[0].reason, 'same-updatedAt');
    return '同时间冲突保留服务端，不无限互推';
  });

  record('墓碑：远端删除时间晚于本地宝宝 → 删除', function () {
    var local = store([baby('baby-1', '2026-01-01T00:00:00.000Z')]);
    var remote = {
      babies: [],
      currentId: null,
      deletedBabies: [{ id: 'baby-1', updatedAt: '2026-02-01T00:00:00.000Z' }],
    };
    var out = shared.mergeProfile(remote, local, { deletedBabies: remote.deletedBabies });
    assert.strictEqual(out.store.babies.length, 0);
    assert.strictEqual(out.store.currentId, null);
    assert.strictEqual(out.deletedBabies.length, 1);
    return '晚于宝宝更新时间的墓碑生效';
  });

  record('墓碑：宝宝在删除后被重新添加（更新时间更晚）→ 保留', function () {
    var local = store([baby('baby-1', '2026-05-01T00:00:00.000Z', { nickname: '重新添加' })]);
    var remote = {
      babies: [],
      currentId: null,
      deletedBabies: [{ id: 'baby-1', updatedAt: '2026-02-01T00:00:00.000Z' }],
    };
    var out = shared.mergeProfile(remote, local, { deletedBabies: remote.deletedBabies });
    assert.strictEqual(out.store.babies.length, 1);
    assert.strictEqual(out.store.babies[0].nickname, '重新添加');
    return '墓碑早于宝宝更新时间，不删除';
  });

  record('本地待推送删除：合入远端并保留墓碑', function () {
    var remote = {
      babies: [baby('baby-1', '2026-01-01T00:00:00.000Z')],
      currentId: 'baby-1',
      deletedBabies: [],
    };
    var local = {
      babies: [],
      currentId: null,
      deletedBabies: [{ id: 'baby-1', updatedAt: '2026-06-01T00:00:00.000Z' }],
    };
    var out = shared.mergeProfile(remote, local, {});
    assert.strictEqual(out.store.babies.length, 0);
    assert.strictEqual(out.deletedBabies.length, 1);
    return '本地墓碑立即反映到合并结果';
  });

  record('currentId：本地变更时间更晚 → 保留本地', function () {
    var local = store([baby('baby-1', '2026-01-01T00:00:00.000Z'), baby('baby-2', '2026-01-01T00:00:00.000Z')], 'baby-2');
    var remote = {
      babies: local.babies,
      currentId: 'baby-1',
      currentIdUpdatedAt: '2026-01-02T00:00:00.000Z',
    };
    var localSnapshot = {
      babies: local.babies,
      currentId: 'baby-2',
      currentIdUpdatedAt: '2026-01-03T00:00:00.000Z',
    };
    var out = shared.mergeProfile(remote, localSnapshot, { currentIdUpdatedAt: remote.currentIdUpdatedAt });
    assert.strictEqual(out.store.currentId, 'baby-2');
    return 'currentId 独立 LWW，不被宝宝记录影响';
  });

  record('currentId：远端指向的宝宝已被删除 → 回落到第一个宝宝', function () {
    var local = store([baby('baby-1', '2026-01-01T00:00:00.000Z')]);
    var remote = { babies: [], currentId: 'baby-9', currentIdUpdatedAt: '2026-07-01T00:00:00.000Z' };
    var out = shared.mergeProfile(remote, local, { currentIdUpdatedAt: remote.currentIdUpdatedAt });
    assert.strictEqual(out.store.currentId, 'baby-1');
    return '非法 currentId 自动纠正';
  });

  record('稳定比较：键顺序不同不算变化', function () {
    var a = { babies: [{ id: 'baby-1', updatedAt: '2026-01-01T00:00:00.000Z', pregnant: false, birthDate: '2025-01-01', name: '宝宝 1', nickname: '', parentRole: 'mom', createdAt: '2025-01-01T00:00:00.000Z' }], currentId: 'baby-1' };
    var b = { currentId: 'baby-1', babies: [{ createdAt: '2025-01-01T00:00:00.000Z', parentRole: 'mom', nickname: '', name: '宝宝 1', birthDate: '2025-01-01', pregnant: false, updatedAt: '2026-01-01T00:00:00.000Z', id: 'baby-1' }] };
    assert.strictEqual(shared.signature(a), shared.signature(b));
    return '键顺序不影响 signature';
  });

  record('同步元数据：非法值归一化', function () {
    var meta = shared.normalizeSyncMeta({ pending: 'yes', deletedBabies: [{ id: '' }, { id: 'baby-2' }] });
    assert.strictEqual(meta.pending, false);
    assert.strictEqual(meta.deletedBabies.length, 1);
    assert.strictEqual(meta.deletedBabies[0].id, 'baby-2');
    assert.strictEqual(shared.isValidDeviceId('abc'), false);
    assert.strictEqual(shared.isValidDeviceId('123e4567-e89b-42d3-a456-426614174000'), true);
    return 'pending/墓碑/设备 id 校验';
  });

  record('设备 id 生成：uuid v4 且可重复校验', function () {
    var id = shared.newDeviceId();
    assert.strictEqual(shared.isValidDeviceId(id), true);
    assert.strictEqual(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id), true);
    return id;
  });

  var passed = results.filter(function (r) { return r.ok; }).length;
  results.forEach(function (r) {
    console.log((r.ok ? 'PASS' : 'FAIL') + '  ' + r.name + (r.ok ? '' : '  → ' + r.detail));
  });
  console.log('\n' + passed + '/' + results.length + ' 通过');
  if (passed !== results.length) process.exitCode = 1;
}

run();
