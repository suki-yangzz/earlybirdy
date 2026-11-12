/* ============================================================
   shared/report.js —— 家长学习报告聚合（纯函数）
   - 数据全部来自真实记录：打卡 checkins + 学习时长 events
   - 不做任何随机/填充；没有记录就是 0
   - now 可注入，便于测试
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

  var MODULES = ['audio', 'cards', 'video', 'tasks'];
  var MODULE_LABELS = { audio: '音乐', cards: '卡片', video: '视频', tasks: '任务' };

  function pad2(n) { return n < 10 ? '0' + n : String(n); }

  function dateKeyOf(d) {
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function startOfDay(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
  }

  function addDays(d, delta) {
    var x = new Date(d.getTime());
    x.setDate(x.getDate() + delta);
    return x;
  }

  /** 本周从周一开始；若当前是周日则取所在周的周一 */
  function startOfWeek(d) {
    var day = d.getDay(); // 0 周日
    var diff = day === 0 ? 6 : day - 1;
    return addDays(startOfDay(d), -diff);
  }

  /** 生成按时间升序的日期键（含今天） */
  function rangeKeys(now, opts) {
    opts = opts || {};
    var today = startOfDay(now || new Date());
    var range = opts.range || '7d';
    var keys = [];
    if (range === 'week') {
      var start = startOfWeek(today);
      for (var d = start; d.getTime() <= today.getTime(); d = addDays(d, 1)) keys.push(dateKeyOf(d));
      return keys;
    }
    var days = Math.max(1, Number(opts.days) || 7);
    for (var i = days - 1; i >= 0; i -= 1) keys.push(dateKeyOf(addDays(today, -i)));
    return keys;
  }

  /**
   * @param {Object} opts
   *   events      { 'YYYY-MM-DD': { audio: 秒, cards: 秒, video: 秒, tasks: 秒 } }
   *   checkins    { stage: { 'YYYY-MM-DD': ['taskId', ...] } }
   *   stage       当前阶段 id（历史完成率按当前阶段任务数计）
   *   tasksCount  当前阶段每日任务数
   *   now         可注入当前时间
   *   days / range
   *   streak      连续打卡天数（由 core 计算）
   */
  function buildReport(opts) {
    opts = opts || {};
    var now = opts.now || new Date();
    var keys = rangeKeys(now, opts);
    var events = opts.events || {};
    var checkins = opts.checkins || {};
    var stage = opts.stage;
    var stageMap = checkins[stage] || {};
    var tasksCount = Math.max(0, Number(opts.tasksCount) || 0);

    var daily = keys.map(function (key) {
      var dayEvents = events[key] || {};
      var modules = {};
      var total = 0;
      MODULES.forEach(function (m) {
        var sec = Math.max(0, Number(dayEvents[m]) || 0);
        modules[m] = sec;
        total += sec;
      });
      var doneList = Array.isArray(stageMap[key]) ? stageMap[key] : [];
      return {
        day: key,
        label: key.slice(5).replace('-', '/'),
        seconds: total,
        modules: modules,
        done: doneList.length,
        expected: tasksCount
      };
    });

    var moduleTotals = {};
    MODULES.forEach(function (m) {
      moduleTotals[m] = daily.reduce(function (sum, d) { return sum + (d.modules[m] || 0); }, 0);
    });
    var totalSeconds = daily.reduce(function (sum, d) { return sum + d.seconds; }, 0);

    var done = daily.reduce(function (sum, d) { return sum + d.done; }, 0);
    var expected = tasksCount * keys.length;
    var rate = expected ? Math.round((done / expected) * 100) : 0;

    var activeDays = daily.filter(function (d) { return d.seconds > 0 || d.done > 0; }).length;

    return {
      range: opts.range || '7d',
      days: daily,
      totalSeconds: totalSeconds,
      totalMinutes: Math.round(totalSeconds / 60),
      moduleTotals: moduleTotals,
      moduleMinutes: Object.keys(moduleTotals).reduce(function (acc, m) {
        acc[m] = Math.round(moduleTotals[m] / 60);
        return acc;
      }, {}),
      completion: { done: done, expected: expected, rate: rate },
      streak: Math.max(0, Number(opts.streak) || 0),
      activeDays: activeDays,
      moduleLabels: MODULE_LABELS
    };
  }

  return { buildReport: buildReport, reportRangeKeys: rangeKeys, REPORT_MODULES: MODULES, REPORT_MODULE_LABELS: MODULE_LABELS };
});
