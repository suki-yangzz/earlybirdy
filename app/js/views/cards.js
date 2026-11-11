/* 卡片页：阶段卡组、左右翻页 / 滑动、翻转揭晓、发音、学习进度 */
(function () {
  'use strict';
  window.YY = window.YY || {};
  YY.Views = YY.Views || {};

  var view = { stageId: null, topicIndex: 0, cardIndex: 0, flipped: false };

  function deckFor(stageId) { return YY.CONTENT.decks[stageId] || null; }

  function syncView(stageId, deck) {
    if (view.stageId !== stageId) {
      view.stageId = stageId;
      view.topicIndex = 0;
      view.cardIndex = 0;
      view.flipped = false;
    }
    if (view.topicIndex >= deck.topics.length) view.topicIndex = 0;
    var cards = deck.topics[view.topicIndex].cards;
    if (view.cardIndex >= cards.length) view.cardIndex = 0;
  }

  function speak(text) {
    if (!('speechSynthesis' in window)) {
      YY.ui.toast('当前浏览器不支持语音朗读，可以看拼音：' + text);
      return;
    }
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = 'zh-CN';
      u.rate = 0.82;
      u.pitch = 1.08;
      window.speechSynthesis.speak(u);
    } catch (err) {
      YY.ui.toast('语音播放失败，可以看拼音跟读');
    }
  }

  function render() {
    var stage = YY.store.stage();
    var stageId = stage.id;
    var deck = deckFor(stageId);

    if (!deck) {
      return YY.ui.appbar({ back: '/home', title: stage.cardsTitle, sub: '这个阶段暂时没有卡片' }) +
        '<main class="scroll">' +
        YY.ui.emptyState('🃏', '这个阶段还没有卡片内容', '去其他阶段看看，或者回首页看看今天的专属内容。',
          '<a class="btn btn-primary" href="#/home">回首页</a>') +
        '</main>';
    }

    syncView(stageId, deck);
    var topic = deck.topics[view.topicIndex];
    var cards = topic.cards;
    var card = cards[view.cardIndex];
    var learned = YY.store.learnedCount(topic.id, cards.length, stageId);
    var totalLearned = deck.topics.reduce(function (sum, t) {
      return sum + YY.store.learnedCount(t.id, t.cards.length, stageId);
    }, 0);
    var totalCards = deck.topics.reduce(function (sum, t) { return sum + t.cards.length; }, 0);

    var chips = deck.topics.map(function (t, i) {
      return '<button class="chip' + (i === view.topicIndex ? ' active' : '') + '" data-topic="' + i + '">' +
        t.emoji + ' ' + YY.ui.esc(t.name) + '</button>';
    }).join('');

    var thumbs = cards.map(function (c, i) {
      var learnedOne = YY.store.isCardLearned(topic.id, i, stageId);
      return '<button class="thumb' + (i === view.cardIndex ? ' active' : '') + '" data-card="' + i + '" aria-label="' + YY.ui.esc(c.word) + '">' +
        '<em>' + c.art + '</em><span class="' + (learnedOne ? 'learned' : '') + '">' + (learnedOne ? '✓ ' : '') + YY.ui.esc(c.word) + '</span></button>';
    }).join('');

    return YY.ui.appbar({
      back: '/home',
      title: stage.cardsTitle,
      sub: '第 ' + (view.cardIndex + 1) + ' / ' + cards.length + ' 张 · ' + topic.name,
      right: '<div class="star-chip">' + YY.icon('star', 16) + totalLearned + '/' + totalCards + '</div>'
    }) +
      '<main class="scroll">' +
      '<div class="stage-tag-row" style="margin-bottom:8px">' +
      '<button class="stage-pill" data-stage-picker>' + stage.emoji + ' ' + YY.ui.esc(stage.label) + YY.icon('chevronDown', 13) + '</button>' +
      '<span class="meta">切换阶段，卡片跟着变</span></div>' +
      '<div class="chip-row">' + chips + '</div>' +

      '<section class="flip-wrap' + (view.flipped ? ' flipped' : '') + '" id="flipWrap">' +
      '<div class="flip-inner">' +
      '<div class="flip-face flip-front flip-full">' +
      '<div class="card-art' + (deck.mono ? ' mono' : '') + '" style="background:linear-gradient(160deg,' + stage.theme.soft + ',#fff)">' + card.art + '</div>' +
      '<div class="card-copy"><div class="card-word">' + YY.ui.esc(card.word) + '</div>' +
      '<div class="card-pinyin">' + YY.ui.esc(card.pinyin) + '</div></div>' +
      '</div>' +
      '<div class="flip-face flip-back">' +
      '<div><span class="hint-pill">卡片背面 · 给家长的小提示</span>' +
      '<div class="tip-title">' + YY.ui.esc(card.tip) + '</div>' +
      '<div class="tip-fact">' + YY.ui.esc(card.fact) + '</div></div>' +
      '<div class="sentence-box"><span>可以说</span><b>' + YY.ui.esc(card.sentence) + '</b></div>' +
      '</div>' +
      '</div>' +
      '<button class="card-arrow left" data-step="-1" aria-label="上一张">' + YY.icon('arrowLeft', 16) + '</button>' +
      '<button class="card-arrow right" data-step="1" aria-label="下一张">' + YY.icon('arrowRight', 16) + '</button>' +
      '</section>' +

      '<div class="card-actions">' +
      '<button class="card-action speak" id="speakCard">' + YY.icon('speaker', 17) + '读给我听</button>' +
      '<button class="card-action flip" id="flipCard">' + YY.icon('rotate', 17) + '翻面看看</button>' +
      '<button class="card-action know" id="knowCard">' + YY.icon('check', 17) + '学会啦</button>' +
      '</div>' +

      '<div class="card-progress">' +
      '<div class="card-progress-top"><span>' + YY.ui.esc(topic.name) + ' · 已学会</span><b>' + learned + ' / ' + cards.length + '</b></div>' +
      '<div class="progress"><i style="width:' + Math.round(learned / cards.length * 100) + '%"></i></div>' +
      '<div class="note">' + YY.icon('info', 13) + '<span>左右滑动卡片可以翻页，点卡片可以翻面；学习进度会自动保存</span></div>' +
      '</div>' +

      '<section class="section" style="margin-bottom:4px">' +
      '<div class="section-head"><h2>这一组卡片</h2><span>点任意一张跳过去</span></div>' +
      '<div class="thumb-row">' + thumbs + '</div>' +
      '</section>' +
      '</main>';
  }

  function goCard(delta) {
    var stage = YY.store.stage();
    var deck = deckFor(stage.id);
    if (!deck) return;
    var cards = deck.topics[view.topicIndex].cards;
    view.cardIndex = (view.cardIndex + delta + cards.length) % cards.length;
    view.flipped = false;
    YY.router.refresh();
  }

  function bind() {
    var stage = YY.store.stage();
    var deck = deckFor(stage.id);
    if (!deck) return;
    var topic = deck.topics[view.topicIndex];
    var cards = topic.cards;
    var card = cards[view.cardIndex];

    document.querySelectorAll('[data-topic]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        view.topicIndex = Number(btn.getAttribute('data-topic'));
        view.cardIndex = 0;
        view.flipped = false;
        YY.router.refresh();
      });
    });
    document.querySelectorAll('[data-card]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        view.cardIndex = Number(btn.getAttribute('data-card'));
        view.flipped = false;
        YY.router.refresh();
      });
    });
    document.querySelectorAll('[data-step]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        goCard(Number(btn.getAttribute('data-step')));
      });
    });

    var wrap = document.getElementById('flipWrap');
    var startX = 0, startY = 0, tracking = false, swiped = false;
    if (wrap) {
      wrap.addEventListener('pointerdown', function (e) {
        if (e.target.closest('.card-arrow')) return;
        tracking = true;
        swiped = false;
        startX = e.clientX;
        startY = e.clientY;
      });
      wrap.addEventListener('pointerup', function (e) {
        if (!tracking) return;
        tracking = false;
        if (e.target.closest('.card-arrow')) return;
        var dx = e.clientX - startX;
        var dy = e.clientY - startY;
        if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
          swiped = true;
          goCard(dx < 0 ? 1 : -1);
          return;
        }
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) {
          view.flipped = !view.flipped;
          wrap.classList.toggle('flipped', view.flipped);
        }
      });
      wrap.addEventListener('pointercancel', function () { tracking = false; });
    }

    var flipBtn = document.getElementById('flipCard');
    if (flipBtn) {
      flipBtn.addEventListener('click', function () {
        view.flipped = !view.flipped;
        if (wrap) wrap.classList.toggle('flipped', view.flipped);
      });
    }

    var speakBtn = document.getElementById('speakCard');
    if (speakBtn) {
      speakBtn.addEventListener('click', function () { speak(card.word); });
    }

    var knowBtn = document.getElementById('knowCard');
    if (knowBtn) {
      knowBtn.addEventListener('click', function () {
        var isNew = YY.store.markCardLearned(topic.id, view.cardIndex);
        if (isNew) {
          YY.ui.toast('又学会一张：' + card.word + ' ⭐');
        } else {
          YY.ui.toast('这张已经学会啦');
        }
        if (view.cardIndex < cards.length - 1) {
          view.cardIndex += 1;
          view.flipped = false;
        } else {
          YY.ui.toast('这一组的卡片都认过一遍啦 🎉');
        }
        YY.router.refresh();
      });
    }
  }

  YY.Views.cards = { render: render, bind: bind, title: '认知卡片 · 芽芽成长' };
})();
