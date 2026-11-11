import { asyncStorage } from './storage';
import {
  PROFILE_KEY,
  ONBOARDED_KEY,
  MIGRATION_KEY,
  normalizeProfile,
  isLegacyMonthsProfile,
  legacyBirthDateFromMonths,
} from './sharedAdapter';

export type StorageAdapter = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

export type BabyProfile = {
  pregnant: boolean;
  /** 孕期预产期 YYYY-MM-DD */
  dueDate?: string;
  /** 已出生生日 YYYY-MM-DD */
  birthDate?: string;
  /** 仅旧版数据迁移前存在 */
  months?: number;
  migratedFromMonths?: boolean;
  updatedAt?: string;
};

/** 读取宝宝档案；没有或损坏时返回 null（调用方据此决定是否引导） */
export async function loadProfile(storage: StorageAdapter = asyncStorage): Promise<BabyProfile | null> {
  try {
    const raw = await storage.getItem(PROFILE_KEY);
    return normalizeProfile(raw);
  } catch {
    return null;
  }
}

/** 保存档案；同时写「已引导」标记，避免二次启动重复引导 */
export async function saveProfile(input: BabyProfile, storage: StorageAdapter = asyncStorage): Promise<BabyProfile | null> {
  const normalized = normalizeProfile(input);
  if (!normalized) return null;
  const record: BabyProfile = { ...normalized, updatedAt: new Date().toISOString() };
  await storage.setItem(PROFILE_KEY, JSON.stringify(record));
  await storage.setItem(ONBOARDED_KEY, '1');
  return record;
}

export async function loadOnboarded(storage: StorageAdapter = asyncStorage): Promise<boolean> {
  try {
    const raw = await storage.getItem(ONBOARDED_KEY);
    return raw === '1' || raw === 'true';
  } catch {
    return false;
  }
}

/** 用户选择「先随便逛逛」时调用：只记一次已引导，不写入档案 */
export async function markOnboarded(storage: StorageAdapter = asyncStorage): Promise<void> {
  try {
    await storage.setItem(ONBOARDED_KEY, '1');
  } catch {
    /* 忽略：下次启动最多再引导一次 */
  }
}

export async function loadMigrated(storage: StorageAdapter = asyncStorage): Promise<boolean> {
  try {
    const raw = await storage.getItem(MIGRATION_KEY);
    return raw === '1' || raw === 'true';
  } catch {
    return false;
  }
}

/**
 * 旧版 { months: n } → { birthDate: 今天往回推 n 个月 }。
 * 只写 profile 与迁移标记，绝不触碰打卡/购物车/成长值等键。
 * 迁移标记存在时不再重复写档案，避免二次迁移。
 */
export async function migrateLegacyProfile(
  legacy: BabyProfile,
  storage: StorageAdapter = asyncStorage,
  now: Date = new Date()
): Promise<BabyProfile | null> {
  if (!isLegacyMonthsProfile(legacy) || typeof legacy.months !== 'number') return null;

  const birthDate = legacyBirthDateFromMonths(legacy.months, now);
  if (!birthDate) return null;

  const already = await loadMigrated(storage);
  if (already) {
    return { pregnant: false, birthDate, migratedFromMonths: true, updatedAt: legacy.updatedAt };
  }

  const saved = await saveProfile({ pregnant: false, birthDate, migratedFromMonths: true }, storage);
  try {
    await storage.setItem(MIGRATION_KEY, '1');
  } catch {
    /* 标记失败时档案已是新结构，后续启动不会二次迁移 */
  }
  return saved;
}
