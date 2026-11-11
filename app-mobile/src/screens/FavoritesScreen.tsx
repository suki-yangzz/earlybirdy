/* 统一收藏列表：音乐 / 视频 / 卡片，支持筛选与取消收藏 */
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../theme';
import { STAGES } from '../sharedAdapter';

type Item = { kind: string; stage: string; id: string; title: string; sub: string; emoji: string };

type Props = {
  items: Item[];
  onBack: () => void;
  onUnfav: (item: Item) => void;
  onOpen: (item: Item) => void;
};

const FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'audio', label: '音乐' },
  { key: 'video', label: '视频' },
  { key: 'card', label: '卡片' },
  { key: 'course', label: '课程' },
];

const KIND_LABEL: Record<string, string> = { audio: '音乐', video: '视频', card: '卡片', course: '课程' };

export default function FavoritesScreen({ items, onBack, onUnfav, onOpen }: Props) {
  const [filter, setFilter] = useState('all');
  const shown = filter === 'all' ? items : items.filter((x) => x.kind === filter);

  return (
    <View style={styles.flex}>
      <View style={styles.head}>
        <Pressable onPress={onBack} style={styles.back} accessibilityLabel="返回">
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <View style={styles.headCopy}>
          <Text style={styles.title}>我的收藏</Text>
          <Text style={styles.sub}>曲目、视频、卡片、课程都能收藏 · 共 {items.length} 条</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {FILTERS.map((f) => {
          const on = filter === f.key;
          const count = f.key === 'all' ? items.length : items.filter((x) => x.kind === f.key).length;
          return (
            <Pressable key={f.key} onPress={() => setFilter(f.key)} style={[styles.filter, on && styles.filterOn]}>
              <Text style={[styles.filterText, on && styles.filterTextOn]}>{f.label} {count}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {shown.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>♡</Text>
            <Text style={styles.emptyTitle}>{filter === 'all' ? '还没有收藏内容' : `还没有收藏${KIND_LABEL[filter]}`}</Text>
            <Text style={styles.emptyText}>在音乐、视频或卡片页点「♡ 收藏」，喜欢的内容就会出现在这里。</Text>
          </View>
        ) : (
          shown.map((item) => (
            <View key={item.kind + item.stage + item.id} style={styles.row}>
              <Pressable style={styles.rowMain} onPress={() => onOpen(item)}>
                <Text style={styles.emoji}>{item.emoji}</Text>
                <View style={styles.copy}>
                  <Text style={styles.name}>{item.title}</Text>
                  <Text style={styles.meta}>
                    {KIND_LABEL[item.kind]} · {STAGES[item.stage]?.chip || item.stage}
                    {item.sub ? ` · ${item.sub}` : ''}
                  </Text>
                </View>
                <Text style={styles.go}>打开 →</Text>
              </Pressable>
              <Pressable style={styles.unfav} onPress={() => onUnfav(item)} accessibilityLabel="取消收藏">
                <Text style={styles.unfavText}>♥</Text>
              </Pressable>
            </View>
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
  filters: { gap: 8, paddingHorizontal: 20, paddingVertical: 12 },
  filter: { height: 32, paddingHorizontal: 12, borderRadius: 999, backgroundColor: COLORS.white, justifyContent: 'center' },
  filterOn: { backgroundColor: COLORS.coral },
  filterText: { fontSize: 11, fontWeight: '700', color: COLORS.ink },
  filterTextOn: { color: '#fff' },
  content: { paddingHorizontal: 20, paddingBottom: 30, gap: 8 },
  empty: { alignItems: 'center', paddingTop: 70, paddingHorizontal: 20 },
  emptyEmoji: { fontSize: 48, color: COLORS.coral },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: COLORS.ink, marginTop: 10 },
  emptyText: { fontSize: 11, color: COLORS.sub, textAlign: 'center', marginTop: 6, lineHeight: 17 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 16, borderWidth: 1, borderColor: COLORS.line },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  emoji: { fontSize: 24 },
  copy: { flex: 1, minWidth: 0 },
  name: { fontSize: 13, fontWeight: '800', color: COLORS.ink },
  meta: { fontSize: 9.5, color: COLORS.sub, marginTop: 2 },
  go: { fontSize: 10, fontWeight: '800', color: COLORS.coral },
  unfav: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  unfavText: { fontSize: 17, color: '#FF6B4A' },
});
