/* 应用启动：初始主题、路由渲染、全局阶段切换入口 */
(function () {
  'use strict';

  function interactionRoutes() {
    return Object.keys(YY.INTERACTIONS).map(function (key) { return YY.INTERACTIONS[key].route; });
  }

  function changeStage(id) {
    if (!YY.STAGES[id]) return;
    if (id === YY.store.getStage()) {
      YY.ui.toast('当前已经是这个阶段啦');
      return;
    }
    YY.store.setStage(id);
    var stage = YY.store.stage();
    YY.ui.applyStage(stage);

    var current = YY.router.path();
    if (interactionRoutes().indexOf(current) !== -1) {
      var target = YY.INTERACTIONS[stage.interaction].route;
      if (target !== current) {
        YY.router.go(target);
      } else {
        YY.router.refresh();
      }
    } else {
      YY.router.refresh();
    }
    YY.ui.toast('已切换到 ' + stage.label);
  }

  function boot() {
    if (!location.hash) {
      try { history.replaceState(null, '', '#/home'); } catch (err) { location.hash = '#/home'; }
    }
    YY.ui.applyStage(YY.store.stage());
    YY.router.render();

    document.addEventListener('click', function (e) {
      var picker = e.target.closest('[data-stage-picker]');
      if (picker) {
        e.preventDefault();
        YY.ui.stagePicker();
      }
    });
  }

  YY.app = {
    changeStage: changeStage
  };

  boot();
})();
