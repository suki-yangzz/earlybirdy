import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { VideoView } from 'expo-video';
import ScreenHeader from '../components/ScreenHeader';
import { COLORS, stageTheme } from '../theme';
import { STAGES } from '../sharedAdapter';
import { fmtTime, useVideoEngine } from '../media/engines';
import { useStudyTimer, StudyModule } from '../useStudyTimer';

type Props = {
  core: any;
  stageId: string;
  onBack: () => void;
  onToggleFav: (kind: string, id: string) => void;
  onToast: (msg: string) => void;
  onRecordHistory: (kind: string, id: string, stage: string) => void;
  onStudyTick: (module: StudyModule, seconds: number) => void;
};

export default function VideoScreen({ core, stageId, onBack, onToggleFav, onToast, onRecordHistory, onStudyTick }: Props) {
  const stage = STAGES[stageId];
  const theme = stageTheme(stage);
  const videos: any[] = core.getContent().videos[stageId] || [];

  const [epIndex, setEpIndex] = useState(0);
  const [quizPick, setQuizPick] = useState<number | null>(null);
  const [barWidth, setBarWidth] = useState(1);
  const pendingPlay = useRef(false);

  useEffect(() => {
    setEpIndex(0);
    setQuizPick(null);
    pendingPlay.current = false;
  }, [stageId]);

  const safeIndex = Math.min(epIndex, Math.max(0, videos.length - 1));
  const ep = videos[safeIndex];

  const engine = useVideoEngine(ep?.src || null, ep?.sec || 240, () => {
    onToast('这一集看完啦，可以换下一集 📺');
  });

  /* 浏览历史：切到某一集即记录（按宝宝隔离） */
  useEffect(() => {
    if (ep) onRecordHistory('video', ep.id, stageId);
  }, [ep?.id, stageId]);

  /* 学习时长：只在播放时累计 */
  useStudyTimer(!!engine.playing, 'video', onStudyTick);

  useEffect(() => {
    if (pendingPlay.current) {
      pendingPlay.current = false;
      engine.play();
    }
  }, [epIndex, engine]);

  useEffect(() => {
    setQuizPick(null);
  }, [epIndex]);

  if (!ep) {
    return (
      <View style={styles.flex}>
        <ScreenHeader title={stage.videoTitle} sub="这个阶段暂时没有动画" accent={theme.accent} onBack={onBack} />
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyEmoji}>🎬</Text>
          <Text style={styles.emptyTitle}>这个阶段还没有视频内容</Text>
          <Pressable style={[styles.emptyBtn, { backgroundColor: theme.accent }]} onPress={onBack}>
            <Text style={styles.emptyBtnText}>回首页</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const fav = core.isFav('video', ep.id, stageId);
  const percent = engine.duration ? Math.min(100, (engine.time / engine.duration) * 100) : 0;
  const scenes: any[] = ep.scenes || [];
  const sceneIndex = scenes.length
    ? Math.min(scenes.length - 1, Math.max(0, Math.floor((engine.time / (engine.duration || ep.sec)) * scenes.length)))
    : -1;
  const currentScene = scenes[sceneIndex] || { emoji: ep.emoji, line: ep.line };

  function selectEpisode(index: number) {
    if (index === safeIndex) {
      if (engine.playing) engine.pause();
      else engine.play();
      return;
    }
    pendingPlay.current = true;
    setEpIndex(index);
  }

  function jumpScene(index: number) {
    if (!scenes.length) return;
    const dur = engine.duration || ep.sec;
    const target = Math.min(dur - 0.2, (dur * index) / scenes.length + 0.05);
    engine.seek(target);
    if (!engine.playing) engine.play();
  }

  const answered = quizPick !== null;

  return (
    <View style={styles.flex}>
      <ScreenHeader
        title={stage.videoTitle}
        sub={stage.videoSub}
        accent={theme.accent}
        onBack={onBack}
        right={
          <Pressable
            onPress={() => {
              onToggleFav('video', ep.id);
              onToast(fav ? '已取消收藏' : '已收藏这一集 ♥');
            }}
            style={[styles.favBtn, { backgroundColor: theme.soft }]}
            accessibilityLabel="收藏"
          >
            <Text style={[styles.favText, { color: fav ? '#FF6B4A' : theme.accent }]}>{fav ? '★' : '☆'}</Text>
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.noteRow}>
          <Text style={styles.noteEmoji}>{stage.emoji}</Text>
          <Text style={styles.noteText}>{stage.videoNote || '今天看动画时，记得每 20 分钟让孩子望望远处。'}</Text>
        </View>

        <View style={[styles.videoStage, { backgroundColor: theme.accentInk }]}>
          {engine.mode === 'real' && engine.player ? (
            <VideoView player={engine.player} nativeControls={false} contentFit="cover" style={styles.videoView} />
          ) : (
            <View style={styles.sceneFallback}>
              <View style={styles.cloudOne} />
              <View style={styles.cloudTwo} />
              <Text style={styles.sun}>☀️</Text>
              <View style={styles.sceneArt}>
                <Text style={styles.sceneEmoji}>{currentScene.emoji}</Text>
                <Text style={styles.sceneLine}>{currentScene.line}</Text>
              </View>
              <View style={styles.grass} />
              {engine.playing && engine.mode === 'sim' && (
                <Text style={styles.simFlag}>静默演示 · 控件可用</Text>
              )}
            </View>
          )}

          <View style={styles.videoControls}>
            <Pressable
              style={styles.videoSeek}
              onLayout={(e) => setBarWidth(Math.max(1, e.nativeEvent.layout.width))}
              onPress={(e) => {
                const x = (e.nativeEvent as any).locationX ?? 0;
                engine.seek((x / barWidth) * engine.duration);
              }}
            >
              <View style={styles.videoSeekTrack} />
              <View style={[styles.videoSeekFill, { width: `${percent}%` }]} />
            </Pressable>
            <View style={styles.vcRow}>
              <Text style={styles.vcTime}>{fmtTime(engine.time)} / {fmtTime(engine.duration)}</Text>
              <View style={styles.vcBtns}>
                <Pressable style={styles.vcSmall} onPress={() => engine.seek(engine.time - 10)}>
                  <Text style={styles.vcSmallText}>后退10秒</Text>
                </Pressable>
                <Pressable
                  style={styles.vcPlay}
                  onPress={() => (engine.playing ? engine.pause() : engine.play())}
                  accessibilityLabel={engine.playing ? '暂停' : '播放'}
                >
                  <Text style={styles.vcPlayText}>{engine.playing ? '暂停' : '播放'}</Text>
                </Pressable>
                <Pressable style={styles.vcSmall} onPress={() => engine.seek(engine.time + 10)}>
                  <Text style={styles.vcSmallText}>前进10秒</Text>
                </Pressable>
                <Text style={styles.eyeBadge}>护眼中</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.titleRow}>
          <View style={styles.titleCopy}>
            <Text style={styles.videoTitle}>{ep.title}</Text>
            <Text style={styles.videoMeta}>第 {safeIndex + 1} 集 · 共 {videos.length} 集 · 适合 {stage.label}</Text>
          </View>
          <View style={[styles.valuePill, { backgroundColor: theme.soft }]}>
            <Text style={[styles.valueText, { color: theme.accent }]}>+{ep.value} 成长值</Text>
          </View>
        </View>

        {ep.quiz ? (
          <View style={styles.quizCard}>
            <View style={styles.quizHead}>
              <Text style={styles.quizTitle}>看完小问答</Text>
              <Text style={styles.quizSub}>选一选，看看记住了吗</Text>
            </View>
            <Text style={styles.quizQ}>{ep.quiz.q}</Text>
            <View style={styles.quizOpts}>
              {ep.quiz.options.map((opt: string, i: number) => {
                const right = i === ep.quiz.answer;
                const picked = quizPick === i;
                const show = answered && (picked || right);
                return (
                  <Pressable
                    key={i}
                    disabled={answered}
                    onPress={() => setQuizPick(i)}
                    style={[
                      styles.quizOpt,
                      show && right ? styles.quizRight : null,
                      show && !right ? styles.quizWrong : null,
                    ]}
                  >
                    <Text style={[styles.quizOptText, show && (right || !right) ? { color: '#3B2B22' } : null]}>{opt}</Text>
                  </Pressable>
                );
              })}
            </View>
            {answered && (
              <Text style={styles.quizResult}>
                {quizPick === ep.quiz.answer ? '答对啦，看得真认真 🌟' : '没关系，再看一遍就记住啦'}
              </Text>
            )}
          </View>
        ) : (
          <View style={styles.parentTip}>
            <Text style={styles.parentTipText}>
              💡 看完后可以问问宝宝：“刚才看到了什么？” 让孩子用自己的话讲一遍，比只看更有收获。
            </Text>
          </View>
        )}

        {scenes.length > 0 && (
          <>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>故事章节</Text>
              <Text style={styles.sectionMeta}>点一下跳过去</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sceneRow}>
              {scenes.map((s: any, i: number) => {
                const on = i === sceneIndex;
                return (
                  <Pressable
                    key={i}
                    onPress={() => jumpScene(i)}
                    style={[styles.sceneChip, on && { backgroundColor: theme.accent }]}
                  >
                    <Text style={[styles.sceneChipText, on && { color: '#fff' }]} numberOfLines={1}>{s.emoji} {s.line}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </>
        )}

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>更多剧集</Text>
          <Text style={styles.sectionMeta}>{videos.length} 集</Text>
        </View>
        <View style={styles.epList}>
          {videos.map((v: any, i: number) => {
            const on = i === safeIndex;
            return (
              <Pressable
                key={v.id}
                onPress={() => selectEpisode(i)}
                style={[styles.epItem, on && { borderColor: theme.accent, backgroundColor: theme.soft }]}
              >
                <Text style={styles.epArt}>{v.emoji}</Text>
                <View style={styles.epBody}>
                  <Text style={[styles.epTitle, on && { color: theme.accentInk }]}>{v.title}</Text>
                  <Text style={styles.epMeta}>第 {i + 1} 集 · 约 {Math.round(v.sec / 60)} 分钟 · +{v.value} 成长值</Text>
                </View>
                <Text style={[styles.epAction, { color: theme.accent }]}>{on && engine.playing ? '播放中' : '播放'}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.eyeNote}>
          <Text style={styles.eyeNoteText}>👀 看完一集记得看看远处，屏幕离眼睛 30 厘米以上；每天看动画不超过 30 分钟。</Text>
        </View>
        <Text style={styles.demoNote}>
          视频源为公开示例媒体，仅用于演示播放入口与进度；资源不可用时自动切换为动画演示，播放控件依然可用。
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingBottom: 30 },
  favBtn: { width: 36, height: 36, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  favText: { fontSize: 16, fontWeight: '800' },
  noteRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 20, marginBottom: 10 },
  noteEmoji: { fontSize: 18 },
  noteText: { flex: 1, fontSize: 10, color: COLORS.sub, lineHeight: 15 },
  videoStage: { marginHorizontal: 20, borderRadius: 24, overflow: 'hidden' },
  videoView: { width: '100%', height: 210 },
  sceneFallback: { height: 210, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  cloudOne: { position: 'absolute', width: 90, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.16)', top: 26, left: 22 },
  cloudTwo: { position: 'absolute', width: 70, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.12)', top: 60, right: 34 },
  sun: { position: 'absolute', top: 18, right: 22, fontSize: 22 },
  sceneArt: { alignItems: 'center', paddingHorizontal: 26 },
  sceneEmoji: { fontSize: 54 },
  sceneLine: { fontSize: 12, color: '#fff', fontWeight: '700', marginTop: 8, textAlign: 'center', lineHeight: 18 },
  grass: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 34, backgroundColor: 'rgba(255,255,255,0.12)' },
  simFlag: { position: 'absolute', top: 12, left: 12, fontSize: 9, color: '#FFF3C4', borderWidth: 1, borderColor: 'rgba(255,243,196,0.5)', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 3 },
  videoControls: { backgroundColor: 'rgba(0,0,0,0.18)', paddingHorizontal: 12, paddingVertical: 10 },
  videoSeek: { height: 16, justifyContent: 'center' },
  videoSeekTrack: { height: 5, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.3)' },
  videoSeekFill: { position: 'absolute', height: 5, borderRadius: 999, backgroundColor: '#fff' },
  vcRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  vcTime: { fontSize: 9.5, color: 'rgba(255,255,255,0.9)' },
  vcBtns: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  vcSmall: { height: 28, paddingHorizontal: 8, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center' },
  vcSmallText: { fontSize: 8.5, color: '#fff', fontWeight: '700' },
  vcPlay: { width: 52, height: 32, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  vcPlayText: { fontSize: 11.5, fontWeight: '800', color: COLORS.ink },
  eyeBadge: { fontSize: 8.5, color: 'rgba(255,255,255,0.8)' },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginHorizontal: 20, marginTop: 12 },
  titleCopy: { flex: 1, minWidth: 0, paddingRight: 8 },
  videoTitle: { fontSize: 16, fontWeight: '800', color: COLORS.ink },
  videoMeta: { fontSize: 10, color: COLORS.sub, marginTop: 3 },
  valuePill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  valueText: { fontSize: 10, fontWeight: '800' },
  quizCard: { marginHorizontal: 20, marginTop: 14, backgroundColor: COLORS.white, borderRadius: 18, padding: 14 },
  quizHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  quizTitle: { fontSize: 13, fontWeight: '800', color: COLORS.ink },
  quizSub: { fontSize: 9.5, color: COLORS.sub },
  quizQ: { fontSize: 12, color: COLORS.ink, fontWeight: '700', marginTop: 10 },
  quizOpts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  quizOpt: { minWidth: '46%', paddingHorizontal: 12, height: 36, borderRadius: 12, backgroundColor: '#F7F1EA', alignItems: 'center', justifyContent: 'center' },
  quizRight: { backgroundColor: '#D9F4E7' },
  quizWrong: { backgroundColor: '#FFE1D8' },
  quizOptText: { fontSize: 11, fontWeight: '700', color: COLORS.sub },
  quizResult: { fontSize: 10.5, color: COLORS.ink, fontWeight: '700', marginTop: 10 },
  parentTip: { marginHorizontal: 20, marginTop: 14, backgroundColor: '#FFF1E8', borderRadius: 16, padding: 12 },
  parentTipText: { fontSize: 10.5, color: '#8A5E48', lineHeight: 16 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 20, marginTop: 18, marginBottom: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: COLORS.ink },
  sectionMeta: { fontSize: 10, color: COLORS.sub },
  sceneRow: { gap: 8, paddingHorizontal: 20 },
  sceneChip: { maxWidth: 150, height: 32, paddingHorizontal: 12, borderRadius: 999, backgroundColor: COLORS.white, justifyContent: 'center' },
  sceneChipText: { fontSize: 10, fontWeight: '700', color: COLORS.ink },
  epList: { gap: 8, paddingHorizontal: 20 },
  epItem: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.white, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: COLORS.line },
  epArt: { fontSize: 24 },
  epBody: { flex: 1, minWidth: 0 },
  epTitle: { fontSize: 12.5, fontWeight: '800', color: COLORS.ink },
  epMeta: { fontSize: 9.5, color: COLORS.sub, marginTop: 2 },
  epAction: { fontSize: 10, fontWeight: '800' },
  eyeNote: { marginHorizontal: 20, marginTop: 16, backgroundColor: '#E9F3FF', borderRadius: 16, padding: 12 },
  eyeNoteText: { fontSize: 10.5, color: '#3B6A96', lineHeight: 16 },
  demoNote: { marginHorizontal: 20, marginTop: 12, fontSize: 9.5, color: COLORS.sub, lineHeight: 15 },
  emptyWrap: { flex: 1, alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 52 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: COLORS.ink, marginTop: 12 },
  emptyBtn: { marginTop: 16, height: 40, paddingHorizontal: 20, borderRadius: 999, justifyContent: 'center' },
  emptyBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },
});
