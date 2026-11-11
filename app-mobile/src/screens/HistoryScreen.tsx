/* 浏览历史：最近看过的曲目/视频/卡片，倒序去重，可清空 */
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../theme';
import { STAGES } from '../sharedAdapter';

type Item = { kind: string; stage: string; id: string; title: string; sub: string; emoji: string; at?: string };

type Props = {
  items: Item[];
  onBack: () => void;
  onClear: () => void;
  onOpen: (item: Item) => void;
};

const KIND_LABEL: Record<string, string> = { audio: '音乐', video: '视频', card: '卡片' };

function timeLabel(at?: string) {
  if (!at) return '';
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function HistoryScreen({ items, onBack, onClear, onOpen }: Props) {
  const [confirm, setConfirm] = useState(false);

  return (
    <View style={styles.flex}>
      <View style={styles.head}>
        <Pressable onPress={onBack} style={styles.back} accessibilityLabel="返回">
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <View style={styles.headCopy}>
          <Text style={styles.title}>浏览历史</Text>
          <Text style={styles.sub}>最近 {items.length} 条 · 同一内容只保留最新一次</Text>
        </View>
        {items.length > 0 && (
          <Pressable onPress={() => setConfirm((v) => !v)} style={styles.clearBtn}>
            <Text style={styles.clearText}>清空</Text>
          </Pressable>
        )}
      </View>

      {confirm && (
        <View style={styles.confirmRow}>
          <Text style={styles.confirmText}>清空后不可恢复，只会影响当前宝宝的历史记录。</Text>
          <View style={styles.confirmBtns}>
            <Pressable onPress={() => setConfirm(false)} style={styles.smallBtn}>
              <Text style={styles.smallText}>取消</Text>
            </Pressable>
            <Pressable onPress={() => { setConfirm(false); onClear(); }} style={[styles.smallBtn, styles.smallDanger]}>
              <Text style={styles.smallDangerText}>确认清空</Text>
            </Pressable>
          </View>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {items.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🕘</Text>
            <Text style={styles.emptyTitle}>还没有浏览记录</Text>
            <Text style={styles.emptyText}>去听一首儿歌、看一集动画或翻几张卡片，这里会自动记录最近看过的内容。</Text>
          </View>
        ) : (
          items.map((item) => (
            <Pressable key={item.kind + item.stage + item.id} style={styles.row} onPress={() => onOpen(item)}>
              <Text style={styles.emoji}>{item.emoji}</Text>
              <View style={styles.copy}>
                <Text style={styles.name}>{item.title}</Text>
                <Text style={styles.meta}>
                  {KIND_LABEL[item.kind]} · {STAGES[item.stage]?.chip || item.stage}
                  {item.sub ? ` · ${item.sub}` : ''}
                </Text>
              </View>
              <Text style={styles.time}>{timeLabel(item.at)}</Text>
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
  clearBtn: { height: 32, paddingHorizontal: 12, borderRadius: 999, backgroundColor: '#FFF0EC', justifyContent: 'center' },
  clearText: { fontSize: 10.5, fontWeight: '800', color: '#C4472E' },
  confirmRow: { marginHorizontal: 20, marginTop: 10, backgroundColor: '#FFF4F0', borderRadius: 12, padding: 10 },
  confirmText: { fontSize: 10, color: '#8A4632', lineHeight: 15 },
  confirmBtns: { flexDirection: 'row', gap: 8, marginTop: 8 },
  smallBtn: { flex: 1, height: 30, borderRadius: 9, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  smallText: { fontSize: 10.5, fontWeight: '700', color: COLORS.sub },
  smallDanger: { backgroundColor: '#F8D8CF' },
  smallDangerText: { fontSize: 10.5, fontWeight: '800', color: '#B03A22' },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 30, gap: 8 },
  empty: { alignItems: 'center', paddingTop: 70, paddingHorizontal: 20 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: COLORS.ink, marginTop: 10 },
  emptyText: { fontSize: 11, color: COLORS.sub, textAlign: 'center', marginTop: 6, lineHeight: 17 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.white, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: COLORS.line },
  emoji: { fontSize: 22 },
  copy: { flex: 1, minWidth: 0 },
  name: { fontSize: 13, fontWeight: '800', color: COLORS.ink },
  meta: { fontSize: 9.5, color: COLORS.sub, marginTop: 2 },
  time: { fontSize: 9, color: COLORS.sub },
});
