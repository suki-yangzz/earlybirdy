import React, { useEffect, useMemo, useState } from 'react';
import { Image, PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import ScreenHeader from '../components/ScreenHeader';
import { COLORS, stageTheme, iconEmoji } from '../theme';
import { STAGES, assetUrl } from '../sharedAdapter';
import { speakWord, stopSpeech } from '../media/speech';
import { useStudyTimer, StudyModule } from '../useStudyTimer';

type Props = {
  core: any;
  stageId: string;
  parentName: string;
  onBack: () => void;
  onMarkLearned: (topicId: string, index: number) => boolean;
  onToggleFav: (kind: string, id: string) => void;
  onRecordHistory: (kind: string, id: string, stage: string) => void;
  onStudyTick: (module: StudyModule, seconds: number) => void;
  onToast: (msg: string) => void;
};

export default function CardsScreen({ core, stageId, parentName, onBack, onMarkLearned, onToggleFav, onRecordHistory, onStudyTick, onToast }: Props) {
  const stage = STAGES[stageId];
  const theme = stageTheme(stage);
  const deck = core.getContent().decks[stageId];
  const topics: any[] = deck?.topics || [];

  const [topicIndex, setTopicIndex] = useState(0);
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [artFailed, setArtFailed] = useState(false);

  useEffect(() => {
    setTopicIndex(0);
    setCardIndex(0);
    setFlipped(false);
  }, [stageId]);

  const topic = topics[Math.min(topicIndex, Math.max(0, topics.length - 1))];
  const cards: any[] = topic?.cards || [];
  const card = cards[Math.min(cardIndex, Math.max(0, cards.length - 1))];

  useEffect(() => {
    setArtFailed(false);
  }, [card?.image]);

  /* 浏览历史 + 卡片模块学习时长（进入页面即开始计时） */
  useEffect(() => {
    if (topic && card) onRecordHistory('card', topic.id + ':' + cardIndex, stageId);
  }, [topic?.id, cardIndex, stageId]);
  useStudyTimer(true, 'cards', onStudyTick);

  /* 离开卡片页停止朗读，避免后台继续读 */
  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, []);

  const learned = topic ? core.learnedCount(topic.id, cards.length, stageId) : 0;
  const totalLearned = topics.reduce((sum: number, t: any) => sum + core.learnedCount(t.id, t.cards.length, stageId), 0);
  const totalCards = topics.reduce((sum: number, t: any) => sum + t.cards.length, 0);

  function step(delta: number) {
    if (!cards.length) return;
    setCardIndex((prev) => (prev + delta + cards.length) % cards.length);
    setFlipped(false);
  }

  function chooseTopic(idx: number) {
    setTopicIndex(idx);
    setCardIndex(0);
    setFlipped(false);
  }

  async function speak() {
    if (!card) return;
    const result = await speakWord(card.word);
    onToast(result.ok ? `正在朗读：${card.word}` : `没有检测到语音输出（可能设备静音或缺少 TTS），可以看拼音：${card.pinyin}`);
  }

  function know() {
    if (!topic || !card) return;
    const isNew = onMarkLearned(topic.id, cardIndex);
    onToast(isNew ? `又学会一张：${card.word} ⭐` : `这张已经学会啦：${card.word}`);
    if (cardIndex < cards.length - 1) {
      setCardIndex(cardIndex + 1);
      setFlipped(false);
    } else {
      onToast('这一组卡片都认过一遍啦 🎉');
    }
  }

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_evt, gesture) => Math.abs(gesture.dx) > 12,
        onPanResponderRelease: (_evt, gesture) => {
          if (Math.abs(gesture.dx) > 45 && Math.abs(gesture.dx) > Math.abs(gesture.dy)) {
            step(gesture.dx < 0 ? 1 : -1);
            return;
          }
          if (Math.abs(gesture.dx) < 10 && Math.abs(gesture.dy) < 10) {
            setFlipped((v) => !v);
          }
        },
      }),
    // step 依赖当前的 cardIndex/cards，长度变化时重新创建
    [cards.length, cardIndex]
  );

  if (!deck || !topic) {
    return (
      <View style={styles.flex}>
        <ScreenHeader title={stage.cardsTitle} sub="这个阶段暂时没有卡片" accent={theme.accent} onBack={onBack} />
        <ScrollView contentContainerStyle={styles.emptyWrap}>
          <Text style={styles.emptyEmoji}>🃏</Text>
          <Text style={styles.emptyTitle}>这个阶段还没有卡片内容</Text>
          <Text style={styles.emptyText}>去其他阶段看看，或者回首页看看今天的专属内容。</Text>
          <Pressable style={[styles.emptyBtn, { backgroundColor: theme.accent }]} onPress={onBack}>
            <Text style={styles.emptyBtnText}>回首页</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  const mono = !!deck.mono;
  const percent = cards.length ? Math.round((learned / cards.length) * 100) : 0;
  const cardKey = topic.id + ':' + cardIndex;
  const fav = core.isFav('card', cardKey, stageId);

  return (
    <View style={styles.flex}>
      <ScreenHeader
        title={stage.cardsTitle}
        sub={`第 ${cardIndex + 1} / ${cards.length} 张 · ${topic.name}`}
        accent={theme.accent}
        onBack={onBack}
        right={
          <View style={[styles.starChip, { backgroundColor: theme.soft }]}>
            <Text style={[styles.starText, { color: theme.accent }]}>⭐ {totalLearned}/{totalCards}</Text>
          </View>
        }
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.topicRow}>
          {topics.map((t: any, i: number) => {
            const on = i === topicIndex;
            return (
              <Pressable
                key={t.id}
                onPress={() => chooseTopic(i)}
                style={[styles.topicChip, on ? { backgroundColor: theme.accent } : { backgroundColor: COLORS.white }]}
              >
                <Text style={[styles.topicText, on ? { color: '#fff' } : { color: COLORS.ink }]}>
                  {t.emoji} {t.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View {...pan.panHandlers} style={styles.cardWrap}>
          <View
            style={[
              styles.card,
              { backgroundColor: flipped ? '#FFFDF9' : mono ? '#FFFFFF' : theme.soft },
              mono && !flipped ? styles.monoCard : null,
            ]}
          >
            {!flipped ? (
              <>
                {card.image && !artFailed ? (
                  <Image
                    source={{ uri: assetUrl(card.image) }}
                    style={styles.artImage}
                    resizeMode="contain"
                    onError={() => setArtFailed(true)}
                  />
                ) : (
                  <Text style={[styles.art, mono && styles.artMono]}>{card.art}</Text>
                )}
                <Text style={styles.word}>{card.word}</Text>
                <Text style={styles.pinyin}>{card.pinyin}</Text>
              </>
            ) : (
              <>
                <View style={[styles.hintPill, { backgroundColor: theme.soft }]}>
                  <Text style={[styles.hintText, { color: theme.accent }]}>卡片背面 · 给{parentName}的小提示</Text>
                </View>
                <Text style={styles.tipTitle}>{card.tip}</Text>
                <Text style={styles.tipFact}>{card.fact}</Text>
                <View style={styles.sentenceBox}>
                  <Text style={styles.sentenceLabel}>可以说</Text>
                  <Text style={styles.sentence}>{card.sentence}</Text>
                </View>
              </>
            )}
          </View>
          <Pressable style={[styles.arrow, styles.arrowLeft]} onPress={() => step(-1)} accessibilityLabel="上一张">
            <Text style={styles.arrowText}>‹</Text>
          </Pressable>
          <Pressable style={[styles.arrow, styles.arrowRight]} onPress={() => step(1)} accessibilityLabel="下一张">
            <Text style={styles.arrowText}>›</Text>
          </Pressable>
        </View>

        <View style={styles.actions}>
          <Pressable style={styles.action} onPress={speak}>
            <Text style={styles.actionText}>🔊 朗读</Text>
          </Pressable>
          <Pressable style={styles.action} onPress={() => setFlipped((v) => !v)}>
            <Text style={styles.actionText}>🔄 翻面</Text>
          </Pressable>
          <Pressable
            style={[styles.action, fav && { borderColor: theme.accent, backgroundColor: theme.soft }]}
            onPress={() => {
              onToggleFav('card', cardKey);
              onToast(fav ? '已取消收藏这张卡片' : '已收藏这张卡片 ♥');
            }}
          >
            <Text style={[styles.actionText, fav && { color: theme.accent }]}>{fav ? '♥ 已收藏' : '♡ 收藏'}</Text>
          </Pressable>
          <Pressable style={[styles.action, styles.actionAccent, { backgroundColor: theme.accent }]} onPress={know}>
            <Text style={[styles.actionText, { color: '#fff' }]}>✓ 学会</Text>
          </Pressable>
        </View>

        <View style={styles.progressCard}>
          <View style={styles.progressHead}>
            <Text style={styles.progressLabel}>{topic.name} · 已学会</Text>
            <Text style={[styles.progressNum, { color: theme.accent }]}>{learned} / {cards.length}</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${percent}%`, backgroundColor: theme.accent }]} />
          </View>
          <Text style={styles.note}>左右滑动卡片可以翻页，点卡片可以翻面；学习进度会自动保存</Text>
        </View>

        <Text style={styles.sectionTitle}>这一组卡片</Text>
        <View style={styles.thumbs}>
          {cards.map((c: any, i: number) => {
            const on = i === cardIndex;
            const learnedOne = core.isCardLearned(topic.id, i, stageId);
            return (
              <Pressable
                key={i}
                onPress={() => { setCardIndex(i); setFlipped(false); }}
                style={[styles.thumb, on && { borderColor: theme.accent }]}
              >
                <Text style={styles.thumbArt}>{c.art}</Text>
                <Text style={[styles.thumbWord, learnedOne && { color: theme.accent }]}>
                  {learnedOne ? '✓ ' : ''}{c.word}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {(stage.tips || []).length > 0 && (
          <View style={styles.tipCard}>
            {(stage.tips || []).map((tip: any, idx: number) => (
              <Text key={idx} style={styles.tipLine}>{iconEmoji(tip.icon)} {tip.title}：{tip.text}</Text>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingBottom: 30 },
  starChip: { paddingHorizontal: 8, height: 26, borderRadius: 999, justifyContent: 'center' },
  starText: { fontSize: 10, fontWeight: '800' },
  topicRow: { gap: 8, paddingHorizontal: 20, paddingBottom: 10 },
  topicChip: { paddingHorizontal: 12, height: 32, borderRadius: 999, justifyContent: 'center' },
  topicText: { fontSize: 11, fontWeight: '700' },
  cardWrap: { marginHorizontal: 20, marginTop: 2 },
  card: {
    height: 226,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    shadowColor: '#784F28',
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  monoCard: { borderWidth: 2, borderColor: '#3B2B22' },
  art: { fontSize: 72 },
  artMono: { fontSize: 82 },
  artImage: { width: '68%', height: 150 },
  word: { fontSize: 26, fontWeight: '800', color: COLORS.ink, marginTop: 10 },
  pinyin: { fontSize: 13, color: COLORS.sub, marginTop: 4, letterSpacing: 1 },
  hintPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, marginBottom: 8 },
  hintText: { fontSize: 9.5, fontWeight: '800' },
  tipTitle: { fontSize: 15, fontWeight: '800', color: COLORS.ink, textAlign: 'center', lineHeight: 22 },
  tipFact: { fontSize: 11, color: COLORS.sub, marginTop: 8, lineHeight: 17, textAlign: 'center' },
  sentenceBox: { marginTop: 12, backgroundColor: '#FFF6EC', borderRadius: 12, padding: 10, width: '100%' },
  sentenceLabel: { fontSize: 9, color: COLORS.sub, fontWeight: '700' },
  sentence: { fontSize: 13, fontWeight: '800', color: '#8A5E48', marginTop: 3 },
  arrow: { position: 'absolute', top: '44%', width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
  arrowLeft: { left: 8 },
  arrowRight: { right: 8 },
  arrowText: { fontSize: 18, fontWeight: '800', color: COLORS.sub, marginTop: -2 },
  actions: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginTop: 12 },
  action: { flex: 1, height: 40, borderRadius: 14, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.line },
  actionAccent: { borderColor: 'transparent' },
  actionText: { fontSize: 11.5, fontWeight: '800', color: COLORS.ink },
  progressCard: { marginHorizontal: 20, marginTop: 14, backgroundColor: COLORS.white, borderRadius: 18, padding: 14 },
  progressHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: { fontSize: 11, fontWeight: '800', color: COLORS.ink },
  progressNum: { fontSize: 12, fontWeight: '800' },
  track: { height: 7, borderRadius: 999, backgroundColor: '#F5EDE3', marginTop: 8, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999 },
  note: { fontSize: 9.5, color: COLORS.sub, marginTop: 8, lineHeight: 15 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: COLORS.ink, marginTop: 18, marginBottom: 8, paddingHorizontal: 20 },
  thumbs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20 },
  thumb: { width: '22%', backgroundColor: COLORS.white, borderRadius: 14, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: COLORS.line },
  thumbArt: { fontSize: 22 },
  thumbWord: { fontSize: 9.5, fontWeight: '700', color: COLORS.ink, marginTop: 3 },
  tipCard: { marginHorizontal: 20, marginTop: 16, backgroundColor: '#FFF1E8', borderRadius: 16, padding: 12, gap: 6 },
  tipLine: { fontSize: 10.5, color: '#8A5E48', lineHeight: 16 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingHorizontal: 30 },
  emptyEmoji: { fontSize: 52 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: COLORS.ink, marginTop: 12 },
  emptyText: { fontSize: 11, color: COLORS.sub, marginTop: 6, textAlign: 'center', lineHeight: 17 },
  emptyBtn: { marginTop: 16, height: 40, paddingHorizontal: 20, borderRadius: 999, justifyContent: 'center' },
  emptyBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },
});
