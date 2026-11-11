/* ============================================================
   共享 UI：主题、AppBar、底部导航、Toast、底部弹层、阶段切换
   ============================================================ */
(function () {
  'use strict';
  window.YY = window.YY || {};

  var WEEK = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function fmtTime(sec) {
    sec = Math.max(0, Math.floor(Number(sec) || 0));
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return pad(m) + ':' + pad(s);
  }

  function dateText(d) {
    var x = d || new Date();
    return x.getFullYear() + '年' + (x.getMonth() + 1) + '月' + x.getDate() + '日 · ' + WEEK[x.getDay()];
  }

  function greeting() {
    var h = new Date().getHours();
    if (h < 6) return '夜深啦，小芽妈妈 🌙';
    if (h < 11) return '早上好呀，小芽妈妈 🌱';
    if (h < 14) return '中午好呀，小芽妈妈 ☀️';
    if (h < 18) return '下午好呀，小芽妈妈 🍃';
    return '晚上好呀，小芽妈妈 🌙';
  }

  function applyStage(stage) {
    var app = document.getElementById('app');
    if (!app || !stage) return;
    var t = stage.theme;
    app.dataset.stage = stage.id;
    app.style.setProperty('--accent', t.accent);
    app.style.setProperty('--accent-ink', t.accentInk);
    app.style.setProperty('--accent-soft', t.soft);
    app.style.setProperty('--page-bg', t.page);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t.page);
  }

  function gradient(stage, angle) {
    var g = (stage && stage.theme && stage.theme.gradient) || ['#FFB347', '#FF8A6A', '#FF6B4A'];
    return 'linear-gradient(' + (angle || 135) + 'deg,' + g.join(',') + ')';
  }

  function routeFor(target) {
    if (!target) return '/home';
    if (target.charAt && target.charAt(0) === '/') return target;
    if (YY.INTERACTIONS[target]) return YY.INTERACTIONS[target].route;
    if (target === 'tasks' || target === 'shop' || target === 'me' || target === 'cart' || target === 'home') return '/' + target;
    return '/home';
  }

  function appbar(opts) {
    opts = opts || {};
    var left = opts.left;
    if (!left) {
      left = opts.back
        ? '<a class="icon-btn" href="#' + opts.back + '" aria-label="返回">' + YY.icon('arrowLeft', 18) + '</a>'
        : '<div class="appbar-side"></div>';
    }
    var right = opts.right || '<div class="appbar-side"></div>';
    var title = '<div class="appbar-title"><h1>' + esc(opts.title || '') + '</h1>' +
      (opts.sub ? '<p>' + esc(opts.sub) + '</p>' : '') + '</div>';
    return '<header class="appbar">' + left + title + right + '</header>';
  }

  function tabbar(current) {
    var stage = YY.store.stage();
    var inter = YY.INTERACTIONS[stage.interaction] || YY.INTERACTIONS.flashcards;
    var cartN = YY.store.cartCount();
    var items = [
      { route: '/home', label: '首页', icon: 'home' },
      { route: '/tasks', label: '任务', icon: 'tasks' },
      { route: '/shop', label: '商城', icon: 'shop', badge: cartN },
      { route: inter.route, label: inter.navLabel, icon: inter.icon },
      { route: '/me', label: '我的', icon: 'user' }
    ];
    function active(route) {
      if (route === '/shop') return current === '/shop' || current === '/cart' || current.indexOf('/shop/') === 0;
      if (route === '/home') return current === '/home' || current === '/';
      return current === route;
    }
    var html = items.map(function (it) {
      var on = active(it.route);
      return '<a class="tab' + (on ? ' active' : '') + '" href="#' + it.route + '">' +
        (it.badge ? '<span class="tab-badge">' + (it.badge > 99 ? '99+' : it.badge) + '</span>' : '') +
        YY.icon(it.icon, 23) +
        '<span>' + esc(it.label) + '</span></a>';
    }).join('');
    return '<nav class="tabbar"><div class="tabbar-inner">' + html + '</div></nav>';
  }

  var toastTimer = null;
  function toast(msg) {
    var app = document.getElementById('app');
    if (!app) return;
    var el = app.querySelector('.toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast';
      app.appendChild(el);
    }
    el.textContent = msg;
    requestAnimationFrame(function () { el.classList.add('show'); });
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 1900);
  }

  function openSheet(html, opts) {
    opts = opts || {};
    var app = document.getElementById('app');
    var overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.innerHTML =
      '<div class="overlay-mask" data-close="1"></div>' +
      '<div class="sheet" role="dialog" aria-modal="true">' +
      '<div class="sheet-handle"></div>' + html + '</div>';
    app.appendChild(overlay);
    requestAnimationFrame(function () { overlay.classList.add('show'); });

    function close() {
      overlay.classList.remove('show');
      setTimeout(function () {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        if (typeof opts.onClose === 'function') opts.onClose();
      }, 260);
    }
    overlay.querySelectorAll('[data-close]').forEach(function (el) {
      el.addEventListener('click', close);
    });
    overlay._close = close;
    overlay._sheet = overlay.querySelector('.sheet');
    return overlay;
  }

  function closeSheet(overlay) {
    if (overlay && typeof overlay._close === 'function') overlay._close();
  }

  function confirmDialog(opts) {
    opts = opts || {};
    var app = document.getElementById('app');
    var overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.innerHTML =
      '<div class="overlay-mask"></div>' +
      '<div class="dialog-wrap"><div class="dialog" role="dialog" aria-modal="true">' +
      (opts.icon ? '<span class="em">' + opts.icon + '</span>' : '') +
      '<h3>' + esc(opts.title || '确认操作') + '</h3>' +
      (opts.text ? '<p>' + esc(opts.text) + '</p>' : '') +
      '<div class="actions">' +
      '<button class="btn btn-ghost" data-cancel>' + esc(opts.cancelText || '再想想') + '</button>' +
      '<button class="btn ' + (opts.danger ? 'btn-primary' : 'btn-primary') + '" data-ok style="' +
      (opts.danger ? 'background:#E0524A;box-shadow:none;' : '') + '">' + esc(opts.okText || '确定') + '</button>' +
      '</div></div></div>';
    app.appendChild(overlay);
    requestAnimationFrame(function () { overlay.classList.add('show'); });
    function close(cb) {
      overlay.classList.remove('show');
      setTimeout(function () {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        if (cb) cb();
      }, 240);
    }
    overlay.querySelector('[data-cancel]').addEventListener('click', function () { close(); });
    overlay.querySelector('.overlay-mask').addEventListener('click', function () { close(); });
    overlay.querySelector('[data-ok]').addEventListener('click', function () {
      close(function () { if (typeof opts.onOk === 'function') opts.onOk(); });
    });
    return overlay;
  }

  function openStagePicker() {
    var current = YY.store.stage();
    var html = '<div class="sheet-head"><div><h3>选择宝宝阶段</h3><p>切换后首页、内容、任务一起变</p></div>' +
      '<button class="icon-btn" data-close aria-label="关闭">' + YY.icon('x', 16) + '</button></div>' +
      '<div class="stage-sheet-list">' +
      YY.STAGE_ORDER.map(function (id) {
        var s = YY.STAGES[id];
        var on = id === current.id;
        return '<button class="stage-sheet-item' + (on ? ' active' : '') + '" data-stage="' + id + '">' +
          '<span class="em">' + s.emoji + '</span>' +
          '<span class="txt"><b>' + esc(s.label) + '</b><p>' + esc(s.note.replace(/^当前阶段：/, '')) + '</p></span>' +
          (on ? YY.icon('check', 18) : YY.icon('chevronRight', 18)) +
          '</button>';
      }).join('') + '</div><p class="sheet-hint">每个阶段都有自己的主题色、内容模块和互动方式</p>';
    var sheet = openSheet(html);
    sheet.querySelectorAll('.stage-sheet-item').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-stage');
        if (id === current.id) { closeSheet(sheet); return; }
        closeSheet(sheet);
        if (YY.app && typeof YY.app.changeStage === 'function') YY.app.changeStage(id);
      });
    });
    return sheet;
  }

  function emptyState(iconEmoji, title, text, actionHtml) {
    return '<div class="empty"><span class="em">' + (iconEmoji || '🌱') + '</span>' +
      '<p><b>' + esc(title || '这里还空空的') + '</b></p>' +
      (text ? '<p class="muted" style="font-size:11px;margin-top:4px;">' + esc(text) + '</p>' : '') +
      (actionHtml || '') + '</div>';
  }

  YY.ui = {
    esc: esc,
    fmtTime: fmtTime,
    dateText: dateText,
    greeting: greeting,
    applyStage: applyStage,
    gradient: gradient,
    routeFor: routeFor,
    appbar: appbar,
    tabbar: tabbar,
    toast: toast,
    openSheet: openSheet,
    closeSheet: closeSheet,
    confirm: confirmDialog,
    stagePicker: openStagePicker,
    emptyState: emptyState,
    pad: pad
  };
})();
