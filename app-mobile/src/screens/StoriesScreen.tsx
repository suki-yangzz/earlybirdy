import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import ScreenHeader from '../components/ScreenHeader';
import AssetCover from '../components/AssetCover';
import { COLORS } from '../theme';
import { STAGES, STORY_CATEGORIES } from '../sharedAdapter';

type Props = {
  stories: any[];
  accent: string;
  onBack: () => void;
  onOpenStory: (id: string) => void;
};

function stageLabel(id: string) {
  return (STAGES[id] && STAGES[id].label) || '孕期';
}

export default function StoriesScreen({ stories, accent, onBack, onOpenStory }: Props) {
  const [stage, setStage] = useState('all');
  const [category, setCategory] = useState('all');

  const stages = Array.from(new Set(stories.map((s) => s.stage || 'pregnancy')));
  const list = stories.filter((s) => {
    if (stage !== 'all' && (s.stage || 'pregnancy') !== stage) return false;
    if (category !== 'all' && s.category !== category) return false;
    return true;
  });

  return (
    <View style={styles.flex}>
      <ScreenHeader
        title="胎教故事"
        sub={`${stories.length} 个故事 · 图文可翻页`}
        accent={accent}
        onBack={onBack}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.filterLabel}>阶段</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {[{ id: 'all', label: '全部阶段' }, ...stages.map((id) => ({ id, label: stageLabel(id) }))].map((s) => {
            const on = stage === s.id;
            return (
              <Pressable
                key={s.id}
                onPress={() => setStage(s.id)}
                style={[styles.chip, on && { backgroundColor: accent, borderColor: accent }]}
                accessibilityRole="button"
                accessibilityLabel={`故事阶段 ${s.label}`}
              >
                <Text style={[styles.chipText, on && { color: '#fff' }]}>{s.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={styles.filterLabel}>分类</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {[{ id: 'all', label: '全部分类' }, ...STORY_CATEGORIES].map((c) => {
            const on = category === c.id;
            return (
              <Pressable
                key={c.id}
                onPress={() => setCategory(c.id)}
                style={[styles.chip, on && { backgroundColor: accent, borderColor: accent }]}
                accessibilityRole="button"
                accessibilityLabel={`故事分类 ${c.label}`}
              >
                <Text style={[styles.chipText, on && { color: '#fff' }]}>{c.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {list.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📖</Text>
            <Text style={styles.emptyTitle}>这个筛选下还没有故事</Text>
            <Text style={styles.emptyText}>换个阶段或分类看看，故事正在持续补充。</Text>
            <Pressable
              style={[styles.emptyBtn, { backgroundColor: accent }]}
              onPress={() => { setStage('all'); setCategory('all'); }}
            >
              <Text style={styles.emptyBtnText}>查看全部故事</Text>
            </Pressable>
          </View>
        ) : (
          list.map((story) => (
            <Pressable
              key={story.id}
              style={styles.card}
              onPress={() => onOpenStory(story.id)}
              accessibilityRole="button"
              accessibilityLabel={`打开故事 ${story.title}`}
            >
              <View style={styles.coverWrap}>
                <AssetCover
                  cover={story.cover}
                  emoji={story.coverEmoji || '📖'}
                  color={story.coverColor}
                  bg={story.coverBg}
                  height={96}
                  radius={16}
                  label={story.title}
                />
                {!!story.audio && (
                  <View style={styles.audioBadge}>
                    <Text style={styles.audioBadgeText}>🎧 有音频</Text>
                  </View>
                )}
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.category}>
                  {story.categoryLabel || '胎教故事'} · {stageLabel(story.stage || 'pregnancy')}
                </Text>
                <Text style={styles.title} numberOfLines={1}>{story.title}</Text>
                <Text style={styles.intro} numberOfLines={2}>{story.intro || story.subtitle}</Text>
                <View style={styles.metaRow}>
                  <Text style={styles.meta}>{(story.pages || []).length} 页</Text>
                  <Text style={styles.dot}>·</Text>
                  <Text style={styles.meta}>{story.duration || '约 3 分钟'}</Text>
                  <Text style={styles.open}>开始阅读 →</Text>
                </View>
              </View>
            </Pressable>
          ))
        )}

        <Text style={styles.footer}>故事用于亲子陪伴与语言启蒙，不替代医疗建议。</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32 },
  filterLabel: { fontSize: 10, fontWeight: '800', color: '#B4745A', marginTop: 8, marginBottom: 6 },
  filters: { gap: 8, paddingBottom: 4 },
  chip: { height: 34, paddingHorizontal: 15, borderRadius: 999, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontSize: 11.5, fontWeight: '800', color: COLORS.sub },
  card: { flexDirection: 'row', gap: 12, backgroundColor: COLORS.white, borderRadius: 22, padding: 12, borderWidth: 1, borderColor: COLORS.line, marginTop: 12 },
  coverWrap: { width: 96 },
  audioBadge: { position: 'absolute', top: 7, left: 7, backgroundColor: 'rgba(76,58,44,0.72)', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
  audioBadgeText: { fontSize: 8.5, fontWeight: '800', color: '#fff' },
  cardBody: { flex: 1, minWidth: 0, justifyContent: 'center' },
  category: { fontSize: 9.5, fontWeight: '800', color: '#B4745A' },
  title: { fontSize: 15.5, fontWeight: '800', color: COLORS.ink, marginTop: 3, lineHeight: 21 },
  intro: { fontSize: 10.5, color: COLORS.sub, lineHeight: 16, marginTop: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  meta: { fontSize: 9.5, color: COLORS.muted, fontWeight: '700' },
  dot: { fontSize: 9, color: COLORS.muted },
  open: { marginLeft: 'auto', fontSize: 10, fontWeight: '800', color: COLORS.coral },
  empty: { alignItems: 'center', paddingVertical: 56, gap: 8, backgroundColor: COLORS.white, borderRadius: 22, marginTop: 12 },
  emptyEmoji: { fontSize: 42 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: COLORS.ink },
  emptyText: { fontSize: 11, color: COLORS.sub },
  emptyBtn: { height: 40, paddingHorizontal: 18, borderRadius: 13, justifyContent: 'center', marginTop: 8 },
  emptyBtnText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  footer: { fontSize: 9.5, color: COLORS.muted, textAlign: 'center', marginTop: 16, lineHeight: 15 },
});
