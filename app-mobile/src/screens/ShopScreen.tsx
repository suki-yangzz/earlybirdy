import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import ScreenHeader from '../components/ScreenHeader';
import { COLORS, stageTheme } from '../theme';
import { STAGES } from '../sharedAdapter';

type ShopMode = 'list' | 'product' | 'cart';

type Props = {
  core: any;
  stageId: string;
  mode: ShopMode;
  productId: number | null;
  onBack: () => void;
  onOpenProduct: (id: number) => void;
  onOpenCart: () => void;
  onNav: (screen: 'home' | 'tasks' | 'shop') => void;
  onAddToCart: (id: number) => void;
  onSetQty: (id: number, qty: number) => void;
  onRemove: (id: number) => void;
  onClearCart: () => void;
  onCheckout: () => any;
  onOpenOrders: () => void;
  onToast: (msg: string) => void;
};

export default function ShopScreen(props: Props) {
  if (props.mode === 'product') return <ProductView {...props} />;
  if (props.mode === 'cart') return <CartView {...props} />;
  return <ListView {...props} />;
}

/* ---------------- 商品列表 ---------------- */
function ListView({ core, stageId, productId, onOpenProduct, onOpenCart, onAddToCart, onNav, onToast }: Props) {
  const stage = STAGES[stageId];
  const theme = stageTheme(stage);
  const [filter, setFilter] = useState('all');
  const coins = core.coins();
  const cartN = core.cartCount();
  const categories = core.getContent().categories || [];
  const products = (core.getContent().products || []).filter((p: any) => filter === 'all' || p.cat === filter);
  const doneIds = core.todayIds(stageId);
  const potential = core.tasksFor(stageId).reduce((sum: number, t: any) => sum + (doneIds.indexOf(t.id) === -1 ? t.value : 0), 0);
  void productId;

  return (
    <View style={styles.flex}>
      <ScreenHeader
        title="成长商城"
        sub="用打卡攒下的成长值换好物"
        accent={theme.accent}
        right={
          <View style={styles.headerRight}>
            <View style={[styles.coinPill, { backgroundColor: theme.soft }]}>
              <Text style={[styles.coinText, { color: theme.accent }]}>⭐ {coins}</Text>
            </View>
            <Pressable onPress={onOpenCart} style={styles.cartBtn} accessibilityLabel="购物车">
              <Text style={styles.cartIcon}>🛒</Text>
              {cartN > 0 && (
                <View style={[styles.cartBadge, { backgroundColor: theme.accent }]}>
                  <Text style={styles.cartBadgeText}>{cartN > 99 ? '99+' : cartN}</Text>
                </View>
              )}
            </Pressable>
          </View>
        }
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.promo, { backgroundColor: theme.accent }]}>
          <View style={styles.promoBlob} />
          <View style={styles.promoBody}>
            <View style={styles.promoCopy}>
              <Text style={styles.promoTag}>本周上新 · 亲子好物</Text>
              <Text style={styles.promoTitle}>把成长值换成小惊喜</Text>
              <Text style={styles.promoDesc}>
                {potential > 0 ? `完成今日任务，最多再得 ${potential} 成长值` : '今天的任务都完成啦，明天继续攒成长值'}
              </Text>
            </View>
            <Pressable style={styles.promoBtn} onPress={() => onNav('tasks')}>
              <Text style={[styles.promoBtnText, { color: theme.accent }]}>去攒值</Text>
            </Pressable>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {categories.map((c: any) => {
            const on = filter === c.id;
            return (
              <Pressable
                key={c.id}
                onPress={() => setFilter(c.id)}
                style={[styles.chip, on ? { backgroundColor: theme.accent } : { backgroundColor: COLORS.white }]}
              >
                <Text style={[styles.chipText, on ? { color: '#fff' } : { color: COLORS.ink }]}>{c.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.grid}>
          {products.map((p: any) => {
            const can = coins >= p.price;
            const diff = p.price - coins;
            return (
              <Pressable key={p.id} style={styles.good} onPress={() => onOpenProduct(p.id)}>
                <View style={[styles.goodArt, { backgroundColor: p.bg }]}>
                  <Text style={styles.goodEmoji}>{p.emoji}</Text>
                  <View style={[styles.goodBadge, { backgroundColor: can ? '#E4F6EE' : '#FFE6DC' }]}>
                    <Text style={[styles.goodBadgeText, { color: can ? '#2E9E82' : '#D25638' }]}>
                      {can ? '可兑换' : `差 ${diff}`}
                    </Text>
                  </View>
                </View>
                <View style={styles.goodBody}>
                  <Text style={styles.goodTitle} numberOfLines={1}>{p.title}</Text>
                  <Text style={styles.goodSub} numberOfLines={1}>{p.sub}</Text>
                  <View style={styles.goodFoot}>
                    <Text style={[styles.goodPrice, !can && { color: COLORS.muted }]}>
                      {p.price}<Text style={styles.goodPriceUnit}> 成长值</Text>
                    </Text>
                    <Pressable
                      style={[styles.goodAdd, { backgroundColor: can ? theme.accent : '#F0E7DD' }]}
                      onPress={() => {
                        onAddToCart(p.id);
                        onToast('已加入购物车 🛒');
                      }}
                    >
                      <Text style={[styles.goodAddText, { color: can ? '#fff' : COLORS.sub }]}>加购</Text>
                    </Pressable>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.shopNote}>
          <Text style={styles.shopNoteText}>
            💡 这里是成长值兑换演示，不会产生真实支付。加入购物车后可在购物车统一结算，余额不足时先去完成任务攒成长值。
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

/* ---------------- 商品详情 ---------------- */
function ProductView({ core, stageId, productId, onBack, onOpenCart, onAddToCart, onToast }: Props) {
  const stage = STAGES[stageId];
  const theme = stageTheme(stage);
  const product = (core.getContent().products || []).filter((p: any) => p.id === Number(productId))[0];
  const coins = core.coins();
  const cartN = core.cartCount();

  if (!product) {
    return (
      <View style={styles.flex}>
        <ScreenHeader title="商品详情" accent={theme.accent} onBack={onBack} />
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyEmoji}>🛍️</Text>
          <Text style={styles.emptyTitle}>没有找到这个商品</Text>
          <Pressable style={[styles.emptyBtn, { backgroundColor: theme.accent }]} onPress={onBack}>
            <Text style={styles.emptyBtnText}>回商城</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const can = coins >= product.price;
  const diff = Math.max(0, product.price - coins);

  return (
    <View style={styles.flex}>
      <ScreenHeader
        title="商品详情"
        sub="成长值兑换 · 无需真实支付"
        accent={theme.accent}
        onBack={onBack}
        right={
          <Pressable onPress={onOpenCart} style={styles.cartBtn} accessibilityLabel="购物车">
            <Text style={styles.cartIcon}>🛒</Text>
            {cartN > 0 && (
              <View style={[styles.cartBadge, { backgroundColor: theme.accent }]}>
                <Text style={styles.cartBadgeText}>{cartN}</Text>
              </View>
            )}
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.productHero, { backgroundColor: product.bg }]}>
          <Text style={styles.productHeroEmoji}>{product.emoji}</Text>
        </View>
        <View style={styles.productInfo}>
          <Text style={styles.productTitle}>{product.title}</Text>
          <Text style={styles.productSub}>{product.sub}</Text>
          <Text style={[styles.productPrice, { color: theme.accent }]}>
            {product.price}<Text style={styles.productPriceUnit}> 成长值</Text>
          </Text>
          <View style={styles.tagRow}>
            {(product.tags || []).map((t: string) => (
              <View key={t} style={[styles.tag, { backgroundColor: theme.soft }]}>
                <Text style={[styles.tagText, { color: theme.accent }]}>{t}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.descCard}>
          <Text style={styles.descTitle}>适合谁</Text>
          <Text style={styles.descText}>{product.desc}</Text>
        </View>

        <View style={styles.descCard}>
          <Text style={styles.descTitle}>兑换说明</Text>
          <Text style={styles.descText}>
            加入购物车后统一结算，结算时会扣除相应成长值。当前你的成长值是 {coins}，
            {can ? '可以直接兑换。' : `还差 ${diff} 成长值，可以先完成今天的任务。`}
          </Text>
        </View>

        {!can && (
          <View style={styles.shopNote}>
            <Text style={styles.shopNoteText}>💡 还差 {diff} 成长值，去任务页完成打卡就能攒到。</Text>
          </View>
        )}

        <View style={styles.productActions}>
          <Pressable
            style={styles.btnWhite}
            onPress={() => {
              onAddToCart(product.id);
              onToast('已加入购物车 🛒');
            }}
          >
            <Text style={styles.btnWhiteText}>加入购物车</Text>
          </Pressable>
          <Pressable style={[styles.btnPrimary, { backgroundColor: theme.accent }]} onPress={onOpenCart}>
            <Text style={styles.btnPrimaryText}>去购物车 →</Text>
          </Pressable>
        </View>
        <Text style={styles.demoNote}>演示流程：加入购物车 → 购物车结算 → 扣减成长值，不会产生真实支付。</Text>
      </ScrollView>
    </View>
  );
}

/* ---------------- 购物车 ---------------- */
function CartView(props: Props) {
  const { core, stageId, onBack, onNav, onSetQty, onRemove, onClearCart, onCheckout, onOpenOrders, onToast, onAddToCart } = props;
  const stage = STAGES[stageId];
  const theme = stageTheme(stage);
  const coins = core.coins();
  const items = core.cart();
  const total = core.cartTotal();
  const enough = coins >= total;
  const [confirmClear, setConfirmClear] = useState(false);
  const [success, setSuccess] = useState<any>(null);
  void onAddToCart;

  if (!items.length && !success) {
    return (
      <View style={styles.flex}>
        <ScreenHeader title="购物车" sub="还没有选好的商品" accent={theme.accent} onBack={onBack} />
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyEmoji}>🛒</Text>
          <Text style={styles.emptyTitle}>购物车还空空的</Text>
          <Text style={styles.emptyText}>去商城挑一件喜欢的，用成长值带回家。</Text>
          <Pressable style={[styles.emptyBtn, { backgroundColor: theme.accent }]} onPress={onBack}>
            <Text style={styles.emptyBtnText}>去逛商城</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <ScreenHeader
        title="购物车"
        sub={success ? '兑换完成' : `${core.cartCount()} 件商品 · 成长值结算`}
        accent={theme.accent}
        onBack={onBack}
        right={
          <Pressable onPress={() => setConfirmClear(true)} accessibilityLabel="清空购物车">
            <Text style={styles.clearText}>清空</Text>
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {items.map((x: any) => (
          <View key={x.product.id} style={styles.cartItem}>
            <View style={[styles.cartArt, { backgroundColor: x.product.bg }]}>
              <Text style={styles.cartEmoji}>{x.product.emoji}</Text>
            </View>
            <View style={styles.cartBody}>
              <Text style={styles.cartTitle} numberOfLines={1}>{x.product.title}</Text>
              <Text style={styles.cartPrice}>{x.product.price} 成长值 / 件</Text>
            </View>
            <View style={styles.qty}>
              <Pressable style={styles.qtyBtn} onPress={() => onSetQty(x.product.id, x.qty - 1)} accessibilityLabel="减少">
                <Text style={styles.qtyBtnText}>−</Text>
              </Pressable>
              <Text style={styles.qtyNum}>{x.qty}</Text>
              <Pressable style={styles.qtyBtn} onPress={() => onSetQty(x.product.id, x.qty + 1)} accessibilityLabel="增加">
                <Text style={styles.qtyBtnText}>+</Text>
              </Pressable>
            </View>
            <Pressable onPress={() => onRemove(x.product.id)} style={styles.removeBtn} accessibilityLabel="移除">
              <Text style={styles.removeText}>×</Text>
            </Pressable>
          </View>
        ))}

        {items.length > 0 && (
        <View style={styles.summary}>
          <View style={styles.sumRow}>
            <Text style={styles.sumLabel}>商品合计</Text>
            <Text style={styles.sumValue}>{total} 成长值</Text>
          </View>
          <View style={styles.sumRow}>
            <Text style={styles.sumLabel}>当前成长值</Text>
            <Text style={styles.sumValue}>{coins} 成长值</Text>
          </View>
          <View style={styles.sumRow}>
            <Text style={styles.sumLabel}>结算后剩余</Text>
            <Text style={styles.sumValue}>{Math.max(0, coins - total)} 成长值</Text>
          </View>
          {!enough && (
            <View style={styles.sumRow}>
              <Text style={styles.insufficient}>成长值不足</Text>
              <Text style={styles.insufficient}>还差 {total - coins}</Text>
            </View>
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalValue}>{total} <Text style={styles.totalUnit}>成长值</Text></Text>
            <Text style={styles.totalNote}>无需真实支付</Text>
          </View>
          <Pressable
            style={[styles.checkout, { backgroundColor: theme.accent }, !enough && { opacity: 0.72 }]}
            onPress={() => {
              if (!enough) {
                onToast(`成长值不足，还差 ${total - coins}，先去完成任务吧`);
                onNav('tasks');
                return;
              }
              const result = onCheckout();
              if (result && result.ok) {
                setSuccess(result);
              } else if (result && result.reason === 'coins') {
                onToast(`成长值不足，还差 ${result.need}，先去完成任务吧`);
                onNav('tasks');
              } else {
                onToast('购物车是空的');
              }
            }}
          >
            <Text style={styles.checkoutText}>{enough ? '确认兑换' : '先去做任务攒成长值'}</Text>
          </Pressable>
        </View>
        )}
        <Text style={styles.demoNote}>结算仅扣减成长值，用于演示购物车流程，不会产生真实支付。</Text>
      </ScrollView>

      {confirmClear && (
        <View style={styles.modalMask}>
          <View style={styles.modalCard}>
            <Text style={styles.modalEmoji}>🗑️</Text>
            <Text style={styles.modalTitle}>清空购物车？</Text>
            <Text style={styles.modalText}>已选好的商品会全部移除，成长值不会变化。</Text>
            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancel} onPress={() => setConfirmClear(false)}>
                <Text style={styles.modalCancelText}>取消</Text>
              </Pressable>
              <Pressable
                style={[styles.modalOk, { backgroundColor: theme.accent }]}
                onPress={() => {
                  onClearCart();
                  setConfirmClear(false);
                  onToast('购物车已清空');
                }}
              >
                <Text style={styles.modalOkText}>清空</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {success && (
        <View style={styles.modalMask}>
          <View style={styles.modalCard}>
            <Text style={styles.modalEmoji}>🎉</Text>
            <Text style={styles.modalTitle}>兑换成功</Text>
            <Text style={styles.modalText}>
              {success.order.items.map((x: any) => `${x.emoji} ${x.title} ×${x.qty}`).join('、')}
            </Text>
            <Text style={styles.modalSub}>订单号 {success.order.id} · 剩余 {success.coins} 成长值</Text>
            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancel}
                onPress={() => {
                  setSuccess(null);
                  onOpenOrders();
                }}
              >
                <Text style={styles.modalCancelText}>查看订单</Text>
              </Pressable>
              <Pressable
                style={[styles.modalOk, { backgroundColor: theme.accent }]}
                onPress={() => {
                  setSuccess(null);
                  onNav('home');
                }}
              >
                <Text style={styles.modalOkText}>回首页</Text>
              </Pressable>
            </View>
            <Text style={styles.modalDemo}>演示订单，不会产生真实支付</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingBottom: 30 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  coinPill: { borderRadius: 999, paddingHorizontal: 8, height: 26, justifyContent: 'center' },
  coinText: { fontSize: 10, fontWeight: '800' },
  cartBtn: { width: 34, height: 34, borderRadius: 12, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  cartIcon: { fontSize: 18 },
  cartBadge: { position: 'absolute', top: -3, right: -4, minWidth: 15, height: 15, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  cartBadgeText: { color: '#fff', fontSize: 8.5, fontWeight: '800' },
  promo: { marginHorizontal: 20, borderRadius: 22, padding: 16, overflow: 'hidden' },
  promoBlob: { position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.14)', top: -60, right: -40 },
  promoBody: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 },
  promoCopy: { flex: 1, minWidth: 0 },
  promoTag: { fontSize: 9, color: 'rgba(255,255,255,0.9)', fontWeight: '700' },
  promoTitle: { fontSize: 16, fontWeight: '800', color: '#fff', marginTop: 5 },
  promoDesc: { fontSize: 9.5, color: 'rgba(255,255,255,0.88)', marginTop: 4, lineHeight: 14 },
  promoBtn: { height: 32, paddingHorizontal: 13, borderRadius: 999, backgroundColor: '#fff', justifyContent: 'center' },
  promoBtnText: { fontSize: 10.5, fontWeight: '800' },
  chips: { gap: 8, paddingHorizontal: 20, paddingVertical: 12 },
  chip: { height: 30, paddingHorizontal: 12, borderRadius: 999, justifyContent: 'center' },
  chipText: { fontSize: 10.5, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 20, rowGap: 10 },
  good: { width: '48.5%', backgroundColor: COLORS.white, borderRadius: 18, overflow: 'hidden', shadowColor: '#784F28', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 1 },
  goodArt: { height: 88, alignItems: 'center', justifyContent: 'center' },
  goodEmoji: { fontSize: 34 },
  goodBadge: { position: 'absolute', top: 8, right: 8, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2 },
  goodBadgeText: { fontSize: 8, fontWeight: '800' },
  goodBody: { padding: 10 },
  goodTitle: { fontSize: 11.5, fontWeight: '800', color: COLORS.ink },
  goodSub: { fontSize: 9, color: COLORS.sub, marginTop: 2 },
  goodFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  goodPrice: { fontSize: 13, fontWeight: '800', color: '#E8A22A' },
  goodPriceUnit: { fontSize: 8.5, fontWeight: '600', color: COLORS.sub },
  goodAdd: { height: 24, paddingHorizontal: 10, borderRadius: 999, justifyContent: 'center' },
  goodAddText: { fontSize: 9.5, fontWeight: '800' },
  shopNote: { marginHorizontal: 20, marginTop: 14, backgroundColor: '#FFF1E8', borderRadius: 16, padding: 12 },
  shopNoteText: { fontSize: 10, color: '#8A5E48', lineHeight: 16 },
  productHero: { marginHorizontal: 20, height: 170, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  productHeroEmoji: { fontSize: 74 },
  productInfo: { paddingHorizontal: 20, marginTop: 14 },
  productTitle: { fontSize: 18, fontWeight: '800', color: COLORS.ink },
  productSub: { fontSize: 10.5, color: COLORS.sub, marginTop: 4 },
  productPrice: { fontSize: 22, fontWeight: '800', marginTop: 8 },
  productPriceUnit: { fontSize: 10, color: COLORS.sub, fontWeight: '600' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  tag: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  tagText: { fontSize: 9, fontWeight: '700' },
  descCard: { marginHorizontal: 20, marginTop: 12, backgroundColor: COLORS.white, borderRadius: 16, padding: 14 },
  descTitle: { fontSize: 12, fontWeight: '800', color: COLORS.ink },
  descText: { fontSize: 10.5, color: '#7A6455', lineHeight: 17, marginTop: 5 },
  productActions: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginTop: 16 },
  btnWhite: { flex: 1, height: 44, borderRadius: 14, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line, alignItems: 'center', justifyContent: 'center' },
  btnWhiteText: { fontSize: 12, fontWeight: '800', color: COLORS.ink },
  btnPrimary: { flex: 1, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  btnPrimaryText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  demoNote: { marginHorizontal: 20, marginTop: 14, fontSize: 9.5, color: COLORS.sub, lineHeight: 15 },
  clearText: { fontSize: 11, color: COLORS.sub, fontWeight: '700' },
  cartItem: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 20, marginBottom: 10, backgroundColor: COLORS.white, borderRadius: 18, padding: 12 },
  cartArt: { width: 54, height: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cartEmoji: { fontSize: 26 },
  cartBody: { flex: 1, minWidth: 0 },
  cartTitle: { fontSize: 12, fontWeight: '800', color: COLORS.ink },
  cartPrice: { fontSize: 9.5, color: COLORS.sub, marginTop: 3 },
  qty: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyBtn: { width: 24, height: 24, borderRadius: 8, backgroundColor: '#F5EDE3', alignItems: 'center', justifyContent: 'center' },
  qtyBtnText: { fontSize: 13, fontWeight: '800', color: COLORS.ink },
  qtyNum: { minWidth: 16, textAlign: 'center', fontSize: 11.5, fontWeight: '800', color: COLORS.ink },
  removeBtn: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  removeText: { fontSize: 13, color: COLORS.muted },
  summary: { marginHorizontal: 20, marginTop: 6, backgroundColor: COLORS.white, borderRadius: 18, padding: 14 },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  sumLabel: { fontSize: 10.5, color: COLORS.sub },
  sumValue: { fontSize: 10.5, color: COLORS.ink, fontWeight: '700' },
  insufficient: { fontSize: 10.5, color: '#D25638', fontWeight: '700' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 6, borderTopWidth: 1, borderTopColor: COLORS.line, paddingTop: 10 },
  totalValue: { fontSize: 20, fontWeight: '800', color: COLORS.ink },
  totalUnit: { fontSize: 10, color: COLORS.sub, fontWeight: '600' },
  totalNote: { fontSize: 9.5, color: COLORS.sub },
  checkout: { height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  checkoutText: { fontSize: 12.5, fontWeight: '800', color: '#fff' },
  modalMask: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(40,24,12,0.36)', alignItems: 'center', justifyContent: 'center', padding: 30 },
  modalCard: { width: '100%', backgroundColor: COLORS.white, borderRadius: 24, padding: 20, alignItems: 'center' },
  modalEmoji: { fontSize: 40 },
  modalTitle: { fontSize: 17, fontWeight: '800', color: COLORS.ink, marginTop: 8 },
  modalText: { fontSize: 11, color: COLORS.sub, lineHeight: 17, marginTop: 6, textAlign: 'center' },
  modalSub: { fontSize: 9.5, color: COLORS.sub, marginTop: 6 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16, alignSelf: 'stretch' },
  modalCancel: { flex: 1, height: 40, borderRadius: 12, backgroundColor: '#F5EDE3', alignItems: 'center', justifyContent: 'center' },
  modalCancelText: { fontSize: 11.5, fontWeight: '800', color: COLORS.ink },
  modalOk: { flex: 1, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modalOkText: { fontSize: 11.5, fontWeight: '800', color: '#fff' },
  modalDemo: { fontSize: 9, color: COLORS.sub, marginTop: 10 },
  emptyWrap: { flex: 1, alignItems: 'center', paddingTop: 80, paddingHorizontal: 30 },
  emptyEmoji: { fontSize: 52 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: COLORS.ink, marginTop: 12 },
  emptyText: { fontSize: 11, color: COLORS.sub, marginTop: 6, textAlign: 'center', lineHeight: 17 },
  emptyBtn: { marginTop: 16, height: 40, paddingHorizontal: 20, borderRadius: 999, justifyContent: 'center' },
  emptyBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },
});
