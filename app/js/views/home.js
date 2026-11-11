/* 首页：阶段选择 + 今日专属 + 任务入口 + 内容入口 + 家长小推荐 */
(function () {
  'use strict';
  window.YY = window.YY || {};
  YY.Views = YY.Views || {};

  function render() {
    var stage = YY.store.stage();
    var stats = YY.store.todayStats();
    var tasks = YY.store.tasksFor().slice(0, 3);
    var coins = YY.store.coins();
    var inter = YY.INTERACTIONS[stage.interaction] || YY.INTERACTIONS.flashcards;
    var heroRoute = YY.ui.routeFor(stage.interaction);
    var nextGoal = Math.min(1000, coins + 140);
    var giftLeft = Math.max(0, nextGoal - coins);
    var coinPct = Math.min(100, Math.round(coins / 1000 * 100));
    var remaining = Math.max(0, stats.total - stats.done);
    var bellBadge = remaining > 0 ? remaining : 0;

    var chips = YY.STAGE_ORDER.map(function (id) {
      var s = YY.STAGES[id];
      return '<button class="chip' + (id === stage.id ? ' active' : '') + '" data-stage="' + id + '">' + s.chip + '</button>';
    }).join('');

    var miniTasks = tasks.map(function (t) {
      var done = YY.store.isTaskDone(t.id);
      return '<div class="mini-task">' +
        '<span class="' + (done ? 'dot-done' : 'dot-idle') + '"></span>' +
        '<span>' + YY.ui.esc(t.title) + '</span></div>';
    }).join('');

    var streakText;
    if (stats.done === stats.total && stats.total > 0) {
      streakText = '今天的任务全部完成啦 🎉 连续打卡 ' + Math.max(1, stats.streak) + ' 天';
    } else if (stats.streak > 0) {
      streakText = '已连续打卡 ' + stats.streak + ' 天，今天再完成 ' + remaining + ' 个任务';
    } else {
      streakText = '今天打个卡，连续天数就从 1 开始 🌱';
    }

    var entries = stage.entries.map(function (e) {
      return '<a class="entry" href="#' + YY.ui.routeFor(e.target) + '">' +
        '<div class="entry-ico" style="background:' + e.bg + ';color:' + e.color + '">' + YY.icon(e.icon, 19) + '</div>' +
        '<div><b>' + YY.ui.esc(e.title) + '</b><span>' + YY.ui.esc(e.sub) + '</span></div>' +
        '</a>';
    }).join('');

    var tips = stage.tips.map(function (t) {
      return '<div class="tip-row">' +
        '<div class="tip-ico" style="background:' + t.bg + ';color:' + t.color + '">' + YY.icon(t.icon, 17) + '</div>' +
        '<div><b>' + YY.ui.esc(t.title) + '</b><p>' + YY.ui.esc(t.text) + '</p></div></div>';
    }).join('');

    return '<header class="appbar">' +
      '<div style="flex:1;min-width:0">' +
      '<p class="greeting-date">' + YY.ui.dateText() + '</p>' +
      '<h1 class="greeting-title">' + YY.ui.greeting() + '</h1>' +
      '</div>' +
      '<a class="icon-btn bell" href="#/tasks" aria-label="今日任务" style="color:#FF6B4A">' + YY.icon('bell', 22) +
      (bellBadge ? '<span class="bell-dot">' + bellBadge + '</span>' : '') + '</a>' +
      '</header>' +
      '<main class="scroll">' +
      '<div class="coin-card">' +
      '<div class="coin-ico">' + YY.icon('star', 20) + '</div>' +
      '<div style="flex:1;min-width:0">' +
      '<div class="coin-title"><span>小星星成长值 <b>' + coins + '</b></span>' +
      '<span>' + (giftLeft > 0 ? '还差 ' + giftLeft + ' 换礼物' : '可以换礼物啦 🎁') + '</span></div>' +
      '<div class="progress thin" style="margin-top:6px"><i style="width:' + coinPct + '%"></i></div>' +
      '</div></div>' +

      '<section class="section" style="margin-top:14px">' +
      '<div class="section-head"><h2>宝宝现在几个月啦？</h2><span>选一个，马上换内容</span></div>' +
      '<div class="chip-row" id="stageRow">' + chips + '</div>' +
      '<div class="mini-note" style="margin-top:2px;background:transparent;padding-left:0">' +
      YY.icon('info', 14) + '<span>' + YY.ui.esc(stage.note) + '</span></div>' +
      '</section>' +

      '<section class="hero">' +
      '<div class="hero-bg dots" style="background:' + YY.ui.gradient(stage) + '"></div>' +
      '<div class="hero-body">' +
      '<div class="hero-copy">' +
      '<span class="hero-tag">今日专属 · ' + YY.ui.esc(stage.label) + '</span>' +
      '<h3 class="hero-title">' + stage.hero.title + '</h3>' +
      '<p class="hero-desc">' + YY.ui.esc(stage.hero.desc) + '</p>' +
      '<a class="hero-cta" href="#' + heroRoute + '">' + YY.ui.esc(stage.hero.cta || inter.cta) + YY.icon('arrowRight', 16) + '</a>' +
      '</div>' +
      '<div class="hero-emoji">' + stage.hero.emoji + '</div>' +
      '</div></section>' +

      '<a class="task-entry" href="#/tasks">' +
      '<div class="task-entry-top">' +
      '<div class="task-entry-left"><div class="task-entry-ico">' + YY.icon('checkCircle', 18) + '</div>' +
      '<b>今天的任务</b><span class="pill pill-coral" style="margin-left:2px">' + stats.done + '/' + stats.total + '</span></div>' +
      '<span class="link">去看看 ' + YY.icon('chevronRight', 13) + '</span></div>' +
      '<div class="mini-tasks">' + miniTasks + '</div>' +
      '<div class="streak-note">' + YY.icon('flame', 15) + '<span>' + streakText + '</span></div>' +
      '</a>' +

      '<section class="section">' +
      '<div class="section-head"><h2>' + YY.ui.esc(stage.homeEntryTitle) + '</h2>' +
      '<span>共 ' + stage.entries.length + ' 个入口</span></div>' +
      '<div class="entry-grid">' + entries + '</div>' +
      '</section>' +

      '<section class="section" style="margin-bottom:4px">' +
      '<div class="section-head"><h2>给家长的小推荐</h2></div>' + tips +
      '</section>' +
      '</main>';
  }

  function bind() {
    var row = document.getElementById('stageRow');
    if (!row) return;
    row.querySelectorAll('[data-stage]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        YY.app.changeStage(btn.getAttribute('data-stage'));
      });
    });
  }

  YY.Views.home = { render: render, bind: bind, title: '芽芽成长 · 早教内容' };
})();
