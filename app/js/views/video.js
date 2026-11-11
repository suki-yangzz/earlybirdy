/* 视频页：剧集列表、播放入口、进度、章节跳转、小问答、收藏 */
(function () {
  'use strict';
  window.YY = window.YY || {};
  YY.Views = YY.Views || {};

  var view = { stageId: null, epIndex: 0, player: null, sceneIndex: -1 };

  function videosFor(stageId) { return YY.CONTENT.videos[stageId] || []; }

  function render() {
    var stage = YY.store.stage();
    var stageId = stage.id;
    var videos = videosFor(stageId);

    if (!videos.length) {
      return YY.ui.appbar({ back: '/home', title: stage.videoTitle, sub: '这个阶段暂时没有动画' }) +
        '<main class="scroll">' +
        YY.ui.emptyState('🎬', '这个阶段还没有视频内容', '去首页看看今天专属的互动内容吧。',
          '<a class="btn btn-primary" href="#/home">回首页</a>') +
        '</main>';
    }

    if (view.stageId !== stageId) {
      view.stageId = stageId;
      view.epIndex = 0;
    }
    if (view.epIndex >= videos.length) view.epIndex = 0;
    var ep = videos[view.epIndex];
    var fav = YY.store.isFav('video', ep.id);

    var episodes = videos.map(function (v, i) {
      return '<button class="ep-item' + (i === view.epIndex ? ' active' : '') + '" data-ep="' + i + '">' +
        '<span class="ep-art">' + v.emoji + '</span>' +
        '<span class="txt"><b>' + YY.ui.esc(v.title) + '</b><span>第 ' + (i + 1) + ' 集 · 约 ' + Math.round(v.sec / 60) + ' 分钟 · +' + v.value + ' 成长值</span></span>' +
        YY.icon(i === view.epIndex ? 'play' : 'chevronRight', 18) +
        '</button>';
    }).join('');

    var scenes = (ep.scenes || []).map(function (s, i) {
      return '<button class="chip flat' + (i === 0 ? ' active' : '') + '" data-scene="' + i + '">' + s.emoji + ' ' + YY.ui.esc(s.line) + '</button>';
    }).join('');

    var quiz = ep.quiz ? '<section class="quiz-card" id="quizCard">' +
      '<div class="quiz-head"><b>看完小问答</b><span>选一选，看看记住了吗</span></div>' +
      '<div class="quiz-q">' + YY.ui.esc(ep.quiz.q) + '</div>' +
      '<div class="quiz-opts">' + ep.quiz.options.map(function (opt, i) {
        return '<button class="quiz-opt" data-opt="' + i + '">' + YY.ui.esc(opt) + '</button>';
      }).join('') + '</div>' +
      '<div class="quiz-result" id="quizResult" style="display:none"></div>' +
      '</section>' : '<div class="parent-tip">' + YY.icon('info', 15) + '<span>看完后可以问问宝宝：“刚才看到了什么？” 让孩子用自己的话讲一遍，比只看更有收获。</span></div>';

    return YY.ui.appbar({
      back: '/home',
      title: stage.videoTitle,
      sub: stage.videoSub,
      right: '<button class="icon-btn' + (fav ? ' on' : '') + '" id="favVideo" style="color:' + (fav ? '#FF6B4A' : stage.theme.accent) + '" aria-label="收藏">' +
        YY.icon('bookmark', 19) + '</button>'
    }) +
      '<main class="scroll">' +
      '<div class="stage-tag-row" style="margin-bottom:8px">' +
      '<button class="stage-pill" data-stage-picker>' + stage.emoji + ' ' + YY.ui.esc(stage.label) + YY.icon('chevronDown', 13) + '</button>' +
      '<span class="meta">切换阶段，换一组动画</span></div>' +
      '<div class="mini-note"><span class="em">' + stage.emoji + '</span><span>' + YY.ui.esc(stage.videoNote || '今天看动画时，记得每 20 分钟让孩子望望远处。') + '</span></div>' +

      '<section class="video-stage paused" id="videoStage">' +
      '<div class="scene-fallback">' +
      '<span class="cloud one"></span><span class="cloud two"></span><span class="cloud three"></span>' +
      '<span class="scene-sun">☀️</span>' +
      '<div class="scene-art"><span class="scene-emoji" id="sceneEmoji">' + ep.emoji + '</span>' +
      '<span class="scene-line" id="sceneLine">' + YY.ui.esc(ep.line || '') + '</span></div>' +
      '<div class="scene-grass"></div>' +
      '</div>' +
      '<span class="video-mode-tip" id="videoFlag" style="display:none">静默演示</span>' +
      '<div class="video-controls">' +
      '<div class="seek" id="videoSeek" style="margin-top:0"><div class="seek-track"></div><div class="seek-fill" id="videoFill"></div></div>' +
      '<div class="vc-row"><span class="vc-time"><span id="videoNow">00:00</span> / <span id="videoTotal">' + YY.ui.fmtTime(ep.sec) + '</span></span>' +
      '<div class="vc-btns">' +
      '<button class="vc-small" id="rewindBtn" aria-label="后退 10 秒">' + YY.icon('rewind', 15) + '</button>' +
      '<button class="vc-play" id="videoPlay" aria-label="播放">' + YY.icon('play', 20) + '</button>' +
      '<button class="vc-small" id="forwardBtn" aria-label="前进 10 秒">' + YY.icon('forward', 15) + '</button>' +
      '<span class="vc-eye">护眼中</span>' +
      '</div></div></div>' +
      '</section>' +

      '<div class="video-title-row"><div><h1>' + YY.ui.esc(ep.title) + '</h1>' +
      '<p>第 ' + (view.epIndex + 1) + ' 集 · 共 ' + videos.length + ' 集 · 适合 ' + YY.ui.esc(stage.label) + '</p></div>' +
      '<span class="pill pill-mint">+' + ep.value + ' 成长值</span></div>' +

      quiz +

      '<section class="section"><div class="section-head"><h2>故事章节</h2><span>点一下跳过去</span></div>' +
      '<div class="scene-row">' + scenes + '</div></section>' +

      '<section class="section"><div class="section-head"><h2>更多剧集</h2><span>' + videos.length + ' 集</span></div>' +
      '<div class="ep-row">' + episodes + '</div></section>' +

      '<div class="eye-note">' + YY.icon('eye', 15) + '<span>看完一集记得看看远处，屏幕离眼睛 30 厘米以上；每天看动画不超过 30 分钟。</span></div>' +
      '<p class="demo-note">视频源为 W3C 公开示例媒体（Big Buck Bunny 预告片），仅用于演示播放入口与进度；资源不可用时自动切换为动画演示，播放控件依然可用。</p>' +
      '</main>';
  }

  function updateFrame(time, duration, playing) {
    var fill = document.getElementById('videoFill');
    var now = document.getElementById('videoNow');
    var total = document.getElementById('videoTotal');
    var pct = duration ? Math.min(100, Math.max(0, time / duration * 100)) : 0;
    if (fill) fill.style.width = pct + '%';
    if (now) now.textContent = YY.ui.fmtTime(time);
    if (total) total.textContent = YY.ui.fmtTime(duration);
    void playing;
  }

  function updateScene(time, duration) {
    var stage = YY.store.stage();
    var videos = videosFor(stage.id);
    var ep = videos[view.epIndex];
    if (!ep || !ep.scenes || !ep.scenes.length) return;
    var ratio = duration ? time / duration : 0;
    var idx = Math.min(ep.scenes.length - 1, Math.max(0, Math.floor(ratio * ep.scenes.length)));
    if (idx === view.sceneIndex) return;
    view.sceneIndex = idx;
    var emoji = document.getElementById('sceneEmoji');
    var line = document.getElementById('sceneLine');
    if (emoji) emoji.textContent = ep.scenes[idx].emoji;
    if (line) line.textContent = ep.scenes[idx].line;
    document.querySelectorAll('[data-scene]').forEach(function (btn, i) {
      btn.classList.toggle('active', i === idx);
    });
  }

  function updateState(playing) {
    var stageEl = document.getElementById('videoStage');
    var btn = document.getElementById('videoPlay');
    var flag = document.getElementById('videoFlag');
    if (stageEl) stageEl.classList.toggle('paused', !playing);
    if (btn) btn.innerHTML = YY.icon(playing ? 'pause' : 'play', 20);
    if (flag) {
      var sim = view.player && view.player.getMode() === 'sim';
      flag.style.display = (playing && sim) ? 'inline' : 'none';
    }
  }

  function bind() {
    var stage = YY.store.stage();
    var videos = videosFor(stage.id);
    if (!videos.length) return null;
    var ep = videos[view.epIndex];
    view.sceneIndex = -1;

    var stageEl = document.getElementById('videoStage');
    var player = YY.createPlayer({
      kind: 'video',
      duration: ep.sec,
      onFrame: function (time, duration, playing) {
        updateFrame(time, duration, playing);
        updateScene(time, duration);
        if (playing && player.getMode() === 'real') {
          var flag = document.getElementById('videoFlag');
          if (flag) flag.style.display = 'none';
        }
        void playing;
      },
      onState: updateState,
      onMode: function (mode) {
        if (stageEl) stageEl.classList.toggle('real', mode === 'real');
        updateState(player.isPlaying());
      },
      onEnd: function () {
        updateState(false);
        YY.ui.toast('这一集看完啦，可以换下一集 📺');
      }
    });
    view.player = player;
    if (stageEl) {
      var controls = stageEl.querySelector('.video-controls');
      if (controls) stageEl.insertBefore(player.el, controls);
      else stageEl.appendChild(player.el);
    }
    player.load(ep.src, ep.sec);

    var playBtn = document.getElementById('videoPlay');
    if (playBtn) {
      playBtn.addEventListener('click', function () {
        player.toggle();
        updateState(player.isPlaying());
      });
    }
    var rewind = document.getElementById('rewindBtn');
    if (rewind) rewind.addEventListener('click', function () {
      player.seek(Math.max(0, player.getTime() - 10));
    });
    var forward = document.getElementById('forwardBtn');
    if (forward) forward.addEventListener('click', function () {
      player.seek(Math.min(player.getDuration(), player.getTime() + 10));
    });

    var seek = document.getElementById('videoSeek');
    if (seek) {
      function doSeek(e) {
        var rect = seek.getBoundingClientRect();
        var ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        player.seek(ratio * player.getDuration());
        updateScene(ratio * player.getDuration(), player.getDuration());
      }
      seek.addEventListener('pointerdown', function (e) {
        seek.setPointerCapture && seek.setPointerCapture(e.pointerId);
        doSeek(e);
      });
      seek.addEventListener('pointermove', function (e) { if (e.buttons) doSeek(e); });
    }

    document.querySelectorAll('[data-scene]').forEach(function (btn, i) {
      btn.addEventListener('click', function () {
        var d = player.getDuration() || ep.sec;
        var target = Math.min(d - 0.2, d * i / (ep.scenes.length || 1) + 0.05);
        player.seek(target);
        updateScene(target, d);
        if (!player.isPlaying()) player.play();
        updateState(true);
      });
    });

    document.querySelectorAll('[data-ep]').forEach(function (btn, i) {
      btn.addEventListener('click', function () {
        if (i === view.epIndex) {
          player.toggle();
          updateState(player.isPlaying());
          return;
        }
        view.epIndex = i;
        view.sceneIndex = -1;
        YY.router.refresh();
      });
    });

    var favBtn = document.getElementById('favVideo');
    if (favBtn) {
      favBtn.addEventListener('click', function () {
        var on = YY.store.toggleFav('video', ep.id);
        favBtn.style.color = on ? '#FF6B4A' : stage.theme.accent;
        YY.ui.toast(on ? '已收藏这一集 ♥' : '已取消收藏');
      });
    }

    var quizCard = document.getElementById('quizCard');
    if (quizCard && ep.quiz) {
      var answered = false;
      quizCard.querySelectorAll('[data-opt]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          if (answered) return;
          answered = true;
          var pick = Number(btn.getAttribute('data-opt'));
          var right = pick === ep.quiz.answer;
          btn.classList.add(right ? 'right' : 'wrong');
          if (!right) {
            var rightBtn = quizCard.querySelector('[data-opt="' + ep.quiz.answer + '"]');
            if (rightBtn) rightBtn.classList.add('right');
          }
          var result = document.getElementById('quizResult');
          if (result) {
            result.style.display = 'block';
            result.textContent = right ? '答对啦，看得真认真 🌟' : '没关系，再看一遍就记住啦';
          }
        });
      });
    }

    updateFrame(0, ep.sec, false);
    updateState(false);
    if (stageEl) stageEl.classList.add('paused');

    return function () {
      if (view.player) {
        view.player.destroy();
        view.player = null;
      }
    };
  }

  YY.Views.video = { render: render, bind: bind, title: '视频 · 芽芽成长' };
})();
