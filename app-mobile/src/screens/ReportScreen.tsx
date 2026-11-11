/* 家长学习报告：真实记录聚合，RN 原生视图手绘柱状图，无第三方图表库 */
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { COLORS, stageTheme } from '../theme';
import { STAGES, REPORT_MODULE_LABELS, REPORT_MODULES, STAGE_ORDER } from '../sharedAdapter';

type Props = {
  core: any;
  stageId: string;
  parentName: string;
  onBack: () => void;
};

function duration(seconds: number) {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s} 秒`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} 分钟`;
  const h = Math.floor(m / 60);
  return `${h} 小时 ${m % 60} 分`;
}

const MODULE_COLORS: Record<string, string> = {
  audio: '#F4986B',
  cards: '#E8B84B',
  video: '#7FAE7A',
  tasks: '#6E9BC5',
};

export default function ReportScreen({ core, stageId, parentName, onBack }: Props) {
  const [range, setRange] = useState<'7d' | 'week'>('7d');
  const stage = STAGES[stageId] || STAGES[STAGE_ORDER[0]];
  const theme = stageTheme(stage);
  const report = core.studyReport({ days: 7, range });
  const maxSeconds = Math.max(1, ...report.days.map((d: any) => d.seconds));
  const hasAny = report.totalSeconds > 0 || report.completion.done > 0;

  return (
    <View style={styles.flex}>
      <View style={styles.head}>
        <Pressable onPress={onBack} style={styles.back} accessibilityLabel="返回">
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <View style={styles.headCopy}>
          <Text style={styles.title}>学习报告</Text>
          <Text style={styles.sub}>{parentName} · 数据来自本机真实打卡与使用记录</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.rangeRow}>
          {[
            { key: '7d' as const, label: '近 7 天' },
            { key: 'week' as const, label: '本周' },
          ].map((opt) => {
            const on = range === opt.key;
            return (
              <Pressable key={opt.key} onPress={() => setRange(opt.key)} style={[styles.rangeChip, on && { backgroundColor: theme.accent }]}>
                <Text style={[styles.rangeText, on && { color: '#fff' }]}>{opt.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: theme.accent }]}>
            <Text style={styles.summaryLabel}>学习时长</Text>
            <Text style={styles.summaryValue}>{duration(report.totalSeconds)}</Text>
            <Text style={styles.summaryFoot}>统计范围内累计</Text>
          </View>
          <View style={styles.summaryCol}>
            <View style={styles.smallCard}>
              <Text style={styles.smallLabel}>任务完成率</Text>
              <Text style={[styles.smallValue, { color: theme.accent }]}>{report.completion.rate}%</Text>
              <Text style={styles.smallFoot}>{report.completion.done} / {report.completion.expected} 项</Text>
            </View>
            <View style={styles.smallCard}>
              <Text style={styles.smallLabel}>连续打卡</Text>
              <Text style={[styles.smallValue, { color: theme.accent }]}>🔥 {report.streak} 天</Text>
              <Text style={styles.smallFoot}>有记录 {report.activeDays} 天</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>每天学习时长</Text>
          <Text style={styles.cardSub}>柱高按当天累计秒数等比绘制</Text>
          <View style={styles.chart}>
            {report.days.map((d: any) => {
              const h = Math.round((d.seconds / maxSeconds) * 92);
              return (
                <View key={d.day} style={styles.barCol}>
                  <Text style={styles.barValue}>{d.seconds >= 60 ? `${Math.round(d.seconds / 60)}m` : d.seconds ? `${d.seconds}s` : ''}</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { height: Math.max(d.seconds > 0 ? 4 : 0, h), backgroundColor: theme.accent }]} />
                  </View>
                  <Text style={styles.barLabel}>{d.label}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>各模块时长分布</Text>
          <Text style={styles.cardSub}>进入内容页计时；音乐/视频仅在播放时累计</Text>
          {REPORT_MODULES.map((m: string) => {
            const sec = report.moduleTotals[m] || 0;
            const pct = report.totalSeconds ? Math.round((sec / report.totalSeconds) * 100) : 0;
            return (
              <View key={m} style={styles.moduleRow}>
                <Text style={styles.moduleName}>{REPORT_MODULE_LABELS[m] || m}</Text>
                <View style={styles.moduleTrack}>
                  <View style={[styles.moduleFill, { width: `${pct}%`, backgroundColor: MODULE_COLORS[m] }]} />
                </View>
                <Text style={styles.moduleValue}>{duration(sec)}</Text>
              </View>
            );
          })}
        </View>

        {!hasAny && (
          <View style={styles.emptyNote}>
            <Text style={styles.emptyNoteTitle}>还没有可用记录</Text>
            <Text style={styles.emptyNoteText}>
              这个范围内没有打卡或学习时长。去听一首儿歌、看一集动画或完成任务后，报告会自动更新；这里不会用随机数据填充。
            </Text>
          </View>
        )}

        <Text style={styles.footnote}>
          口径说明：任务完成率 = 已完成任务数 /（当前阶段每日任务数 × 统计天数）；历史阶段变化后按当前阶段任务数计算；时长按本机本地日期归天。
        </Text>
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
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 30 },
  rangeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  rangeChip: { height: 32, paddingHorizontal: 14, borderRadius: 999, backgroundColor: COLORS.white, justifyContent: 'center' },
  rangeText: { fontSize: 11, fontWeight: '800', color: COLORS.ink },
  summaryRow: { flexDirection: 'row', gap: 10 },
  summaryCard: { flex: 1, borderRadius: 20, padding: 14, justifyContent: 'center' },
  summaryLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },
  summaryValue: { fontSize: 20, fontWeight: '800', color: '#fff', marginTop: 6 },
  summaryFoot: { fontSize: 9, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  summaryCol: { flex: 1, gap: 8 },
  smallCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: 14, padding: 10 },
  smallLabel: { fontSize: 9.5, color: COLORS.sub, fontWeight: '700' },
  smallValue: { fontSize: 16, fontWeight: '800', marginTop: 3 },
  smallFoot: { fontSize: 8.5, color: COLORS.sub, marginTop: 2 },
  card: { backgroundColor: COLORS.white, borderRadius: 20, padding: 14, marginTop: 12 },
  cardTitle: { fontSize: 14, fontWeight: '800', color: COLORS.ink },
  cardSub: { fontSize: 9.5, color: COLORS.sub, marginTop: 3 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 14, height: 130 },
  barCol: { flex: 1, alignItems: 'center' },
  barValue: { fontSize: 8.5, color: COLORS.sub, height: 12 },
  barTrack: { width: 16, height: 92, borderRadius: 8, backgroundColor: '#F5EDE3', justifyContent: 'flex-end', overflow: 'hidden' },
  barFill: { width: '100%', borderRadius: 8 },
  barLabel: { fontSize: 8.5, color: COLORS.sub, marginTop: 5 },
  moduleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  moduleName: { width: 32, fontSize: 10.5, fontWeight: '700', color: COLORS.ink },
  moduleTrack: { flex: 1, height: 10, borderRadius: 999, backgroundColor: '#F5EDE3', overflow: 'hidden' },
  moduleFill: { height: '100%', borderRadius: 999 },
  moduleValue: { width: 66, textAlign: 'right', fontSize: 9.5, color: COLORS.sub },
  emptyNote: { marginTop: 12, backgroundColor: '#FFF6EC', borderRadius: 16, padding: 12 },
  emptyNoteTitle: { fontSize: 12, fontWeight: '800', color: '#8A5E48' },
  emptyNoteText: { fontSize: 10, color: '#8A5E48', lineHeight: 16, marginTop: 4 },
  footnote: { fontSize: 9, color: COLORS.sub, lineHeight: 14, marginTop: 12 },
});
