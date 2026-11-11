/* 跨类型搜索：曲目 / 卡片 / 视频 / 商品，中文子串 + 拼音首字母 */
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { COLORS } from '../theme';
import { searchContent, STAGES } from '../sharedAdapter';

type Item = {
  kind: string;
  stage?: string;
  id: string | number;
  title: string;
  sub: string;
  emoji: string;
};

type Props = {
  content: any;
  onBack: () => void;
  onOpen: (item: Item) => void;
};

const GROUPS: { key: 'audio' | 'card' | 'video' | 'product'; label: string }[] = [
  { key: 'audio', label: '音乐' },
  { key: 'card', label: '卡片' },
  { key: 'video', label: '视频' },
  { key: 'product', label: '商品' },
];

export default function SearchScreen({ content, onBack, onOpen }: Props) {
  const [query, setQuery] = useState('');
  const result = useMemo(() => searchContent(content, query), [content, query]);
  const trimmed = query.trim();

  return (
    <View style={styles.flex}>
      <View style={styles.head}>
        <Pressable onPress={onBack} style={styles.back} accessibilityLabel="返回">
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="搜儿歌、卡片、动画、商品"
            placeholderTextColor={COLORS.sub}
            style={styles.input}
            autoFocus
            returnKeyType="search"
            accessibilityLabel="搜索输入"
          />
          {!!query && (
            <Pressable onPress={() => setQuery('')} accessibilityLabel="清空搜索">
              <Text style={styles.clear}>✕</Text>
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {!trimmed ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🔍</Text>
            <Text style={styles.emptyTitle}>搜一搜，找今天想玩的内容</Text>
            <Text style={styles.emptyText}>支持中文，也支持拼音首字母：例如「两只老虎」可以输入 lz。</Text>
          </View>
        ) : result.total === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🌵</Text>
            <Text style={styles.emptyTitle}>没有找到「{trimmed}」</Text>
            <Text style={styles.emptyText}>试试更短的关键词，或改用拼音首字母，比如 lz、xg。</Text>
          </View>
        ) : (
          <>
            <Text style={styles.summary}>共 {result.total} 条结果</Text>
            {GROUPS.map((group) => {
              const items: Item[] = (result.groups as any)[group.key] || [];
              if (!items.length) return null;
              return (
                <View key={group.key} style={styles.group}>
                  <Text style={styles.groupTitle}>{group.label} · {items.length}</Text>
                  {items.map((item) => (
                    <Pressable
                      key={group.key + String(item.id)}
                      style={styles.row}
                      onPress={() => onOpen(item)}
                    >
                      <Text style={styles.emoji}>{item.emoji}</Text>
                      <View style={styles.copy}>
                        <Text style={styles.name}>{item.title}</Text>
                        <Text style={styles.meta}>
                          {item.stage && STAGES[item.stage] ? `${STAGES[item.stage].chip} · ` : ''}
                          {item.sub}
                        </Text>
                      </View>
                      <Text style={styles.go}>打开 →</Text>
                    </Pressable>
                  ))}
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, gap: 10 },
  back: { width: 36, height: 36, borderRadius: 13, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 18, fontWeight: '800', color: COLORS.coral },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', height: 42, borderRadius: 14, backgroundColor: COLORS.white, paddingHorizontal: 10, borderWidth: 1, borderColor: COLORS.line },
  searchIcon: { fontSize: 14, marginRight: 6 },
  input: { flex: 1, fontSize: 13, color: COLORS.ink, paddingVertical: 0 },
  clear: { fontSize: 13, color: COLORS.sub, paddingHorizontal: 4 },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 30 },
  empty: { alignItems: 'center', paddingTop: 64, paddingHorizontal: 20 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: COLORS.ink, marginTop: 10, textAlign: 'center' },
  emptyText: { fontSize: 11, color: COLORS.sub, textAlign: 'center', marginTop: 6, lineHeight: 17 },
  summary: { fontSize: 10.5, color: COLORS.sub, marginBottom: 8 },
  group: { marginBottom: 14 },
  groupTitle: { fontSize: 12.5, fontWeight: '800', color: COLORS.ink, marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.white, borderRadius: 14, padding: 11, borderWidth: 1, borderColor: COLORS.line, marginBottom: 6 },
  emoji: { fontSize: 20 },
  copy: { flex: 1, minWidth: 0 },
  name: { fontSize: 12.5, fontWeight: '800', color: COLORS.ink },
  meta: { fontSize: 9.5, color: COLORS.sub, marginTop: 2 },
  go: { fontSize: 10, fontWeight: '800', color: COLORS.coral },
});
