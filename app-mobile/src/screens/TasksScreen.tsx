import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { COLORS, stageTheme } from '../theme';
import { STAGE_ORDER, STAGES } from '../sharedAdapter';
import { useStudyTimer, StudyModule } from '../useStudyTimer';

type Props = {
  core: any;
  stageId: string;
  onBack: () => void;
  onToggle: (task: any) => void;
  onStudyTick: (module: StudyModule, seconds: number) => void;
};

export default function TasksScreen({ core, stageId, onBack, onToggle, onStudyTick }: Props) {
  const stage = STAGES[stageId] || STAGES[STAGE_ORDER[0]];
  const theme = stageTheme(stage);
  const stats = core.todayStats(stageId);
  const tasks = core.tasksFor(stageId);
  const percent = stats.total ? Math.round(stats.done / stats.total * 100) : 0;

  useStudyTimer(true, 'tasks', onStudyTick);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.head}>
        <Pressable onPress={onBack} style={styles.back}>
          <Text style={[styles.backText, { color: theme.accent }]}>←</Text>
        </Pressable>
        <Text style={styles.title}>今日任务</Text>
        <View style={styles.back} />
      </View>

      <View style={[styles.progressCard, { backgroundColor: theme.accent }]}>
        <View style={styles.progressHead}>
          <View>
            <Text style={styles.progressLabel}>今日已完成</Text>
            <Text style={styles.progressBig}>
              {stats.done}
              <Text style={styles.progressSmall}> / {stats.total}</Text>
            </Text>
          </View>
          <View style={styles.streakBox}>
            <Text style={styles.streakLabel}>连续打卡</Text>
            <Text style={styles.streakNum}>🔥 {stats.streak} 天</Text>
          </View>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${percent}%` }]} />
        </View>
        <View style={styles.progressFoot}>
          <Text style={styles.footText}>
            {stats.done === stats.total ? '今天圆满啦，明天继续' : `再做 ${stats.total - stats.done} 个就完成`}
          </Text>
          <Text style={styles.footText}>今日 +{stats.earned} 成长值</Text>
        </View>
      </View>

      <View style={styles.list}>
        {tasks.map((task: any) => {
          const done = core.isTaskDone(task.id, stageId);
          return (
            <Pressable
              key={task.id}
              onPress={() => onToggle(task)}
              style={[styles.task, done && styles.taskDone]}
            >
              <Text style={styles.taskEmoji}>{task.emoji}</Text>
              <View style={styles.taskBody}>
                <Text style={[styles.taskTitle, done && styles.taskTitleDone]}>{task.title}</Text>
                {!!task.sub && <Text style={styles.taskSub}>{task.sub}</Text>}
              </View>
              <View style={styles.taskRight}>
                <Text style={[styles.value, { color: theme.accent }]}>+{task.value}</Text>
                <View style={[styles.check, done && { backgroundColor: theme.accent, borderColor: theme.accent }]}>
                  <Text style={[styles.checkMark, done && { color: '#fff' }]}>{done ? '✓' : ''}</Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.tip}>
        <Text style={styles.tipText}>打卡状态已写入本地存储，关闭 App 再打开仍会保留。</Text>
      </View>
      <Text style={styles.footer}>阶段：{stage.chip} · 任务数 {stats.total}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 38, height: 38, borderRadius: 14, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 18, fontWeight: '800' },
  title: { fontSize: 17, fontWeight: '800', color: COLORS.ink },
  progressCard: { borderRadius: 24, padding: 18, marginTop: 4 },
  progressHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  progressLabel: { fontSize: 11, color: 'rgba(255,255,255,0.85)' },
  progressBig: { fontSize: 34, fontWeight: '800', color: '#fff', marginTop: 2 },
  progressSmall: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.9)' },
  streakBox: { backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  streakLabel: { fontSize: 10, color: 'rgba(255,255,255,0.9)' },
  streakNum: { fontSize: 16, fontWeight: '800', color: '#fff', marginTop: 2 },
  track: { height: 9, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.28)', marginTop: 14, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999, backgroundColor: '#fff' },
  progressFoot: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  footText: { fontSize: 10, color: 'rgba(255,255,255,0.92)' },
  list: { marginTop: 14, gap: 10 },
  task: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: 'transparent' },
  taskDone: { backgroundColor: '#F3FBF7', borderColor: '#C9EFE1' },
  taskEmoji: { fontSize: 24, marginRight: 12 },
  taskBody: { flex: 1, minWidth: 0 },
  taskTitle: { fontSize: 14, fontWeight: '800', color: COLORS.ink },
  taskTitleDone: { color: COLORS.sub, textDecorationLine: 'line-through' },
  taskSub: { fontSize: 10, color: COLORS.sub, marginTop: 3 },
  taskRight: { alignItems: 'flex-end', gap: 6 },
  value: { fontSize: 12, fontWeight: '800' },
  check: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: '#E6D9CC', alignItems: 'center', justifyContent: 'center' },
  checkMark: { fontSize: 13, fontWeight: '800' },
  tip: { marginTop: 16, backgroundColor: '#FFF1E8', borderRadius: 16, padding: 12 },
  tipText: { fontSize: 10.5, color: '#8A5E48', lineHeight: 16 },
  footer: { fontSize: 10, color: COLORS.sub, marginTop: 16, textAlign: 'center' },
});
