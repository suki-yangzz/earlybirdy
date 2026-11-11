import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { COLORS, stageTheme, greeting, iconEmoji } from '../theme';
import { STAGE_ORDER, STAGES, INTERACTIONS, profileAgeLabel, profileIsOverdue, displayName } from '../sharedAdapter';
import type { BabyProfile } from '../profile';
import type { Baby } from '../babies';

type Props = {
  core: any;
  stageId: string;
  contentInfo: { version: string; source: string; offline: boolean };
  profile: BabyProfile | null;
  baby: Baby | null;
  onOpenBabies: () => void;
  onOpenSearch: () => void;
  onOpenTasks: () => void;
  onOpenInteraction: () => void;
  onOpenEntry: (target?: string) => void;
  onOpenMine: () => void;
};

function sourceLabel(info: Props['contentInfo']) {
  if (info.offline) return info.source === 'cache' ? '离线 · 本地缓存' : '离线 · 内置内容';
  if (info.source === 'remote') return '内容已更新 · ' + info.version;
  if (info.source === 'cache') return '本地缓存 · ' + info.version;
  return '内置内容';
}

export default function HomeScreen({ core, stageId, contentInfo, profile, baby, onOpenBabies, onOpenSearch, onOpenTasks, onOpenInteraction, onOpenEntry, onOpenMine }: Props) {
  const stage = STAGES[stageId] || STAGES[STAGE_ORDER[0]];
  const theme = stageTheme(stage);
  const stats = core.todayStats(stageId);
  const interaction = INTERACTIONS[stage.interaction] || {};
  const entries = stage.entries || [];
  const progress = stats.total ? stats.done / stats.total : 0;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.head}>
        <View>
          <Text style={styles.brand}>芽芽成长</Text>
          <Text style={styles.sub}>
            {greeting()}，{baby ? displayName(baby) : '家长'} · {new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: theme.soft }]}>
          <Text style={[styles.badgeText, { color: theme.accent }]}>{sourceLabel(contentInfo)}</Text>
        </View>
      </View>

      <View style={styles.quickRow}>
        <Pressable onPress={onOpenBabies} style={[styles.babyPill, { backgroundColor: theme.soft }]} accessibilityRole="button">
          <Text style={styles.babyText}>
            {baby ? `${baby.pregnant ? '🤰' : '👶'} ${baby.name} · ${profileAgeLabel(baby as any)}` : '👶 添加宝宝档案'} ▾
          </Text>
        </Pressable>
        <Pressable onPress={onOpenSearch} style={styles.searchPill} accessibilityRole="button" accessibilityLabel="搜索">
          <Text style={styles.searchPillText}>🔍 搜索</Text>
        </Pressable>
      </View>

      <View style={styles.stageNoteWrap}>
        <Text style={styles.stageNote}>{stage.note}</Text>
      </View>

      {profile?.pregnant && (
        <Pressable
          onPress={() => onOpenEntry('courses')}
          style={[styles.pregnancy, { backgroundColor: theme.soft }]}
          accessibilityRole="button"
          accessibilityLabel="进入孕妈课堂"
        >
          <Text style={styles.pregnancyTitle}>🤰 孕期 · 预产期 {profile.dueDate || '未设置'}</Text>
          <Text style={[styles.pregnancySub, { color: theme.accent }]}>
            {profileAgeLabel(profile)}
            {profileIsOverdue(profile) ? ' · 宝宝应该出生啦，去「我的」切换' : ' · 进入孕妈课堂 →'}
          </Text>
        </Pressable>
      )}

      <View style={[styles.hero, { backgroundColor: theme.accent }]}>
        <Text style={styles.heroEmoji}>{stage.hero?.emoji || '🌱'}</Text>
        <Text style={[styles.heroTitle, { color: '#fff' }]}>
          {String(stage.hero?.title || '').replace(/<br\s*\/?>/gi, '\n')}
        </Text>
        <Text style={[styles.heroDesc, { color: 'rgba(255,255,255,0.9)' }]}>{stage.hero?.desc}</Text>
        <Pressable style={[styles.cta, { backgroundColor: '#fff' }]} onPress={onOpenInteraction}>
          <Text style={[styles.ctaText, { color: theme.accent }]}>{stage.hero?.cta || interaction.cta || '去看看'}</Text>
        </Pressable>
        {!!interaction.navLabel && (
          <Text style={[styles.interactionHint, { color: 'rgba(255,255,255,0.78)' }]}>
            本阶段主互动：{interaction.navLabel}
          </Text>
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.cardHead}>
          <Text style={styles.cardTitle}>今天的任务</Text>
          <Text style={styles.cardMeta}>{stats.done}/{stats.total} 已完成</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: theme.accent }]} />
        </View>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: theme.accent }]}>🔥 {stats.streak}</Text>
            <Text style={styles.statLabel}>连续打卡</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: COLORS.yellow }]}>+{stats.earned}</Text>
            <Text style={styles.statLabel}>今日成长值</Text>
          </View>
          <Pressable style={[styles.smallCta, { backgroundColor: theme.accent }]} onPress={onOpenTasks}>
            <Text style={styles.smallCtaText}>{stats.done === stats.total ? '看看成果' : '去打卡'}</Text>
          </Pressable>
        </View>
      </View>

      <Text style={styles.sectionTitle}>{stage.chip} · 玩中学</Text>
      <View style={styles.grid}>
        {entries.map((entry: any, idx: number) => (
          <Pressable key={idx} style={styles.entry} onPress={() => onOpenEntry(entry.target)}>
            <Text style={styles.entryEmoji}>{iconEmoji(entry.icon)}</Text>
            <Text style={styles.entryTitle}>{entry.title}</Text>
            <Text style={styles.entrySub}>{entry.sub}</Text>
            <Text style={[styles.entryGo, { color: theme.accent }]}>打开 →</Text>
          </Pressable>
        ))}
      </View>

      {(stage.tips || []).length > 0 && (
        <View style={styles.tipCard}>
          {(stage.tips || []).map((tip: any, idx: number) => (
            <Text key={idx} style={styles.tipText}>
              {iconEmoji(tip.icon)} {tip.title}：{tip.text}
            </Text>
          ))}
        </View>
      )}

      <Text style={styles.footer}>
        内容源：{contentInfo.source} · 版本 {contentInfo.version}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 },
  head: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  brand: { fontSize: 22, fontWeight: '800', color: COLORS.ink },
  sub: { fontSize: 12, color: COLORS.sub, marginTop: 4 },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, maxWidth: 180 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  quickRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  babyPill: { flex: 1, height: 34, borderRadius: 999, paddingHorizontal: 12, justifyContent: 'center' },
  babyText: { fontSize: 11, fontWeight: '800', color: COLORS.ink },
  searchPill: { height: 34, paddingHorizontal: 12, borderRadius: 999, backgroundColor: COLORS.white, justifyContent: 'center' },
  searchPillText: { fontSize: 11, fontWeight: '800', color: COLORS.ink },
  pregnancy: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12 },
  pregnancyTitle: { fontSize: 12, fontWeight: '800', color: COLORS.ink },
  pregnancySub: { fontSize: 11, fontWeight: '700', marginTop: 4 },
  stageNoteWrap: { marginTop: 2, marginBottom: 12 },
  stageNote: { fontSize: 11, color: COLORS.sub },
  hero: { borderRadius: 26, padding: 18, shadowColor: '#784F28', shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  heroEmoji: { fontSize: 34 },
  heroTitle: { fontSize: 18, fontWeight: '800', marginTop: 8 },
  heroDesc: { fontSize: 12, marginTop: 4, lineHeight: 18 },
  cta: { alignSelf: 'flex-start', marginTop: 14, height: 40, paddingHorizontal: 18, borderRadius: 999, justifyContent: 'center' },
  ctaText: { fontSize: 13, fontWeight: '800' },
  interactionHint: { fontSize: 10, marginTop: 10, opacity: 0.75 },
  card: { backgroundColor: COLORS.white, borderRadius: 22, padding: 16, marginTop: 14, shadowColor: '#784F28', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '800', color: COLORS.ink },
  cardMeta: { fontSize: 11, color: COLORS.sub },
  progressTrack: { height: 9, borderRadius: 999, backgroundColor: '#F5EDE3', marginTop: 12, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999 },
  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  stat: { alignItems: 'center' },
  statNum: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 10, color: COLORS.sub, marginTop: 2 },
  smallCta: { height: 34, paddingHorizontal: 14, borderRadius: 999, justifyContent: 'center' },
  smallCtaText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: COLORS.ink, marginTop: 20, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  entry: { width: '48%', backgroundColor: COLORS.white, borderRadius: 18, padding: 13, shadowColor: '#784F28', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 1 },
  entryEmoji: { fontSize: 22 },
  entryTitle: { fontSize: 13, fontWeight: '800', color: COLORS.ink, marginTop: 6 },
  entrySub: { fontSize: 10, color: COLORS.sub, marginTop: 3 },
  entryGo: { fontSize: 9.5, fontWeight: '800', marginTop: 7 },
  tipCard: { backgroundColor: '#FFF1E8', borderRadius: 18, padding: 13, marginTop: 16, gap: 6 },
  tipText: { fontSize: 11, color: '#8A5E48', lineHeight: 17 },
  footer: { fontSize: 10, color: COLORS.sub, marginTop: 18, textAlign: 'center' },
});
