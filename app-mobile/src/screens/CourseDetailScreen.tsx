import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { VideoView } from 'expo-video';
import ScreenHeader from '../components/ScreenHeader';
import AssetCover from '../components/AssetCover';
import { COLORS } from '../theme';
import { useStudyTimer } from '../useStudyTimer';
import type { StudyModule } from '../useStudyTimer';
import { assetUrl } from '../sharedAdapter';
import { fmtTime, useAudioEngine, useVideoEngine } from '../media/engines';

type Props = {
  course: any;
  accent: string;
  isFav: boolean;
  onBack: () => void;
  onToggleFav: () => void;
  onStudyTick: (module: StudyModule, seconds: number) => void;
  onToast: (msg: string) => void;
  getProgress?: (chapterId: string) => { sec?: number; page?: number } | null;
  onSaveProgress?: (chapterId: string, patch: { sec?: number; page?: number }) => void;
};

const TYPE_LABEL: Record<string, string> = { article: '图文', audio: '音频', video: '视频' };

function chapterType(ch: any): 'article' | 'audio' | 'video' {
  const t = ch && (ch.type || ch.kind);
  return t === 'audio' || t === 'video' ? t : 'article';
}

function splitLong(text: string): string[] {
  const chunks: string[] = [];
  let rest = text;
  while (rest.length > 150) {
    let cut = rest.lastIndexOf('。', 150);
    if (cut < 60) cut = rest.lastIndexOf('；', 150);
    if (cut < 60) cut = 150;
    chunks.push(rest.slice(0, cut + 1).trim());
    rest = rest.slice(cut + 1).trim();
  }
  if (rest) chunks.push(rest);
  return chunks;
}

/** 章节页：优先用 pages；没有就把 body 按空行/长度拆页，保证长文可翻页 */
function pagesOf(ch: any): { title?: string; body: string; image?: string }[] {
  if (Array.isArray(ch.pages) && ch.pages.length) {
    return ch.pages.filter((p: any) => p && p.body);
  }
  const text = String(ch.body || '').trim();
  if (!text) return [];
  const paragraphs = text.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
  if (paragraphs.length > 1) {
    const out: { body: string }[] = [];
    for (let i = 0; i < paragraphs.length; i += 2) out.push({ body: paragraphs.slice(i, i + 2).join('\n\n') });
    return out;
  }
  return splitLong(text).map((body) => ({ body }));
}

export default function CourseDetailScreen({ course, accent, isFav, onBack, onToggleFav, onStudyTick, onToast, getProgress, onSaveProgress }: Props) {
  const [openArticleId, setOpenArticleId] = useState<string | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [activePlayableId, setActivePlayableId] = useState<string | null>(null);
  const [barWidth, setBarWidth] = useState(1);
  const pendingSeek = useRef<number | null>(null);
  const lastSavedSec = useRef(-1);
  const progressReader = useRef(getProgress);
  progressReader.current = getProgress;
  useStudyTimer(true, 'tasks', onStudyTick);

  const chapters: any[] = (course && course.chapters) || [];
  const activeChapter = chapters.find((c) => c.id === activePlayableId) || null;
  const isVideoChapter = !!activeChapter && chapterType(activeChapter) === 'video';
  const saved = activeChapter && progressReader.current ? progressReader.current(activeChapter.id) : null;

  /* 音频 / 视频共用同一套进度、收藏与切章节逻辑，只切换底层引擎 */
  const audioSrc = activeChapter && !isVideoChapter && activeChapter.src ? assetUrl(activeChapter.src) : null;
  const videoSrc = activeChapter && isVideoChapter && activeChapter.src ? assetUrl(activeChapter.src) : null;
  const fallbackSec = (activeChapter && activeChapter.sec) || 600;
  const handleEnd = () => onToast('本章已播放完');
  const audioEngine = useAudioEngine(audioSrc, fallbackSec, handleEnd);
  const videoEngine = useVideoEngine(videoSrc, fallbackSec, handleEnd);
  const engine = isVideoChapter ? videoEngine : audioEngine;

  /* 切章节：先暂停旧音轨，再恢复上次位置 */
  useEffect(() => {
    if (!activeChapter) {
      pendingSeek.current = null;
      lastSavedSec.current = -1;
      return;
    }
    const prev = progressReader.current ? progressReader.current(activeChapter.id) : null;
    pendingSeek.current = prev && prev.sec ? prev.sec : null;
    lastSavedSec.current = prev && prev.sec ? prev.sec : -1;
  }, [activeChapter && activeChapter.id]);

  useEffect(() => {
    if (pendingSeek.current == null) return;
    /* 等真实媒体就绪再定位，否则设置 currentTime 会被播放器丢弃 */
    if (engine.mode === 'real' && engine.duration > 0) {
      engine.seek(pendingSeek.current);
      pendingSeek.current = null;
    }
  }, [engine.duration, engine.mode]);

  /* 播放位置按 5 秒 / 暂停时落盘，避免频繁写存储 */
  useEffect(() => {
    if (!activeChapter) return;
    const sec = Math.floor(engine.time);
    const prev = lastSavedSec.current;
    if (!engine.playing) {
      if (sec >= 1 && sec !== prev) {
        lastSavedSec.current = sec;
        onSaveProgress?.(activeChapter.id, { sec });
      }
      return;
    }
    if (prev < 0 || sec - prev >= 5) {
      lastSavedSec.current = sec;
      onSaveProgress?.(activeChapter.id, { sec });
    }
  }, [engine.time, engine.playing, activeChapter && activeChapter.id]);

  if (!course) {
    return (
      <View style={styles.flex}>
        <ScreenHeader title="课程详情" accent={accent} onBack={onBack} />
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>📚</Text>
          <Text style={styles.emptyTitle}>课程不存在</Text>
          <Text style={styles.emptyText}>内容可能已下架，返回列表看看其他课程。</Text>
          <Pressable style={[styles.emptyBtn, { backgroundColor: accent }]} onPress={onBack}>
            <Text style={styles.emptyBtnText}>返回课程列表</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  function closePlayer() {
    if (activeChapter && engine.time >= 1) onSaveProgress?.(activeChapter.id, { sec: Math.floor(engine.time) });
    engine.pause();
    setActivePlayableId(null);
  }

  function openChapter(ch: any) {
    if (ch.locked) {
      onToast(ch.lockText || '该章节暂未解锁');
      return;
    }
    const type = chapterType(ch);
    if (type === 'article') {
      if (!pagesOf(ch).length) {
        onToast('本章图文正在整理，稍后再来看看');
        return;
      }
      if (openArticleId === ch.id) {
        setOpenArticleId(null);
        return;
      }
      const prev = progressReader.current ? progressReader.current(ch.id) : null;
      setPageIndex(prev && typeof prev.page === 'number' ? prev.page : 0);
      setOpenArticleId(ch.id);
      setActivePlayableId(null);
      engine.pause();
      return;
    }
    if (activePlayableId === ch.id) {
      if (engine.playing) engine.pause();
      else engine.play();
      return;
    }
    if (activeChapter && engine.time >= 1) onSaveProgress?.(activeChapter.id, { sec: Math.floor(engine.time) });
    engine.pause();
    setOpenArticleId(null);
    setActivePlayableId(ch.id);
  }

  function goRelative(from: any, delta: number) {
    const idx = chapters.indexOf(from);
    const target = chapters[idx + delta];
    if (!target) {
      onToast(delta > 0 ? '已经是最后一节' : '已经是第一节');
      return;
    }
    if (target.locked) {
      onToast(target.lockText || '该章节暂未解锁');
      return;
    }
    openChapter(target);
  }

  function goPage(ch: any, delta: number) {
    const pages = pagesOf(ch);
    const next = Math.max(0, Math.min(pages.length - 1, pageIndex + delta));
    if (next === pageIndex) {
      onToast(delta > 0 ? '已经是最后一页' : '已经是第一页');
      return;
    }
    setPageIndex(next);
    onSaveProgress?.(ch.id, { page: next });
  }

  const percent = engine.duration ? Math.min(100, (engine.time / engine.duration) * 100) : 0;
  const playerColor = course.coverColor || accent;
  const savedSec = saved && saved.sec ? saved.sec : 0;

  return (
    <View style={styles.flex}>
      <ScreenHeader
        title="课程详情"
        sub={course.categoryLabel}
        accent={accent}
        onBack={onBack}
        right={
          <Pressable onPress={onToggleFav} accessibilityLabel={isFav ? '取消收藏课程' : '收藏课程'} style={styles.favBtn}>
            <Text style={[styles.favText, isFav && { color: COLORS.coral }]}>{isFav ? '♥' : '♡'}</Text>
          </Pressable>
        }
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AssetCover cover={course.cover} emoji={course.coverEmoji} color={course.coverColor} bg={course.coverBg} height={168} radius={24} label={course.title} />

        <View style={styles.titleRow}>
          <Text style={styles.title}>{course.title}</Text>
          {course.status === 'coming' && (
            <View style={styles.comingBadge}><Text style={styles.comingText}>制作中</Text></View>
          )}
        </View>
        <Text style={styles.subtitle}>{course.subtitle}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{course.lessons} 节</Text>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.meta}>{course.duration}</Text>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.meta}>{isFav ? '已收藏' : '未收藏'}</Text>
        </View>

        <View style={styles.introCard}>
          <Text style={styles.introLabel}>课程简介</Text>
          <Text style={styles.intro}>{course.intro}</Text>
        </View>

        {course.status === 'coming' && (
          <View style={styles.comingNotice}>
            <Text style={styles.comingNoticeTitle}>课程制作中</Text>
            <Text style={styles.comingNoticeText}>可以先收藏，上线后会在「我的收藏」里找到。下面章节暂未解锁。</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>章节 · {chapters.length}</Text>
        {chapters.length === 0 ? (
          <View style={styles.chapterEmpty}>
            <Text style={styles.emptyText}>章节整理中，稍后再来看看。</Text>
          </View>
        ) : (
          chapters.map((ch: any, idx: number) => {
            const type = chapterType(ch);
            const isOpen = openArticleId === ch.id;
            const isPlaying = activePlayableId === ch.id;
            const pages = type === 'article' ? pagesOf(ch) : [];
            const page = pages[Math.min(pageIndex, Math.max(0, pages.length - 1))];
            return (
              <View key={ch.id} style={[styles.chapter, (isOpen || isPlaying) && styles.chapterOpen]}>
                <Pressable onPress={() => openChapter(ch)} accessibilityRole="button" accessibilityLabel={`章节 ${ch.title}`}>
                  <View style={styles.chapterHead}>
                    <View style={[styles.index, { backgroundColor: ch.locked ? '#F2EEE9' : course.coverBg }]}>
                      <Text style={[styles.indexText, { color: ch.locked ? COLORS.muted : course.coverColor }]}>{ch.locked ? '🔒' : idx + 1}</Text>
                    </View>
                    <View style={styles.chapterCopy}>
                      <Text style={[styles.chapterTitle, ch.locked && { color: COLORS.sub }]}>{ch.title}</Text>
                      <Text style={styles.chapterMeta}>
                        {TYPE_LABEL[type]} · {ch.duration}{ch.locked ? ` · ${ch.lockText || '未解锁'}` : ''}
                      </Text>
                    </View>
                    <Text style={[styles.chapterGo, { color: ch.locked ? COLORS.muted : accent }]}>
                      {ch.locked ? '待解锁' : isPlaying ? (engine.playing ? '暂停' : '继续') : isOpen ? '收起' : type === 'article' ? '阅读' : '播放'}
                    </Text>
                  </View>
                </Pressable>

                {isPlaying && type !== 'video' && (
                  <View style={[styles.player, { backgroundColor: playerColor }]}>
                    <View style={styles.blobOne} />
                    <View style={styles.blobTwo} />
                    <View style={styles.playerTop}>
                      <Text style={styles.tag}>{TYPE_LABEL[type]}</Text>
                      {engine.mode === 'sim' && <Text style={styles.simFlag}>静默演示</Text>}
                      <Text style={styles.suitable}>{course.title}</Text>
                    </View>

                    <View style={styles.vinylWrap}>
                      <View style={[styles.vinyl, { backgroundColor: 'rgba(0,0,0,0.18)' }]}>
                        <View style={[styles.vinylCore, { backgroundColor: course.coverBg || '#fff' }]}>
                          <Text style={styles.vinylEmoji}>{course.coverEmoji || '🎵'}</Text>
                        </View>
                      </View>
                      {engine.playing && <Text style={styles.playingBadge}>正在播放</Text>}
                    </View>

                    <Text style={styles.songTitle}>{ch.title}</Text>
                    <Text style={styles.songArtist}>{course.title}</Text>
                    {savedSec > 0 && (
                      <Text style={styles.lastPos}>上次听到 {fmtTime(savedSec)}</Text>
                    )}

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
                      <Pressable style={styles.sideBtn} onPress={onToggleFav}>
                        <Text style={[styles.sideText, isFav && { color: '#FFE1A3' }]}>{isFav ? '♥ 已收藏' : '♡ 收藏'}</Text>
                      </Pressable>
                      <Pressable style={styles.sideBtn} onPress={() => goRelative(ch, -1)}>
                        <Text style={styles.sideText}>上一节</Text>
                      </Pressable>
                      <Pressable
                        style={styles.playBtn}
                        onPress={() => (engine.playing ? engine.pause() : engine.play())}
                        accessibilityLabel={engine.playing ? '暂停' : '播放'}
                      >
                        <Text style={styles.playText}>{engine.playing ? '暂停' : '播放'}</Text>
                      </Pressable>
                      <Pressable style={styles.sideBtn} onPress={() => goRelative(ch, 1)}>
                        <Text style={styles.sideText}>下一节</Text>
                      </Pressable>
                      <Pressable style={styles.sideBtn} onPress={closePlayer}>
                        <Text style={styles.sideText}>收起</Text>
                      </Pressable>
                    </View>

                    {!ch.src && (
                      <Text style={styles.playerNote}>音频素材缺失，已切换为静默演示：进度、收藏与切章节仍可用。</Text>
                    )}
                    {!!ch.src && engine.mode === 'sim' && (
                      <Text style={styles.playerNote}>素材暂时无法加载，已降级为静默演示，不会卡住页面。</Text>
                    )}
                  </View>
                )}

                {isPlaying && type === 'video' && (
                  <View style={[styles.player, { backgroundColor: playerColor }]}>
                    <View style={styles.blobOne} />
                    <View style={styles.blobTwo} />
                    <View style={styles.playerTop}>
                      <Text style={styles.tag}>视频</Text>
                      {videoEngine.error && <Text style={styles.simFlag}>静默演示</Text>}
                      <Text style={styles.suitable}>{ch.title}</Text>
                    </View>

                    <View style={styles.videoStage}>
                      {videoEngine.player && !videoEngine.error ? (
                        <View>
                          <VideoView player={videoEngine.player} nativeControls={false} contentFit="cover" style={styles.videoView} />
                          {videoEngine.mode === 'sim' && (
                            <Text style={styles.videoLoading}>视频加载中…控件已可用，不会卡住页面</Text>
                          )}
                        </View>
                      ) : (
                        <View style={styles.videoFallback}>
                          <AssetCover
                            cover={course.cover}
                            emoji="🎬"
                            color={course.coverColor}
                            bg={course.coverBg}
                            height={150}
                            radius={14}
                            label={ch.title}
                          />
                          <Text style={styles.videoFallbackText}>
                            {!ch.src
                              ? '视频素材缺失，暂时无法播放，可先看其他章节。'
                              : videoEngine.error
                                ? '视频加载失败，已降级为占位提示；播放、进度与左右 10 秒仍可用，不会卡住页面。'
                                : '视频准备中，请稍候；播放、进度与左右 10 秒仍可用。'}
                          </Text>
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
                          accessibilityLabel="视频进度"
                        >
                          <View style={styles.videoSeekTrack} />
                          <View style={[styles.videoSeekFill, { width: `${percent}%` }]} />
                        </Pressable>
                        <View style={styles.vcRow}>
                          <Text style={styles.vcTime}>{fmtTime(engine.time)} / {fmtTime(engine.duration)}</Text>
                          <View style={styles.vcBtns}>
                            <Pressable style={styles.vcSmall} onPress={() => engine.seekBy(-10)} accessibilityLabel="后退10秒">
                              <Text style={styles.vcSmallText}>后退10秒</Text>
                            </Pressable>
                            <Pressable
                              style={styles.vcPlay}
                              onPress={() => (engine.playing ? engine.pause() : engine.play())}
                              accessibilityLabel={engine.playing ? '暂停' : '播放'}
                            >
                              <Text style={styles.vcPlayText}>{engine.playing ? '暂停' : '播放'}</Text>
                            </Pressable>
                            <Pressable style={styles.vcSmall} onPress={() => engine.seekBy(10)} accessibilityLabel="前进10秒">
                              <Text style={styles.vcSmallText}>前进10秒</Text>
                            </Pressable>
                          </View>
                        </View>
                      </View>
                    </View>

                    {savedSec > 0 && (
                      <Text style={styles.lastPos}>上次看到 {fmtTime(savedSec)}</Text>
                    )}

                    <View style={styles.controls}>
                      <Pressable style={styles.sideBtn} onPress={onToggleFav}>
                        <Text style={[styles.sideText, isFav && { color: '#FFE1A3' }]}>{isFav ? '♥ 已收藏' : '♡ 收藏'}</Text>
                      </Pressable>
                      <Pressable style={styles.sideBtn} onPress={() => goRelative(ch, -1)}>
                        <Text style={styles.sideText}>上一节</Text>
                      </Pressable>
                      <Pressable style={styles.sideBtn} onPress={() => goRelative(ch, 1)}>
                        <Text style={styles.sideText}>下一节</Text>
                      </Pressable>
                      <Pressable style={styles.sideBtn} onPress={closePlayer}>
                        <Text style={styles.sideText}>收起</Text>
                      </Pressable>
                    </View>
                  </View>
                )}

                {isOpen && (
                  <View style={styles.bodyBox}>
                    {!pages.length ? (
                      <Text style={styles.bodyText}>本章图文正在整理，稍后再来看看。</Text>
                    ) : (
                      <>
                        <View style={styles.pageHead}>
                          <Text style={styles.pageTitle}>{page.title || `第 ${pageIndex + 1} 页`}</Text>
                          <Text style={styles.pageCount}>{Math.min(pageIndex + 1, pages.length)} / {pages.length}</Text>
                        </View>
                        {!!page.image && (
                          <AssetCover cover={page.image} emoji="🖼️" color={course.coverColor} bg={course.coverBg} height={150} radius={14} label={page.title || ch.title} />
                        )}
                        <Text style={styles.bodyText}>{page.body}</Text>
                        <View style={styles.pageNav}>
                          <Pressable
                            style={[styles.pageBtn, pageIndex <= 0 && styles.pageBtnOff]}
                            onPress={() => goPage(ch, -1)}
                            accessibilityLabel="上一页"
                          >
                            <Text style={styles.pageBtnText}>← 上一页</Text>
                          </Pressable>
                          <Pressable
                            style={[styles.pageBtn, pageIndex >= pages.length - 1 && styles.pageBtnOff]}
                            onPress={() => goPage(ch, 1)}
                            accessibilityLabel="下一页"
                          >
                            <Text style={styles.pageBtnText}>下一页 →</Text>
                          </Pressable>
                        </View>
                      </>
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}

        <Text style={styles.footer}>本课程为日常科普参考，如有身体不适或指标异常，请及时就医。</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32 },
  favBtn: { width: 38, height: 38, borderRadius: 14, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  favText: { fontSize: 19, fontWeight: '800', color: COLORS.sub },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 16 },
  title: { flex: 1, fontSize: 21, fontWeight: '800', color: COLORS.ink, lineHeight: 28 },
  comingBadge: { backgroundColor: '#4C3A2C', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, marginTop: 4 },
  comingText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  subtitle: { fontSize: 12, color: COLORS.sub, marginTop: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  meta: { fontSize: 10, color: COLORS.muted, fontWeight: '700' },
  dot: { fontSize: 9, color: COLORS.muted },
  introCard: { backgroundColor: COLORS.white, borderRadius: 18, padding: 14, marginTop: 14, borderWidth: 1, borderColor: COLORS.line },
  introLabel: { fontSize: 10, fontWeight: '800', color: '#B4745A' },
  intro: { fontSize: 12.5, color: COLORS.ink, lineHeight: 21, marginTop: 6 },
  comingNotice: { backgroundColor: '#FFF6EC', borderRadius: 16, padding: 13, marginTop: 12 },
  comingNoticeTitle: { fontSize: 12, fontWeight: '800', color: '#B4745A' },
  comingNoticeText: { fontSize: 10.5, color: '#8A6A58', lineHeight: 17, marginTop: 4 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: COLORS.ink, marginTop: 20, marginBottom: 8 },
  chapter: { backgroundColor: COLORS.white, borderRadius: 16, borderWidth: 1, borderColor: COLORS.line, padding: 12, marginBottom: 8 },
  chapterOpen: { borderColor: '#F0C9B8', backgroundColor: '#FFFDFB' },
  chapterHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  index: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  indexText: { fontSize: 13, fontWeight: '800' },
  chapterCopy: { flex: 1, minWidth: 0 },
  chapterTitle: { fontSize: 12.5, fontWeight: '800', color: COLORS.ink },
  chapterMeta: { fontSize: 9.5, color: COLORS.sub, marginTop: 3 },
  chapterGo: { fontSize: 9.5, fontWeight: '800' },
  bodyBox: { marginTop: 10, backgroundColor: '#FBF7F2', borderRadius: 12, padding: 12 },
  bodyText: { fontSize: 12, color: COLORS.ink, lineHeight: 21 },
  pageHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  pageTitle: { flex: 1, fontSize: 12.5, fontWeight: '800', color: COLORS.ink },
  pageCount: { fontSize: 9.5, color: COLORS.sub, fontWeight: '700' },
  pageNav: { flexDirection: 'row', gap: 8, marginTop: 12 },
  pageBtn: { flex: 1, height: 36, borderRadius: 11, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line, alignItems: 'center', justifyContent: 'center' },
  pageBtnOff: { opacity: 0.45 },
  pageBtnText: { fontSize: 11, fontWeight: '800', color: COLORS.ink },
  player: { marginTop: 12, borderRadius: 22, padding: 14, overflow: 'hidden' },
  blobOne: { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.12)', top: -60, right: -50 },
  blobTwo: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.10)', bottom: -50, left: -30 },
  playerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  tag: { fontSize: 9.5, color: '#fff', fontWeight: '800', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  simFlag: { fontSize: 9, color: '#FFF3C4', borderWidth: 1, borderColor: 'rgba(255,243,196,0.5)', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 3 },
  suitable: { flex: 1, textAlign: 'right', fontSize: 9, color: 'rgba(255,255,255,0.86)' },
  vinylWrap: { alignItems: 'center', marginTop: 12 },
  vinyl: { width: 108, height: 108, borderRadius: 54, alignItems: 'center', justifyContent: 'center', borderWidth: 5, borderColor: 'rgba(255,255,255,0.24)' },
  vinylCore: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  vinylEmoji: { fontSize: 24 },
  playingBadge: { marginTop: 5, fontSize: 9, color: 'rgba(255,255,255,0.9)', fontWeight: '700' },
  songTitle: { fontSize: 15, fontWeight: '800', color: '#fff', textAlign: 'center', marginTop: 8 },
  songArtist: { fontSize: 10, color: 'rgba(255,255,255,0.86)', textAlign: 'center', marginTop: 3 },
  lastPos: { fontSize: 9, color: '#FFF3C4', textAlign: 'center', marginTop: 4 },
  seek: { height: 18, justifyContent: 'center', marginTop: 10 },
  seekTrack: { height: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.26)' },
  seekFill: { position: 'absolute', height: 6, borderRadius: 999, backgroundColor: '#fff' },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  timeText: { fontSize: 9, color: 'rgba(255,255,255,0.9)' },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  sideBtn: { minWidth: 46, height: 36, alignItems: 'center', justifyContent: 'center' },
  sideText: { fontSize: 9.5, color: 'rgba(255,255,255,0.92)', fontWeight: '700' },
  playBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  playText: { fontSize: 13, fontWeight: '800', color: '#3B2B22' },
  playerNote: { fontSize: 9, color: 'rgba(255,255,255,0.9)', lineHeight: 14, marginTop: 10 },
  videoStage: { marginTop: 12, borderRadius: 18, overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.16)' },
  videoView: { width: '100%', height: 190 },
  videoFallback: { padding: 12, gap: 8 },
  videoFallbackText: { fontSize: 9.5, color: 'rgba(255,255,255,0.92)', lineHeight: 15 },
  videoLoading: { fontSize: 9, color: 'rgba(255,255,255,0.85)', paddingHorizontal: 12, paddingBottom: 8 },
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
  vcPlayText: { fontSize: 11.5, fontWeight: '800', color: '#3B2B22' },
  chapterEmpty: { backgroundColor: COLORS.white, borderRadius: 16, padding: 20, alignItems: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  emptyEmoji: { fontSize: 44 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: COLORS.ink },
  emptyText: { fontSize: 11.5, color: COLORS.sub, textAlign: 'center', lineHeight: 18 },
  emptyBtn: { height: 40, paddingHorizontal: 18, borderRadius: 13, justifyContent: 'center', marginTop: 10 },
  emptyBtnText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  footer: { fontSize: 9.5, color: COLORS.muted, textAlign: 'center', marginTop: 16, lineHeight: 15 },
});
