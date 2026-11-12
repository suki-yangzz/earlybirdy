/* ============================================================
   content/profile-store.js —— 设备档案文件存储（零依赖）
   选型：单个 JSON 文件 + 临时文件原子 rename。
   - 适合内测 / 单机：无需安装数据库，备份=复制文件；
   - 不适合多实例并发：写操作只在当前进程内串行（同步写），
     多进程同时写会互相覆盖；上线应换 SQLite / Postgres。
   ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const babies = require(path.join(__dirname, '..', 'shared', 'babies.js'));
const profileSync = require(path.join(__dirname, '..', 'shared', 'profileSync.js'));

const DEFAULT_PATH = path.join(__dirname, '..', 'server', 'data', 'profiles.json');
const MAX_BABIES = 20;

function emptyData() {
  return { version: 1, updatedAt: new Date().toISOString(), devices: {} };
}

function fail(status, code, message) {
  const err = new Error(message || code);
  err.status = status;
  err.code = code;
  return err;
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeIso(value, fallback) {
  if (typeof value === 'string' && !isNaN(Date.parse(value))) return new Date(value).toISOString();
  return fallback || nowIso();
}

function createProfileStore(opts) {
  const filePath = (opts && opts.filePath) || process.env.PROFILE_STORE_PATH || DEFAULT_PATH;
  let data = null;

  function load() {
    if (data) return data;
    try {
      const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      data = raw && typeof raw === 'object' && raw.devices && typeof raw.devices === 'object' ? raw : emptyData();
      if (!data.version) data.version = 1;
    } catch (err) {
      if (err && err.code !== 'ENOENT') {
        /* 文件损坏时保留现场，避免直接覆盖用户数据 */
        const backup = filePath + '.corrupt-' + Date.now();
        try { fs.copyFileSync(filePath, backup); } catch (copyErr) { /* 忽略 */ }
        console.warn('[profiles] 无法解析 ' + filePath + '，已备份到 ' + backup + '，本次从空档案启动');
      }
      data = emptyData();
    }
    return data;
  }

  function save() {
    const db = load();
    db.updatedAt = nowIso();
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const tmp = filePath + '.tmp-' + process.pid + '-' + crypto.randomBytes(4).toString('hex');
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2) + '\n');
    fs.renameSync(tmp, filePath);
  }

  function deviceOf(deviceId) {
    const db = load();
    return db.devices[deviceId] || null;
  }

  function publicProfile(device) {
    if (!device) return null;
    return {
      deviceId: device.deviceId,
      accountId: device.accountId || null,
      babies: Array.isArray(device.babies) ? device.babies : [],
      currentId: device.currentId || null,
      currentIdUpdatedAt: device.currentIdUpdatedAt || null,
      deletedBabies: Array.isArray(device.deletedBabies) ? device.deletedBabies : [],
      createdAt: device.createdAt || null,
      updatedAt: device.updatedAt || null,
    };
  }

  function createDevice(deviceId) {
    const at = nowIso();
    return {
      deviceId: deviceId,
      accountId: null,
      babies: [],
      currentId: null,
      currentIdUpdatedAt: null,
      deletedBabies: [],
      createdAt: at,
      updatedAt: at,
    };
  }

  function ensureDevice(deviceId) {
    const db = load();
    if (!db.devices[deviceId]) {
      db.devices[deviceId] = createDevice(deviceId);
    }
    return db.devices[deviceId];
  }

  function get(deviceId) {
    return publicProfile(deviceOf(deviceId));
  }

  /** 整包快照：per-baby LWW + 墓碑，返回服务端权威结果 */
  function applySnapshot(deviceId, snapshot) {
    if (!snapshot || typeof snapshot !== 'object' || !Array.isArray(snapshot.babies)) {
      throw fail(400, 'invalid_profile', '请求体需要 { babies: [] }');
    }
    if (snapshot.babies.length > MAX_BABIES) {
      throw fail(400, 'too_many_babies', '最多 ' + MAX_BABIES + ' 个宝宝档案');
    }
    const db = load();
    const created = !db.devices[deviceId];
    const device = ensureDevice(deviceId);
    const merged = profileSync.mergeProfile(
      { babies: device.babies, currentId: device.currentId, accountId: device.accountId },
      snapshot,
      { deletedBabies: device.deletedBabies, currentIdUpdatedAt: device.currentIdUpdatedAt }
    );
    device.babies = merged.store.babies;
    device.currentId = merged.store.currentId;
    device.currentIdUpdatedAt = merged.currentIdUpdatedAt || device.currentIdUpdatedAt || null;
    device.deletedBabies = merged.deletedBabies;
    device.accountId = merged.accountId || null;
    device.updatedAt = nowIso();
    save();
    return { profile: publicProfile(device), conflicts: merged.conflicts, dropped: merged.dropped, created: created };
  }

  /** 新增 / 覆盖单个宝宝；updatedAt 更旧返回 409，避免旧副本覆盖新数据 */
  function upsertBaby(deviceId, input) {
    if (!input || typeof input !== 'object') throw fail(400, 'invalid_baby', '请求体需要宝宝对象');
    const db = load();
    const device = ensureDevice(deviceId);
    const at = normalizeIso(input.updatedAt, nowIso());
    const id = typeof input.id === 'string' && input.id
      ? input.id
      : babies.nextBabyId(device.babies);
    const candidate = Object.assign({}, input, {
      id: id,
      createdAt: normalizeIso(input.createdAt, at),
      updatedAt: at,
    });
    const existing = device.babies.find((b) => b.id === id) || null;
    if (existing && profileSync.timeOf(existing.updatedAt) > profileSync.timeOf(at)) {
      throw fail(409, 'stale', '该宝宝在服务端已有更新的记录（' + existing.updatedAt + '）');
    }
    const merged = profileSync.mergeProfile(
      { babies: device.babies, currentId: device.currentId, accountId: device.accountId },
      {
        babies: [candidate],
        currentId: device.currentId || id,
        currentIdUpdatedAt: device.currentId ? device.currentIdUpdatedAt : at,
        deletedBabies: [],
      },
      { deletedBabies: device.deletedBabies, currentIdUpdatedAt: device.currentIdUpdatedAt }
    );
    device.babies = merged.store.babies;
    device.currentId = merged.store.currentId;
    device.currentIdUpdatedAt = merged.currentIdUpdatedAt || (device.currentId ? at : null);
    device.deletedBabies = merged.deletedBabies;
    device.updatedAt = nowIso();
    save();
    const baby = device.babies.find((b) => b.id === id) || null;
    return { profile: publicProfile(device), baby: baby, created: !existing };
  }

  /** 局部更新单个宝宝；不传 updatedAt 时用服务端当前时间 */
  function patchBaby(deviceId, babyId, patch) {
    const device = deviceOf(deviceId);
    if (!device) throw fail(404, 'device_not_found', '设备档案不存在');
    const existing = device.babies.find((b) => b.id === babyId);
    if (!existing) throw fail(404, 'baby_not_found', '宝宝档案不存在');
    if (patch && patch.updatedAt && profileSync.timeOf(patch.updatedAt) < profileSync.timeOf(existing.updatedAt)) {
      throw fail(409, 'stale', '该宝宝在服务端已有更新的记录（' + existing.updatedAt + '）');
    }
    const at = patch && patch.updatedAt ? new Date(patch.updatedAt) : new Date();
    const updated = babies.updateBaby(existing, patch || {}, at);
    if (!updated) throw fail(400, 'invalid_patch', '更新后档案不合法（检查日期）');
    device.babies = device.babies.map((b) => (b.id === babyId ? updated : b));
    device.updatedAt = nowIso();
    save();
    return { profile: publicProfile(device), baby: updated };
  }

  /** 删除宝宝：写墓碑，服务端保留 updatedAt 更晚的重新添加 */
  function deleteBaby(deviceId, babyId, atInput) {
    const device = deviceOf(deviceId);
    if (!device) throw fail(404, 'device_not_found', '设备档案不存在');
    const existing = device.babies.find((b) => b.id === babyId);
    if (!existing) throw fail(404, 'baby_not_found', '宝宝档案不存在');
    const at = normalizeIso(atInput, nowIso());
    if (profileSync.timeOf(existing.updatedAt) > profileSync.timeOf(at)) {
      throw fail(409, 'stale', '该宝宝在服务端已有更新的记录（' + existing.updatedAt + '）');
    }
    device.babies = device.babies.filter((b) => b.id !== babyId);
    device.deletedBabies = profileSync.addTombstone(device.deletedBabies, babyId, at);
    if (device.currentId === babyId) {
      device.currentId = device.babies[0] ? device.babies[0].id : null;
      device.currentIdUpdatedAt = at;
    }
    device.updatedAt = nowIso();
    save();
    return { profile: publicProfile(device), deleted: { id: babyId, updatedAt: at } };
  }

  function stats() {
    const db = load();
    const ids = Object.keys(db.devices);
    return {
      devices: ids.length,
      babies: ids.reduce((n, id) => n + (db.devices[id].babies || []).length, 0),
      file: filePath,
    };
  }

  return {
    filePath: filePath,
    get: get,
    applySnapshot: applySnapshot,
    upsertBaby: upsertBaby,
    patchBaby: patchBaby,
    deleteBaby: deleteBaby,
    stats: stats,
    publicProfile: publicProfile,
  };
}

module.exports = { createProfileStore, DEFAULT_PATH, MAX_BABIES };
