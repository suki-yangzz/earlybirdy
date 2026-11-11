/* ============================================================
   媒体引擎：优先使用公开示例音/视频，资源不可用时自动降级为
   “静默演示进度”，保证播放器交互永不白屏、不卡死。
   ============================================================ */
(function () {
  'use strict';
  window.YY = window.YY || {};

  YY.createPlayer = function (opts) {
    opts = opts || {};
    var kind = opts.kind === 'video' ? 'video' : 'audio';
    var onFrame = opts.onFrame || function () {};
    var onEnd = opts.onEnd || function () {};
    var onMode = opts.onMode || function () {};
    var onState = opts.onState || function () {};

    var el = document.createElement(kind === 'video' ? 'video' : 'audio');
    el.className = 'video-el';
    el.preload = 'metadata';
    el.setAttribute('playsinline', '');
    el.setAttribute('webkit-playsinline', '');
    if (kind === 'video') el.setAttribute('disablepictureinpicture', '');
    el.controls = false;

    var mode = 'sim';
    var playing = false;
    var simTime = 0;
    var duration = Number(opts.duration) || 0;
    var src = '';
    var lastSim = Date.now();
    var failTimer = null;
    var gaveUp = false;
    var endedFlag = false;
    var destroyed = false;
    var lastRealTime = 0;
    var stalledTicks = 0;

    function emitFrame() { onFrame(currentTime(), duration, playing); }
    function currentTime() {
      if (mode === 'real') {
        var t = Number(el.currentTime) || 0;
        return t;
      }
      return simTime;
    }
    function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

    function setMode(next) {
      if (mode === next) return;
      mode = next;
      onMode(next, el);
    }

    function safePlay() {
      if (!src) return;
      try {
        var p = el.play();
        if (p && typeof p.catch === 'function') {
          p.catch(function () { /* 保持模拟进度，不打断交互 */ });
        }
      } catch (err) { /* 忽略 */ }
    }
    function safePause() {
      try { el.pause(); } catch (err) { /* 忽略 */ }
    }

    function finish() {
      if (endedFlag) return;
      endedFlag = true;
      playing = false;
      simTime = duration;
      if (mode === 'real') {
        try { el.pause(); } catch (err) {}
      }
      onState(false);
      emitFrame();
      onEnd();
    }

    var ticker = setInterval(function () {
      if (destroyed || !playing) return;
      if (mode === 'real') {
        if (el.ended) { finish(); return; }
        var rt = Number(el.currentTime) || 0;
        if (Math.abs(rt - lastRealTime) < 0.01) {
          stalledTicks += 1;
        } else {
          stalledTicks = 0;
        }
        lastRealTime = rt;
        /* 真实播放卡住（资源被拦截/网络无响应）：退回模拟进度，避免界面冻住 */
        if (stalledTicks >= 12) {
          simTime = rt;
          lastSim = Date.now();
          safePause();
          setMode('sim');
          emitFrame();
          return;
        }
        emitFrame();
        if (duration && el.currentTime >= duration - 0.06) finish();
      } else {
        var now = Date.now();
        var dt = Math.max(0, (now - lastSim) / 1000);
        lastSim = now;
        if (dt > 2) dt = 0.25;
        simTime = Math.min(duration, simTime + dt);
        emitFrame();
        if (simTime >= duration) finish();
      }
    }, 250);

    function onMeta() {
      var d = Number(el.duration);
      if (isFinite(d) && d > 0) {
        duration = d;
        emitFrame();
      }
    }

    function onReady() {
      if (destroyed || gaveUp || mode === 'real') return;
      var d = Number(el.duration);
      if (!isFinite(d) || d <= 0) return;
      duration = d;
      var wasSimTime = simTime;
      setMode('real');
      lastRealTime = Number(el.currentTime) || 0;
      stalledTicks = 0;
      try {
        var target = Math.min(wasSimTime, Math.max(0, d - 0.25));
        if (target > 0.3) el.currentTime = target;
      } catch (err) { /* 忽略 */ }
      if (playing) safePlay();
      emitFrame();
    }

    el.addEventListener('loadedmetadata', onMeta);
    el.addEventListener('loadeddata', onReady);
    el.addEventListener('canplay', onReady);
    el.addEventListener('timeupdate', function () { if (mode === 'real') emitFrame(); });
    el.addEventListener('playing', function () {
      if (!playing) { playing = true; onState(true); }
      if (mode === 'sim' && el.readyState >= 2) onReady();
    });
    el.addEventListener('waiting', function () { /* 缓冲时继续使用当前进度 */ });
    el.addEventListener('error', function () {
      if (destroyed) return;
      gaveUp = true;
      setMode('sim');
    });
    el.addEventListener('ended', function () {
      if (mode === 'real') finish();
    });

    var api = {
      el: el,
      kind: kind,
      load: function (nextSrc, fallbackDuration) {
        if (destroyed) return;
        playing = false;
        endedFlag = false;
        gaveUp = false;
        simTime = 0;
        lastRealTime = 0;
        stalledTicks = 0;
        duration = Number(fallbackDuration) || 0;
        src = nextSrc || '';
        setMode('sim');
        onState(false);
        if (failTimer) clearTimeout(failTimer);
        if (src) {
          try { el.src = src; el.load(); } catch (err) {}
          failTimer = setTimeout(function () {
            if (mode !== 'real') { gaveUp = true; setMode('sim'); }
          }, 8000);
        } else {
          gaveUp = true;
        }
        emitFrame();
      },
      play: function () {
        if (destroyed) return;
        if (playing) return;
        playing = true;
        endedFlag = false;
        lastSim = Date.now();
        lastRealTime = Number(el.currentTime) || 0;
        stalledTicks = 0;
        if (simTime >= duration && duration > 0) simTime = 0;
        onState(true);
        safePlay();
        emitFrame();
      },
      pause: function () {
        if (destroyed) return;
        playing = false;
        safePause();
        onState(false);
        emitFrame();
      },
      toggle: function () { if (playing) api.pause(); else api.play(); },
      seek: function (sec) {
        if (destroyed) return;
        var d = duration || Number(sec) || 0;
        var target = clamp(Number(sec) || 0, 0, d);
        simTime = target;
        endedFlag = false;
        if (mode === 'real' && el.readyState >= 1) {
          try { el.currentTime = Math.min(target, Math.max(0, (el.duration || d) - 0.05)); } catch (err) {}
        }
        emitFrame();
      },
      setLoopPoint: function () {},
      getTime: currentTime,
      getDuration: function () { return duration; },
      isPlaying: function () { return playing; },
      getMode: function () { return mode; },
      destroy: function () {
        destroyed = true;
        playing = false;
        safePause();
        clearInterval(ticker);
        if (failTimer) clearTimeout(failTimer);
        try {
          el.removeAttribute('src');
          el.load();
        } catch (err) {}
        if (el.parentNode) el.parentNode.removeChild(el);
      }
    };

    return api;
  };
})();
