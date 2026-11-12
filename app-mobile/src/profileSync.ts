/* ============================================================
   app-mobile/src/profileSync.ts —— 宝宝档案云端同步（离线优先）
   - 本地 AsyncStorage 是读取第一来源；启动先上屏，再后台拉/推
   - 写操作先落本地，再异步推送；失败标记 pending，下次启动/网络恢复补推
   - 冲突按 shared/profileSync.js 的 per-baby updatedAt LWW
   - 身份：匿名设备 ID（yy.v1.deviceId），不是认证；预留在服务端 accountId
   ============================================================ */
import { asyncStorage } from './storage';
import {
  DEVICE_ID_KEY,
  SYNC_META_KEY,
  SERVICE_URL,
  newDeviceId,
  isValidDeviceId,
  normalizeSyncMeta,
  buildSnapshot,
  mergeProfile,
  addTombstone,
} from './sharedAdapter';

export type SyncBaby = {
  id: string;
  name?: string;
  nickname?: string;
  parentRole?: string;
  pregnant?: boolean;
  dueDate?: string;
  birthDate?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
};

export type ProfileStore = { babies: SyncBaby[]; currentId: string | null };

export type SyncMeta = {
  deviceId: string | null;
  registered: boolean;
  pending: boolean;
  currentIdUpdatedAt: string | null;
  deletedBabies: { id: string; updatedAt: string }[];
  changedAt: string | null;
  lastSyncAt: string | null;
  lastError: string | null;
};

export type SyncSource = 'server' | 'registered' | 'local' | 'offline';

export type SyncResult = {
  store: ProfileStore;
  changed: boolean;
  source: SyncSource;
  conflicts?: any[];
  serverStale?: boolean;
  error?: string;
};

const API_BASE = String(SERVICE_URL || '').replace(/\/manifest\.json(\?.*)?$/i, '');
const REQUEST_TIMEOUT_MS = 2500;

async function readJSON(key: string): Promise<any | null> {
  try {
    const raw = await asyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
}

async function writeJSON(key: string, value: any) {
  await asyncStorage.setItem(key, JSON.stringify(value));
}

/** 首次启动生成并持久化匿名设备 ID；已有合法值则沿用 */
export async function getDeviceId(): Promise<string> {
  const out = await getDeviceIdState();
  return out.deviceId;
}

/** 同时返回“本次是否新生成”，用于区分全新设备与“清缓存后保留设备 ID” */
export async function getDeviceIdState(): Promise<{ deviceId: string; created: boolean }> {
  const existing = await asyncStorage.getItem(DEVICE_ID_KEY);
  if (existing && isValidDeviceId(existing)) return { deviceId: existing, created: false };
  const next = newDeviceId();
  await asyncStorage.setItem(DEVICE_ID_KEY, next);
  return { deviceId: next, created: true };
}

export async function readSyncMeta(): Promise<SyncMeta> {
  return normalizeSyncMeta(await readJSON(SYNC_META_KEY)) as SyncMeta;
}

export async function writeSyncMeta(meta: SyncMeta): Promise<void> {
  await writeJSON(SYNC_META_KEY, normalizeSyncMeta(meta));
}

/** 当前宝宝变化：记录独立时间戳，供 currentId 的 LWW 使用 */
export async function markCurrentChange(at: Date = new Date()): Promise<void> {
  const meta = await readSyncMeta();
  meta.currentIdUpdatedAt = at.toISOString();
  await writeSyncMeta(meta);
}

/** 删除宝宝：本地墓碑（服务端合并时按 updatedAt 判断） */
export async function recordDeletion(id: string, at: Date = new Date()): Promise<void> {
  const meta = await readSyncMeta();
  meta.deletedBabies = addTombstone(meta.deletedBabies, id, at.toISOString());
  await writeSyncMeta(meta);
}

type ApiResult = { status: number; ok: boolean; data: any };

async function request(path: string, init: RequestInit = {}): Promise<ApiResult> {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS) : null;
  try {
    const response = await fetch(API_BASE + path, Object.assign({}, init, controller ? { signal: controller.signal } : {}));
    const text = await response.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (err) {
      data = { raw: text };
    }
    return { status: response.status, ok: response.ok, data };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function errorText(err: any): string {
  if (!err) return 'unknown';
  return String(err.message || err);
}

/** 推送整包快照；失败时保留 pending，供下次启动/网络恢复补推 */
export async function pushProfile(store: ProfileStore): Promise<{ ok: boolean; profile?: any; conflicts?: any[]; error?: string }> {
  const deviceId = await getDeviceId();
  const meta = await readSyncMeta();
  const snapshot = buildSnapshot(store, meta);
  try {
    const res = await request('/api/devices/' + encodeURIComponent(deviceId) + '/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(snapshot),
    });
    if (!res.ok || !res.data || !res.data.profile) {
      meta.pending = true;
      meta.lastError = 'HTTP ' + res.status;
      await writeSyncMeta(meta);
      return { ok: false, error: meta.lastError };
    }
    meta.pending = false;
    meta.registered = true;
    meta.deletedBabies = [];
    meta.changedAt = null;
    meta.lastSyncAt = new Date().toISOString();
    meta.lastError = null;
    await writeSyncMeta(meta);
    return { ok: true, profile: res.data.profile, conflicts: res.data.conflicts };
  } catch (err) {
    meta.pending = true;
    meta.lastError = errorText(err);
    await writeSyncMeta(meta);
    return { ok: false, error: meta.lastError };
  }
}

let pushChain: Promise<any> = Promise.resolve();

/**
 * 本地写成功后调用：标记 pending 并串行推送。
 * 不阻塞 UI，也绝不抛出网络错误。
 */
export function queueProfileChange(store: ProfileStore): Promise<any> {
  const mark = (async () => {
    const meta = await readSyncMeta();
    meta.pending = true;
    meta.changedAt = new Date().toISOString();
    await writeSyncMeta(meta);
  })();
  pushChain = pushChain.then(() => mark).then(() => pushProfile(store)).catch(() => undefined);
  return pushChain;
}

/** 网络恢复时补推（只推 pending，避免无变化时空写） */
export async function flushPending(store: ProfileStore): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const meta = await readSyncMeta();
  if (!meta.pending) return { ok: true, skipped: true };
  const out = await pushProfile(store);
  return { ok: out.ok, error: out.error };
}

function adopt(
  profile: any,
  localStore: ProfileStore,
  meta: SyncMeta,
  source: SyncSource
): SyncResult {
  const merged = mergeProfile(profile, localStore, {
    deletedBabies: Array.isArray(profile.deletedBabies) ? profile.deletedBabies : [],
    currentIdUpdatedAt: profile.currentIdUpdatedAt || null,
  });
  const nextMeta: SyncMeta = Object.assign({}, meta, {
    registered: true,
    deletedBabies: merged.deletedBabies,
    currentIdUpdatedAt: merged.currentIdUpdatedAt || meta.currentIdUpdatedAt,
    lastSyncAt: new Date().toISOString(),
    lastError: null,
  });
  void writeSyncMeta(nextMeta);
  return {
    store: merged.store,
    changed: merged.changedFromClient === true,
    source: source,
    conflicts: merged.conflicts,
    serverStale: merged.changedFromServer === true,
  };
}

/**
 * 启动同步：先把本地未同步修改补推，再拉远端按 LWW 合并。
 * - 远端 404 且本地有档案：一次性注册并上传
 * - 远端 200 且本地为空：从服务端恢复（清缓存后重启的关键路径）
 * - 网络失败：返回 offline，本地数据保持不变
 */
export async function syncProfileFromServer(localStore: ProfileStore): Promise<SyncResult> {
  const identity = await getDeviceIdState();
  const deviceId = identity.deviceId;
  let meta = await readSyncMeta();

  /* 首次启动：本地已有档案但从未注册过设备 → 直接整包上传，避免先 GET 一次 404 */
  if (!meta.registered) {
    if (localStore.babies.length) {
      const registered = await pushProfile(localStore);
      if (!registered.ok) return { store: localStore, changed: false, source: 'offline', error: registered.error };
      return adopt(registered.profile, localStore, await readSyncMeta(), 'registered');
    }
    /* 全新设备且没有本地档案：等用户首次添加宝宝时再创建，避免无意义的 404 */
    if (identity.created) return { store: localStore, changed: false, source: 'local' };
    /* 设备 ID 还在、本地缓存/同步标记被清：尝试从服务端恢复 */
  }

  if (meta.pending) {
    const pushed = await pushProfile(localStore);
    if (pushed.ok && pushed.profile) return adopt(pushed.profile, localStore, await readSyncMeta(), 'server');
    if (!pushed.ok) return { store: localStore, changed: false, source: 'offline', error: pushed.error };
    meta = await readSyncMeta();
  }

  let res: ApiResult;
  try {
    res = await request('/api/devices/' + encodeURIComponent(deviceId) + '/profile');
  } catch (err) {
    return { store: localStore, changed: false, source: 'offline', error: errorText(err) };
  }

  if (res.status === 404) {
    if (!localStore.babies.length) return { store: localStore, changed: false, source: 'local' };
    const pushed = await pushProfile(localStore);
    if (!pushed.ok) return { store: localStore, changed: false, source: 'offline', error: pushed.error };
    return adopt(pushed.profile, localStore, await readSyncMeta(), 'registered');
  }

  if (!res.ok || !res.data || !res.data.profile) {
    return { store: localStore, changed: false, source: 'offline', error: 'HTTP ' + res.status };
  }

  const adopted = adopt(res.data.profile, localStore, meta, 'server');
  /* 本地比服务端新（例如 pending 标记丢失）：把合并结果补推回服务端 */
  if (adopted.serverStale) {
    const pushed = await pushProfile(adopted.store);
    if (pushed.ok && pushed.profile) return adopt(pushed.profile, localStore, await readSyncMeta(), 'server');
  }
  return adopted;
}
