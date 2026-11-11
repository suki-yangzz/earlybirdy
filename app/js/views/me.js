/* 我的：阶段信息、成长统计、阶段切换、兑换记录、数据重置 */
(function () {
  'use strict';
  window.YY = window.YY || {};
  YY.Views = YY.Views || {};

  function render() {
    var stage = YY.store.stage();
    var stats = YY.store.todayStats();
    var coins = YY.store.coins();
    var total = YY.store.totalCompleted();
    var favs = YY.store.favCount();
    var orders = YY.store.orders();

    var stageList = YY.STAGE_ORDER.map(function (id) {
      var s = YY.STAGES[id];
      var on = id === stage.id;
      return '<button class="stage-item' + (on ? ' active' : '') + '" data-stage="' + id + '">' +
        '<span class="em">' + s.emoji + '</span>' +
        '<span class="txt"><b>' + YY.ui.esc(s.label) + '</b><p>' + YY.ui.esc(s.homeEntryTitle) + '</p></span>' +
        (on ? '<span class="check">' + YY.icon('check', 17) + '</span>' : YY.icon('chevronRight', 16)) +
        '</button>';
    }).join('');

    var orderList = orders.length ? orders.slice(0, 4).map(function (o) {
      var names = o.items.map(function (x) { return x.emoji + ' ' + x.title; }).join('、');
      return '<div class="order-item"><div style="min-width:0"><b>' + YY.ui.esc(names) + '</b>' +
        '<p>' + o.date + ' · ' + o.id + '</p></div><span>-' + o.total + '</span></div>';
    }).join('') : '<p style="font-size:11px;color:#A08876;line-height:1.7">还没有兑换记录，去商城用成长值换第一件小礼物吧。</p>';

    return '<header class="appbar">' +
      '<div style="flex:1;min-width:0"><h1 class="greeting-title" style="font-size:22px">我的</h1>' +
      '<p class="greeting-date" style="margin-top:3px">记录今天，也记录一点点长大</p></div>' +
      '<a class="icon-btn" href="#/shop" aria-label="去商城" style="color:#3FC1A0">' + YY.icon('gift', 20) + '</a>' +
      '</header>' +
      '<main class="scroll">' +

      '<section class="profile">' +
      '<div class="profile-bg dots" style="background:' + YY.ui.gradient(stage) + '"></div>' +
      '<div class="profile-body"><div class="avatar">' + stage.emoji + '</div>' +
      '<div style="flex:1;min-width:0"><div class="name">小芽妈妈</div>' +
      '<div class="meta">当前阶段：' + YY.ui.esc(stage.label) + ' · ' + YY.ui.esc(stage.homeEntryTitle) + '</div>' +
      '<div class="coins">' + YY.icon('star', 13) + ' ' + coins + ' 成长值</div>' +
      '</div></div></section>' +

      '<div class="stats-row">' +
      '<div class="stat"><b>' + stats.streak + '</b><span>连续打卡（天）</span></div>' +
      '<div class="stat"><b>' + total + '</b><span>累计完成任务</span></div>' +
      '<div class="stat"><b>' + favs + '</b><span>收藏内容</span></div>' +
      '</div>' +

      '<section class="me-card"><h2>宝宝阶段</h2><div>' + stageList + '</div></section>' +

      '<section class="me-card"><div class="row-between" style="margin-bottom:6px"><h2 style="margin:0">兑换记录</h2>' +
      '<a href="#/shop" style="font-size:10.5px;font-weight:800;color:#3FC1A0">去商城 ' + YY.icon('chevronRight', 12) + '</a></div>' +
      orderList + '</section>' +

      '<section class="me-card"><h2>今日概览</h2>' +
      '<div class="row-between" style="font-size:11.5px;color:#8A725F;padding:4px 0"><span>今日任务</span><b>' + stats.done + ' / ' + stats.total + ' 已完成</b></div>' +
      '<div class="progress thin" style="margin-top:4px"><i style="width:' + stats.percent + '%"></i></div>' +
      '<div class="row-between" style="font-size:11.5px;color:#8A725F;padding:8px 0 0"><span>当前阶段成长值</span><b>+' + stats.earned + '</b></div>' +
      '</section>' +

      '<button class="danger-btn" id="resetData">' + YY.icon('trash', 15) + ' 清空体验数据</button>' +
      '<p class="about-note">所有阶段、打卡、购物车与收藏数据都保存在本机浏览器（localStorage），换设备或清缓存会丢失。</p>' +
      '</main>';
  }

  function bind() {
    document.querySelectorAll('.stage-item[data-stage]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        YY.app.changeStage(btn.getAttribute('data-stage'));
      });
    });
    var reset = document.getElementById('resetData');
    if (reset) {
      reset.addEventListener('click', function () {
        YY.ui.confirm({
          icon: '🧹', title: '清空体验数据？', danger: true,
          text: '会清除所有阶段的打卡、连续天数、成长值、收藏和购物车，回到初始状态。此操作不可撤销。',
          okText: '确认清空',
          onOk: function () {
            YY.store.resetAll();
            YY.ui.applyStage(YY.store.stage());
            YY.ui.toast('已恢复到初始状态');
            location.hash = '#/home';
            YY.router.refresh();
          }
        });
      });
    }
  }

  YY.Views.me = { render: render, bind: bind, title: '我的 · 芽芽成长' };
})();
