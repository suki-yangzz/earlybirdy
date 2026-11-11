/**
 * 卡片语音朗读（B1）
 * - 原生 / Web 统一走 expo-speech（Web 实现即浏览器 speechSynthesis）
 * - 连续点按：先 stop 再 speak，避免排队叠加
 * - 语音不可用 / 系统静音 / 无中文语音：onStart 超时或 onError 时返回明确原因，由页面降级提示拼音
 * - 离开页面：调用 stopSpeech()
 */
import { Platform } from 'react-native';
import * as Speech from 'expo-speech';

export type SpeakResult = { ok: boolean; reason?: 'no-voice' | 'error' | 'unsupported' };

let speakSeq = 0;

/** 朗读一个词；返回是否检测到语音真正开始 */
export async function speakWord(text: string): Promise<SpeakResult> {
  if (!text) return { ok: false, reason: 'unsupported' };
  const seq = ++speakSeq;
  try {
    /* 连续点按不叠加：每次朗读前清空上一段队列 */
    await Speech.stop().catch(() => {});
    if (Platform.OS !== 'web') {
      const voices = await Speech.getAvailableVoicesAsync().catch(() => []);
      if (!voices || voices.length === 0) return { ok: false, reason: 'no-voice' };
    }
    const started = await new Promise<boolean>((resolve) => {
      let done = false;
      const finish = (value: boolean) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve(value);
      };
      const timer = setTimeout(async () => {
        /* 部分浏览器不派发 onstart，但 speaking 已为 true；以此兜底，避免误报“不可用” */
        try {
          const speaking = await Speech.isSpeakingAsync();
          finish(!!speaking);
        } catch (err) {
          finish(false);
        }
      }, 900);
      try {
        Speech.speak(text, {
          language: 'zh-CN',
          rate: 0.82,
          pitch: 1.08,
          onStart: () => finish(true),
          onError: () => finish(false),
          onDone: () => finish(true),
        });
      } catch (err) {
        finish(false);
      }
    });
    /* 期间又点了别的词：本次结果不再提示，避免旧 toast 覆盖新状态 */
    if (seq !== speakSeq) return { ok: false, reason: 'unsupported' };
    return started ? { ok: true } : { ok: false, reason: 'no-voice' };
  } catch (err) {
    return { ok: false, reason: 'unsupported' };
  }
}

/** 停止朗读并清空队列（离开页面时调用） */
export async function stopSpeech() {
  try {
    await Speech.stop();
  } catch (err) {
    /* 引擎不可用时忽略 */
  }
}

/** 该平台是否有语音能力（Web 上仅检查 speechSynthesis 是否存在） */
export function speechSupported(): boolean {
  if (Platform.OS !== 'web') return true;
  const synth = (globalThis as any).speechSynthesis;
  return !!(synth && (globalThis as any).SpeechSynthesisUtterance);
}
