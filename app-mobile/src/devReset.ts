/**
 * 开发调试：彻底重置
 * - 清掉本项目所有 `yy.v1.*` 键（含多宝宝隔离键、档案、提醒、内容缓存）
 * - 通过 AsyncStorage.getAllKeys 枚举真实键，逐条删除后再复核，避免"看起来成功"
 * - 仅在 __DEV__ 下由「我的」页调用
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const APP_KEY_PREFIX = 'yy.v1.';

/** 当前存储中所有 yy.v1.* 键（真实枚举，不做假设） */
export async function listAppKeys(prefix: string = APP_KEY_PREFIX): Promise<string[]> {
  const keys = await AsyncStorage.getAllKeys();
  return keys.filter((key) => key.indexOf(prefix) === 0);
}

/** 删除所有 yy.v1.* 键，返回删除清单与复核后的残留 */
export async function purgeAllAppData(): Promise<{ removed: string[]; remaining: string[] }> {
  const removed = await listAppKeys();
  if (removed.length) await AsyncStorage.multiRemove(removed);
  const remaining = await listAppKeys();
  return { removed, remaining };
}
