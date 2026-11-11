import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import ScreenHeader from '../components/ScreenHeader';
import AssetCover from '../components/AssetCover';
import { COLORS } from '../theme';
import { useStudyTimer } from '../useStudyTimer';
import type { StudyModule } from '../useStudyTimer';
import { assetUrl, STAGES } from '../sharedAdapter';
import { fmtTime, useAudioEngine } from '../media/engines';

type Props = {
  story: any;
  accent: string;
  initialPage?: number;
  onBack: () => void;
  onStudyTick: (module: StudyModule, seconds: number) => void;
  onPageChange?: (page: number) => void;
  onToast: (msg: string) => void;
};

function pagesOf(story: any): { title?: string; body: string; image?: string }[] {
  if (!story) return [];
  if (Array.isArray(story.pages) && story.pages.length) {
    return story.pages.filter((p: any) => p && p.body);
  }
  return [];
}

export default function StoryDetailScreen({ story, accent, initialPage = 0, onBack, onStudyTick, onPageChange, onToast }: Props) {
  const pages = pagesOf(story);
  const [pageIndex, setPageIndex] = useState(() => Math.max(0, Math.min(pages.length - 1, initialPage)));
  const [barWidth, setBarWidth] = useState(1);
  useStudyTimer(true, 'tasks', onStudyTick);

  const audioSrc = story && story.audio && story.audio.src ? assetUrl(story.audio.src) : null;
  const fallbackSec = (story && story.audio && story.audio.sec) || 300;
  const engine = useAudioEngine(audioSrc, fallbackSec, () => onToast('故事音频已播放完'));

  if (!story) {
    return (
      <View style={styles.flex}>
        <ScreenHeader title="故事详情" accent={accent} onBack={onBack} />
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>📖</Text>
          <Text style={styles.emptyTitle}>故事不存在</Text>
          <Text style={styles.emptyText}>内容可能已下架，返回列表看看其他故事。</Text>
          <Pressable style={[styles.emptyBtn, { backgroundColor: accent }]} onPress={onBack}>
            <Text style={styles.emptyBtnText}>返回故事列表</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const page = pages[Math.min(pageIndex, Math.max(0, pages.length - 1))];
  const percent = engine.duration ? Math.min(100, (engine.time / engine.duration) * 100) : 0;
  const playerColor = story.coverColor || accent;
  const stageText = (STAGES[story.stage] && STAGES[story.stage].label) || '孕期';

  function goPage(delta: number) {
    const next = Math.max(0, Math.min(pages.length - 1, pageIndex + delta));
    if (next === pageIndex) {
      onToast(delta > 0 ? '已经是最后一页' : '已经是第一页');
      return;
    }
    setPageIndex(next);
    onPageChange?.(next);
  }

  return (
    <View style={styles.flex}>
      <ScreenHeader title="故事详情" sub={story.categoryLabel || '胎教故事'} accent={accent} onBack={onBack} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AssetCover
          cover={story.cover}
          emoji={story.coverEmoji || '📖'}
          color={story.coverColor}
          bg={story.coverBg}
          height={168}
          radius={24}
          label={story.title}
        />

        <Text style={styles.title}>{story.title}</Text>
        <Text style={styles.subtitle}>{story.subtitle}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{stageText}</Text>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.meta}>{pages.length} 页</Text>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.meta}>{story.duration || '约 3 分钟'}</Text>
        </View>

        <View style={styles.introCard}>
          <Text style={styles.introLabel}>故事简介</Text>
          <Text style={styles.intro}>{story.intro}</Text>
        </View>

        {!!audioSrc && (
          <View style={[styles.player, { backgroundColor: playerColor }]}>
            <View style={styles.blobOne} />
            <View style={styles.blobTwo} />
            <View style={styles.playerTop}>
              <Text style={styles.tag}>音频伴读</Text>
              {engine.mode === 'sim' && <Text style={styles.simFlag}>静默演示</Text>}
              <Text style={styles.suitable}>{story.title}</Text>
            </View>

            <View style={styles.vinylWrap}>
              <View style={[styles.vinyl, { backgroundColor: 'rgba(0,0,0,0.18)' }]}>
                <View style={[styles.vinylCore, { backgroundColor: story.coverBg || '#fff' }]}>
                  <Text style={styles.vinylEmoji}>{story.coverEmoji || '🎧'}</Text>
                </View>
              </View>
              {engine.playing && <Text style={styles.playingBadge}>正在播放</Text>}
            </View>

            <Pressable
              style={styles.seek}
              onLayout={(e) => setBarWidth(Math.max(1, e.nativeEvent.layout.width))}
              onPress={(e) => {
                const x = (e.nativeEvent as any).locationX ?? 0;
                engine.seek((x / barWidth) * engine.duration);
              }}
              accessibilityLabel="故事音频进度"
            >
              <View style={styles.seekTrack} />
              <View style={[styles.seekFill, { width: `${percent}%` }]} />
            </Pressable>
            <View style={styles.timeRow}>
              <Text style={styles.timeText}>{fmtTime(engine.time)}</Text>
              <Text style={styles.timeText}>{fmtTime(engine.duration)}</Text>
            </View>

            <View style={styles.controls}>
              <Pressable style={styles.sideBtn} onPress={() => engine.seekBy(-10)} accessibilityLabel="后退10秒">
                <Text style={styles.sideText}>−10s</Text>
              </Pressable>
              <Pressable
                style={styles.playBtn}
                onPress={() => (engine.playing ? engine.pause() : engine.play())}
                accessibilityLabel={engine.playing ? '暂停故事音频' : '播放故事音频'}
              >
                <Text style={styles.playText}>{engine.playing ? '暂停' : '播放'}</Text>
              </Pressable>
              <Pressable style={styles.sideBtn} onPress={() => engine.seekBy(10)} accessibilityLabel="前进10秒">
                <Text style={styles.sideText}>+10s</Text>
              </Pressable>
            </View>

            {engine.mode === 'sim' && (
              <Text style={styles.playerNote}>素材暂时无法加载，已降级为静默演示；翻页阅读不受影响。</Text>
            )}
          </View>
        )}

        <Text style={styles.sectionTitle}>故事正文</Text>
        {!pages.length ? (
          <View style={styles.bodyCard}>
            <Text style={styles.bodyText}>故事内容正在整理，稍后再来看看。</Text>
          </View>
        ) : (
          <View style={styles.bodyCard}>
            <View style={styles.pageHead}>
              <Text style={styles.pageTitle}>{page.title || `第 ${pageIndex + 1} 页`}</Text>
              <Text style={styles.pageCount}>{Math.min(pageIndex + 1, pages.length)} / {pages.length}</Text>
            </View>
            {!!page.image && (
              <AssetCover cover={page.image} emoji="🖼️" color={story.coverColor} bg={story.coverBg} height={150} radius={14} label={page.title || story.title} />
            )}
            <Text style={styles.bodyText}>{page.body}</Text>

            <View style={styles.dots}>
              {pages.map((_: any, i: number) => (
                <Pressable
                  key={i}
                  onPress={() => { setPageIndex(i); onPageChange?.(i); }}
                  style={[styles.dotItem, i === pageIndex && { backgroundColor: accent, width: 16 }]}
                  accessibilityLabel={`第 ${i + 1} 页`}
                />
              ))}
            </View>

            <View style={styles.pageNav}>
              <Pressable
                style={[styles.pageBtn, pageIndex <= 0 && styles.pageBtnOff]}
                onPress={() => goPage(-1)}
                accessibilityLabel="上一页"
              >
                <Text style={styles.pageBtnText}>← 上一页</Text>
              </Pressable>
              <Pressable
                style={[styles.pageBtn, pageIndex >= pages.length - 1 && styles.pageBtnOff]}
                onPress={() => goPage(1)}
                accessibilityLabel="下一页"
              >
                <Text style={styles.pageBtnText}>下一页 →</Text>
              </Pressable>
            </View>

            <Pressable style={[styles.backList, { borderColor: accent }]} onPress={onBack} accessibilityLabel="返回故事列表">
              <Text style={[styles.backListText, { color: accent }]}>返回故事列表</Text>
            </Pressable>
          </View>
        )}

        <Text style={styles.footer}>故事用于亲子陪伴与语言启蒙，不替代医疗建议。</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32 },
  title: { fontSize: 21, fontWeight: '800', color: COLORS.ink, marginTop: 16, lineHeight: 28 },
  subtitle: { fontSize: 12, color: COLORS.sub, marginTop: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  meta: { fontSize: 10, color: COLORS.muted, fontWeight: '700' },
  dot: { fontSize: 9, color: COLORS.muted },
  introCard: { backgroundColor: COLORS.white, borderRadius: 18, padding: 14, marginTop: 14, borderWidth: 1, borderColor: COLORS.line },
  introLabel: { fontSize: 10, fontWeight: '800', color: '#B4745A' },
  intro: { fontSize: 12.5, color: COLORS.ink, lineHeight: 21, marginTop: 6 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: COLORS.ink, marginTop: 20, marginBottom: 8 },
  bodyCard: { backgroundColor: COLORS.white, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: COLORS.line },
  pageHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  pageTitle: { flex: 1, fontSize: 12.5, fontWeight: '800', color: COLORS.ink },
  pageCount: { fontSize: 9.5, color: COLORS.sub, fontWeight: '700' },
  bodyText: { fontSize: 13, color: COLORS.ink, lineHeight: 24 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 14 },
  dotItem: { width: 6, height: 6, borderRadius: 999, backgroundColor: '#E8DCCF' },
  pageNav: { flexDirection: 'row', gap: 8, marginTop: 12 },
  pageBtn: { flex: 1, height: 38, borderRadius: 11, backgroundColor: '#FBF7F2', borderWidth: 1, borderColor: COLORS.line, alignItems: 'center', justifyContent: 'center' },
  pageBtnOff: { opacity: 0.45 },
  pageBtnText: { fontSize: 11.5, fontWeight: '800', color: COLORS.ink },
  backList: { marginTop: 10, height: 38, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  backListText: { fontSize: 11.5, fontWeight: '800' },
  player: { marginTop: 14, borderRadius: 22, padding: 14, overflow: 'hidden' },
  blobOne: { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.12)', top: -60, right: -50 },
  blobTwo: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.10)', bottom: -50, left: -30 },
  playerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  tag: { fontSize: 9.5, color: '#fff', fontWeight: '800', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  simFlag: { fontSize: 9, color: '#FFF3C4', borderWidth: 1, borderColor: 'rgba(255,243,196,0.5)', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 3 },
  suitable: { flex: 1, textAlign: 'right', fontSize: 9, color: 'rgba(255,255,255,0.86)' },
  vinylWrap: { alignItems: 'center', marginTop: 12 },
  vinyl: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 5, borderColor: 'rgba(255,255,255,0.24)' },
  vinylCore: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  vinylEmoji: { fontSize: 22 },
  playingBadge: { marginTop: 5, fontSize: 9, color: 'rgba(255,255,255,0.9)', fontWeight: '700' },
  seek: { height: 18, justifyContent: 'center', marginTop: 10 },
  seekTrack: { height: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.26)' },
  seekFill: { position: 'absolute', height: 6, borderRadius: 999, backgroundColor: '#fff' },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  timeText: { fontSize: 9, color: 'rgba(255,255,255,0.9)' },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18, marginTop: 10 },
  sideBtn: { minWidth: 46, height: 36, alignItems: 'center', justifyContent: 'center' },
  sideText: { fontSize: 10, color: 'rgba(255,255,255,0.92)', fontWeight: '700' },
  playBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  playText: { fontSize: 13, fontWeight: '800', color: '#3B2B22' },
  playerNote: { fontSize: 9, color: 'rgba(255,255,255,0.9)', lineHeight: 14, marginTop: 10 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  emptyEmoji: { fontSize: 44 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: COLORS.ink },
  emptyText: { fontSize: 11.5, color: COLORS.sub, textAlign: 'center', lineHeight: 18 },
  emptyBtn: { height: 40, paddingHorizontal: 18, borderRadius: 13, justifyContent: 'center', marginTop: 10 },
  emptyBtnText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  footer: { fontSize: 9.5, color: COLORS.muted, textAlign: 'center', marginTop: 16, lineHeight: 15 },
});
