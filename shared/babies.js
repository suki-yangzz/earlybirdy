/* ============================================================
   shared/babies.js —— 多宝宝档案（纯函数与隔离存储键）
   - babies: [{ id, name, pregnant, dueDate?, birthDate?, createdAt, updatedAt }]
   - 隔离：打卡 / 学习进度 / 收藏 / 浏览历史 / 学习报告事件 按宝宝分键
   - 共享：购物车 / 成长值 / 订单（家长账号级）
   - 旧单档案 → 第一个宝宝（迁移由调用方执行，本文件提供纯换算）
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

  var BABIES_KEY = 'yy.v1.babies';
  var CURRENT_BABY_KEY = 'yy.v1.currentBaby';
  var BABIES_MIGRATION_KEY = 'yy.v1.babiesMigration';

  /* 这些键按宝宝隔离；其余（购物车/成长值/订单）保持账号共享 */
  var SCOPED_KEYS = ['checkins', 'learned', 'fav', 'history', 'events'];

  /* 家长身份：档案字段，随宝宝独立保存；缺省/非法一律按「妈妈」兜底 */
  var PARENT_ROLES = ['mom', 'dad', 'other'];
  var ROLE_LABELS = { mom: '妈妈', dad: '爸爸', other: '家长' };
  var DEFAULT_PARENT_ROLE = 'mom';
  /* 称呼显示上限：8 个汉字（约 16 个半角字符），超出截断并加省略号 */
  var NICKNAME_UNITS = 8;

  function normalizeParentRole(value) {
    return PARENT_ROLES.indexOf(value) !== -1 ? value : DEFAULT_PARENT_ROLE;
  }

  /** 全角字符按 1 个汉字计，半角按 0.5 计，用于中英混排截断 */
  function charUnits(ch) {
    return /[\u2E80-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF]/.test(ch) ? 1 : 0.5;
  }

  /** 昵称截断：空昵称由 displayName 兜底为「宝宝」，这里只做上限保护 */
  function truncateNickname(value) {
    var text = String(value == null ? '' : value).trim();
    if (!text) return '';
    var units = 0;
    var out = '';
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      var u = charUnits(ch);
      if (units + u > NICKNAME_UNITS) return out + '…';
      units += u;
      out += ch;
    }
    return out;
  }

  /** 展示名称：${昵称}${身份}，如「小花生妈妈」；空昵称兜底「宝宝」 */
  function displayName(input) {
    var baby = input && typeof input === 'object' ? input : {};
    var nickname = truncateNickname(baby.nickname);
    return (nickname || '宝宝') + ROLE_LABELS[normalizeParentRole(baby.parentRole)];
  }

  function pad2(n) { return n < 10 ? '0' + n : String(n); }

  function isDateKey(value) {
    if (!/^(\d{4})-(\d{2})-(\d{2})$/.test(String(value || '').trim())) return false;
    var p = String(value).trim().split('-').map(Number);
    var d = new Date(p[0], p[1] - 1, p[2], 12, 0, 0, 0);
    return d.getFullYear() === p[0] && d.getMonth() === p[1] - 1 && d.getDate() === p[2];
  }

  function dateKey(value) {
    var d = value instanceof Date ? value : new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function addDaysKey(key, delta) {
    var p = String(key).split('-').map(Number);
    var d = new Date(p[0], p[1] - 1, p[2], 12, 0, 0, 0);
    d.setDate(d.getDate() + delta);
    return dateKey(d);
  }

  /**
   * 规范化单个宝宝；日期缺失/非法返回 null（不编造日期）。
   * 脏状态归一化：孕期只保留 dueDate，已出生只保留 birthDate；
   * 声明阶段与唯一有效日期冲突时，以日期为准（例如 pregnant:true 但只有出生日期 → 归一化为已出生）。
   */
  function normalizeBaby(raw, index) {
    if (!raw || typeof raw !== 'object') return null;
    var id = typeof raw.id === 'string' && raw.id ? raw.id : 'baby-' + ((index || 0) + 1);
    var name = typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : '宝宝 ' + ((index || 0) + 1);
    var createdAt = typeof raw.createdAt === 'string' ? raw.createdAt : null;
    var updatedAt = typeof raw.updatedAt === 'string' ? raw.updatedAt : null;
    /* 老数据迁移：缺字段补默认值，不触发重新引导、不清空其他数据 */
    var nickname = typeof raw.nickname === 'string' ? raw.nickname.trim() : '';
    var parentRole = normalizeParentRole(raw.parentRole);
    var hasDue = isDateKey(raw.dueDate);
    var hasBirth = isDateKey(raw.birthDate);
    var pregnant = null;
    if (raw.pregnant === true) pregnant = hasDue ? true : (hasBirth ? false : null);
    else if (raw.pregnant === false) pregnant = hasBirth ? false : (hasDue ? true : null);
    if (pregnant === null) return null;
    var base = { id: id, name: name, nickname: nickname, parentRole: parentRole, createdAt: createdAt, updatedAt: updatedAt };
    if (pregnant) {
      base.pregnant = true;
      base.dueDate = raw.dueDate;
      return base;
    }
    base.pregnant = false;
    base.birthDate = raw.birthDate;
    return base;
  }

  /** 迁移旧档案（含 months）为第一个宝宝；日期换算沿用 profile 的规则 */
  function legacyBaby(profile, babies, now) {
    if (!profile || typeof profile !== 'object') return null;
    var birthDate = profile.birthDate;
    var dueDate = profile.dueDate;
    if (!birthDate && typeof profile.months === 'number') {
      var profileApi = null;
      try { profileApi = require('./profile'); } catch (err) { /* 浏览器分支 */ }
      if (!profileApi && root.YYShared) profileApi = root.YYShared;
      if (profileApi && profileApi.legacyBirthDateFromMonths) {
        birthDate = profileApi.legacyBirthDateFromMonths(profile.months, now || new Date());
      }
    }
    var candidate = profile.pregnant === true
      ? { pregnant: true, dueDate: dueDate }
      : { pregnant: false, birthDate: birthDate };
    return normalizeBaby(
      {
        id: nextBabyId(babies),
        name: '宝宝 1',
        pregnant: candidate.pregnant,
        dueDate: candidate.dueDate,
        birthDate: candidate.birthDate,
        createdAt: (now || new Date()).toISOString(),
        updatedAt: (now || new Date()).toISOString()
      },
      0
    );
  }

  function normalizeStore(raw) {
    var src = raw && typeof raw === 'object' ? raw : {};
    var list = Array.isArray(src.babies) ? src.babies : [];
    var babies = [];
    var seen = {};
    list.forEach(function (b) {
      var normalized = normalizeBaby(b, babies.length);
      if (!normalized || seen[normalized.id]) return;
      seen[normalized.id] = true;
      babies.push(normalized);
    });
    var currentId = src.currentId;
    if (!babies.some(function (b) { return b.id === currentId; })) currentId = babies[0] ? babies[0].id : null;
    return { babies: babies, currentId: currentId };
  }

  function nextBabyId(babies) {
    var max = 0;
    (babies || []).forEach(function (b) {
      var m = /^baby-(\d+)$/.exec(String(b && b.id));
      if (m) max = Math.max(max, Number(m[1]));
    });
    return 'baby-' + (max + 1);
  }

  /** 新增宝宝：调用方传入已选日期；name 可空 */
  function createBaby(input, babies, now) {
    var base = now || new Date();
    var list = babies || [];
    var candidate = {
      id: nextBabyId(list),
      name: (input && input.name) || '宝宝 ' + (list.length + 1),
      nickname: input && input.nickname,
      parentRole: input && input.parentRole,
      pregnant: !!(input && input.pregnant),
      dueDate: input && input.dueDate,
      birthDate: input && input.birthDate,
      createdAt: base.toISOString(),
      updatedAt: base.toISOString()
    };
    return normalizeBaby(candidate, list.length);
  }

  /**
   * 合并补丁：键不存在 → 沿用旧值；键存在但为 null/undefined → 显式清除。
   * 切换阶段时把对侧日期传 null，避免 dueDate 与 birthDate 同时残留。
   */
  function patchValue(patch, key, fallback) {
    if (!patch || !Object.prototype.hasOwnProperty.call(patch, key)) return fallback;
    var value = patch[key];
    return value == null ? undefined : value;
  }

  function updateBaby(baby, patch, now) {
    var merged = {
      id: baby.id,
      name: patchValue(patch, 'name', baby.name),
      nickname: patchValue(patch, 'nickname', baby.nickname),
      parentRole: patchValue(patch, 'parentRole', baby.parentRole),
      pregnant: patchValue(patch, 'pregnant', baby.pregnant),
      dueDate: patchValue(patch, 'dueDate', baby.dueDate),
      birthDate: patchValue(patch, 'birthDate', baby.birthDate),
      createdAt: baby.createdAt,
      updatedAt: (now || new Date()).toISOString()
    };
    return normalizeBaby(merged, 0);
  }

  function scopedPrefix(babyId) {
    return 'yy.v1.baby.' + String(babyId || 'default') + '.';
  }

  /** 隔离键：yy.v1.baby.<id>.checkins；共享键原样返回 */
  function scopedKey(babyId, key) {
    var base = String(key || '').replace(/^yy\.v1\./, '');
    if (SCOPED_KEYS.indexOf(base) === -1) return key;
    return scopedPrefix(babyId) + base;
  }

  function isScopedKey(key) {
    return SCOPED_KEYS.indexOf(String(key || '').replace(/^yy\.v1\./, '')) !== -1;
  }

  return {
    BABIES_KEY: BABIES_KEY,
    CURRENT_BABY_KEY: CURRENT_BABY_KEY,
    BABIES_MIGRATION_KEY: BABIES_MIGRATION_KEY,
    BABY_SCOPED_KEYS: SCOPED_KEYS,
    PARENT_ROLES: PARENT_ROLES,
    ROLE_LABELS: ROLE_LABELS,
    DEFAULT_PARENT_ROLE: DEFAULT_PARENT_ROLE,
    NICKNAME_UNITS: NICKNAME_UNITS,
    normalizeParentRole: normalizeParentRole,
    truncateNickname: truncateNickname,
    displayName: displayName,
    normalizeBaby: normalizeBaby,
    normalizeBabyStore: normalizeStore,
    nextBabyId: nextBabyId,
    createBaby: createBaby,
    updateBaby: updateBaby,
    legacyBaby: legacyBaby,
    addDaysKey: addDaysKey,
    scopedPrefix: scopedPrefix,
    scopedKey: scopedKey,
    isScopedKey: isScopedKey
  };
});
