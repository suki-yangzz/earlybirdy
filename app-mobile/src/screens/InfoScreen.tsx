import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import ScreenHeader from '../components/ScreenHeader';
import { COLORS } from '../theme';
import { asyncStorage } from '../storage';
import { appVersionLabel, sdkVersionLabel } from '../appVersion';

export type InfoMode = 'about' | 'help' | 'privacy';

type Props = {
  mode: InfoMode;
  accent: string;
  onBack: () => void;
  onToast: (msg: string) => void;
};

const FAQ = [
  { q: '宝宝月龄和阶段不准怎么办？', a: '到「我的 · 宝宝档案」修改生日或预产期，阶段、主题色、任务和互动内容会立即同步。' },
  { q: '换手机会丢数据吗？', a: '会。当前所有数据只保存在本机，换设备、清除浏览器缓存或卸载 App 都会丢失，建议截图保留重要记录。' },
  { q: '成长值怎么获得？', a: '完成每日任务、打卡和亲子互动会获得成长值，可以在商城兑换礼物。成长值与购物车、订单为账号共享。' },
  { q: '孕妈课堂的课程为什么有锁？', a: '标注「制作中 / 待解锁」的章节尚未上线，点击会给出明确提示，不会静默无响应。' },
  { q: '打卡提醒没有弹出？', a: '需要允许通知权限；Web 端只保存设置，不会定时弹出系统通知。被拒绝时可在「我的 · 打卡提醒」里重新去设置开启。' },
];

const PRIVACY = [
  ['我们保存什么', '宝宝昵称、家长身份、生日/预产期、打卡、收藏、浏览历史、学习时长、成长值、购物车与订单。它们仅保存在本机存储（Web 为 localStorage，原生为 AsyncStorage）。'],
  ['我们不收集什么', '本应用当前不包含账号体系，不上传宝宝档案与学习记录，不做跨设备同步，也不接入第三方广告 SDK。'],
  ['通知与麦克风', '打卡提醒只使用本地通知能力；卡片朗读使用系统语音合成，不会录音或上传音频。'],
  ['如何删除', '「我的 · 清空体验数据」可清除当前宝宝的体验数据；开发模式下还提供「彻底重置」，删除全部本机数据并回到首次引导。'],
  ['儿童隐私', '应用面向家长使用，内容与记录由家长主动录入。请勿在昵称中填写真实姓名、证件号等敏感信息。'],
  ['联系我们', '如对隐私有疑问，可通过应用商店页面的开发者联系方式与我们联系。'],
];

export default function InfoScreen({ mode, accent, onBack, onToast }: Props) {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [feedback, setFeedback] = useState('');
  const [sending, setSending] = useState(false);

  const title = mode === 'about' ? '关于我们' : mode === 'help' ? '帮助与反馈' : '隐私政策';
  const versionLabel = appVersionLabel();
  const sdkLabel = sdkVersionLabel();

  async function submitFeedback() {
    const text = feedback.trim();
    if (!text) {
      onToast('请先写下你的问题或建议');
      return;
    }
    setSending(true);
    try {
      const key = 'yy.v1.feedback';
      const raw = await asyncStorage.getItem(key);
      const list = raw ? JSON.parse(raw) : [];
      list.unshift({ text, at: new Date().toISOString() });
      await asyncStorage.setItem(key, JSON.stringify(list.slice(0, 50)));
      setFeedback('');
      onToast('已记录反馈，感谢你的建议');
    } catch (err) {
      onToast('反馈保存失败，请稍后再试');
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={styles.flex}>
      <ScreenHeader title={title} accent={accent} onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {mode === 'about' && (
          <>
            <View style={[styles.logo, { backgroundColor: accent }]}>
              <Text style={styles.logoText}>🌱</Text>
            </View>
            <Text style={styles.appName}>芽芽成长</Text>
            <Text style={styles.version}>版本 {versionLabel}</Text>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>我们在做什么</Text>
              <Text style={styles.paragraph}>
                芽芽成长是一款面向孕妈与 0～6 岁家庭的陪伴型内容应用：按宝宝阶段推荐胎教音乐、认知卡、动画和亲子任务，用每日打卡把内容变成可以坚持的小习惯。
              </Text>
              <Text style={styles.paragraph}>
                我们希望界面足够安静、信息足够清楚，让家长在忙碌里也能快速找到今天能做的一件事。所有阶段内容仅作日常参考，不能替代医生的专业建议。
              </Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>当前版本</Text>
              <View style={styles.infoRow}><Text style={styles.infoLabel}>应用版本</Text><Text style={styles.infoValue}>{versionLabel}</Text></View>
              {!!sdkLabel && <View style={styles.infoRow}><Text style={styles.infoLabel}>Expo SDK</Text><Text style={styles.infoValue}>{sdkLabel}</Text></View>}
              <View style={styles.infoRow}><Text style={styles.infoLabel}>内容模式</Text><Text style={styles.infoValue}>本地缓存 + 内容服务</Text></View>
              <View style={styles.infoRow}><Text style={styles.infoLabel}>数据存储</Text><Text style={styles.infoValue}>仅本机</Text></View>
            </View>
            <Text style={styles.footer}>© 2026 芽芽成长 · 为每个普通日子留一点成长</Text>
          </>
        )}

        {mode === 'help' && (
          <>
            <Text style={styles.sectionTitle}>常见问题</Text>
            {FAQ.map((item, idx) => {
              const on = openFaq === idx;
              return (
                <Pressable key={item.q} onPress={() => setOpenFaq(on ? null : idx)} style={styles.faq} accessibilityRole="button">
                  <View style={styles.faqHead}>
                    <Text style={styles.faqQ}>{item.q}</Text>
                    <Text style={[styles.faqArrow, { color: accent }]}>{on ? '−' : '+'}</Text>
                  </View>
                  {on && <Text style={styles.faqA}>{item.a}</Text>}
                </Pressable>
              );
            })}

            <Text style={styles.sectionTitle}>反馈与建议</Text>
            <View style={styles.card}>
              <Text style={styles.paragraph}>遇到问题、想要的功能，或觉得内容哪里不对，都可以写在这里。反馈保存在本机，便于开发调试时导出。</Text>
              <TextInput
                value={feedback}
                onChangeText={setFeedback}
                placeholder="例如：希望增加 1 岁以内的辅食课程"
                placeholderTextColor={COLORS.sub}
                multiline
                style={styles.textarea}
                accessibilityLabel="反馈内容"
              />
              <Pressable style={[styles.submit, { backgroundColor: accent, opacity: sending ? 0.6 : 1 }]} onPress={submitFeedback} disabled={sending}>
                <Text style={styles.submitText}>{sending ? '保存中…' : '提交反馈'}</Text>
              </Pressable>
            </View>
            <Text style={styles.footer}>紧急医疗问题请直接联系医院，不要等待应用内回复。</Text>
          </>
        )}

        {mode === 'privacy' && (
          <>
            <Text style={styles.updated}>生效日期：2026-11-10 · 适用于芽芽成长 App</Text>
            {PRIVACY.map(([head, body]) => (
              <View key={head} style={styles.card}>
                <Text style={styles.cardTitle}>{head}</Text>
                <Text style={styles.paragraph}>{body}</Text>
              </View>
            ))}
            <Text style={styles.footer}>本页为内置文本，后续如有变更会在版本更新中同步。</Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 36 },
  logo: { width: 76, height: 76, borderRadius: 24, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  logoText: { fontSize: 38 },
  appName: { fontSize: 22, fontWeight: '800', color: COLORS.ink, textAlign: 'center', marginTop: 12 },
  version: { fontSize: 10.5, color: COLORS.sub, textAlign: 'center', marginTop: 4, marginBottom: 18 },
  card: { backgroundColor: COLORS.white, borderRadius: 20, padding: 15, borderWidth: 1, borderColor: COLORS.line, marginBottom: 12 },
  cardTitle: { fontSize: 13.5, fontWeight: '800', color: COLORS.ink, marginBottom: 8 },
  paragraph: { fontSize: 12, color: COLORS.sub, lineHeight: 21, marginBottom: 6 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.line },
  infoLabel: { fontSize: 11.5, color: COLORS.sub },
  infoValue: { fontSize: 11.5, color: COLORS.ink, fontWeight: '700' },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: COLORS.ink, marginTop: 8, marginBottom: 8 },
  faq: { backgroundColor: COLORS.white, borderRadius: 16, padding: 13, borderWidth: 1, borderColor: COLORS.line, marginBottom: 8 },
  faqHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  faqQ: { flex: 1, fontSize: 12.5, fontWeight: '800', color: COLORS.ink, lineHeight: 18 },
  faqArrow: { fontSize: 17, fontWeight: '800' },
  faqA: { fontSize: 11.5, color: COLORS.sub, lineHeight: 19, marginTop: 8 },
  textarea: { minHeight: 96, borderRadius: 13, backgroundColor: '#FBF7F2', padding: 12, fontSize: 12, color: COLORS.ink, textAlignVertical: 'top', marginTop: 8 },
  submit: { height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  submitText: { fontSize: 12.5, fontWeight: '800', color: '#fff' },
  updated: { fontSize: 10, color: COLORS.muted, marginBottom: 10 },
  footer: { fontSize: 9.5, color: COLORS.muted, textAlign: 'center', lineHeight: 15, marginTop: 10 },
});
