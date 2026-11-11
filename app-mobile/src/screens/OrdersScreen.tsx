/* 兑换记录：订单列表 → 订单详情；兼容旧订单（无 status/createdAt） */
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../theme';

type Item = { id: number; title: string; emoji: string; qty: number; price: number };
type Order = { id: string; date: string; createdAt?: string; status?: string; items: Item[]; total: number };

type Props = {
  orders: Order[];
  onBack: () => void;
};

function timeLabel(order: Order) {
  if (order.createdAt) {
    const d = new Date(order.createdAt);
    if (!Number.isNaN(d.getTime())) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
  }
  return order.date || '';
}

function statusLabel(order: Order) {
  return order.status === 'done' || !order.status ? '已完成' : order.status;
}

export default function OrdersScreen({ orders, onBack }: Props) {
  const [detailId, setDetailId] = useState<string | null>(null);
  const sorted = [...orders].sort((a, b) => {
    const ax = a.createdAt || a.date || '';
    const bx = b.createdAt || b.date || '';
    return bx.localeCompare(ax);
  });
  const detail = sorted.find((o) => o.id === detailId) || null;

  if (detail) {
    return (
      <View style={styles.flex}>
        <View style={styles.head}>
          <Pressable onPress={() => setDetailId(null)} style={styles.back} accessibilityLabel="返回订单列表">
            <Text style={styles.backText}>←</Text>
          </Pressable>
          <View style={styles.headCopy}>
            <Text style={styles.title}>订单详情</Text>
            <Text style={styles.sub}>订单号 {detail.id}</Text>
          </View>
        </View>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.statusCard}>
            <Text style={styles.statusText}>{statusLabel(detail)}</Text>
            <Text style={styles.statusTime}>{timeLabel(detail)}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>商品明细</Text>
            {detail.items.map((item, idx) => (
              <View key={String(item.id) + idx} style={styles.itemRow}>
                <Text style={styles.itemEmoji}>{item.emoji}</Text>
                <View style={styles.itemCopy}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={styles.itemMeta}>单价 ¥{item.price} × {item.qty}</Text>
                </View>
                <Text style={styles.itemTotal}>¥{item.price * item.qty}</Text>
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>合计</Text>
              <Text style={styles.totalValue}>¥{detail.total}</Text>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>下单时间</Text>
              <Text style={styles.infoValue}>{timeLabel(detail)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>订单状态</Text>
              <Text style={styles.infoValue}>{statusLabel(detail)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>支付方式</Text>
              <Text style={styles.infoValue}>成长值兑换</Text>
            </View>
          </View>
          <Text style={styles.note}>历史订单只保留原有字段；展示时缺失的状态按「已完成」兼容。</Text>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <View style={styles.head}>
        <Pressable onPress={onBack} style={styles.back} accessibilityLabel="返回">
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <View style={styles.headCopy}>
          <Text style={styles.title}>兑换记录</Text>
          <Text style={styles.sub}>共 {sorted.length} 笔订单 · 购物车与成长值为账号共享</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {sorted.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🧾</Text>
            <Text style={styles.emptyTitle}>还没有兑换记录</Text>
            <Text style={styles.emptyText}>去商城挑一份小礼物，用成长值兑换后，订单会出现在这里。</Text>
          </View>
        ) : (
          sorted.map((order) => (
            <Pressable key={order.id} style={styles.orderRow} onPress={() => setDetailId(order.id)}>
              <View style={styles.orderTop}>
                <Text style={styles.orderId}>订单 {order.id}</Text>
                <Text style={styles.orderStatus}>{statusLabel(order)}</Text>
              </View>
              <Text style={styles.orderMeta}>{timeLabel(order)} · {order.items.length} 件商品</Text>
              <View style={styles.orderItems}>
                {order.items.slice(0, 4).map((item, idx) => (
                  <Text key={String(item.id) + idx} style={styles.orderItemText}>{item.emoji} {item.title} ×{item.qty}</Text>
                ))}
                {order.items.length > 4 && <Text style={styles.orderItemText}>… 还有 {order.items.length - 4} 件</Text>}
              </View>
              <View style={styles.orderFoot}>
                <Text style={styles.orderTotal}>合计 ¥{order.total}</Text>
                <Text style={styles.orderGo}>查看详情 →</Text>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 16, gap: 10 },
  back: { width: 36, height: 36, borderRadius: 13, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 18, fontWeight: '800', color: COLORS.coral },
  headCopy: { flex: 1 },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.ink },
  sub: { fontSize: 11, color: COLORS.sub, marginTop: 3 },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 30, gap: 10 },
  empty: { alignItems: 'center', paddingTop: 70, paddingHorizontal: 20 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: COLORS.ink, marginTop: 10 },
  emptyText: { fontSize: 11, color: COLORS.sub, textAlign: 'center', marginTop: 6, lineHeight: 17 },
  orderRow: { backgroundColor: COLORS.white, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: COLORS.line },
  orderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderId: { fontSize: 12, fontWeight: '800', color: COLORS.ink },
  orderStatus: { fontSize: 9.5, fontWeight: '800', color: '#2E8B57', backgroundColor: '#E4F5EA', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  orderMeta: { fontSize: 9.5, color: COLORS.sub, marginTop: 4 },
  orderItems: { marginTop: 8, gap: 3 },
  orderItemText: { fontSize: 10, color: COLORS.ink },
  orderFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  orderTotal: { fontSize: 12, fontWeight: '800', color: COLORS.coral },
  orderGo: { fontSize: 10, fontWeight: '800', color: COLORS.coral },
  statusCard: { backgroundColor: COLORS.coral, borderRadius: 18, padding: 14 },
  statusText: { fontSize: 18, fontWeight: '800', color: '#fff' },
  statusTime: { fontSize: 10, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  card: { backgroundColor: COLORS.white, borderRadius: 18, padding: 14, marginTop: 10 },
  cardTitle: { fontSize: 13, fontWeight: '800', color: COLORS.ink, marginBottom: 6 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F5EDE3' },
  itemEmoji: { fontSize: 22 },
  itemCopy: { flex: 1, minWidth: 0 },
  itemTitle: { fontSize: 12, fontWeight: '800', color: COLORS.ink },
  itemMeta: { fontSize: 9.5, color: COLORS.sub, marginTop: 2 },
  itemTotal: { fontSize: 12, fontWeight: '800', color: COLORS.ink },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  totalLabel: { fontSize: 11, color: COLORS.sub, fontWeight: '700' },
  totalValue: { fontSize: 18, fontWeight: '800', color: COLORS.coral },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7 },
  infoLabel: { fontSize: 10.5, color: COLORS.sub },
  infoValue: { fontSize: 10.5, color: COLORS.ink, fontWeight: '700' },
  note: { fontSize: 9, color: COLORS.sub, lineHeight: 14, marginTop: 4 },
});
