import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Platform, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import HomeScreen from './src/screens/HomeScreen';
import TasksScreen from './src/screens/TasksScreen';
import CardsScreen from './src/screens/CardsScreen';
import MusicScreen from './src/screens/MusicScreen';
import VideoScreen from './src/screens/VideoScreen';
import ShopScreen from './src/screens/ShopScreen';
import MineScreen from './src/screens/MineScreen';
import FavoritesScreen from './src/screens/FavoritesScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import SearchScreen from './src/screens/SearchScreen';
import ReportScreen from './src/screens/ReportScreen';
import OrdersScreen from './src/screens/OrdersScreen';
import BabyManagerScreen from './src/screens/BabyManagerScreen';
import CoursesScreen from './src/screens/CoursesScreen';
import CourseDetailScreen from './src/screens/CourseDetailScreen';
import StoriesScreen from './src/screens/StoriesScreen';
import StoryDetailScreen from './src/screens/StoryDetailScreen';
import InfoScreen from './src/screens/InfoScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import TabBar, { TabItem } from './src/components/TabBar';
import Toast from './src/components/Toast';
import { asyncStorage } from './src/storage';
import {
  hydrate,
  createCore,
  createContentSync,
  SERVICE_URL,
  STAGES,
  INTERACTIONS,
  KEYS,
  stageFromProfile,
  profileLabel,
  displayName,
  COURSES,
  findCourse,
  STORIES,
  findStory,
} from './src/sharedAdapter';
import { loadOnboarded, markOnboarded } from './src/profile';
import { cancelAllScheduledReminders, restoreReminder } from './src/notifications';
import { purgeAllAppData } from './src/devReset';
import {
  loadBabyStore,
  saveBabyStore,
  addBaby,
  patchBaby,
  removeBaby,
  scopedStorageFor,
} from './src/babies';
import type { Baby, BabyStore } from './src/babies';
import { syncProfileFromServer } from './src/profileSync';
import type { ProfileStore } from './src/profileSync';
import type { BabyProfile } from './src/profile';
import { COLORS, stageTheme, iconEmoji } from './src/theme';
import type { StudyModule } from './src/useStudyTimer';

type Screen =
  | 'home'
  | 'tasks'
  | 'cards'
  | 'music'
  | 'video'
  | 'shop'
  | 'product'
  | 'cart'
  | 'mine'
  | 'fav'
  | 'history'
  | 'search'
  | 'report'
  | 'orders'
  | 'babies'
  | 'courses'
  | 'course'
  | 'stories'
  | 'story'
  | 'about'
  | 'help'
  | 'privacy';
type ContentInfo = { version: string; source: string; offline: boolean };

const INTERACTION_SCREEN: Record<string, Screen> = { audio: 'music', flashcards: 'cards', video: 'video' };

function profileOf(baby: Baby | null): BabyProfile | null {
  if (!baby) return null;
  return {
    pregnant: baby.pregnant,
    dueDate: baby.dueDate,
    birthDate: baby.birthDate,
    updatedAt: baby.updatedAt,
  };
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState<Screen>('home');
  const [productId, setProductId] = useState<number | null>(null);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [storyId, setStoryId] = useState<string | null>(null);
  const [coursesOrigin, setCoursesOrigin] = useState<'home' | 'mine'>('home');
  const [musicTrackId, setMusicTrackId] = useState<string | null>(null);
  const [stageId, setStageId] = useState('');
  const [babies, setBabies] = useState<Baby[]>([]);
  const [currentBabyId, setCurrentBabyId] = useState<string | null>(null);
  const [profile, setProfile] = useState<BabyProfile | null>(null);
  const [needOnboarding, setNeedOnboarding] = useState(false);
  /* 云同步回调里需要读到最新的本地快照 */
  const latestStoreRef = useRef<{ babies: Baby[]; currentId: string | null }>({ babies: [], currentId: null });
  latestStoreRef.current = { babies, currentId: currentBabyId };
  const [contentInfo, setContentInfo] = useState<ContentInfo>({ version: 'builtin', source: 'builtin', offline: false });
  const [toastMsg, setToastMsg] = useState('');
  const [sessionKey, setSessionKey] = useState(0);
  const [, setTick] = useState(0);
  const coreRef = useRef<any>(null);
  const bundleRef = useRef<any>(null);
  const storageRef = useRef<any>(asyncStorage);
  const toastTimer = useRef<any>(null);

  function bump() {
    setTick((t) => t + 1);
  }

  function showToast(msg: string) {
    setToastMsg(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(''), 2200);
  }

  function buildCore(bundle: any, state: any, info: ContentInfo) {
    const core = createCore({
      stages: bundle.stages,
      content: bundle.content,
      stageOrder: bundle.stageOrder,
      storage: storageRef.current,
      state,
      /* 阶段由宝宝档案推导，不再单独落 yy.v1.stage，避免两份事实来源互相矛盾 */
      persistStage: false,
    });
    coreRef.current = core;
    /* 旧版本收藏/历史里存的是文件名 slug，内容服务改发 uid 后在这里一次性迁移 */
    const migrated = core.migrateIds();
    if (migrated && migrated.changed) {
      if (__DEV__) console.log(`[ids] migrated fav=${migrated.fav} history=${migrated.history} learned=${migrated.learned}`);
      core.flush();
    }
    setStageId(core.getStage());
    setContentInfo(info);
    bump();
  }

  function applyBundle(bundle: any, state: any, info: ContentInfo) {
    bundleRef.current = bundle;
    /* 课程：远端 manifest 提供 courses 时优先，缺失时用内置兜底，避免课堂页空白 */
    if (bundle && bundle.content) {
      if (!Array.isArray(bundle.content.courses) || !bundle.content.courses.length) {
        bundle.content.courses = COURSES;
      }
      /* 故事：远端缺失时用内置兜底，避免胎教故事入口打开空列表 */
      if (!Array.isArray(bundle.content.stories) || !bundle.content.stories.length) {
        bundle.content.stories = STORIES;
      }
    }
    buildCore(bundle, state, info);
  }

  const currentBaby = babies.find((b) => b.id === currentBabyId) || null;

  /** 切换到某个宝宝：重建隔离 core，阶段由该宝宝生日推导 */
  async function activateBaby(store: BabyStore, id: string, toast = true) {
    const baby = store.babies.find((b) => b.id === id) || null;
    const scoped = scopedStorageFor(id);
    storageRef.current = scoped;
    const state = await hydrate(scoped);
    const derived = (baby && stageFromProfile(baby as any)) || 'toddler';
    state.stage = derived;
    await asyncStorage.removeItem(KEYS.stage).catch(() => {});
    if (bundleRef.current) buildCore(bundleRef.current, state, contentInfo);
    setBabies(store.babies);
    setCurrentBabyId(id);
    setProfile(profileOf(baby));
    setStageId(derived);
    setScreen('home');
    setProductId(null);
    bump();
    if (coreRef.current) {
      await coreRef.current.flush();
      showToast(toast ? `已切换到 ${baby ? baby.name : '宝宝'} · ${STAGES[derived]?.label || ''}` : '');
    }
  }

  /** 应用云端合并结果：先落本地缓存，再按需切换当前宝宝 */
  async function applySyncedStore(next: ProfileStore) {
    const nextBabies = (next.babies || []) as Baby[];
    await saveBabyStore({ babies: nextBabies, currentId: next.currentId }, { sync: false });
    latestStoreRef.current = { babies: nextBabies, currentId: next.currentId };
    const previousId = latestStoreRef.current.currentId;
    setBabies(nextBabies);
    if (nextBabies.length) setNeedOnboarding(false);
    if (next.currentId && next.currentId !== previousId) {
      await activateBaby({ babies: nextBabies, currentId: next.currentId } as BabyStore, next.currentId, false);
      return;
    }
    setCurrentBabyId(next.currentId);
    const current = nextBabies.find((b) => b.id === next.currentId) || null;
    setProfile(profileOf(current));
    if (!nextBabies.length) {
      /* 服务端档案被清空：回到首次引导，避免停在旧宝宝页 */
      storageRef.current = asyncStorage;
      setScreen('home');
      setProductId(null);
      setNeedOnboarding(true);
    }
    bump();
  }

  /** 网络恢复 / 回前台时补推 pending，并把服务端较新的记录合并回来 */
  async function retryProfileSync() {
    try {
      const synced = await syncProfileFromServer(latestStoreRef.current as any);
      if (synced.changed) await applySyncedStore(synced.store);
    } catch (err: any) {
      console.warn('[profile] retry failed: ' + (err && err.message ? err.message : err));
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      // 1) 冷启动先加载多宝宝档案（内部完成旧单档案迁移），再用缓存/内置内容出画面
      const store = await loadBabyStore(new Date());
      const onboarded = await loadOnboarded();
      if (cancelled) return;

      // 恢复已保存的打卡提醒（原生重新排期；Web 只读取设置）
      restoreReminder().catch(() => {});

      let state: any;
      const current = store.babies.find((b) => b.id === store.currentId) || null;
      if (store.currentId) {
        storageRef.current = scopedStorageFor(store.currentId);
        state = await hydrate(storageRef.current);
        const derived = current && stageFromProfile(current as any);
        state.stage = derived || 'toddler';
        asyncStorage.removeItem(KEYS.stage).catch(() => {});
      } else {
        storageRef.current = asyncStorage;
        state = await hydrate(asyncStorage);
        /* 档案缺失：未引导过走首次引导；已跳过引导则用安全兜底阶段，避免空白 */
        state.stage = 'toddler';
        asyncStorage.removeItem(KEYS.stage).catch(() => {});
        if (!onboarded) setNeedOnboarding(true);
      }
      if (cancelled) return;

      setBabies(store.babies);
      setCurrentBabyId(store.currentId);
      setProfile(profileOf(current));
      latestStoreRef.current = { babies: store.babies, currentId: store.currentId };

      const sync = createContentSync({ manifestUrl: SERVICE_URL, storage: asyncStorage });
      const cached = await sync.getCachedBundle();
      if (cancelled) return;
      applyBundle(cached.bundle, state, {
        version: cached.bundle.version,
        source: cached.source,
        offline: false,
      });
      setReady(true);

      // 2) 档案云同步：本地已上屏；断网/超时只保持本地，不影响界面
      try {
        const synced = await syncProfileFromServer(store as any);
        if (!cancelled && synced.changed) {
          await applySyncedStore(synced.store);
        }
        if (__DEV__ && synced.source !== 'server') {
          console.log('[profile] sync source=' + synced.source + (synced.error ? ' error=' + synced.error : ''));
        }
      } catch (err: any) {
        console.warn('[profile] sync failed: ' + (err && err.message ? err.message : err));
      }
      if (cancelled) return;

      // 3) 后台拉远端内容；失败自动回落缓存/内置
      let res: any = null;
      try {
        res = await sync.sync();
      } catch (err: any) {
        console.warn('[content] sync failed: ' + (err && err.message ? err.message : err));
        return;
      }
      if (cancelled) return;
      const snap = coreRef.current ? coreRef.current.snapshot() : state;
      applyBundle(res.bundle, snap, {
        version: res.version || res.bundle.version,
        source: res.source,
        offline: !!res.offline,
      });
    }

    boot().catch(() => {
      if (!cancelled) setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  /* 网络恢复（Web online / 原生回前台）时补推 pending，并把远端较新的记录合并回来 */
  useEffect(() => {
    if (!ready) return;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const onOnline = () => { void retryProfileSync(); };
      window.addEventListener('online', onOnline);
      return () => window.removeEventListener('online', onOnline);
    }
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void retryProfileSync();
    });
    return () => sub.remove();
  }, [ready]);

  /* 跨天 / 回前台重算阶段：日期边界变化时自动进入下一档，只轻提示一次 */
  useEffect(() => {
    if (!ready) return;
    let currentStage = stageId;
    function recompute() {
      if (!currentBaby) return;
      const derived = stageFromProfile(currentBaby as any, new Date());
      if (!derived || derived === currentStage) return;
      currentStage = derived;
      if (coreRef.current) coreRef.current.setStage(derived);
      setStageId(derived);
      const nextStage = STAGES[derived];
      if (screen === 'cards' || screen === 'music' || screen === 'video') {
        setScreen(INTERACTION_SCREEN[nextStage.interaction] || 'cards');
      }
      setProfile(profileOf(currentBaby));
      bump();
      if (coreRef.current) coreRef.current.flush();
      showToast(`今天进入「${nextStage.label}」阶段，内容已更新`);
    }
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') recompute();
    });
    let onVisibility: (() => void) | null = null;
    let onFocus: (() => void) | null = null;
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      onVisibility = () => {
        if (document.visibilityState === 'visible') recompute();
      };
      onFocus = () => recompute();
      document.addEventListener('visibilitychange', onVisibility);
      window.addEventListener('focus', onFocus);
    }
    return () => {
      sub.remove();
      if (onVisibility) document.removeEventListener('visibilitychange', onVisibility);
      if (onFocus) window.removeEventListener('focus', onFocus);
    };
  }, [ready, currentBaby && currentBaby.id, currentBaby && currentBaby.updatedAt, stageId, screen]);

  const core = coreRef.current;

  if (!ready || !core) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: COLORS.cream }]}>
        <StatusBar style="dark" />
        <View style={styles.loading}>
          <ActivityIndicator color={COLORS.coral} />
          <Text style={styles.loadingText}>正在准备今天的内容…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (needOnboarding) {
    return <OnboardingScreen onComplete={completeOnboarding} onSkip={skipOnboarding} />;
  }

  const stage = STAGES[stageId] || STAGES.toddler;
  const theme = stageTheme(stage);
  const interaction = INTERACTIONS[stage.interaction] || INTERACTIONS.flashcards;

  /** 当前宝宝的档案更新入口：写生日/预产期后全站阶段实时推导；对侧日期显式置空，避免脏状态 */
  async function applyProfile(next: BabyProfile) {
    if (!currentBabyId) return;
    const patch = next.pregnant
      ? { pregnant: true, dueDate: next.dueDate, birthDate: null }
      : { pregnant: false, birthDate: next.birthDate, dueDate: null };
    await updateBabyProfile(currentBabyId, patch, '档案已更新');
  }

  async function updateBabyIdentity(nickname: string, parentRole: 'mom' | 'dad' | 'other') {
    if (!currentBabyId) return;
    const result = await patchBaby({ babies, currentId: currentBabyId }, currentBabyId, { nickname, parentRole }, new Date());
    if (!result) {
      showToast('称呼保存失败，请重试');
      return;
    }
    setBabies(result.store.babies);
    setProfile(profileOf(result.baby));
    bump();
    showToast(`称呼已更新 · ${displayName(result.baby as any)}`);
  }

  async function updateBabyProfile(id: string, patch: any, successLabel?: string) {
    const result = await patchBaby({ babies, currentId: currentBabyId }, id, patch, new Date());
    if (!result) {
      showToast('日期不合法，请重新选择');
      return;
    }
    setBabies(result.store.babies);
    if (id !== currentBabyId) return;
    setProfile(profileOf(result.baby));
    const derived = stageFromProfile(result.baby as any);
    if (!derived) return;
    core.setStage(derived);
    setStageId(derived);
    const nextStage = STAGES[derived];
    if (screen === 'cards' || screen === 'music' || screen === 'video') {
      setScreen(INTERACTION_SCREEN[nextStage.interaction] || 'cards');
    }
    bump();
    await core.flush();
    showToast(`${successLabel || '宝宝档案已更新'} · ${profileLabel(result.baby as any, new Date())} · ${nextStage.label}`);
  }

  /** 阶段只由宝宝档案推导：不再提供页面内切换/预览入口 */
  async function completeOnboarding(next: BabyProfile, identity: { nickname: string; parentRole: 'mom' | 'dad' | 'other' }) {
    if (!core) return;
    const input = next.pregnant
      ? { name: '宝宝 1', nickname: identity.nickname, parentRole: identity.parentRole, pregnant: true, dueDate: next.dueDate }
      : { name: '宝宝 1', nickname: identity.nickname, parentRole: identity.parentRole, pregnant: false, birthDate: next.birthDate };
    const added = await addBaby({ babies: [], currentId: null }, input as any, new Date());
    if (!added) {
      showToast('日期不合法，请重新选择');
      return;
    }
    setNeedOnboarding(false);
    setScreen('home');
    await activateBaby(added.store, added.baby.id, false);
    const derived = stageFromProfile(added.baby as any) || 'toddler';
    showToast(next.pregnant ? '已记录预产期，开始孕期陪伴' : `已准备好${STAGES[derived].label}的内容`);
  }

  async function skipOnboarding() {
    await markOnboarded();
    setNeedOnboarding(false);
    setScreen('home');
    showToast('已跳过，可随时在「我的」添加宝宝生日');
  }

  async function switchBaby(id: string) {
    const store = await setCurrentStore(id);
    await activateBaby(store, id);
  }

  async function setCurrentStore(id: string) {
    const next: BabyStore = { babies, currentId: id };
    await saveBabyStore(next);
    return next;
  }

  async function addBabyProfile(input: { name?: string; nickname?: string; parentRole?: 'mom' | 'dad' | 'other'; pregnant: boolean; dueDate?: string | null; birthDate?: string | null }) {
    const store = { babies, currentId: currentBabyId };
    const added = await addBaby(store, input, new Date());
    if (!added) {
      showToast('日期不合法，请重新选择');
      return;
    }
    await activateBaby(added.store, added.baby.id, false);
    showToast(`已添加 ${added.baby.name}，学习数据独立保存`);
  }

  async function deleteBabyProfile(id: string) {
    const result = await removeBaby({ babies, currentId: currentBabyId }, id);
    if (!result.ok) {
      showToast('至少保留一个宝宝档案');
      return;
    }
    setBabies(result.store.babies);
    if (result.store.currentId !== currentBabyId) {
      await activateBaby(result.store, result.store.currentId as string, false);
    }
    showToast('宝宝档案已删除');
  }

  function openInteraction() {
    setScreen(INTERACTION_SCREEN[stage.interaction] || 'cards');
  }

  function openEntry(target?: string) {
    if (target === 'audio') return setScreen('music');
    if (target === 'flashcards') return setScreen('cards');
    if (target === 'video') return setScreen('video');
    if (target === 'shop') return setScreen('shop');
    if (target === 'tasks') return setScreen('tasks');
    if (target === 'courses') {
      setCoursesOrigin(screen === 'mine' ? 'mine' : 'home');
      return setScreen('courses');
    }
    if (target === 'story') return setScreen('stories');
    openInteraction();
  }

  function openStory(id: string) {
    setStoryId(id);
    setScreen('story');
    core.recordHistory('story', id, stageId);
    core.flush();
  }

  function openCourse(id: string) {
    setCourseId(id);
    setScreen('course');
    core.recordHistory('course', id, stageId);
    core.flush();
  }

  function openSearchItem(item: any) {
    if (item.kind === 'product') {
      setProductId(Number(item.id));
      return setScreen('product');
    }
    if (item.kind === 'audio') {
      setMusicTrackId(item.id);
      return setScreen('music');
    }
    if (item.kind === 'video') return setScreen('video');
    if (item.kind === 'course') return openCourse(item.id);
    if (item.kind === 'story') return openStory(item.id);
    setScreen('cards');
  }

  function toggleTask(task: any) {
    core.toggleTask(task, stageId);
    bump();
    core.flush();
  }

  function markLearned(topicId: string, index: number) {
    const isNew = core.markCardLearned(topicId, index, stageId);
    bump();
    core.flush();
    return !!isNew;
  }

  function toggleFav(kind: string, id: string) {
    core.toggleFav(kind, id, stageId);
    bump();
    core.flush();
  }

  function recordHistory(kind: string, id: string, stage: string) {
    core.recordHistory(kind, id, stage);
    core.flush();
  }

  function studyTick(module: StudyModule, seconds: number) {
    core.addStudyTime(module, seconds);
    core.flush();
  }

  function addToCart(id: number) {
    core.addToCart(id);
    bump();
    core.flush();
  }

  function setQty(id: number, qty: number) {
    core.setQty(id, qty);
    bump();
    core.flush();
  }

  function removeFromCart(id: number) {
    core.removeFromCart(id);
    bump();
    core.flush();
    showToast('已从购物车移除');
  }

  function clearCart() {
    core.clearCart();
    bump();
    core.flush();
  }

  function checkout() {
    const result = core.checkout();
    bump();
    core.flush();
    return result;
  }

  function resetAll() {
    core.resetAll();
    // 清空当前宝宝的体验数据但保留档案：阶段仍由档案推导
    const derived = (currentBaby && stageFromProfile(currentBaby as any)) || 'toddler';
    core.setStage(derived);
    setStageId(derived);
    setScreen('home');
    setProductId(null);
    bump();
    core.flush();
    showToast('已清空当前宝宝的体验数据');
  }

  /**
   * 开发调试：彻底重置
   * 1) 先 flush 旧 core 的 pending 写入，避免重置后又落回旧数据
   * 2) 取消已排期的本地提醒（不写回设置）
   * 3) 枚举并删除所有 yy.v1.* 键，再复核残留
   * 4) 用空白状态重建 core（内存一并重置），并通过 sessionKey 重挂载页面树
   * 5) 回到首次引导
   */
  async function devHardReset() {
    try {
      if (coreRef.current) await coreRef.current.flush();
      await cancelAllScheduledReminders();
      const { removed, remaining } = await purgeAllAppData();
      const fresh = await hydrate(asyncStorage);
      storageRef.current = asyncStorage;
      setBabies([]);
      setCurrentBabyId(null);
      setProfile(null);
      setProductId(null);
      setScreen('home');
      setNeedOnboarding(true);
      setSessionKey((k) => k + 1);
      if (bundleRef.current) buildCore(bundleRef.current, fresh, contentInfo);
      bump();
      if (__DEV__) console.log('[dev-reset] removed=' + removed.length + ' remaining=' + remaining.length);
    } catch (err) {
      if (__DEV__) console.warn('[dev-reset] failed', err);
    }
  }

  const tabs: TabItem[] = [
    { key: 'home', label: '首页', icon: '🏠' },
    { key: 'tasks', label: '任务', icon: '✅' },
    { key: 'shop', label: '商城', icon: '🛍️', badge: core.cartCount() },
    { key: 'interaction', label: interaction.navLabel, icon: iconEmoji(interaction.icon) },
    { key: 'mine', label: '我的', icon: '👤' },
  ];

  const activeTab =
    screen === 'fav' || screen === 'history' || screen === 'report' || screen === 'orders' || screen === 'babies' || screen === 'about' || screen === 'help' || screen === 'privacy'
      ? 'mine'
      : screen === 'search'
        ? 'home'
        : screen === 'courses' || screen === 'course'
          ? coursesOrigin
          : screen === 'stories' || screen === 'story'
            ? 'home'
            : screen === 'home' ? 'home'
          : screen === 'tasks' ? 'tasks'
            : screen === 'shop' || screen === 'product' || screen === 'cart' ? 'shop'
              : screen === 'mine' ? 'mine'
                : 'interaction';

  function onTab(key: string) {
    if (key === 'home') return setScreen('home');
    if (key === 'tasks') return setScreen('tasks');
    if (key === 'shop') return setScreen('shop');
    if (key === 'mine') return setScreen('mine');
    openInteraction();
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.page }]}>
      <StatusBar style="dark" />
      <View style={styles.body} key={sessionKey}>
        {screen === 'home' && (
          <HomeScreen
            core={core}
            stageId={stageId}
            contentInfo={contentInfo}
            profile={profile}
            baby={currentBaby}
            onOpenBabies={() => setScreen('babies')}
            onOpenSearch={() => setScreen('search')}
            onOpenTasks={() => setScreen('tasks')}
            onOpenInteraction={() => openInteraction()}
            onOpenEntry={(target?: string) => openEntry(target)}
            onOpenMine={() => setScreen('mine')}
          />
        )}
        {screen === 'tasks' && (
          <TasksScreen
            core={core}
            stageId={stageId}
            onBack={() => setScreen('home')}
            onToggle={toggleTask}
            onStudyTick={studyTick}
          />
        )}
        {screen === 'cards' && (
          <CardsScreen
            core={core}
            stageId={stageId}
            parentName={currentBaby ? displayName(currentBaby) : '家长'}
            onBack={() => setScreen('home')}
            onMarkLearned={markLearned}
            onToggleFav={toggleFav}
            onRecordHistory={recordHistory}
            onStudyTick={studyTick}
            onToast={showToast}
          />
        )}
        {screen === 'music' && (
          <MusicScreen
            core={core}
            stageId={stageId}
            initialTrackId={musicTrackId}
            onConsumeInitialTrack={() => setMusicTrackId(null)}
            onBack={() => setScreen('home')}
            onToggleFav={toggleFav}
            onToast={showToast}
            onRecordHistory={recordHistory}
            onStudyTick={studyTick}
          />
        )}
        {screen === 'video' && (
          <VideoScreen
            core={core}
            stageId={stageId}
            onBack={() => setScreen('home')}
            onToggleFav={toggleFav}
            onToast={showToast}
            onRecordHistory={recordHistory}
            onStudyTick={studyTick}
          />
        )}
        {(screen === 'shop' || screen === 'product' || screen === 'cart') && (
          <ShopScreen
            core={core}
            stageId={stageId}
            mode={screen === 'shop' ? 'list' : screen === 'product' ? 'product' : 'cart'}
            productId={productId}
            onBack={() => setScreen('shop')}
            onOpenProduct={(id: number) => { setProductId(id); setScreen('product'); }}
            onOpenCart={() => setScreen('cart')}
            onNav={(next) => setScreen(next === 'home' ? 'home' : next === 'tasks' ? 'tasks' : 'shop')}
            onAddToCart={addToCart}
            onSetQty={setQty}
            onRemove={removeFromCart}
            onClearCart={clearCart}
            onCheckout={checkout}
            onOpenOrders={() => setScreen('orders')}
            onToast={showToast}
          />
        )}
        {screen === 'mine' && (
          <MineScreen
            core={core}
            stageId={stageId}
            profile={profile}
            baby={currentBaby}
            parentName={currentBaby ? displayName(currentBaby) : '家长'}
            babyCount={babies.length}
            onChangeProfile={applyProfile}
            onUpdateIdentity={updateBabyIdentity}
            onOpenBabies={() => setScreen('babies')}
            onOpenFavorites={() => setScreen('fav')}
            onOpenHistory={() => setScreen('history')}
            onOpenReport={() => setScreen('report')}
            onOpenOrders={() => setScreen('orders')}
            onReset={resetAll}
            onHardReset={devHardReset}
            onOpenShop={() => setScreen('shop')}
            onOpenTasks={() => setScreen('tasks')}
            onOpenCourses={() => { setCoursesOrigin('mine'); setScreen('courses'); }}
            onOpenAbout={() => setScreen('about')}
            onOpenHelp={() => setScreen('help')}
            onOpenPrivacy={() => setScreen('privacy')}
            onToast={showToast}
          />
        )}
        {screen === 'fav' && (
          <FavoritesScreen
            items={core.favItems()}
            onBack={() => setScreen('mine')}
            onUnfav={(item: any) => { core.toggleFav(item.kind, item.id, item.stage); bump(); core.flush(); }}
            onOpen={openSearchItem}
          />
        )}
        {screen === 'history' && (
          <HistoryScreen
            items={core.history()}
            onBack={() => setScreen('mine')}
            onClear={() => { core.clearHistory(); bump(); core.flush(); showToast('浏览历史已清空'); }}
            onOpen={openSearchItem}
          />
        )}
        {screen === 'search' && (
          <SearchScreen
            content={core.getContent()}
            onBack={() => setScreen('home')}
            onOpen={openSearchItem}
          />
        )}
        {screen === 'report' && (
          <ReportScreen core={core} stageId={stageId} parentName={currentBaby ? displayName(currentBaby) : '家长'} onBack={() => setScreen('mine')} />
        )}
        {screen === 'orders' && (
          <OrdersScreen orders={core.orders()} onBack={() => setScreen('mine')} />
        )}
        {screen === 'babies' && (
          <BabyManagerScreen
            babies={babies}
            currentId={currentBabyId}
            onBack={() => setScreen('mine')}
            onSwitch={switchBaby}
            onAdd={addBabyProfile}
            onUpdate={(id: string, patch: any) => updateBabyProfile(id, patch, '宝宝档案已更新')}
            onDelete={deleteBabyProfile}
          />
        )}
        {screen === 'courses' && (
          <CoursesScreen
            courses={(core.getContent().courses || COURSES)}
            accent={theme.accent}
            onBack={() => setScreen(coursesOrigin)}
            onOpenCourse={openCourse}
            onStudyTick={studyTick}
          />
        )}
        {screen === 'course' && (
          <CourseDetailScreen
            course={(core.getContent().courses || []).find((c: any) => c.id === courseId) || findCourse(courseId || '')}
            accent={theme.accent}
            isFav={!!courseId && core.isFav('course', courseId, stageId)}
            onBack={() => setScreen('courses')}
            onToggleFav={() => {
              if (!courseId) return;
              core.toggleFav('course', courseId, stageId);
              bump();
              core.flush();
              showToast(core.isFav('course', courseId, stageId) ? '课程已收藏' : '已取消收藏');
            }}
            onStudyTick={studyTick}
            onToast={showToast}
            getProgress={(chapterId: string) => core.getCourseProgress(courseId || '', chapterId)}
            onSaveProgress={(chapterId: string, patch: any) => {
              core.setCourseProgress(courseId || '', chapterId, patch);
            }}
          />
        )}
        {screen === 'stories' && (
          <StoriesScreen
            stories={core.getContent().stories || STORIES}
            accent={theme.accent}
            onBack={() => setScreen('home')}
            onOpenStory={openStory}
          />
        )}
        {screen === 'story' && (
          <StoryDetailScreen
            story={findStory(core.getContent(), storyId)}
            accent={theme.accent}
            initialPage={(() => {
              if (!storyId) return 0;
              const progress = core.getCourseProgress(storyId, 'read');
              return progress && typeof progress.page === 'number' ? progress.page : 0;
            })()}
            onBack={() => setScreen('stories')}
            onPageChange={(page: number) => {
              if (!storyId) return;
              core.setCourseProgress(storyId, 'read', { page });
            }}
            onStudyTick={studyTick}
            onToast={showToast}
          />
        )}
        {(screen === 'about' || screen === 'help' || screen === 'privacy') && (
          <InfoScreen mode={screen} accent={theme.accent} onBack={() => setScreen('mine')} onToast={showToast} />
        )}
      </View>
      <Toast message={toastMsg} visible={!!toastMsg} />
      <TabBar items={tabs} active={activeTab} accent={theme.accent} onChange={onTab} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 12, color: COLORS.sub },
});
