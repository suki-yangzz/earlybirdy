/**
 * 打卡提醒（B2）
 * - 设置持久化：yy.v1.reminder（账号级，不随宝宝切换）
 * - 原生：expo-notifications 本地每日通知；启动时按已保存设置重新排期
 * - Web：expo-notifications 不支持 Web 定时通知，只保存设置 + 用浏览器 Notification 权限模拟权限分支
 * - 权限被拒：返回 denied，由 UI 引导「去设置开启」
 */
import { Linking, Platform } from 'react-native';
import { asyncStorage } from './storage';
import {
  REMINDER_KEY,
  DEFAULT_REMINDER,
  normalizeReminder,
} from './sharedAdapter';

export type ReminderSettings = { enabled: boolean; hour: number; minute: number };
export type ReminderStatus = 'ok' | 'denied' | 'unsupported' | 'error';
export type ReminderResult = { status: ReminderStatus; webOnly?: boolean; message?: string };

const CHANNEL_ID = 'checkin-reminders';
let handlerReady = false;

function nativeNotifications(): any | null {
  if (Platform.OS === 'web') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('expo-notifications');
  } catch (err) {
    return null;
  }
}

async function readRaw(): Promise<any | null> {
  try {
    const raw = await asyncStorage.getItem(REMINDER_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

export async function loadReminderSettings(): Promise<ReminderSettings> {
  return normalizeReminder(await readRaw()) as ReminderSettings;
}

async function saveReminderSettings(settings: ReminderSettings): Promise<ReminderSettings> {
  const normalized = normalizeReminder(settings) as ReminderSettings;
  await asyncStorage.setItem(REMINDER_KEY, JSON.stringify(normalized));
  return normalized;
}

function initNativeHandler() {
  const Notifications = nativeNotifications();
  if (!Notifications || handlerReady) return;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    handlerReady = true;
  } catch (err) {
    /* 某些环境（Expo Go iOS 旧版本）可能不支持，忽略 */
  }
}

async function ensureAndroidChannel(Notifications: any) {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: '每日打卡提醒',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF8A5B',
    });
  } catch (err) {
    /* 渠道失败不阻断排期 */
  }
}

async function scheduleNative(settings: ReminderSettings): Promise<boolean> {
  const Notifications = nativeNotifications();
  if (!Notifications) return false;
  initNativeHandler();
  await ensureAndroidChannel(Notifications);
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    const trigger = Platform.OS === 'ios'
      ? {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
          repeats: true,
          hour: settings.hour,
          minute: settings.minute,
        }
      : {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: settings.hour,
          minute: settings.minute,
          channelId: CHANNEL_ID,
        };
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '今天的打卡时间到啦 🌱',
        body: '花 5 分钟陪宝宝完成今天的小任务，连续打卡更有成就感。',
      },
      trigger,
    });
    return true;
  } catch (err) {
    return false;
  }
}

async function cancelNative(): Promise<void> {
  const Notifications = nativeNotifications();
  if (!Notifications) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (err) {
    /* 取消失败不阻断设置保存 */
  }
}

/** Web：申请浏览器通知权限；原生：申请系统通知权限 */
async function requestPermission(): Promise<ReminderStatus> {
  if (Platform.OS === 'web') {
    const N = (globalThis as any).Notification;
    if (!N) return 'unsupported';
    if (N.permission === 'granted') return 'ok';
    if (N.permission === 'denied') return 'denied';
    try {
      const result = await N.requestPermission();
      return result === 'granted' ? 'ok' : 'denied';
    } catch (err) {
      return 'error';
    }
  }

  const Notifications = nativeNotifications();
  if (!Notifications) return 'unsupported';
  initNativeHandler();
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.status === 'granted') return 'ok';
    if (!current.canAskAgain) return 'denied';
    const asked = await Notifications.requestPermissionsAsync();
    return asked.status === 'granted' ? 'ok' : 'denied';
  } catch (err) {
    return 'error';
  }
}

/** 开启提醒：申请权限 + 保存设置 + 原生排期 */
export async function enableReminder(settings: ReminderSettings): Promise<ReminderResult> {
  const status = await requestPermission();
  if (status !== 'ok') {
    return { status, message: status === 'denied' ? '通知权限被拒绝，可到系统设置中开启' : '当前环境不支持本地通知' };
  }
  const saved = await saveReminderSettings({ ...settings, enabled: true });
  if (Platform.OS === 'web') {
    return { status: 'ok', webOnly: true, message: '设置已保存；Web 不支持定时本地通知' };
  }
  const scheduled = await scheduleNative(saved);
  if (!scheduled) return { status: 'error', message: '排期失败：请确认已安装 development build' };
  return { status: 'ok', message: `每天 ${pad(saved.hour)}:${pad(saved.minute)} 提醒已开启` };
}

/** 修改提醒时间（保持开启状态） */
export async function updateReminderTime(settings: ReminderSettings): Promise<ReminderResult> {
  const saved = await saveReminderSettings({ ...settings, enabled: true });
  if (Platform.OS === 'web') return { status: 'ok', webOnly: true, message: '时间已保存（Web 不排期）' };
  const scheduled = await scheduleNative(saved);
  return scheduled
    ? { status: 'ok', message: `已改为每天 ${pad(saved.hour)}:${pad(saved.minute)} 提醒` }
    : { status: 'error', message: '排期失败，请检查通知权限' };
}

/** 关闭提醒：取消排期 + 保存 */
export async function disableReminder(): Promise<ReminderResult> {
  await saveReminderSettings({ ...(await loadReminderSettings()), enabled: false });
  if (Platform.OS !== 'web') await cancelNative();
  return { status: 'ok', message: '打卡提醒已关闭' };
}

/** 启动时恢复：读取设置并按需重新排期（无需再次申请权限） */
export async function restoreReminder(): Promise<void> {
  const settings = await loadReminderSettings();
  if (!settings.enabled || Platform.OS === 'web') return;
  await scheduleNative(settings);
}

/** 「去设置开启」：原生跳系统设置；Web 交由浏览器权限面板处理 */
export async function openReminderSettings(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    await Linking.openSettings();
    return true;
  } catch (err) {
    return false;
  }
}

/** 取消所有已排期的本地提醒（不写设置；供彻底重置使用） */
export async function cancelAllScheduledReminders(): Promise<void> {
  if (Platform.OS === 'web') return;
  await cancelNative();
}

/** 权限说明文案（UI 展示用） */
export function reminderScopeNote(): string {
  if (Platform.OS === 'web') {
    return 'Web 端只能保存设置与演示权限分支，定时通知需在 development build / 真机验证。';
  }
  return 'Expo Go 内本地通知可用；iOS 上通知弹出与锁屏行为请以 development build / 真机为准。';
}

function pad(n: number) {
  return n < 10 ? '0' + n : String(n);
}

export const DEFAULT_REMINDER_SETTINGS = DEFAULT_REMINDER;
