/* ============================================================
   shared/profile.js —— 宝宝档案（出生日期驱动）与阶段推导
   - 档案唯一事实来源：
       { pregnant: true,  dueDate:  "YYYY-MM-DD" }
       { pregnant: false, birthDate:"YYYY-MM-DD" }
   - 月龄不落库，每次由 ageFromBirthdate(birthDate, now) 实时计算
   - 所有日期按「本地日期」处理（用本地年/月/日构造，避免 UTC 差一天）
   - 纯函数，now 可注入，便于测试与后续接服务器时间
   ============================================================ */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) {
    root.YYShared = root.YYShared || {};
    for (var k in api) if (Object.prototype.hasOwnProperty.call(api, k)) root.YYShared[k] = api[k];
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var PROFILE_KEY = 'yy.v1.profile';
  var ONBOARDED_KEY = 'yy.v1.onboarded';
  var MIGRATION_KEY = 'yy.v1.profileMigration';

  /*
   * 阶段区间沿用原有划分，左闭右开：
   *   baby      [0, 6)      0-5 个月（6 个月整进入 toddler）
   *   toddler   [6, 36)     6 个月-2 岁 11 个月
   *   preschool [36, 72)    3 岁-5 岁 11 个月
   *   kid       [72, +∞)    6 岁及以上
   */
  var MONTH_BANDS = [
    { stage: 'baby', min: 0, max: 6, label: '0-6 个月' },
    { stage: 'toddler', min: 6, max: 36, label: '6 个月-3 岁' },
    { stage: 'preschool', min: 36, max: 72, label: '3-6 岁' },
    { stage: 'kid', min: 72, max: Infinity, label: '6 岁以上' }
  ];

  function pad2(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function isValidMonths(months) {
    return typeof months === 'number' && isFinite(months) && months >= 0;
  }

  function daysInMonth(year, month) {
    return new Date(year, month, 0, 12, 0, 0, 0).getDate();
  }

  /** 把 key / Date / 今天 统一成本地中午的 Date（中午可避开 DST 的 0 点跳变） */
  function toLocalDate(value) {
    if (value === undefined || value === null) return new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), 12, 0, 0, 0);
    if (value instanceof Date) {
      if (isNaN(value.getTime())) return null;
      return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 12, 0, 0, 0);
    }
    if (typeof value === 'string') {
      var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
      if (!m) return null;
      var y = Number(m[1]);
      var mo = Number(m[2]);
      var d = Number(m[3]);
      var dt = new Date(y, mo - 1, d, 12, 0, 0, 0);
      if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
      return dt;
    }
    return null;
  }

  /** 本地日期 → "YYYY-MM-DD" */
  function dateKey(value) {
    var d = toLocalDate(value);
    if (!d) return null;
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  /** 是否合法日期字符串（会拒绝 2026-02-30） */
  function isDateKey(value) {
    return toLocalDate(value) !== null && /^(\d{4})-(\d{2})-(\d{2})$/.test(String(value).trim());
  }

  /** 日期加减自然月，月末自动收敛（1/31 + 1 月 → 2/28 或 2/29） */
  function addMonths(value, delta) {
    var base = toLocalDate(value);
    if (!base) return null;
    var total = (base.getFullYear() * 12 + base.getMonth()) + Number(delta || 0);
    var y = Math.floor(total / 12);
    var m = total - y * 12; // 0-11
    var d = Math.min(base.getDate(), daysInMonth(y, m + 1));
    return new Date(y, m, d, 12, 0, 0, 0);
  }

  function addMonthsKey(value, delta) {
    var d = addMonths(value, delta);
    return d ? dateKey(d) : null;
  }

  function addDaysKey(value, delta) {
    var base = toLocalDate(value);
    if (!base) return null;
    var d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + Number(delta || 0), 12, 0, 0, 0);
    return dateKey(d);
  }

  /**
   * 月龄计算：满自然月计数，未满整月向下取整。
   * 做法：先按年月差取上界，再拿「出生日期 + N 个月」与 now 比较，超过则减 1。
   * 例：1/15 出生，2/14 → 0，2/15 → 1；2/29 出生，次年 2/28 → 12。
   */
  function ageFromBirthdate(birthDate, now) {
    var birth = toLocalDate(birthDate);
    var today = toLocalDate(now);
    if (!birth || !today) return null;

    var months = (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth());
    var candidate = addMonths(birth, months);
    if (candidate && candidate.getTime() > today.getTime()) months -= 1;
    if (months < 0) months = 0;

    var totalDays = Math.round(
      (Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
        - Date.UTC(birth.getFullYear(), birth.getMonth(), birth.getDate())) / 86400000
    );

    return {
      months: months,
      days: totalDays,
      future: totalDays < 0,
      birthDate: dateKey(birth),
      today: dateKey(today)
    };
  }

  /** 两个日期相差的自然日（正数表示 target 在未来）；用 UTC 组装避免 DST 影响 */
  function daysUntil(targetDate, now) {
    var target = toLocalDate(targetDate);
    var today = toLocalDate(now);
    if (!target || !today) return null;
    return Math.round(
      (Date.UTC(target.getFullYear(), target.getMonth(), target.getDate())
        - Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) / 86400000
    );
  }

  /** 月龄 → 阶段 id；非法月龄返回 null */
  function stageFromMonths(months) {
    if (!isValidMonths(months)) return null;
    var n = Math.floor(months);
    for (var i = 0; i < MONTH_BANDS.length; i++) {
      var band = MONTH_BANDS[i];
      if (n >= band.min && n < band.max) return band.stage;
    }
    return 'kid';
  }

  /**
   * 归一化档案：接受对象或 JSON 字符串，返回新结构。
   * - 新结构：pregnant + dueDate / birthDate
   * - 兼容旧结构：{ months: n } 原样保留 months，由启动时迁移
   * - 旧孕期 { pregnant: true } 无 dueDate 也保留，UI 提示补设预产期
   * - 无法识别返回 null
   */
  function normalizeProfile(raw) {
    var obj = raw;
    if (typeof raw === 'string') {
      try { obj = JSON.parse(raw); } catch (err) { return null; }
    }
    if (!obj || typeof obj !== 'object') return null;

    if (obj.pregnant === true) {
      var p = { pregnant: true };
      if (isDateKey(obj.dueDate)) p.dueDate = String(obj.dueDate).trim();
      if (typeof obj.updatedAt === 'string') p.updatedAt = obj.updatedAt;
      return p;
    }

    if (isDateKey(obj.birthDate)) {
      var b = { pregnant: false, birthDate: String(obj.birthDate).trim() };
      if (typeof obj.updatedAt === 'string') b.updatedAt = obj.updatedAt;
      if (obj.migratedFromMonths === true) b.migratedFromMonths = true;
      return b;
    }

    if (isValidMonths(obj.months) || (typeof obj.months === 'string' && obj.months.trim() !== '' && isFinite(Number(obj.months))) ) {
      var m = Math.floor(Number(obj.months));
      if (m < 0) return null;
      var legacy = { pregnant: false, months: m };
      if (typeof obj.updatedAt === 'string') legacy.updatedAt = obj.updatedAt;
      return legacy;
    }

    return null;
  }

  function isLegacyMonthsProfile(profile) {
    var p = normalizeProfile(profile);
    return !!p && p.pregnant !== true && typeof p.months === 'number' && !p.birthDate;
  }

  /** 旧月龄迁移：出生日期 = 今天往回推 N 个月（月末自动收敛） */
  function legacyBirthDateFromMonths(months, now) {
    if (!isValidMonths(months)) return null;
    return addMonthsKey(toLocalDate(now), -Math.floor(months));
  }

  /** 档案 → 阶段 id；没有可用档案返回 null */
  function stageFromProfile(profile, now) {
    var p = normalizeProfile(profile);
    if (!p) return null;
    if (p.pregnant) return 'pregnancy';
    if (p.birthDate) {
      var age = ageFromBirthdate(p.birthDate, now);
      if (!age) return null;
      return stageFromMonths(age.months);
    }
    if (typeof p.months === 'number') return stageFromMonths(p.months);
    return null;
  }

  /** 档案中的日期文案：预产期 2027-01-26 / 生日 2026-08-05 */
  function profileDateLabel(profile) {
    var p = normalizeProfile(profile);
    if (!p) return '未设置';
    if (p.pregnant) return p.dueDate ? '预产期 ' + p.dueDate : '预产期未设置';
    if (p.birthDate) return '生日 ' + p.birthDate;
    if (typeof p.months === 'number') return '旧月龄 ' + p.months + ' 个月';
    return '未设置';
  }

  /** 孕期倒计时 / 已出生月龄文案 */
  function profileAgeLabel(profile, now) {
    var p = normalizeProfile(profile);
    if (!p) return '未设置';
    if (p.pregnant) {
      if (!p.dueDate) return '预产期未设置';
      var left = daysUntil(p.dueDate, now);
      if (left > 0) return '距预产期 ' + left + ' 天';
      if (left === 0) return '预产期就是今天';
      return '已过预产期 ' + (-left) + ' 天';
    }
    if (p.birthDate) {
      var age = ageFromBirthdate(p.birthDate, now);
      if (!age) return '日期无效';
      if (age.future) return '尚未出生';
      return String(age.months) + ' 个月';
    }
    if (typeof p.months === 'number') return p.months + ' 个月';
    return '未设置';
  }

  /** 组合文案：生日 2026-08-05 · 3 个月 / 预产期 2027-01-26 · 距预产期 82 天 */
  function profileLabel(profile, now) {
    var p = normalizeProfile(profile);
    if (!p) return '未设置';
    return profileDateLabel(p) + ' · ' + profileAgeLabel(p, now);
  }

  function profileIsOverdue(profile, now) {
    var p = normalizeProfile(profile);
    if (!p || !p.pregnant || !p.dueDate) return false;
    var left = daysUntil(p.dueDate, now);
    return typeof left === 'number' && left < 0;
  }

  /** 与月龄区间对应的阶段说明，供引导页/说明展示 */
  function monthBands() {
    return MONTH_BANDS.map(function (b) {
      return { stage: b.stage, min: b.min, max: b.max, label: b.label };
    });
  }

  return {
    PROFILE_KEY: PROFILE_KEY,
    ONBOARDED_KEY: ONBOARDED_KEY,
    MIGRATION_KEY: MIGRATION_KEY,
    MONTH_BANDS: MONTH_BANDS,
    isValidMonths: isValidMonths,
    daysInMonth: daysInMonth,
    dateKey: dateKey,
    isDateKey: isDateKey,
    addMonths: addMonths,
    addMonthsKey: addMonthsKey,
    addDaysKey: addDaysKey,
    ageFromBirthdate: ageFromBirthdate,
    daysUntil: daysUntil,
    stageFromMonths: stageFromMonths,
    normalizeProfile: normalizeProfile,
    isLegacyMonthsProfile: isLegacyMonthsProfile,
    legacyBirthDateFromMonths: legacyBirthDateFromMonths,
    stageFromProfile: stageFromProfile,
    profileDateLabel: profileDateLabel,
    profileAgeLabel: profileAgeLabel,
    profileLabel: profileLabel,
    profileIsOverdue: profileIsOverdue,
    monthBands: monthBands
  };
});
