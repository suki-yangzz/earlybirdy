/* ============================================================
   app-mobile/src/babies.ts —— 多宝宝档案持久化与隔离存储
   - 旧单档案（yy.v1.profile，含 months）自动迁入第一个宝宝
   - 旧全局打卡/学习/收藏复制到 baby-1 隔离键（不删除原键，保留兜底）
   - 打卡/学习进度/收藏/浏览历史/学习报告按宝宝隔离
   - 购物车/成长值/订单保持家长账号共享
   ============================================================ */
import { asyncStorage } from './storage';
import {
  BABIES_KEY,
  CURRENT_BABY_KEY,
  BABIES_MIGRATION_KEY,
  BABY_SCOPED_KEYS,
  PROFILE_KEY,
  ONBOARDED_KEY,
  normalizeBabyStore,
  createBaby,
  updateBaby,
  legacyBaby,
  isLegacyMonthsProfile,
  legacyBirthDateFromMonths,
  normalizeProfile,
  scopedPrefix,
  createScopedStorage,
} from './sharedAdapter';
import { markCurrentChange, queueProfileChange, recordDeletion } from './profileSync';

export type ParentRole = 'mom' | 'dad' | 'other';

export type Baby = {
  id: string;
  name: string;
  nickname: string;
  parentRole: ParentRole;
  pregnant: boolean;
  dueDate?: string;
  birthDate?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type BabyStore = { babies: Baby[]; currentId: string | null };

async function readJSON(key: string): Promise<any | null> {
  try {
    const raw = await asyncStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

async function writeJSON(key: string, value: any) {
  await asyncStorage.setItem(key, JSON.stringify(value));
}

/** 把旧全局体验数据复制到指定宝宝的隔离键（目标已存在则不覆盖） */
export async function copyLegacyScopedData(babyId: string) {
  for (const key of BABY_SCOPED_KEYS) {
    const base = String(key).replace(/^yy\.v1\./, '');
    const legacyKey = 'yy.v1.' + base;
    const target = scopedPrefix(babyId) + base;
    const legacy = await asyncStorage.getItem(legacyKey);
    if (!legacy) continue;
    const exists = await asyncStorage.getItem(target);
    if (exists == null) await asyncStorage.setItem(target, legacy);
  }
}

/** 当前宝宝的隔离存储；共享键原样透传 */
export function scopedStorageFor(babyId: string) {
  return createScopedStorage(asyncStorage, babyId, scopedPrefix);
}

function profileOf(baby: Baby) {
  return {
    pregnant: !!baby.pregnant,
    dueDate: baby.dueDate,
    birthDate: baby.birthDate,
    updatedAt: baby.updatedAt,
  };
}

/** 兼容镜像：把当前宝宝写回 yy.v1.profile，供旧脚本/旧逻辑读取 */
export async function mirrorCurrentProfile(baby: Baby | null) {
  if (!baby) return;
  await writeJSON(PROFILE_KEY, profileOf(baby));
}

/** 读取多宝宝档案；首次启动自动迁移旧单档案 */
export async function loadBabyStore(now: Date = new Date()): Promise<BabyStore> {
  const raw = await readJSON(BABIES_KEY);
  if (raw) {
    const store: BabyStore = normalizeBabyStore(raw) as BabyStore;
    if (store.currentId) await asyncStorage.setItem(CURRENT_BABY_KEY, store.currentId);
    /* 老数据迁移：把补上的 nickname / parentRole 写回，避免每次启动重复规范化 */
    const needsPersist = (Array.isArray(raw.babies) ? raw.babies : []).some(
      (b: any) => typeof b?.nickname !== 'string' || !b?.parentRole,
    );
    if (needsPersist) await writeJSON(BABIES_KEY, store);
    const current = store.babies.find((b) => b.id === store.currentId);
    if (current) await mirrorCurrentProfile(current);
    return store;
  }

  // 旧单档案迁移
  const legacyProfileRaw = await readJSON(PROFILE_KEY);
  let legacy = normalizeProfile(legacyProfileRaw);
  if (!legacy && legacyProfileRaw && legacyProfileRaw.pregnant === true && legacyProfileRaw.dueDate) {
    legacy = legacyProfileRaw;
  }
  if (legacy && isLegacyMonthsProfile(legacy)) {
    legacy = { pregnant: false, birthDate: legacyBirthDateFromMonths((legacy as any).months, now) } as any;
  }
  const baby = legacy ? legacyBaby(legacy, [], now) : null;
  if (!baby) return { babies: [], currentId: null };

  await copyLegacyScopedData(baby.id);
  const store: BabyStore = { babies: [baby], currentId: baby.id };
  /* 迁移只落本地；首次上传由启动时的云同步统一处理，避免重复推送 */
  await saveBabyStore(store, { sync: false });
  await asyncStorage.setItem(BABIES_MIGRATION_KEY, '1');
  return store;
}

export async function saveBabyStore(store: BabyStore, opts: { sync?: boolean } = {}) {
  /* 记录切换前的当前宝宝，用于给 currentId 的 LWW 打时间戳 */
  const previousCurrent = await asyncStorage.getItem(CURRENT_BABY_KEY).catch(() => null);
  await writeJSON(BABIES_KEY, store);
  if (store.currentId) await asyncStorage.setItem(CURRENT_BABY_KEY, store.currentId);
  const current = store.babies.find((b) => b.id === store.currentId) || store.babies[0] || null;
  if (current) {
    await mirrorCurrentProfile(current);
    await asyncStorage.setItem(ONBOARDED_KEY, '1');
  }
  /* 本地已落盘；云端推送异步进行，失败只标记 pending，不影响界面 */
  if (opts.sync !== false) {
    if (previousCurrent !== store.currentId) await markCurrentChange();
    void queueProfileChange(store as any);
  }
}

export async function addBaby(store: BabyStore, input: { name?: string; nickname?: string; parentRole?: ParentRole; pregnant: boolean; dueDate?: string | null; birthDate?: string | null }, now: Date = new Date()) {
  const baby = createBaby(input, store.babies as any, now) as Baby | null;
  if (!baby) return null;
  /* 新宝宝从空白数据开始；旧单档案只会迁移给第一个宝宝（见 loadBabyStore） */
  const next: BabyStore = { babies: [...store.babies, baby], currentId: baby.id };
  await saveBabyStore(next);
  return { store: next, baby };
}

export async function patchBaby(store: BabyStore, id: string, patch: Partial<Baby>, now: Date = new Date()) {
  const current = store.babies.find((b) => b.id === id);
  if (!current) return null;
  const updated = updateBaby(current as any, patch as any, now) as Baby | null;
  if (!updated) return null;
  const next: BabyStore = {
    babies: store.babies.map((b) => (b.id === id ? updated : b)),
    currentId: store.currentId,
  };
  await saveBabyStore(next);
  return { store: next, baby: updated };
}

/** 删除宝宝：清理隔离键并切换到剩余第一个；不允许删最后一个 */
export async function removeBaby(store: BabyStore, id: string) {
  if (store.babies.length <= 1) return { ok: false, reason: 'last' as const, store };
  const remaining = store.babies.filter((b) => b.id !== id);
  for (const base of BABY_SCOPED_KEYS) {
    const key = scopedPrefix(id) + String(base).replace(/^yy\.v1\./, '');
    await asyncStorage.removeItem(key).catch(() => {});
  }
  await recordDeletion(id);
  const currentId = store.currentId === id ? remaining[0].id : store.currentId;
  const next: BabyStore = { babies: remaining, currentId };
  await saveBabyStore(next);
  return { ok: true as const, store: next };
}

export async function setCurrentBaby(store: BabyStore, id: string) {
  if (!store.babies.some((b) => b.id === id)) return store;
  const next: BabyStore = { ...store, currentId: id };
  await asyncStorage.setItem(CURRENT_BABY_KEY, id);
  const current = next.babies.find((b) => b.id === id);
  if (current) await mirrorCurrentProfile(current);
  await markCurrentChange();
  void queueProfileChange(next as any);
  return next;
}
