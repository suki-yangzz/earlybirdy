import AsyncStorage from '@react-native-async-storage/async-storage';

/** 与 shared/rules.js 约定的 storage adapter：读写都可返回 Promise */
export const asyncStorage = {
  getItem: (key: string): Promise<string | null> => AsyncStorage.getItem(key),
  setItem: (key: string, value: string): Promise<void> => AsyncStorage.setItem(key, value),
  removeItem: (key: string): Promise<void> => AsyncStorage.removeItem(key),
};
