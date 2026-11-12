/* shared/ 的轻量桥接：Metro 直接消费纯 CommonJS 模块，不重复实现业务逻辑 */
// @ts-ignore shared 是不带类型声明的共用模块（H5 / RN 共用）
const shared = require('../../shared/index');

// @ts-ignore Expo 会把 EXPO_PUBLIC_ 前缀变量注入到 process.env
const envUrl = typeof process !== 'undefined' && process.env ? process.env.EXPO_PUBLIC_CONTENT_URL : '';

const DEFAULT_MANIFEST_URL = 'http://127.0.0.1:8788/manifest.json';

/** 允许填写基础地址（http://<IP>:8788）或完整清单地址（.../manifest.json） */
function normalizeManifestUrl(value: string): string {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  if (/manifest\.json(\?|$)/.test(trimmed)) return trimmed;
  return trimmed.replace(/\/+$/, '') + '/manifest.json';
}

/**
 * mock 内容服务地址：
 * - 真机（Expo Go）必须用 Mac 的局域网 IP，见 scripts/dev-iphone.sh
 * - 兜底默认 http://127.0.0.1:8788/manifest.json（统一服务；Expo Web / iOS 模拟器可用）
 * - Android 模拟器如需手动填写，用 http://10.0.2.2:8788
 */
export const SERVICE_URL: string = normalizeManifestUrl(envUrl) || DEFAULT_MANIFEST_URL;

export const SERVICE_URL_SOURCE: string = envUrl ? 'env:EXPO_PUBLIC_CONTENT_URL' : 'default';

/** 把 manifest 里的相对素材路径解析为内容服务地址；空值返回空串 */
export function assetUrl(path: string): string {
  const value = String(path || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  const base = SERVICE_URL.replace(/\/manifest\.json(\?.*)?$/i, '');
  return base + (value.charAt(0) === '/' ? '' : '/') + value;
}

// 启动即打印实际使用的地址，便于确认注入是否生效（Metro 终端 / Web 控制台可见）
console.log('[content] manifestUrl = ' + SERVICE_URL + '  (source: ' + SERVICE_URL_SOURCE + ')');
if (!envUrl) {
  // @ts-ignore react-native 在原生/Web 都可用
  const platform = require('react-native').Platform;
  if (platform && platform.OS !== 'web') {
    console.warn('[content] 未注入 EXPO_PUBLIC_CONTENT_URL，真机无法访问 127.0.0.1；请用 scripts/dev-iphone.sh 或在 app-mobile/.env 填局域网 IP');
  }
}

export const STAGES: Record<string, any> = shared.STAGES;
export const STAGE_ORDER: string[] = shared.STAGE_ORDER;
export const INTERACTIONS: Record<string, any> = shared.INTERACTIONS;
export const hydrate = shared.hydrate;
export const createCore = shared.createCore;
export const createContentSync = shared.createContentSync;
export const KEYS: Record<string, string> = shared.KEYS;
export const SCOPED_KEYS: string[] = shared.SCOPED_KEYS;
export const HISTORY_LIMIT: number = shared.HISTORY_LIMIT;
export const createScopedStorage = shared.createScopedStorage;
export const createMemoryStorage = shared.createMemoryStorage;

/* 宝宝档案：出生日期 → 月龄 → 阶段的纯函数与存储键（来自 shared/profile.js） */
export const PROFILE_KEY: string = shared.PROFILE_KEY;
export const ONBOARDED_KEY: string = shared.ONBOARDED_KEY;
export const MIGRATION_KEY: string = shared.MIGRATION_KEY;
export const normalizeProfile = shared.normalizeProfile;
export const isLegacyMonthsProfile = shared.isLegacyMonthsProfile;
export const legacyBirthDateFromMonths = shared.legacyBirthDateFromMonths;
export const stageFromMonths = shared.stageFromMonths;
export const stageFromProfile = shared.stageFromProfile;
export const ageFromBirthdate = shared.ageFromBirthdate;
export const daysUntil = shared.daysUntil;
export const dateKey = shared.dateKey;
export const isDateKey = shared.isDateKey;
export const addMonthsKey = shared.addMonthsKey;
export const addDaysKey = shared.addDaysKey;
export const daysInMonth = shared.daysInMonth;
export const profileDateLabel = shared.profileDateLabel;
export const profileAgeLabel = shared.profileAgeLabel;
export const profileLabel = shared.profileLabel;
export const profileIsOverdue = shared.profileIsOverdue;
export const MONTH_BANDS = shared.MONTH_BANDS;

/* 多宝宝档案与隔离键（来自 shared/babies.js） */
export const BABIES_KEY: string = shared.BABIES_KEY;
export const CURRENT_BABY_KEY: string = shared.CURRENT_BABY_KEY;
export const BABIES_MIGRATION_KEY: string = shared.BABIES_MIGRATION_KEY;
export const BABY_SCOPED_KEYS: string[] = shared.BABY_SCOPED_KEYS;
export const PARENT_ROLES: string[] = shared.PARENT_ROLES;
export const ROLE_LABELS: Record<string, string> = shared.ROLE_LABELS;
export const DEFAULT_PARENT_ROLE: string = shared.DEFAULT_PARENT_ROLE;
export const NICKNAME_UNITS: number = shared.NICKNAME_UNITS;
export const normalizeParentRole = shared.normalizeParentRole;
export const truncateNickname = shared.truncateNickname;
export const displayName = shared.displayName;
export const normalizeBaby = shared.normalizeBaby;

/* 孕妈课堂：内置课程兜底（远端 manifest 提供 courses 时优先远端） */
export const COURSES: any[] = shared.COURSES;
export const COURSE_CATEGORIES: any[] = shared.COURSE_CATEGORIES;
export const coursesByCategory = shared.coursesByCategory;
export const findCourse = shared.findCourse;

/* 胎教故事：内置兜底 + 分类（远端 manifest 提供 stories 时优先远端） */
export const STORIES: any[] = shared.STORIES;
export const STORY_CATEGORIES: any[] = shared.STORY_CATEGORIES;
export function findStory(content: any, id: string | null): any {
  if (!content || !id) return null;
  const list: any[] = Array.isArray(content.stories) ? content.stories : [];
  return list.find((s) => s && (s.id === id || s.slug === id || s.legacyId === id)) || null;
}
export const normalizeBabyStore = shared.normalizeBabyStore;
export const createBaby = shared.createBaby;
export const updateBaby = shared.updateBaby;
export const legacyBaby = shared.legacyBaby;
export const scopedKey = shared.scopedKey;
export const scopedPrefix = shared.scopedPrefix;
export const nextBabyId = shared.nextBabyId;

/* 设备档案云同步（来自 shared/profileSync.js） */
export const DEVICE_ID_KEY: string = shared.DEVICE_ID_KEY;
export const SYNC_META_KEY: string = shared.SYNC_META_KEY;
export const newDeviceId = shared.newDeviceId;
export const isValidDeviceId = shared.isValidDeviceId;
export const normalizeSyncMeta = shared.normalizeSyncMeta;
export const buildSnapshot = shared.buildSnapshot;
export const mergeProfile = shared.mergeProfile;
export const addTombstone = shared.addTombstone;

/* 搜索 / 报告（来自 shared/search.js / shared/report.js） */
export const searchContent = shared.searchContent;
export const buildReport = shared.buildReport;
export const REPORT_MODULES: string[] = shared.REPORT_MODULES;
export const REPORT_MODULE_LABELS: Record<string, string> = shared.REPORT_MODULE_LABELS;

/* 打卡提醒设置（来自 shared/notify.js） */
export const REMINDER_KEY: string = shared.REMINDER_KEY;
export const DEFAULT_REMINDER: { enabled: boolean; hour: number; minute: number } = shared.DEFAULT_REMINDER;
export const normalizeReminder = shared.normalizeReminder;
export const formatReminderTime = shared.formatTime;
export const nextReminderAt = shared.nextReminderAt;
