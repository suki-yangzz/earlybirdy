/* 哈希路由：单入口、无刷新、移动端友好 */
(function () {
  'use strict';
  window.YY = window.YY || {};

  var cleanup = null;

  function path() {
    var raw = location.hash.replace(/^#/, '');
    if (!raw) raw = '/home';
    if (raw.charAt(0) !== '/') raw = '/' + raw;
    return raw;
  }

  function resolve(p) {
    if (p === '/home' || p === '/') return { view: YY.Views.home, params: {} };
    if (p === '/tasks') return { view: YY.Views.tasks, params: {} };
    if (p === '/me') return { view: YY.Views.me, params: {} };
    if (p === '/cart') return { view: YY.Views.cart, params: {} };
    if (p === '/shop') return { view: YY.Views.shop, params: {} };
    if (p === '/music') return { view: YY.Views.music, params: {} };
    if (p === '/cards') return { view: YY.Views.cards, params: {} };
    if (p === '/video') return { view: YY.Views.video, params: {} };
    if (p.indexOf('/shop/') === 0) {
      var id = p.split('/')[2];
      if (/^\d+$/.test(id)) return { view: YY.Views.product, params: { id: id } };
    }
    return null;
  }

  function clearOverlays() {
    document.querySelectorAll('#app > .overlay').forEach(function (el) {
      if (el.parentNode) el.parentNode.removeChild(el);
    });
  }

  function replaceHash(p) {
    try { history.replaceState(null, '', '#' + p); } catch (err) { location.hash = '#' + p; }
  }

  function render() {
    if (cleanup) {
      try { cleanup(); } catch (err) {}
      cleanup = null;
    }
    clearOverlays();

    var p = path();
    var match = resolve(p);
    if (!match) {
      replaceHash('/home');
      match = resolve('/home');
      p = '/home';
    }

    var screen = document.getElementById('screen');
    if (!screen) return;
    var stage = YY.store.stage();
    YY.ui.applyStage(stage);

    screen.innerHTML = match.view.render(match.params) + YY.ui.tabbar(p);
    cleanup = match.view.bind(match.params) || null;
    document.title = match.view.title || '芽芽成长 · 早教内容';

    var scroller = screen.querySelector('.scroll');
    if (scroller) scroller.scrollTop = 0;
  }

  function refresh() { render(); }

  function go(p) {
    if (!p) return;
    if (('#' + p) === location.hash) { render(); return; }
    location.hash = '#' + p;
  }

  window.addEventListener('hashchange', render);

  YY.router = {
    path: path,
    resolve: resolve,
    render: render,
    refresh: refresh,
    go: go
  };
})();
