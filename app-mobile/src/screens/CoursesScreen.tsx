import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import ScreenHeader from '../components/ScreenHeader';
import AssetCover from '../components/AssetCover';
import { COLORS } from '../theme';
import { COURSE_CATEGORIES } from '../sharedAdapter';
import type { StudyModule } from '../useStudyTimer';

type Props = {
  courses: any[];
  accent: string;
  onBack: () => void;
  onOpenCourse: (id: string) => void;
  onStudyTick: (module: StudyModule, seconds: number) => void;
};

export default function CoursesScreen({ courses, accent, onBack, onOpenCourse }: Props) {
  const [category, setCategory] = useState('all');
  const list = category === 'all' ? courses : courses.filter((c) => c.category === category);

  return (
    <View style={styles.flex}>
      <ScreenHeader title="孕妈课堂" sub={`${courses.length} 门课程 · 按阶段慢慢学`} accent={accent} onBack={onBack} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {[{ id: 'all', label: '全部' }, ...COURSE_CATEGORIES].map((c) => {
            const on = category === c.id;
            return (
              <Pressable
                key={c.id}
                onPress={() => setCategory(c.id)}
                style={[styles.chip, on && { backgroundColor: accent, borderColor: accent }]}
                accessibilityRole="button"
                accessibilityLabel={`课程分类 ${c.label}`}
              >
                <Text style={[styles.chipText, on && { color: '#fff' }]}>{c.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {list.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🌱</Text>
            <Text style={styles.emptyTitle}>这个分类还没有课程</Text>
            <Text style={styles.emptyText}>课程正在整理中，先看看其他分类吧。</Text>
            <Pressable style={[styles.emptyBtn, { backgroundColor: accent }]} onPress={() => setCategory('all')}>
              <Text style={styles.emptyBtnText}>查看全部课程</Text>
            </Pressable>
          </View>
        ) : (
          list.map((course) => (
            <Pressable
              key={course.id}
              style={styles.card}
              onPress={() => onOpenCourse(course.id)}
              accessibilityRole="button"
              accessibilityLabel={`打开课程 ${course.title}`}
            >
              <View style={styles.coverWrap}>
                <AssetCover cover={course.cover} emoji={course.coverEmoji} color={course.coverColor} bg={course.coverBg} height={96} radius={16} label={course.title} />
                {course.status === 'coming' && (
                  <View style={styles.comingBadge}>
                    <Text style={styles.comingText}>制作中</Text>
                  </View>
                )}
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.category}>{course.categoryLabel || '课程'}</Text>
                <Text style={styles.title} numberOfLines={2}>{course.title}</Text>
                <Text style={styles.intro} numberOfLines={2}>{course.intro}</Text>
                <View style={styles.metaRow}>
                  <Text style={styles.meta}>{course.lessons} 节</Text>
                  <Text style={styles.dot}>·</Text>
                  <Text style={styles.meta}>{course.duration}</Text>
                  <Text style={styles.open}>{course.status === 'coming' ? '看看详情' : '开始学习'} →</Text>
                </View>
              </View>
            </Pressable>
          ))
        )}

        <Text style={styles.footer}>内容仅作日常参考，不能替代产检医生的专业建议。</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32, gap: 12 },
  filters: { gap: 8, paddingBottom: 4 },
  chip: { height: 34, paddingHorizontal: 15, borderRadius: 999, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontSize: 11.5, fontWeight: '800', color: COLORS.sub },
  card: { flexDirection: 'row', gap: 12, backgroundColor: COLORS.white, borderRadius: 22, padding: 12, borderWidth: 1, borderColor: COLORS.line },
  coverWrap: { width: 96 },
  comingBadge: { position: 'absolute', top: 7, left: 7, backgroundColor: 'rgba(76,58,44,0.72)', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
  comingText: { fontSize: 8.5, fontWeight: '800', color: '#fff' },
  cardBody: { flex: 1, minWidth: 0, justifyContent: 'center' },
  category: { fontSize: 9.5, fontWeight: '800', color: '#B4745A' },
  title: { fontSize: 15.5, fontWeight: '800', color: COLORS.ink, marginTop: 3, lineHeight: 21 },
  intro: { fontSize: 10.5, color: COLORS.sub, lineHeight: 16, marginTop: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  meta: { fontSize: 9.5, color: COLORS.muted, fontWeight: '700' },
  dot: { fontSize: 9, color: COLORS.muted },
  open: { marginLeft: 'auto', fontSize: 10, fontWeight: '800', color: COLORS.coral },
  empty: { alignItems: 'center', paddingVertical: 56, gap: 8, backgroundColor: COLORS.white, borderRadius: 22 },
  emptyEmoji: { fontSize: 42 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: COLORS.ink },
  emptyText: { fontSize: 11, color: COLORS.sub },
  emptyBtn: { height: 40, paddingHorizontal: 18, borderRadius: 13, justifyContent: 'center', marginTop: 8 },
  emptyBtnText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  footer: { fontSize: 9.5, color: COLORS.muted, textAlign: 'center', marginTop: 8, lineHeight: 15 },
});
