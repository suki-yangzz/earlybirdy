/* ============================================================
   shared/notify.js —— 打卡提醒设置（纯函数）
   - 账号级共享（不随宝宝切换）
   - enabled + hour + minute，时间非法时回落 19:00
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

  var REMINDER_KEY = 'yy.v1.reminder';
  var DEFAULT_HOUR = 19;
  var DEFAULT_MINUTE = 0;

  function pad2(n) { return n < 10 ? '0' + n : String(n); }

  function clampInt(value, min, max, fallback) {
    var n = Number(value);
    if (!isFinite(n) || Math.floor(n) !== n || n < min || n > max) return fallback;
    return n;
  }

  /** 规范化提醒设置；只接受 true 才开启，避免脏数据把提醒打开 */
  function normalizeReminder(raw) {
    var s = raw && typeof raw === 'object' ? raw : {};
    return {
      enabled: s.enabled === true,
      hour: clampInt(s.hour, 0, 23, DEFAULT_HOUR),
      minute: clampInt(s.minute, 0, 59, DEFAULT_MINUTE)
    };
  }

  function formatTime(settings) {
    var s = normalizeReminder(settings);
    return pad2(s.hour) + ':' + pad2(s.minute);
  }

  /** 下一次提醒的本地时间；当天的时刻已过则顺延到明天 */
  function nextReminderAt(settings, now) {
    var s = normalizeReminder(settings);
    var base = now instanceof Date ? now : new Date();
    var next = new Date(base.getFullYear(), base.getMonth(), base.getDate(), s.hour, s.minute, 0, 0);
    if (next.getTime() <= base.getTime()) next.setDate(next.getDate() + 1);
    return next;
  }

  return {
    REMINDER_KEY: REMINDER_KEY,
    DEFAULT_REMINDER: { enabled: false, hour: DEFAULT_HOUR, minute: DEFAULT_MINUTE },
    normalizeReminder: normalizeReminder,
    formatTime: formatTime,
    nextReminderAt: nextReminderAt
  };
});
