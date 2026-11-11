import React, { useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../theme';
import DatePicker from '../components/DatePicker';
import { ROLE_LABELS, NICKNAME_UNITS, displayName } from '../sharedAdapter';
import type { ParentRole } from '../babies';
import type { BabyProfile } from '../profile';

type Identity = { nickname: string; parentRole: ParentRole };

type Props = {
  onComplete: (profile: BabyProfile, identity: Identity) => void;
  onSkip: () => void;
};

type Step = 'entry' | 'due' | 'birth' | 'nickname' | 'role';

const PREGNANCY = { accent: '#8B6BE0', soft: '#F1EBFF', border: '#DCCDFF' };
const BORN = { accent: '#4E9EF5', soft: '#E9F3FF', border: '#CFE6FF' };
const ROLES: { value: ParentRole; label: string; emoji: string; sub: string }[] = [
  { value: 'mom', label: ROLE_LABELS.mom, emoji: '👩', sub: '称呼示例：小花生妈妈' },
  { value: 'dad', label: ROLE_LABELS.dad, emoji: '👨', sub: '称呼示例：小花生爸爸' },
  { value: 'other', label: ROLE_LABELS.other, emoji: '🧑', sub: '称呼示例：小花生家长' },
];

export default function OnboardingScreen({ onComplete, onSkip }: Props) {
  const [step, setStep] = useState<Step>('entry');
  const [draft, setDraft] = useState<BabyProfile | null>(null);
  const [nickname, setNickname] = useState('');
  const [role, setRole] = useState<ParentRole | null>(null);

  const stepLabel =
    step === 'entry'
      ? '第一次见面'
      : step === 'nickname'
        ? '怎么称呼你'
        : step === 'role'
          ? '你的身份'
          : '选日期';

  const preview = displayName({ nickname: nickname.trim(), parentRole: role || 'mom' });

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.brandRow}>
          <Text style={styles.brand}>芽芽成长</Text>
          <View style={styles.stepPill}>
            <Text style={styles.stepText}>{stepLabel}</Text>
          </View>
        </View>

        {step === 'entry' && (
          <>
            <Text style={styles.title}>宝宝多大了？</Text>
            <Text style={styles.sub}>选一次就好。之后月龄会按生日自动增长，内容也会跟着宝宝长大。</Text>

            <View style={styles.cards}>
              <Pressable
                onPress={() => setStep('due')}
                accessibilityRole="button"
                style={[styles.option, { backgroundColor: PREGNANCY.soft, borderColor: PREGNANCY.border }]}
              >
                <View style={[styles.optionEmoji, { backgroundColor: '#E4D8FF' }]}>
                  <Text style={styles.optionEmojiText}>🤰</Text>
                </View>
                <View style={styles.optionCopy}>
                  <Text style={[styles.optionTitle, { color: '#4B3290' }]}>还没出生</Text>
                  <Text style={styles.optionSub}>孕期 · 选预产期，显示倒计时</Text>
                </View>
                <Text style={[styles.optionArrow, { color: PREGNANCY.accent }]}>→</Text>
              </Pressable>

              <Pressable
                onPress={() => setStep('birth')}
                accessibilityRole="button"
                style={[styles.option, { backgroundColor: BORN.soft, borderColor: BORN.border }]}
              >
                <View style={[styles.optionEmoji, { backgroundColor: '#D6EBFF' }]}>
                  <Text style={styles.optionEmojiText}>👶</Text>
                </View>
                <View style={styles.optionCopy}>
                  <Text style={[styles.optionTitle, { color: '#1F5E9C' }]}>已经出生啦</Text>
                  <Text style={styles.optionSub}>选生日 · 月龄自动计算，阶段自动匹配</Text>
                </View>
                <Text style={[styles.optionArrow, { color: BORN.accent }]}>→</Text>
              </Pressable>
            </View>

            <Pressable style={styles.skip} onPress={onSkip} accessibilityRole="button">
              <Text style={styles.skipText}>先随便逛逛</Text>
            </Pressable>
            <Text style={styles.note}>日期只保存在本机，之后可以在「我的 · 宝宝生日」里随时修改。</Text>
          </>
        )}

        {(step === 'due' || step === 'birth') && (
          <>
            <Pressable onPress={() => setStep('entry')} accessibilityRole="button" style={styles.backBtn}>
              <Text style={styles.backText}>← 返回</Text>
            </Pressable>
            <Text style={styles.title}>{step === 'due' ? '预产期是哪天？' : '宝宝哪天出生？'}</Text>
            <Text style={styles.sub}>
              {step === 'due' ? '默认按 40 周计算，也可以自己选。' : '选到具体日期，月龄按月自动增长。'}
            </Text>
            <DatePicker
              mode={step === 'due' ? 'due' : 'birth'}
              accent={step === 'due' ? PREGNANCY.accent : BORN.accent}
              onConfirm={(date) => {
                setDraft(step === 'due' ? { pregnant: true, dueDate: date } : { pregnant: false, birthDate: date });
                setStep('nickname');
              }}
            />
          </>
        )}

        {step === 'nickname' && (
          <>
            <Pressable onPress={() => setStep(draft?.pregnant ? 'due' : 'birth')} accessibilityRole="button" style={styles.backBtn}>
              <Text style={styles.backText}>← 返回</Text>
            </Pressable>
            <Text style={styles.title}>宝宝的小名是什么？</Text>
            <Text style={styles.sub}>用来生成你的称呼，例如「小花生妈妈」。这一步可以跳过，之后在「我的」里也能改。</Text>
            <TextInput
              value={nickname}
              onChangeText={setNickname}
              placeholder="例如：小花生"
              placeholderTextColor={COLORS.sub}
              maxLength={NICKNAME_UNITS * 2}
              style={styles.input}
              accessibilityLabel="宝宝昵称"
            />
            <Text style={styles.hint}>昵称最多显示 8 个汉字 / 16 个字符，超出会截断。</Text>

            <View style={styles.previewCard}>
              <Text style={styles.previewLabel}>称呼预览</Text>
              <Text style={styles.previewValue}>{preview}</Text>
            </View>

            <Pressable
              style={styles.primary}
              onPress={() => setStep('role')}
              accessibilityRole="button"
            >
              <Text style={styles.primaryText}>{nickname.trim() ? '下一步' : '跳过昵称'}</Text>
            </Pressable>
            {!!nickname.trim() && (
              <Pressable style={styles.skip} onPress={() => { setNickname(''); setStep('role'); }} accessibilityRole="button">
                <Text style={styles.skipText}>先不填昵称</Text>
              </Pressable>
            )}
          </>
        )}

        {step === 'role' && (
          <>
            <Pressable onPress={() => setStep('nickname')} accessibilityRole="button" style={styles.backBtn}>
              <Text style={styles.backText}>← 返回</Text>
            </Pressable>
            <Text style={styles.title}>你是宝宝的？</Text>
            <Text style={styles.sub}>身份只用于称呼展示，和宝宝档案一起保存在本机。必须选择一项。</Text>
            <View style={styles.cards}>
              {ROLES.map((opt) => {
                const on = role === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => setRole(opt.value)}
                    accessibilityRole="button"
                    accessibilityLabel={`选择${opt.label}`}
                    style={[styles.option, on ? styles.roleOn : styles.roleOff]}
                  >
                    <View style={styles.optionEmoji}>
                      <Text style={styles.optionEmojiText}>{opt.emoji}</Text>
                    </View>
                    <View style={styles.optionCopy}>
                      <Text style={[styles.optionTitle, on && { color: COLORS.coral }]}>{opt.label}</Text>
                      <Text style={styles.optionSub}>{opt.sub}</Text>
                    </View>
                    <Text style={[styles.optionArrow, on && { color: COLORS.coral }]}>{on ? '✓' : ''}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              style={[styles.primary, !role && styles.primaryDisabled]}
              disabled={!role}
              onPress={() => draft && role && onComplete(draft, { nickname: nickname.trim(), parentRole: role })}
              accessibilityRole="button"
              accessibilityLabel="完成引导"
            >
              <Text style={styles.primaryText}>{role ? '完成，开始陪伴' : '请先选择身份'}</Text>
            </Pressable>
            <Text style={styles.note}>称呼会显示在首页问候、我的页和学习报告里。</Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.cream },
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 36 },
  brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { fontSize: 22, fontWeight: '800', color: COLORS.ink },
  stepPill: { backgroundColor: COLORS.white, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  stepText: { fontSize: 10, fontWeight: '700', color: COLORS.sub },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.ink, marginTop: 22, letterSpacing: 0.3 },
  sub: { fontSize: 12.5, color: COLORS.sub, lineHeight: 19, marginTop: 8 },
  backBtn: { alignSelf: 'flex-start', paddingVertical: 8, paddingRight: 12 },
  backText: { fontSize: 12, fontWeight: '700', color: COLORS.sub },

  cards: { gap: 12, marginTop: 22 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 92,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  roleOff: { backgroundColor: COLORS.white, borderColor: COLORS.line },
  roleOn: { backgroundColor: '#FFF1EA', borderColor: COLORS.coral },
  optionEmoji: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF6EC' },
  optionEmojiText: { fontSize: 28 },
  optionCopy: { flex: 1, minWidth: 0 },
  optionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.ink },
  optionSub: { fontSize: 11.5, color: COLORS.sub, marginTop: 5, lineHeight: 17 },
  optionArrow: { fontSize: 20, fontWeight: '800', color: COLORS.sub },

  input: {
    height: 52,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.line,
    paddingHorizontal: 14,
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.ink,
    marginTop: 20,
  },
  hint: { fontSize: 10, color: COLORS.sub, marginTop: 8 },
  previewCard: { marginTop: 16, backgroundColor: '#FFF1EA', borderRadius: 16, padding: 14 },
  previewLabel: { fontSize: 10, fontWeight: '800', color: '#B4745A' },
  previewValue: { fontSize: 22, fontWeight: '800', color: COLORS.coral, marginTop: 4 },
  primary: { height: 50, borderRadius: 16, backgroundColor: COLORS.coral, alignItems: 'center', justifyContent: 'center', marginTop: 22 },
  primaryDisabled: { backgroundColor: '#E8D8CD' },
  primaryText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  skip: { alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 18, marginTop: 12 },
  skipText: { fontSize: 12, fontWeight: '700', color: COLORS.muted },
  note: { fontSize: 10, color: COLORS.muted, lineHeight: 16, textAlign: 'center', marginTop: 14 },
});
