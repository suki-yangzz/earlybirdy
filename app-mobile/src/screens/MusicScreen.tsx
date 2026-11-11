import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import ScreenHeader from '../components/ScreenHeader';
import { COLORS, stageTheme } from '../theme';
import { STAGES } from '../sharedAdapter';
import { fmtTime, useAudioEngine } from '../media/engines';
import { useStudyTimer, StudyModule } from '../useStudyTimer';

type Props = {
  core: any;
  stageId: string;
  initialTrackId?: string | null;
  onConsumeInitialTrack?: () => void;
  onBack: () => void;
  onToggleFav: (kind: string, id: string) => void;
  onToast: (msg: string) => void;
  onRecordHistory: (kind: string, id: string, stage: string) => void;
  onStudyTick: (module: StudyModule, seconds: number) => void;
};

const SLEEP_OPTIONS = [
  { value: 0, label: '关闭' },
  { value: 15, label: '15 分钟' },
  { value: 30, label: '30 分钟' },
  { value: 60, label: '60 分钟' },
];

export default function MusicScreen({ core, stageId, initialTrackId, onConsumeInitialTrack, onBack, onToggleFav, onToast, onRecordHistory, onStudyTick }: Props) {
  const stage = STAGES[stageId];
  const theme = stageTheme(stage);
  const tracks: any[] = core.getContent().tracks[stageId] || [];

  const [trackIndex, setTrackIndex] = useState(0);
  const [loop, setLoop] = useState(false);
  const [sleepMin, setSleepMin] = useState(0);
  const [sleepOpen, setSleepOpen] = useState(false);
  const [barWidth, setBarWidth] = useState(1);
  const pendingPlay = useRef(false);
  const loopRef = useRef(loop);
  const indexRef = useRef(trackIndex);
  loopRef.current = loop;
  indexRef.current = trackIndex;

  useEffect(() => {
    setTrackIndex(0);
    setLoop(false);
    setSleepMin(0);
    setSleepOpen(false);
  }, [stageId]);

  /* 从收藏/历史点某首曲子进入时，直接定位到那一首 */
  useEffect(() => {
    if (!initialTrackId) return;
    const idx = tracks.findIndex((item: any) => item.id === initialTrackId);
    if (idx >= 0) setTrackIndex(idx);
    onConsumeInitialTrack && onConsumeInitialTrack();
  }, [initialTrackId, stageId]);

  const safeIndex = Math.min(trackIndex, Math.max(0, tracks.length - 1));
  const track = tracks[safeIndex];

  const engineRef = useRef<any>(null);
  const engine = useAudioEngine(track?.src || null, track?.sec || 240, () => {
    if (loopRef.current) {
      engineRef.current?.seek(0);
      engineRef.current?.play();
      return;
    }
    if (tracks.length <= 1) {
      engineRef.current?.seek(0);
      return;
    }
    pendingPlay.current = true;
    setTrackIndex((prev) => (prev + 1) % tracks.length);
  });
  engineRef.current = engine;

  /* 浏览历史：切到某首曲子即记录（按宝宝隔离） */
  useEffect(() => {
    if (track) onRecordHistory('audio', track.id, stageId);
  }, [track?.id, stageId]);

  /* 学习时长：仅在真正播放时累计 */
  useStudyTimer(!!engine.playing, 'audio', onStudyTick);

  useEffect(() => {
    if (pendingPlay.current) {
      pendingPlay.current = false;
      engine.play();
    }
  }, [trackIndex, engine]);

  useEffect(() => {
    if (sleepMin <= 0) return;
    const timer = setTimeout(() => {
      engineRef.current?.pause();
      setSleepMin(0);
      onToast('定时到啦，音乐已暂停 🌙');
    }, sleepMin * 60 * 1000);
    return () => clearTimeout(timer);
  }, [sleepMin, onToast]);

  function selectTrack(index: number, autoplay: boolean) {
    const total = tracks.length;
    if (!total) return;
    const next = (index + total) % total;
    if (next === safeIndex) {
      if (engine.playing) engine.pause();
      else engine.play();
      return;
    }
    pendingPlay.current = autoplay;
    setTrackIndex(next);
    if (!autoplay) {
      pendingPlay.current = false;
    }
  }

  if (!track) {
    return (
      <View style={styles.flex}>
        <ScreenHeader title={stage.audioTitle} sub="音频内容" accent={theme.accent} onBack={onBack} />
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyEmoji}>🎧</Text>
          <Text style={styles.emptyTitle}>这个阶段还没有音频内容</Text>
          <Pressable style={[styles.emptyBtn, { backgroundColor: theme.accent }]} onPress={onBack}>
            <Text style={styles.emptyBtnText}>回首页</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const fav = core.isFav('audio', track.id, stageId);
  const percent = engine.duration ? Math.min(100, (engine.time / engine.duration) * 100) : 0;

  return (
    <View style={styles.flex}>
      <ScreenHeader
        title={stage.audioTitle}
        sub={stage.audioSub}
        accent={theme.accent}
        onBack={onBack}
        right={
          <Pressable
            onPress={() => setSleepOpen((v) => !v)}
            style={[styles.timerBtn, sleepMin > 0 && { backgroundColor: theme.soft }]}
            accessibilityLabel="定时关闭"
          >
            <Text style={[styles.timerText, { color: theme.accent }]}>{sleepMin > 0 ? `${sleepMin}分` : '⏰'}</Text>
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.noteRow}>
          <Text style={styles.noteEmoji}>{stage.emoji}</Text>
          <Text style={styles.noteText}>{stage.audioNote}</Text>
        </View>

        <View style={[styles.player, { backgroundColor: theme.accent }]}>
          <View style={styles.blobOne} />
          <View style={styles.blobTwo} />
          <View style={styles.playerTop}>
            <Text style={styles.tag}>{stage.audioTagline}</Text>
            {engine.mode === 'sim' && engine.playing && <Text style={styles.simFlag}>静默演示</Text>}
            <Text style={styles.suitable}>{stage.audioSuitable}</Text>
          </View>

          <View style={styles.vinylWrap}>
            <View style={[styles.vinyl, { backgroundColor: theme.accentInk }]}>
              <View style={[styles.vinylCore, { backgroundColor: theme.soft }]}>
                <Text style={styles.vinylEmoji}>{track.emoji}</Text>
              </View>
            </View>
            {engine.playing && <Text style={styles.playingBadge}>正在播放</Text>}
          </View>

          <Text style={styles.songTitle}>{track.title}</Text>
          <Text style={styles.songArtist}>{track.artist}</Text>

          <Pressable
            style={styles.seek}
            onLayout={(e) => setBarWidth(Math.max(1, e.nativeEvent.layout.width))}
            onPress={(e) => {
              const x = (e.nativeEvent as any).locationX ?? 0;
              engine.seek((x / barWidth) * engine.duration);
            }}
          >
            <View style={styles.seekTrack} />
            <View style={[styles.seekFill, { width: `${percent}%` }]} />
          </Pressable>
          <View style={styles.timeRow}>
            <Text style={styles.timeText}>{fmtTime(engine.time)}</Text>
            <Text style={styles.timeText}>{fmtTime(engine.duration)}</Text>
          </View>

          <View style={styles.controls}>
            <Pressable
              style={styles.sideBtn}
              onPress={() => {
                onToggleFav('audio', track.id);
                onToast(fav ? '已取消收藏' : '已收藏这首曲子 ♥');
              }}
            >
              <Text style={[styles.sideText, fav && { color: '#FFE1A3' }]}>{fav ? '♥ 已收藏' : '♡ 收藏'}</Text>
            </Pressable>
            <Pressable style={styles.sideBtn} onPress={() => selectTrack(safeIndex - 1, true)}>
              <Text style={styles.sideText}>上一首</Text>
            </Pressable>
            <Pressable
              style={styles.playBtn}
              onPress={() => (engine.playing ? engine.pause() : engine.play())}
              accessibilityLabel={engine.playing ? '暂停' : '播放'}
            >
              <Text style={styles.playText}>{engine.playing ? '暂停' : '播放'}</Text>
            </Pressable>
            <Pressable style={styles.sideBtn} onPress={() => selectTrack(safeIndex + 1, true)}>
              <Text style={styles.sideText}>下一首</Text>
            </Pressable>
            <Pressable style={styles.sideBtn} onPress={() => setSleepOpen((v) => !v)}>
              <Text style={[styles.sideText, sleepMin > 0 && { color: '#FFE1A3' }]}>定时</Text>
            </Pressable>
          </View>
        </View>

        {sleepOpen && (
          <View style={styles.sleepCard}>
            <View style={styles.sleepHead}>
              <Text style={styles.sleepTitle}>定时与循环</Text>
              <Pressable onPress={() => setSleepOpen(false)}>
                <Text style={styles.closeText}>收起</Text>
              </Pressable>
            </View>
            <Text style={styles.sleepHint}>哄睡时定时关闭，不吵到宝宝</Text>
            <View style={styles.optionRow}>
              {SLEEP_OPTIONS.map((opt) => {
                const on = sleepMin === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => {
                      setSleepMin(opt.value);
                      onToast(opt.value ? `已设置 ${opt.value} 分钟后自动暂停` : '已关闭定时');
                    }}
                    style={[styles.option, on && { backgroundColor: theme.accent }]}
                  >
                    <Text style={[styles.optionText, on && { color: '#fff' }]}>{opt.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              style={styles.loopRow}
              onPress={() => {
                setLoop((v) => !v);
                onToast(loop ? '已关闭单曲循环' : '已开启单曲循环');
              }}
            >
              <View style={styles.loopCopy}>
                <Text style={styles.loopTitle}>单曲循环</Text>
                <Text style={styles.loopSub}>一首听到底，自动重新开始</Text>
              </View>
              <View style={[styles.switch, loop && { backgroundColor: theme.accent }]}>
                <View style={[styles.knob, loop && styles.knobOn]} />
              </View>
            </Pressable>
            <Text style={styles.sleepHint}>定时只在本页面生效，离开页面会自动取消</Text>
          </View>
        )}

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>全部曲目</Text>
          <Text style={styles.sectionMeta}>{tracks.length} 首 · 点一下切换</Text>
        </View>
        <View style={styles.list}>
          {tracks.map((t: any, i: number) => {
            const on = i === safeIndex;
            return (
              <Pressable
                key={t.id}
                onPress={() => selectTrack(i, true)}
                style={[styles.songItem, on && { borderColor: theme.accent, backgroundColor: theme.soft }]}
              >
                <Text style={styles.songEmoji}>{t.emoji}</Text>
                <View style={styles.songBody}>
                  <Text style={[styles.songName, on && { color: theme.accentInk }]}>{t.title}</Text>
                  <Text style={styles.songMeta}>{t.artist}</Text>
                </View>
                <Text style={[styles.songAction, { color: theme.accent }]}>
                  {on && engine.playing ? '播放中' : '播放'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.parentTip}>
          <Text style={styles.parentTipText}>💡 {stage.audioTip}</Text>
        </View>
        <Text style={styles.demoNote}>
          音源为公开示例音频，仅用于演示播放器交互；资源不可用时自动切换为静默演示，进度、收藏和定时依然可用。
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingBottom: 30 },
  timerBtn: { width: 38, height: 38, borderRadius: 14, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  timerText: { fontSize: 12, fontWeight: '800' },
  noteRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 20, marginBottom: 10 },
  noteEmoji: { fontSize: 18 },
  noteText: { flex: 1, fontSize: 10, color: COLORS.sub, lineHeight: 15 },
  player: { marginHorizontal: 20, borderRadius: 26, padding: 16, overflow: 'hidden', shadowColor: '#784F28', shadowOpacity: 0.2, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
  blobOne: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.12)', top: -70, right: -60 },
  blobTwo: { position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.10)', bottom: -60, left: -40 },
  playerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  tag: { fontSize: 9.5, color: '#fff', fontWeight: '800', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  simFlag: { fontSize: 9, color: '#FFF3C4', borderWidth: 1, borderColor: 'rgba(255,243,196,0.5)', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 3 },
  suitable: { fontSize: 9.5, color: 'rgba(255,255,255,0.86)' },
  vinylWrap: { alignItems: 'center', marginTop: 14 },
  vinyl: { width: 128, height: 128, borderRadius: 64, alignItems: 'center', justifyContent: 'center', borderWidth: 6, borderColor: 'rgba(255,255,255,0.28)' },
  vinylCore: { width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center' },
  vinylEmoji: { fontSize: 26 },
  playingBadge: { marginTop: 6, fontSize: 9, color: 'rgba(255,255,255,0.9)', fontWeight: '700' },
  songTitle: { fontSize: 17, fontWeight: '800', color: '#fff', textAlign: 'center', marginTop: 8 },
  songArtist: { fontSize: 10.5, color: 'rgba(255,255,255,0.86)', textAlign: 'center', marginTop: 3 },
  seek: { height: 18, justifyContent: 'center', marginTop: 12 },
  seekTrack: { height: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.26)' },
  seekFill: { position: 'absolute', height: 6, borderRadius: 999, backgroundColor: '#fff' },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  timeText: { fontSize: 9.5, color: 'rgba(255,255,255,0.9)' },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  sideBtn: { minWidth: 52, height: 38, alignItems: 'center', justifyContent: 'center' },
  sideText: { fontSize: 10, color: 'rgba(255,255,255,0.92)', fontWeight: '700' },
  playBtn: { width: 62, height: 62, borderRadius: 31, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  playText: { fontSize: 14, fontWeight: '800', color: '#3B2B22' },
  sleepCard: { marginHorizontal: 20, marginTop: 12, backgroundColor: COLORS.white, borderRadius: 18, padding: 14 },
  sleepHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sleepTitle: { fontSize: 14, fontWeight: '800', color: COLORS.ink },
  closeText: { fontSize: 10.5, color: COLORS.sub, fontWeight: '700' },
  sleepHint: { fontSize: 9.5, color: COLORS.sub, marginTop: 4 },
  optionRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  option: { flex: 1, height: 34, borderRadius: 12, backgroundColor: '#F7F1EA', alignItems: 'center', justifyContent: 'center' },
  optionText: { fontSize: 10.5, fontWeight: '800', color: COLORS.ink },
  loopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  loopCopy: { flex: 1 },
  loopTitle: { fontSize: 12, fontWeight: '800', color: COLORS.ink },
  loopSub: { fontSize: 9.5, color: COLORS.sub, marginTop: 2 },
  switch: { width: 46, height: 26, borderRadius: 13, backgroundColor: '#E8DED3', padding: 3 },
  knob: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
  knobOn: { alignSelf: 'flex-end' },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 20, marginTop: 18, marginBottom: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: COLORS.ink },
  sectionMeta: { fontSize: 10, color: COLORS.sub },
  list: { gap: 8, paddingHorizontal: 20 },
  songItem: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.white, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: COLORS.line },
  songEmoji: { fontSize: 24 },
  songBody: { flex: 1, minWidth: 0 },
  songName: { fontSize: 13, fontWeight: '800', color: COLORS.ink },
  songMeta: { fontSize: 9.5, color: COLORS.sub, marginTop: 2 },
  songAction: { fontSize: 10.5, fontWeight: '800' },
  parentTip: { marginHorizontal: 20, marginTop: 16, backgroundColor: '#FFF1E8', borderRadius: 16, padding: 12 },
  parentTipText: { fontSize: 10.5, color: '#8A5E48', lineHeight: 16 },
  demoNote: { marginHorizontal: 20, marginTop: 12, fontSize: 9.5, color: COLORS.sub, lineHeight: 15 },
  emptyWrap: { flex: 1, alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 52 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: COLORS.ink, marginTop: 12 },
  emptyBtn: { marginTop: 16, height: 40, paddingHorizontal: 20, borderRadius: 999, justifyContent: 'center' },
  emptyBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },
});
