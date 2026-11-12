/* ============================================================
   shared/profileSync.js —— 设备档案云同步的纯合并逻辑
   客户端与服务端共用，不碰网络、不碰存储。

   身份：匿名设备 ID（uuid）。档案以 deviceId 为键存服务端。
   预留 accountId: null；将来接入登录后，把 deviceId 绑定到账号即可
   （服务端把 profile.accountId 写成账号 id，读取时按账号合并多设备）。

   冲突：同一条宝宝记录按 updatedAt 做 last-write-wins（LWW）。
   - 本地与远端 updatedAt 不同：时间更新的那条保留；
   - updatedAt 完全相同但内容不同：保留服务端，并记录 conflict，
     避免两端无限互推；此时客户端内容会被服务端覆盖，属于已知取舍；
   - updatedAt 缺失按 0（1970）处理，永远输给有时间的一方。
   删除：墓碑 { id, updatedAt }。墓碑时间 >= 宝宝更新时间 → 删除；
   宝宝更新时间更新 → 视为重新添加，宝宝保留。墓碑长期保留，防止
   离线旧设备把已删除宝宝重新推回。
   currentId：单独用 currentIdUpdatedAt 做 LWW，与宝宝记录互不影响。
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

  var DEVICE_ID_KEY = 'yy.v1.deviceId';
  var SYNC_META_KEY = 'yy.v1.sync';
  var DEVICE_ID_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;

  function babiesApi() {
    try { return require('./babies'); } catch (err) { /* 浏览器分支 */ }
    return root.YYShared || {};
  }

  /** RFC4122 v4；优先 crypto.randomUUID，退化为 Math.random */
  function newDeviceId() {
    try {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
      }
    } catch (err) { /* 继续退化实现 */ }
    var hex = '0123456789abcdef';
    var out = '';
    for (var i = 0; i < 36; i++) {
      if (i === 8 || i === 13 || i === 18 || i === 23) { out += '-'; continue; }
      if (i === 14) { out += '4'; continue; }
      var r = Math.floor(Math.random() * 16);
      if (i === 19) r = (r & 0x3) | 0x8;
      out += hex.charAt(r);
    }
    return out;
  }

  function isValidDeviceId(value) {
    return typeof value === 'string' && DEVICE_ID_PATTERN.test(value);
  }

  function timeOf(value) {
    var t = Date.parse(String(value || ''));
    return isNaN(t) ? 0 : t;
  }

  /** 键排序后的稳定 JSON，用于判断内容是否真的变化 */
  function stableStringify(value) {
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) {
      return '[' + value.map(stableStringify).join(',') + ']';
    }
    var keys = Object.keys(value).sort();
    return '{' + keys.map(function (k) {
      return JSON.stringify(k) + ':' + stableStringify(value[k]);
    }).join(',') + '}';
  }

  function signature(store) {
    var src = store && typeof store === 'object' ? store : {};
    var babies = (Array.isArray(src.babies) ? src.babies : []).slice().sort(function (a, b) {
      return String(a && a.id).localeCompare(String(b && b.id));
    });
    return stableStringify({ babies: babies, currentId: src.currentId || null });
  }

  /** 同步元数据：客户端持久化在 yy.v1.sync */
  function normalizeSyncMeta(raw) {
    var src = raw && typeof raw === 'object' ? raw : {};
    var tombstones = [];
    (Array.isArray(src.deletedBabies) ? src.deletedBabies : []).forEach(function (item) {
      if (!item || typeof item.id !== 'string' || !item.id) return;
      tombstones.push({
        id: item.id,
        updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : new Date(0).toISOString(),
      });
    });
    return {
      deviceId: typeof src.deviceId === 'string' ? src.deviceId : null,
      registered: src.registered === true,
      pending: src.pending === true,
      currentIdUpdatedAt: typeof src.currentIdUpdatedAt === 'string' ? src.currentIdUpdatedAt : null,
      deletedBabies: tombstones,
      changedAt: typeof src.changedAt === 'string' ? src.changedAt : null,
      lastSyncAt: typeof src.lastSyncAt === 'string' ? src.lastSyncAt : null,
      lastError: typeof src.lastError === 'string' ? src.lastError : null,
    };
  }

  /** 记录删除墓碑（同一 id 取更晚时间） */
  function addTombstone(list, id, updatedAt) {
    var out = (Array.isArray(list) ? list : []).filter(function (t) { return t && t.id !== id; });
    out.push({ id: id, updatedAt: updatedAt });
    return out;
  }

  /**
   * 合并档案。约定 base = 服务端已存（权威基线），incoming = 客户端整包快照。
   * 服务端 PUT 与客户端拉取都用这一方向，规则才能保持一致。
   * @param serverStore    服务端已存 { babies, currentId }
   * @param clientSnapshot 客户端快照 { babies, currentId, currentIdUpdatedAt, deletedBabies }
   * @param serverMeta     服务端元数据 { deletedBabies, currentIdUpdatedAt }
   * @returns { store, deletedBabies, currentIdUpdatedAt, conflicts, dropped,
   *            changedFromServer, changedFromClient }
   */
  function mergeProfile(serverStore, clientSnapshot, serverMeta) {
    var api = babiesApi();
    var normalize = api.normalizeBaby;
    var base = serverStore && typeof serverStore === 'object' ? serverStore : {};
    var next = clientSnapshot && typeof clientSnapshot === 'object' ? clientSnapshot : {};
    var meta = serverMeta && typeof serverMeta === 'object' ? serverMeta : {};

    var map = {};
    var order = [];
    var conflicts = [];
    var dropped = [];

    function keep(raw, source, index) {
      var baby = normalize ? normalize(raw, index) : raw;
      if (!baby || !baby.id) { dropped.push({ source: source, raw: raw }); return null; }
      map[baby.id] = baby;
      order.push(baby.id);
      return baby;
    }

    (Array.isArray(base.babies) ? base.babies : []).forEach(function (raw, i) { keep(raw, 'server', i); });

    (Array.isArray(next.babies) ? next.babies : []).forEach(function (raw, i) {
      var candidate = normalize ? normalize(raw, i) : raw;
      if (!candidate || !candidate.id) { dropped.push({ source: 'client', raw: raw }); return; }
      var current = map[candidate.id];
      if (!current) {
        keep(candidate, 'client', i);
        return;
      }
      var ct = timeOf(candidate.updatedAt);
      var bt = timeOf(current.updatedAt);
      if (ct > bt) {
        map[candidate.id] = candidate;
        conflicts.push({
          id: candidate.id,
          kept: 'client',
          serverUpdatedAt: current.updatedAt || null,
          clientUpdatedAt: candidate.updatedAt || null,
        });
      } else if (bt > ct) {
        conflicts.push({
          id: candidate.id,
          kept: 'server',
          serverUpdatedAt: current.updatedAt || null,
          clientUpdatedAt: candidate.updatedAt || null,
        });
      } else if (stableStringify(candidate) !== stableStringify(current)) {
        /* 时间相同内容不同：保留服务端，避免两端互相覆盖 */
        conflicts.push({
          id: candidate.id,
          kept: 'server',
          reason: 'same-updatedAt',
          serverUpdatedAt: current.updatedAt || null,
          clientUpdatedAt: candidate.updatedAt || null,
        });
      }
    });

    /* 墓碑：两边并集，同 id 取更晚 */
    var tombstones = [];
    var tombMap = {};
    (Array.isArray(meta.deletedBabies) ? meta.deletedBabies : [])
      .concat(Array.isArray(next.deletedBabies) ? next.deletedBabies : [])
      .forEach(function (item) {
        if (!item || typeof item.id !== 'string' || !item.id) return;
        var at = typeof item.updatedAt === 'string' ? item.updatedAt : new Date(0).toISOString();
        if (!tombMap[item.id] || timeOf(at) > timeOf(tombMap[item.id].updatedAt)) {
          tombMap[item.id] = { id: item.id, updatedAt: at };
        }
      });
    Object.keys(tombMap).forEach(function (id) {
      var tomb = tombMap[id];
      var baby = map[id];
      if (baby && timeOf(baby.updatedAt) > timeOf(tomb.updatedAt)) {
        tombstones.push(tomb); /* 宝宝比墓碑新：视为重新添加 */
        return;
      }
      delete map[id];
      order = order.filter(function (x) { return x !== id; });
      tombstones.push(tomb);
    });

    var mergedBabies = [];
    var seen = {};
    order.forEach(function (id) {
      if (seen[id] || !map[id]) return;
      seen[id] = true;
      mergedBabies.push(map[id]);
    });

    /* currentId 单独 LWW：客户端变更时间更晚才覆盖服务端 */
    var serverCurrentAt = typeof meta.currentIdUpdatedAt === 'string' ? meta.currentIdUpdatedAt : null;
    var clientCurrentAt = typeof next.currentIdUpdatedAt === 'string' ? next.currentIdUpdatedAt : null;
    var currentId = null;
    var currentIdUpdatedAt = null;
    if (timeOf(clientCurrentAt) > timeOf(serverCurrentAt)) {
      currentId = next.currentId || null;
      currentIdUpdatedAt = clientCurrentAt;
    } else {
      currentId = base.currentId || null;
      currentIdUpdatedAt = serverCurrentAt;
    }
    if (!mergedBabies.some(function (b) { return b.id === currentId; })) {
      currentId = mergedBabies[0] ? mergedBabies[0].id : null;
      if (currentId && !currentIdUpdatedAt) currentIdUpdatedAt = clientCurrentAt || serverCurrentAt || null;
    }

    var store = { babies: mergedBabies, currentId: currentId };
    var result = {
      store: store,
      deletedBabies: tombstones,
      currentIdUpdatedAt: currentIdUpdatedAt,
      accountId: next.accountId || base.accountId || null,
      conflicts: conflicts,
      dropped: dropped,
    };
    result.changedFromServer = signature(store) !== signature(base);
    result.changedFromClient = signature(store) !== signature(next);
    return result;
  }

  /** 客户端整包快照（推给服务端） */
  function buildSnapshot(store, meta, now) {
    var at = (now instanceof Date ? now : new Date()).toISOString();
    var m = normalizeSyncMeta(meta);
    return {
      babies: (store && Array.isArray(store.babies)) ? store.babies : [],
      currentId: (store && store.currentId) || null,
      currentIdUpdatedAt: m.currentIdUpdatedAt || (store && store.currentId ? at : null),
      deletedBabies: m.deletedBabies,
      updatedAt: m.changedAt || at,
    };
  }

  return {
    DEVICE_ID_KEY: DEVICE_ID_KEY,
    SYNC_META_KEY: SYNC_META_KEY,
    DEVICE_ID_PATTERN: DEVICE_ID_PATTERN,
    newDeviceId: newDeviceId,
    isValidDeviceId: isValidDeviceId,
    stableStringify: stableStringify,
    signature: signature,
    timeOf: timeOf,
    normalizeSyncMeta: normalizeSyncMeta,
    addTombstone: addTombstone,
    mergeProfile: mergeProfile,
    buildSnapshot: buildSnapshot,
  };
});
