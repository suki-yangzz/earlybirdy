/* 商城：商品列表 / 分类 / 详情 / 购物车 / 成长值结算（无真实支付） */
(function () {
  'use strict';
  window.YY = window.YY || {};
  YY.Views = YY.Views || {};

  var filter = 'all';

  function cartBadgesHtml() {
    var n = YY.store.cartCount();
    return '<a class="icon-btn cart-btn" href="#/cart" aria-label="购物车">' + YY.icon('cart', 20) +
      (n ? '<span class="cart-badge" data-cart-badge>' + n + '</span>' : '') + '</a>';
  }

  function updateCartBadges() {
    var n = YY.store.cartCount();
    var headerCart = document.querySelector('[data-cart-badge]');
    if (headerCart) {
      if (n) { headerCart.textContent = n; headerCart.style.display = 'flex'; }
      else headerCart.style.display = 'none';
    } else if (n) {
      var cartBtn = document.querySelector('.appbar .cart-btn');
      if (cartBtn) {
        var span = document.createElement('span');
        span.className = 'cart-badge';
        span.setAttribute('data-cart-badge', '');
        span.textContent = n;
        cartBtn.appendChild(span);
      }
    }
    var navTab = document.querySelector('.tabbar a[href="#/shop"]');
    if (navTab) {
      var navBadge = navTab.querySelector('.tab-badge');
      if (n) {
        if (!navBadge) {
          navBadge = document.createElement('span');
          navBadge.className = 'tab-badge';
          navTab.appendChild(navBadge);
        }
        navBadge.textContent = n > 99 ? '99+' : n;
      } else if (navBadge) {
        navBadge.parentNode.removeChild(navBadge);
      }
    }
  }

  /* ---------- 商品列表 ---------- */
  function renderList() {
    var stage = YY.store.stage();
    var coins = YY.store.coins();
    var cats = YY.CONTENT.categories;
    var products = YY.CONTENT.products.filter(function (p) {
      return filter === 'all' || p.cat === filter;
    });
    var doneIds = YY.store.todayIds();
    var potential = YY.store.tasksFor().reduce(function (sum, t) {
      return sum + (doneIds.indexOf(t.id) === -1 ? t.value : 0);
    }, 0);

    var chips = cats.map(function (c) {
      return '<button class="chip flat' + (filter === c.id ? ' active' : '') + '" data-cat="' + c.id + '">' + YY.ui.esc(c.label) + '</button>';
    }).join('');

    var goods = products.map(function (p) {
      var can = coins >= p.price;
      var diff = p.price - coins;
      return '<div class="good" data-product="' + p.id + '">' +
        '<div class="good-art" style="background:' + p.bg + '">' + p.emoji +
        '<span class="good-badge ' + (can ? 'ok' : 'no') + '">' + (can ? '可兑换' : '差 ' + diff) + '</span></div>' +
        '<div class="good-body"><b>' + YY.ui.esc(p.title) + '</b><p>' + YY.ui.esc(p.sub) + '</p>' +
        '<div class="good-foot">' +
        '<span class="good-price' + (can ? '' : ' dim') + '">' + p.price + '<span>成长值</span></span>' +
        '<button class="good-add' + (can ? '' : ' dim') + '" data-add="' + p.id + '">加购</button>' +
        '</div></div></div>';
    }).join('');

    return '<header class="appbar">' +
      '<div style="flex:1;min-width:0"><h1 class="greeting-title" style="font-size:22px">成长商城</h1>' +
      '<p class="greeting-date" style="margin-top:3px">用打卡攒下的成长值换好物</p></div>' +
      '<div style="display:flex;align-items:center;gap:8px">' +
      '<span class="shop-coin">' + YY.icon('star', 15) + coins + '<em>成长值</em></span>' +
      cartBadgesHtml() +
      '</div></header>' +
      '<main class="scroll">' +
      '<section class="promo">' +
      '<div class="promo-bg dots" style="background:' + YY.ui.gradient(stage) + '"></div>' +
      '<div class="promo-body"><div><span class="tag">本周上新 · 亲子好物</span>' +
      '<b>把成长值换成小惊喜</b><p>' + (potential > 0 ? '完成今日任务，最多再得 ' + potential + ' 成长值' : '今天的任务都完成啦，明天继续攒成长值') + '</p></div>' +
      '<a class="promo-btn" href="#/tasks">去攒值</a></div>' +
      '</section>' +

      '<div class="chip-row" style="margin-top:12px">' + chips + '</div>' +

      '<div class="goods-grid">' + goods + '</div>' +

      '<div class="shop-note">' + YY.icon('info', 15) +
      '<span>这里是成长值兑换演示，不会产生真实支付。加入购物车后可在购物车统一结算，余额不足时先去完成任务攒成长值。</span></div>' +
      '</main>';
  }

  function bindList() {
    document.querySelectorAll('[data-cat]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        filter = btn.getAttribute('data-cat');
        YY.router.refresh();
      });
    });
    document.querySelectorAll('[data-product]').forEach(function (card) {
      card.addEventListener('click', function (e) {
        if (e.target.closest('[data-add]')) return;
        location.hash = '#/shop/' + card.getAttribute('data-product');
      });
    });
    document.querySelectorAll('[data-add]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var id = Number(btn.getAttribute('data-add'));
        YY.store.addToCart(id);
        updateCartBadges();
        YY.ui.toast('已加入购物车 🛒');
      });
    });
  }

  /* ---------- 商品详情 ---------- */
  function renderProduct(params) {
    var id = Number(params && params.id);
    var p = YY.CONTENT.products.filter(function (x) { return x.id === id; })[0];
    if (!p) {
      return YY.ui.appbar({ back: '/shop', title: '商品详情' }) +
        '<main class="scroll">' + YY.ui.emptyState('🛍️', '没有找到这个商品', '可能已经下架了，回商城看看别的吧。',
          '<a class="btn btn-primary" href="#/shop">回商城</a>') + '</main>';
    }
    var coins = YY.store.coins();
    var can = coins >= p.price;
    var diff = Math.max(0, p.price - coins);
    var tags = p.tags.map(function (t) {
      return '<span class="pill pill-mint">' + YY.ui.esc(t) + '</span>';
    }).join('');

    return YY.ui.appbar({
      back: '/shop', title: '商品详情', sub: '成长值兑换 · 无需真实支付',
      right: cartBadgesHtml()
    }) +
      '<main class="scroll">' +
      '<div class="product-hero" style="background:linear-gradient(160deg,' + p.bg + ',#fff)">' + p.emoji + '</div>' +
      '<div class="product-info"><h1>' + YY.ui.esc(p.title) + '</h1><p class="sub">' + YY.ui.esc(p.sub) + '</p>' +
      '<div class="product-price">' + p.price + '<span>成长值</span></div>' +
      '<div class="product-tags">' + tags + '</div></div>' +

      '<div class="product-desc"><b>适合谁</b><p>' + YY.ui.esc(p.desc) + '</p></div>' +

      '<div class="product-desc"><b>兑换说明</b><p>加入购物车后统一结算，结算时会扣除相应成长值。当前你的成长值是 ' + coins + '，' +
      (can ? '可以直接兑换。' : '还差 ' + diff + ' 成长值，可以先完成今天的任务。') + '</p></div>' +

      (can ? '' : '<div class="shop-note">' + YY.icon('info', 15) + '<span>还差 ' + diff + ' 成长值，去任务页完成打卡就能攒到。</span></div>') +

      '<div class="product-actions">' +
      '<button class="btn btn-white" id="addCurrent">加入购物车</button>' +
      '<a class="btn btn-primary" href="#/cart">去购物车 ' + YY.icon('arrowRight', 15) + '</a>' +
      '</div>' +
      '<p class="demo-note">演示流程：加入购物车 → 购物车结算 → 扣减成长值，不会产生真实支付。</p>' +
      '</main>';
  }

  function bindProduct(params) {
    var p = YY.CONTENT.products.filter(function (x) { return x.id === Number(params && params.id); })[0];
    if (!p) return;
    var addBtn = document.getElementById('addCurrent');
    if (addBtn) {
      addBtn.addEventListener('click', function () {
        YY.store.addToCart(p.id);
        updateCartBadges();
        YY.ui.toast('已加入购物车 🛒');
      });
    }
  }

  /* ---------- 购物车 ---------- */
  function renderCart() {
    var coins = YY.store.coins();
    var items = YY.store.cart();
    var total = YY.store.cartTotal();
    var enough = coins >= total;

    if (!items.length) {
      return YY.ui.appbar({ back: '/shop', title: '购物车', sub: '还没有选好的商品' }) +
        '<main class="scroll">' +
        YY.ui.emptyState('🛒', '购物车还空空的', '去商城挑一件喜欢的，用成长值带回家。',
          '<a class="btn btn-primary" href="#/shop">去逛商城</a>') +
        '</main>';
    }

    var list = items.map(function (x) {
      var p = x.product;
      return '<div class="cart-item">' +
        '<div class="cart-art" style="background:' + p.bg + '">' + p.emoji + '</div>' +
        '<div class="txt"><b>' + YY.ui.esc(p.title) + '</b>' +
        '<div class="price">' + p.price + ' 成长值 / 件</div></div>' +
        '<div class="qty">' +
        '<button data-minus="' + p.id + '" aria-label="减少">' + YY.icon('minus', 13) + '</button>' +
        '<span>' + x.qty + '</span>' +
        '<button data-plus="' + p.id + '" aria-label="增加">' + YY.icon('plus', 13) + '</button>' +
        '</div>' +
        '<button class="cart-remove" data-remove="' + p.id + '" aria-label="移除">' + YY.icon('x', 15) + '</button>' +
        '</div>';
    }).join('');

    return YY.ui.appbar({
      back: '/shop', title: '购物车', sub: YY.store.cartCount() + ' 件商品 · 成长值结算',
      right: '<button class="icon-btn" id="clearCart" aria-label="清空购物车">' + YY.icon('trash', 19) + '</button>'
    }) +
      '<main class="scroll">' +
      '<div class="cart-list">' + list + '</div>' +
      '<div class="cart-summary">' +
      '<div class="row"><span>商品合计</span><span>' + total + ' 成长值</span></div>' +
      '<div class="row"><span>当前成长值</span><span>' + coins + ' 成长值</span></div>' +
      '<div class="row"><span>结算后剩余</span><span>' + (coins - total >= 0 ? coins - total : 0) + ' 成长值</span></div>' +
      '<div class="total"><b>' + total + ' <span style="font-size:11px;color:#A08876">成长值</span></b>' +
      '<span>无需真实支付</span></div>' +
      (enough ? '' : '<div class="row" style="color:#D25638;margin-top:6px"><span>成长值不足</span><span>还差 ' + (total - coins) + '</span></div>') +
      '<button class="btn btn-primary btn-block" id="checkout"' + (enough ? '' : ' style="opacity:.6"') + '>' +
      (enough ? '确认兑换' : '先去做任务攒成长值') + '</button>' +
      '</div>' +
      '<p class="demo-note">结算仅扣减成长值，用于演示购物车流程，不会产生真实支付。</p>' +
      '</main>';
  }

  function bindCart() {
    document.querySelectorAll('[data-plus]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = Number(btn.getAttribute('data-plus'));
        var item = YY.store.cart().filter(function (x) { return x.product.id === id; })[0];
        YY.store.setQty(id, (item ? item.qty : 0) + 1);
        YY.router.refresh();
      });
    });
    document.querySelectorAll('[data-minus]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = Number(btn.getAttribute('data-minus'));
        var item = YY.store.cart().filter(function (x) { return x.product.id === id; })[0];
        YY.store.setQty(id, (item ? item.qty : 0) - 1);
        YY.router.refresh();
      });
    });
    document.querySelectorAll('[data-remove]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        YY.store.removeFromCart(Number(btn.getAttribute('data-remove')));
        YY.ui.toast('已从购物车移除');
        YY.router.refresh();
      });
    });
    var clear = document.getElementById('clearCart');
    if (clear) {
      clear.addEventListener('click', function () {
        YY.ui.confirm({
          icon: '🗑️', title: '清空购物车？', text: '已选好的商品会全部移除，成长值不会变化。',
          okText: '清空', danger: true,
          onOk: function () {
            YY.store.clearCart();
            YY.ui.toast('购物车已清空');
            YY.router.refresh();
          }
        });
      });
    }
    var checkout = document.getElementById('checkout');
    if (checkout) {
      checkout.addEventListener('click', function () {
        var result = YY.store.checkout();
        if (!result.ok) {
          if (result.reason === 'coins') {
            YY.ui.toast('成长值不足，还差 ' + result.need + '，先去完成任务吧');
            setTimeout(function () { location.hash = '#/tasks'; }, 900);
          } else {
            YY.ui.toast('购物车是空的');
          }
          return;
        }
        YY.router.refresh();
        openSuccess(result);
      });
    }
  }

  function openSuccess(result) {
    var order = result.order;
    var itemsText = order.items.map(function (x) { return x.emoji + ' ' + x.title + ' ×' + x.qty; }).join('、');
    var html = '<div style="text-align:center;padding:4px 2px 6px">' +
      '<span style="font-size:46px;display:block">🎉</span>' +
      '<h3 style="font-size:18px;font-weight:800;margin-top:8px">兑换成功</h3>' +
      '<p style="font-size:11px;color:#8A725F;line-height:1.7;margin-top:6px">' + YY.ui.esc(itemsText) + '</p>' +
      '<p style="font-size:10.5px;color:#A08876;margin-top:6px">订单号 ' + order.id + ' · 剩余 ' + result.coins + ' 成长值</p>' +
      '<div style="display:flex;gap:10px;margin-top:16px">' +
      '<a class="btn btn-soft" style="flex:1" href="#/shop" data-close>继续逛逛</a>' +
      '<a class="btn btn-primary" style="flex:1" href="#/home" data-close>回首页</a>' +
      '</div><p style="font-size:9.5px;color:#C0A98F;margin-top:10px">演示订单，不会产生真实支付</p></div>';
    YY.ui.openSheet(html);
  }

  YY.Views.shop = { render: renderList, bind: bindList, title: '成长商城 · 芽芽成长' };
  YY.Views.product = { render: renderProduct, bind: bindProduct, title: '商品详情 · 芽芽成长' };
  YY.Views.cart = { render: renderCart, bind: bindCart, title: '购物车 · 芽芽成长' };
})();
