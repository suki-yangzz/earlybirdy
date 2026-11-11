/* 音乐页：曲目列表、播放/暂停、进度、拖动、收藏、定时与单曲循环 */
(function () {
  'use strict';
  window.YY = window.YY || {};
  YY.Views = YY.Views || {};

  var view = { stageId: null, trackIndex: 0, loop: false, sleepMinutes: 0, sleepTimer: null, player: null };

  function tracksFor(stageId) { return YY.CONTENT.tracks[stageId] || []; }

  function render() {
    var stage = YY.store.stage();
    var stageId = stage.id;
    var tracks = tracksFor(stageId);

    if (!tracks.length) {
      return YY.ui.appbar({ back: '/home', title: stage.audioTitle, sub: '音频内容' }) +
        '<main class="scroll">' +
        YY.ui.emptyState('🎧', '这个阶段还没有音频内容', '先去首页看看今天专属的互动内容吧。',
          '<a class="btn btn-primary" href="#/home">回首页</a>') +
        '</main>';
    }

    if (view.stageId !== stageId) {
      view.stageId = stageId;
      view.trackIndex = 0;
      view.sleepMinutes = 0;
      view.loop = false;
    }
    if (view.trackIndex >= tracks.length) view.trackIndex = 0;
    var track = tracks[view.trackIndex];

    var listHtml = tracks.map(function (t, i) {
      return '<button class="song-item' + (i === view.trackIndex ? ' active' : '') + '" data-track="' + i + '">' +
        '<span class="song-ico">' + t.emoji + '</span>' +
        '<span class="txt"><b>' + YY.ui.esc(t.title) + '</b><span>' + YY.ui.esc(t.artist) + '</span></span>' +
        YY.icon(i === view.trackIndex ? 'pause' : 'play', 18) +
        '</button>';
    }).join('');

    return YY.ui.appbar({
      back: '/home',
      title: stage.audioTitle,
      sub: stage.audioSub,
      right: '<button class="icon-btn" id="openSleep" aria-label="定时关闭">' + YY.icon('timer', 20) + '</button>'
    }) +
      '<main class="scroll">' +
      '<div class="stage-tag-row" style="margin-bottom:8px">' +
      '<button class="stage-pill" data-stage-picker>' + stage.emoji + ' ' + YY.ui.esc(stage.label) + YY.icon('chevronDown', 13) + '</button>' +
      '<span class="meta">切换阶段，听听别的</span></div>' +
      '<div class="mini-note"><span class="em">' + stage.emoji + '</span><span>' + YY.ui.esc(stage.audioNote) + '</span></div>' +

      '<section class="player" id="player">' +
      '<div class="player-bg dots" style="background:' + YY.ui.gradient(stage) + '"></div>' +
      '<div class="player-body">' +
      '<div class="player-top"><span class="tag">' + YY.ui.esc(stage.audioTagline) + '</span>' +
      '<span id="modeFlag" style="display:none">静默演示</span>' +
      '<span>' + YY.ui.esc(stage.audioSuitable) + '</span></div>' +
      '<div class="vinyl-wrap"><div class="vinyl-ring"><div class="vinyl" style="background:' + stage.theme.accentInk + '">' +
      '<div class="disc-center" style="background:' + YY.ui.gradient(stage) + '"><span id="discEmoji">' + track.emoji + '</span></div>' +
      '</div></div></div>' +
      '<div class="song-now"><h2 id="trackTitle">' + YY.ui.esc(track.title) + '</h2><p id="trackArtist">' + YY.ui.esc(track.artist) + '</p></div>' +
      '<div class="seek" id="seekBar"><div class="seek-track"></div><div class="seek-fill" id="seekFill"></div><div class="seek-dot" id="seekDot"></div></div>' +
      '<div class="seek-time"><span id="timeNow">00:00</span><span id="timeTotal">' + YY.ui.fmtTime(track.sec) + '</span></div>' +
      '<div class="waves">' +
      '<span class="wave" style="--i:0"></span><span class="wave" style="--i:1"></span><span class="wave" style="--i:2"></span>' +
      '<span class="wave" style="--i:3"></span><span class="wave" style="--i:4"></span><span class="wave" style="--i:5"></span>' +
      '</div>' +
      '<div class="player-controls">' +
      '<button class="pc-round" id="favBtn" aria-label="收藏">' + YY.icon('heart', 19) + '</button>' +
      '<button class="pc-round big" id="prevBtn" aria-label="上一首">' + YY.icon('skipBack', 20) + '</button>' +
      '<button class="pc-play" id="playBtn" aria-label="播放">' + YY.icon('play', 24) + '</button>' +
      '<button class="pc-round big" id="nextBtn" aria-label="下一首">' + YY.icon('skipForward', 20) + '</button>' +
      '<button class="pc-round" id="sleepBtn" aria-label="定时">' + YY.icon('timer', 19) + '</button>' +
      '</div>' +
      '</div></section>' +

      '<section class="section">' +
      '<div class="section-head"><h2>全部曲目</h2><span>' + tracks.length + ' 首 · 点一下切换</span></div>' +
      '<div class="song-list">' + listHtml + '</div>' +
      '</section>' +

      '<div class="parent-tip">' + YY.icon('info', 15) + '<span>' + YY.ui.esc(stage.audioTip) + '</span></div>' +
      '<p class="demo-note">音源为公开示例音频（SoundHelix），仅用于演示播放器交互；资源不可用时自动切换为静默演示，进度、收藏和定时依然可用。</p>' +
      '</main>';
  }

  function updateFrame(time, duration, playing) {
    var pct = duration ? Math.min(100, Math.max(0, time / duration * 100)) : 0;
    var fill = document.getElementById('seekFill');
    var dot = document.getElementById('seekDot');
    var now = document.getElementById('timeNow');
    var total = document.getElementById('timeTotal');
    if (fill) fill.style.width = pct + '%';
    if (dot) dot.style.left = pct + '%';
    if (now) now.textContent = YY.ui.fmtTime(time);
    if (total) total.textContent = YY.ui.fmtTime(duration);
    void playing;
  }

  function updateState(playing) {
    var player = document.getElementById('player');
    var playBtn = document.getElementById('playBtn');
    var flag = document.getElementById('modeFlag');
    if (player) player.classList.toggle('playing', playing);
    if (playBtn) playBtn.innerHTML = YY.icon(playing ? 'pause' : 'play', 24);
    if (flag) {
      var sim = view.player && view.player.getMode() === 'sim';
      flag.style.display = (playing && sim) ? 'inline' : 'none';
    }
  }

  function paintTrack() {
    var stage = YY.store.stage();
    var tracks = tracksFor(stage.id);
    var track = tracks[view.trackIndex];
    if (!track) return;
    var title = document.getElementById('trackTitle');
    var artist = document.getElementById('trackArtist');
    var disc = document.getElementById('discEmoji');
    if (title) title.textContent = track.title;
    if (artist) artist.textContent = track.artist;
    if (disc) disc.textContent = track.emoji;
    document.querySelectorAll('[data-track]').forEach(function (btn, i) {
      var active = i === view.trackIndex;
      btn.classList.toggle('active', active);
      var ic = btn.querySelector('.ic');
      if (ic) ic.outerHTML = YY.icon(active && view.player && view.player.isPlaying() ? 'pause' : 'play', 18);
    });
    updateFav();
  }

  function updateFav() {
    var stage = YY.store.stage();
    var track = tracksFor(stage.id)[view.trackIndex];
    var btn = document.getElementById('favBtn');
    if (!btn || !track) return;
    btn.classList.toggle('on', YY.store.isFav('audio', track.id));
  }

  function selectTrack(index, autoplay) {
    var stage = YY.store.stage();
    var tracks = tracksFor(stage.id);
    view.trackIndex = (index + tracks.length) % tracks.length;
    var track = tracks[view.trackIndex];
    paintTrack();
    if (view.player) {
      view.player.load(track.src, track.sec);
      if (autoplay) view.player.play();
    }
    updateState(!!autoplay);
  }

  function openSleepSheet() {
    var options = [0, 15, 30, 60];
    var labels = { 0: '关闭', 15: '15 分钟', 30: '30 分钟', 60: '60 分钟' };
    var html = '<div class="sheet-head"><div><h3>定时与循环</h3><p>哄睡时定时关闭，不吵到宝宝</p></div>' +
      '<button class="icon-btn" data-close aria-label="关闭">' + YY.icon('x', 16) + '</button></div>' +
      '<div class="option-grid" id="sleepOptions">' +
      options.map(function (m) {
        return '<button class="option' + (view.sleepMinutes === m ? ' on' : '') + '" data-min="' + m + '">' + labels[m] + '</button>';
      }).join('') + '</div>' +
      '<div class="toggle-row"><div class="t"><b>单曲循环</b><p>一首听到底，自动重新开始</p></div>' +
      '<button class="switch' + (view.loop ? ' on' : '') + '" id="loopToggle" aria-label="单曲循环"></button></div>' +
      '<p class="sheet-hint">定时只在本页面生效，离开页面会自动取消</p>';
    var sheet = YY.ui.openSheet(html);
    sheet.querySelectorAll('[data-min]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var mins = Number(btn.getAttribute('data-min'));
        view.sleepMinutes = mins;
        if (view.sleepTimer) { clearTimeout(view.sleepTimer); view.sleepTimer = null; }
        if (mins > 0) {
          view.sleepTimer = setTimeout(function () {
            if (view.player) view.player.pause();
            view.sleepMinutes = 0;
            view.sleepTimer = null;
            YY.ui.toast('定时到啦，音乐已暂停 🌙');
            var sleepBtn = document.getElementById('sleepBtn');
            if (sleepBtn) sleepBtn.classList.remove('on');
          }, mins * 60 * 1000);
          YY.ui.toast('已设置 ' + mins + ' 分钟后自动暂停');
        } else {
          YY.ui.toast('已关闭定时');
        }
        var sleepBtn = document.getElementById('sleepBtn');
        if (sleepBtn) sleepBtn.classList.toggle('on', mins > 0);
        YY.ui.closeSheet(sheet);
      });
    });
    var loopBtn = sheet.querySelector('#loopToggle');
    if (loopBtn) {
      loopBtn.addEventListener('click', function () {
        view.loop = !view.loop;
        loopBtn.classList.toggle('on', view.loop);
      });
    }
  }

  function bind() {
    var stage = YY.store.stage();
    var tracks = tracksFor(stage.id);
    if (!tracks.length) return null;
    var track = tracks[view.trackIndex];

    var player = YY.createPlayer({
      kind: 'audio',
      duration: track.sec,
      onFrame: updateFrame,
      onState: updateState,
      onMode: function () { updateState(view.player ? view.player.isPlaying() : false); },
      onEnd: function () {
        if (view.loop) {
          view.player.seek(0);
          view.player.play();
        } else {
          selectTrack(view.trackIndex + 1, true);
        }
      }
    });
    view.player = player;
    var playerRoot = document.getElementById('player');
    if (playerRoot) {
      var mount = document.createElement('div');
      mount.style.display = 'none';
      mount.id = 'mediaMount';
      playerRoot.appendChild(mount);
      mount.appendChild(player.el);
    }
    player.load(track.src, track.sec);

    var playBtn = document.getElementById('playBtn');
    if (playBtn) {
      playBtn.addEventListener('click', function () {
        player.toggle();
        updateState(player.isPlaying());
      });
    }
    var prevBtn = document.getElementById('prevBtn');
    if (prevBtn) prevBtn.addEventListener('click', function () { selectTrack(view.trackIndex - 1, true); });
    var nextBtn = document.getElementById('nextBtn');
    if (nextBtn) nextBtn.addEventListener('click', function () { selectTrack(view.trackIndex + 1, true); });

    var favBtn = document.getElementById('favBtn');
    if (favBtn) {
      favBtn.addEventListener('click', function () {
        var on = YY.store.toggleFav('audio', track.id);
        favBtn.classList.toggle('on', on);
        YY.ui.toast(on ? '已收藏这首曲子 ♥' : '已取消收藏');
      });
    }

    var sleepBtn = document.getElementById('sleepBtn');
    if (sleepBtn) sleepBtn.addEventListener('click', openSleepSheet);
    var topTimer = document.getElementById('openSleep');
    if (topTimer) topTimer.addEventListener('click', openSleepSheet);

    var seek = document.getElementById('seekBar');
    if (seek) {
      function doSeek(e) {
        var rect = seek.getBoundingClientRect();
        var ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        player.seek(ratio * player.getDuration());
      }
      seek.addEventListener('pointerdown', function (e) {
        seek.setPointerCapture && seek.setPointerCapture(e.pointerId);
        doSeek(e);
      });
      seek.addEventListener('pointermove', function (e) {
        if (e.buttons) doSeek(e);
      });
    }

    document.querySelectorAll('[data-track]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = Number(btn.getAttribute('data-track'));
        if (idx === view.trackIndex) {
          player.toggle();
          updateState(player.isPlaying());
          paintTrack();
          return;
        }
        selectTrack(idx, true);
      });
    });

    updateFav();
    updateFrame(0, track.sec, false);
    updateState(false);

    var cleanup = function () {
      if (view.sleepTimer) { clearTimeout(view.sleepTimer); view.sleepTimer = null; }
      view.sleepMinutes = 0;
      if (view.player) {
        view.player.destroy();
        view.player = null;
      }
    };
    return cleanup;
  }

  YY.Views.music = { render: render, bind: bind, title: '音乐 · 芽芽成长' };
})();
