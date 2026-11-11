/* 今日任务：按阶段任务、打卡、连续天数、成长值、持久化 */
(function () {
  'use strict';
  window.YY = window.YY || {};
  YY.Views = YY.Views || {};

  var rotation = {};

  var WEEK_SHORT = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

  function rewardCells(stageId) {
    var todayKey = YY.store.dateKey();
    var cells = [];
    var i;
    for (i = 5; i >= 1; i--) {
      var pastKey = YY.store.addDays(todayKey, -i);
      var parts = pastKey.split('-').map(Number);
      var d = new Date(parts[0], parts[1] - 1, parts[2]);
      cells.push({
        label: WEEK_SHORT[d.getDay()],
        done: YY.store.hasCheckin(stageId, pastKey),
        isToday: false,
        future: false,
        key: pastKey
      });
    }
    var todayDone = YY.store.todayStats(stageId).done > 0;
    cells.push({ label: '今天', done: todayDone, isToday: true, future: false, key: todayKey });
    cells.push({ label: '明天', done: false, isToday: false, future: true, key: YY.store.addDays(todayKey, 1) });
    return cells;
  }

  function render() {
    var stage = YY.store.stage();
    var stageId = stage.id;
    var tasks = YY.store.tasksFor();
    var rot = rotation[stageId] || 0;
    var ordered = tasks.slice(rot).concat(tasks.slice(0, rot));
    var stats = YY.store.todayStats();
    var today = new Date();
    var dateLine = (today.getMonth() + 1) + '月' + today.getDate() + '日 · ' + WEEK_SHORT[today.getDay()];

    var cells = rewardCells(stageId).map(function (c) {
      var cls = 'reward-circle';
      var content = '';
      if (c.isToday) {
        cls += ' today';
        content = c.done ? '🔥' : '🌱';
      } else if (c.future) {
        content = '🎁';
      } else if (c.done) {
        cls += ' on';
        content = '⭐';
      }
      return '<div class="reward-slot">' +
        '<div class="' + cls + '">' + content + '</div>' +
        '<span class="' + (c.isToday ? 'hot' : '') + '">' + c.label + '</span></div>';
    }).join('');

    var taskHtml = ordered.map(function (t) {
      var done = YY.store.isTaskDone(t.id);
      var go = t.go && YY.INTERACTIONS[t.go]
        ? '<a class="go" href="#' + YY.INTERACTIONS[t.go].route + '">去玩' + YY.icon('chevronRight', 11) + '</a>'
        : '';
      return '<div class="task-card' + (done ? ' done' : '') + '">' +
        '<button class="task-toggle' + (done ? ' done' : '') + '" data-toggle="' + t.id + '" aria-label="' + (done ? '取消打卡' : '完成任务') + '">' +
        (done ? YY.icon('check', 22) : t.emoji) + '</button>' +
        '<div style="flex:1;min-width:0">' +
        '<div class="task-title">' + YY.ui.esc(t.title) + '</div>' +
        '<div class="task-sub">' + YY.ui.esc(t.sub) + '</div>' +
        '</div>' +
        '<div class="task-side">' + go +
        '<div class="value' + (done ? ' done' : '') + '">' + (done ? '已获得 +' + t.value : '可得 ' + t.value) + '</div></div>' +
        '</div>';
    }).join('');

    var nextGoal = Math.max(1, stats.streak + 1);

    return '<header class="appbar">' +
      '<div style="flex:1;min-width:0"><h1 class="greeting-title" style="font-size:22px">今日任务</h1>' +
      '<p class="greeting-date" style="margin-top:3px">' + dateLine + ' · 完成一项打一个卡</p></div>' +
      '<a class="icon-btn" href="#/shop" aria-label="去商城" style="color:#F5A623">' + YY.icon('gift', 20) + '</a>' +
      '</header>' +
      '<main class="scroll">' +

      '<div class="stage-tag-row">' +
      '<button class="stage-pill" data-stage-picker>' + stage.emoji + ' ' + YY.ui.esc(stage.label) + YY.icon('chevronDown', 13) + '</button>' +
      '<span class="meta">' + YY.ui.esc(stage.note.replace(/^当前阶段：/, '')) + '</span>' +
      '</div>' +

      '<section class="task-hero">' +
      '<div class="task-hero-bg dots" style="background:' + YY.ui.gradient(stage) + '"></div>' +
      '<div class="task-hero-body">' +
      '<div class="task-hero-top">' +
      '<div><p class="label">今日已完成</p><p class="count"><b>' + stats.done + '</b><span> / ' + stats.total + ' 项</span></p></div>' +
      '<div class="task-hero-streak"><p>连续打卡</p><b>' + stats.streak + ' 天</b></div>' +
      '</div>' +
      '<div class="progress"><i style="width:' + stats.percent + '%"></i></div>' +
      '<div class="task-hero-foot"><span>' + (stats.done === stats.total && stats.total ? '全部完成，今天太棒啦！' : '再完成 ' + (stats.total - stats.done) + ' 项就全部打卡') + '</span>' +
      '<span>今日 +' + stats.earned + ' 成长值</span></div>' +
      '</div></section>' +

      '<section class="reward-card">' +
      '<div class="reward-head"><b>连续打卡奖励</b><span class="pill pill-paper">' + YY.icon('gift', 12) + ' 明天第 ' + nextGoal + ' 天</span></div>' +
      '<div class="reward-slots">' + cells + '</div>' +
      '</section>' +

      '<section class="section">' +
      '<div class="section-head"><h2>今天的小任务</h2><span>' + stats.done + '/' + stats.total + ' 已完成</span></div>' +
      '<div class="task-list">' + taskHtml + '</div>' +
      '</section>' +

      '<div class="parent-tools">' +
      '<div class="left"><div class="ico">' + YY.icon('settings', 17) + '</div>' +
      '<div><b>家长小设置</b><p>换个组合，今天也有新鲜感</p></div></div>' +
      '<button class="btn btn-soft btn-sm" id="shuffleTasks">换个组合</button>' +
      '</div>' +

      '<p class="about-note">打卡状态会保存在这台设备上，明天打开还能看到连续天数</p>' +
      '</main>';
  }

  function bind() {
    var toggleBtns = document.querySelectorAll('[data-toggle]');
    toggleBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-toggle');
        var tasks = YY.store.tasksFor();
        var task = tasks.filter(function (t) { return t.id === id; })[0];
        if (!task) return;
        var result = YY.store.toggleTask(task);
        if (result.done) {
          YY.ui.toast('打卡成功，+' + task.value + ' 成长值 🌟');
        } else {
          YY.ui.toast('已取消这项打卡');
        }
        var stats = YY.store.todayStats();
        if (result.done && stats.done === stats.total && stats.total > 0) {
          setTimeout(function () {
            YY.ui.toast('今天的任务全部完成啦，连续 ' + Math.max(1, stats.streak) + ' 天 🎉');
          }, 250);
        }
        YY.router.refresh();
      });
    });

    var shuffle = document.getElementById('shuffleTasks');
    if (shuffle) {
      shuffle.addEventListener('click', function () {
        var stageId = YY.store.getStage();
        var len = YY.store.tasksFor().length || 1;
        rotation[stageId] = ((rotation[stageId] || 0) + 2) % len;
        YY.ui.toast('任务顺序换好啦');
        YY.router.refresh();
      });
    }
  }

  YY.Views.tasks = { render: render, bind: bind, title: '今日任务 · 芽芽成长' };
})();
