import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { COLORS, stageTheme } from '../theme';
import { STAGES, STAGE_ORDER, profileAgeLabel, profileIsOverdue, formatReminderTime, ROLE_LABELS, NICKNAME_UNITS, displayName } from '../sharedAdapter';
import DatePicker from '../components/DatePicker';
import { appVersionLabel } from '../appVersion';
import {
  DEFAULT_REMINDER_SETTINGS,
  disableReminder,
  enableReminder,
  loadReminderSettings,
  openReminderSettings,
  reminderScopeNote,
  updateReminderTime,
} from '../notifications';
import type { ReminderSettings } from '../notifications';
import type { BabyProfile } from '../profile';
import type { Baby } from '../babies';

type Props = {
  core: any;
  stageId: string;
  profile: BabyProfile | null;
  baby: Baby | null;
  parentName: string;
  babyCount: number;
  onChangeProfile: (profile: BabyProfile) => void;
  onUpdateIdentity: (nickname: string, parentRole: 'mom' | 'dad' | 'other') => void;
  onOpenBabies: () => void;
  onOpenFavorites: () => void;
  onOpenHistory: () => void;
  onOpenReport: () => void;
  onOpenOrders: () => void;
  onReset: () => void;
  onHardReset: () => void;
  onOpenShop: () => void;
  onOpenTasks: () => void;
  onOpenCourses: () => void;
  onOpenAbout: () => void;
  onOpenHelp: () => void;
  onOpenPrivacy: () => void;
  onToast: (msg: string) => void;
};

type DateMode = 'due' | 'birth';

const REMINDER_TIMES = [
  { hour: 18, minute: 0 },
  { hour: 19, minute: 0 },
  { hour: 20, minute: 0 },
  { hour: 21, minute: 0 },
];

export default function MineScreen({ core, stageId, profile, baby, parentName, babyCount, onChangeProfile, onUpdateIdentity, onOpenBabies, onOpenFavorites, onOpenHistory, onOpenReport, onOpenOrders, onReset, onHardReset, onOpenShop, onOpenTasks, onOpenCourses, onOpenAbout, onOpenHelp, onOpenPrivacy, onToast }: Props) {
  const stage = STAGES[stageId];
  const theme = stageTheme(stage);
  const stats = core.todayStats(stageId);
  const coins = core.coins();
  const total = core.totalCompleted();
  const favs = core.favCount();
  const orders = core.orders();
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmHardReset, setConfirmHardReset] = useState(false);
  const [dateMode, setDateMode] = useState<DateMode | null>(null);
  /** 改日期时若阶段发生变化，先暂存日期，等二次确认后再写档案 */
  const [pendingSwitchDate, setPendingSwitchDate] = useState<string | null>(null);
  const [reminder, setReminder] = useState<ReminderSettings>(DEFAULT_REMINDER_SETTINGS);
  const [reminderBusy, setReminderBusy] = useState(false);
  const [reminderDenied, setReminderDenied] = useState(false);
  const [reminderWebOnly, setReminderWebOnly] = useState(false);
  const [identityOpen, setIdentityOpen] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState('');
  const [roleDraft, setRoleDraft] = useState<'mom' | 'dad' | 'other'>('mom');

  useEffect(() => {
    let alive = true;
    loadReminderSettings().then((settings) => {
      if (alive) setReminder(settings);
    });
    return () => { alive = false; };
  }, []);

  async function toggleReminder(next: boolean) {
    if (reminderBusy) return;
    setReminderBusy(true);
    if (!next) {
      const result = await disableReminder();
      setReminder((prev) => ({ ...prev, enabled: false }));
      setReminderDenied(false);
      setReminderWebOnly(false);
      setReminderBusy(false);
      onToast(result.message || '打卡提醒已关闭');
      return;
    }
    const result = await enableReminder(reminder);
    setReminderBusy(false);
    if (result.status === 'ok') {
      setReminder((prev) => ({ ...prev, enabled: true }));
      setReminderDenied(false);
      setReminderWebOnly(!!result.webOnly);
      onToast(result.message || '打卡提醒已开启');
      return;
    }
    setReminder((prev) => ({ ...prev, enabled: false }));
    setReminderDenied(result.status === 'denied');
    onToast(result.message || '无法开启打卡提醒');
  }

  async function pickReminderTime(hour: number, minute: number) {
    const next = { ...reminder, hour, minute };
    setReminder(next);
    if (!reminder.enabled) return;
    const result = await updateReminderTime(next);
    onToast(result.message || '提醒时间已更新');
  }
  const overdue = profileIsOverdue(profile);
  const roleLabel = ROLE_LABELS[baby?.parentRole || 'mom'] || '家长';
  const currentName = baby ? displayName(baby) : parentName;
  const dateText = profile?.pregnant
    ? (profile.dueDate || '未设置')
    : (profile?.birthDate || (profile?.months != null ? `旧月龄 ${profile.months} 个月` : '未设置'));
  const ageText = profileAgeLabel(profile);

  return (
    <View style={styles.flex}>
      <View style={styles.head}>
        <View style={styles.headCopy}>
          <Text style={styles.headTitle}>我的</Text>
          <Text style={styles.headSub}>记录今天，也记录一点点长大</Text>
        </View>
        <Pressable onPress={onOpenShop} style={styles.giftBtn} accessibilityLabel="去商城">
          <Text style={styles.giftText}>🎁</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.profile, { backgroundColor: theme.accent }]}>
          <View style={styles.profileBlob} />
          <View style={styles.profileBody}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{stage.emoji}</Text>
            </View>
            <View style={styles.profileCopy}>
              <Text style={styles.name} numberOfLines={1}>{currentName}</Text>
              <Text style={styles.profileMeta}>
                {baby ? `当前宝宝：${baby.name}` : '未设置宝宝'} · {stage.label} · {stage.homeEntryTitle}
              </Text>
              <View style={styles.coinsPill}>
                <Text style={styles.coinsText}>⭐ {coins} 成长值</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: theme.accent }]}>{stats.streak}</Text>
            <Text style={styles.statLabel}>连续打卡（天）</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: theme.accent }]}>{total}</Text>
            <Text style={styles.statLabel}>累计完成任务</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: theme.accent }]}>{favs}</Text>
            <Text style={styles.statLabel}>收藏内容</Text>
          </View>
        </View>

        <Pressable
          onPress={onOpenCourses}
          accessibilityRole="button"
          accessibilityLabel="进入孕妈课堂"
          style={[styles.courseEntry, { borderColor: theme.accent }]}
        >
          <View style={[styles.courseIcon, { backgroundColor: theme.soft }]}>
            <Text style={styles.courseEmoji}>🤰</Text>
          </View>
          <View style={styles.toolCopy}>
            <View style={styles.courseTitleRow}>
              <Text style={styles.toolLabel}>孕妈课堂</Text>
              {!!profile?.pregnant && (
                <View style={[styles.pregTag, { backgroundColor: theme.accent }]}>
                  <Text style={styles.pregTagText}>孕期专属</Text>
                </View>
              )}
            </View>
            <Text style={styles.toolSub}>
              {profile?.pregnant ? '胎教 / 营养 / 产检 / 心理 / 分娩准备' : '孕期知识回看 · 胎教 / 营养 / 产检'}
            </Text>
          </View>
          <Text style={[styles.toolGo, { color: theme.accent }]}>→</Text>
        </Pressable>

        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle}>宝宝档案</Text>
            <Pressable onPress={onOpenBabies} accessibilityRole="button" accessibilityLabel="管理宝宝">
              <Text style={[styles.cardLink, { color: theme.accent }]}>管理宝宝（{babyCount}）→</Text>
            </Pressable>
          </View>
          {(baby?.name || profile) && (
            <Text style={styles.currentBaby}>当前：{baby?.name || '宝宝'} · 学习数据独立保存</Text>
          )}
          <Pressable
            onPress={() => {
              setNicknameDraft(baby?.nickname || '');
              setRoleDraft((baby?.parentRole || 'mom') as 'mom' | 'dad' | 'other');
              setIdentityOpen(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="修改我的称呼"
            style={styles.identityRow}
          >
            <View style={styles.identityCopy}>
              <Text style={styles.identityLabel}>我的称呼</Text>
              <Text style={styles.identityValue}>{currentName}</Text>
            </View>
            <Text style={[styles.identityAction, { color: theme.accent }]}>修改 →</Text>
          </Pressable>
          <Pressable
            onPress={() => setDateMode(profile?.pregnant === false ? 'birth' : 'due')}
            accessibilityRole="button"
            style={[styles.ageRow, { backgroundColor: theme.soft, borderColor: theme.accent }]}
          >
            <Text style={styles.stageEmoji}>{profile?.pregnant ? '🤰' : stage.emoji}</Text>
            <View style={styles.stageCopy}>
              <Text style={styles.stageName}>{profile?.pregnant ? '预产期' : '宝宝生日'}</Text>
              <Text style={styles.stageSub}>{dateText} · {ageText} · 当前阶段 {stage.label}</Text>
            </View>
            <Text style={[styles.stageAction, { color: theme.accent }]}>修改 →</Text>
          </Pressable>

          {overdue && (
            <Pressable
              onPress={() => setDateMode('birth')}
              accessibilityRole="button"
              style={styles.overdueRow}
            >
              <Text style={styles.overdueText}>宝宝应该出生啦，点这里切换 →</Text>
            </Pressable>
          )}

          {profile?.pregnant && (
            <Pressable
              onPress={() => setDateMode('birth')}
              accessibilityRole="button"
              style={[styles.bornBtn, { backgroundColor: theme.soft }]}
            >
              <Text style={[styles.bornText, { color: theme.accent }]}>👶 宝宝出生了 · 选出生日期 →</Text>
            </Pressable>
          )}

          <View style={styles.stageLadder}>
            {STAGE_ORDER.map((id) => {
              const s = STAGES[id];
              const on = id === stageId;
              return (
                <View key={id} style={[styles.stagePill, on && { backgroundColor: stageTheme(s).soft }]}>
                  <Text style={[styles.stagePillText, on && { color: stageTheme(s).accent, fontWeight: '800' }]}>
                    {s.emoji} {s.label}
                  </Text>
                </View>
              );
            })}
          </View>
          <Text style={styles.ageHint}>月龄按生日自然增长；改生日后，阶段、主题色、导航、互动页和任务会立即同步。</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{roleLabel}工具</Text>
          {[
            { emoji: '♥', label: '我的收藏', sub: `曲目 / 视频 / 卡片 · ${favs} 条`, onPress: onOpenFavorites },
            { emoji: '🕘', label: '浏览历史', sub: '最近看过的内容 · 可清空', onPress: onOpenHistory },
            { emoji: '📊', label: '学习报告', sub: '时长 / 完成率 / 连续打卡', onPress: onOpenReport },
            { emoji: '🧾', label: '兑换记录', sub: `订单列表与详情 · ${orders.length} 笔`, onPress: onOpenOrders },
          ].map((entry) => (
            <Pressable key={entry.label} onPress={entry.onPress} style={styles.toolRow} accessibilityRole="button">
              <Text style={styles.toolEmoji}>{entry.emoji}</Text>
              <View style={styles.toolCopy}>
                <Text style={styles.toolLabel}>{entry.label}</Text>
                <Text style={styles.toolSub}>{entry.sub}</Text>
              </View>
              <Text style={[styles.toolGo, { color: theme.accent }]}>→</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle}>打卡提醒</Text>
            <Switch
              value={reminder.enabled}
              onValueChange={toggleReminder}
              disabled={reminderBusy}
              accessibilityLabel="打卡提醒开关"
              trackColor={{ false: '#E6D9CC', true: theme.accent }}
              thumbColor="#FFFFFF"
            />
          </View>
          <Text style={styles.reminderSub}>
            {reminder.enabled ? `每天 ${formatReminderTime(reminder)} 提醒打卡` : '开启后每天固定时间提醒，重启仍有效'}
          </Text>
          <View style={styles.timeRow}>
            {REMINDER_TIMES.map((t) => {
              const on = reminder.hour === t.hour && reminder.minute === t.minute;
              const label = `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`;
              return (
                <Pressable
                  key={label}
                  onPress={() => pickReminderTime(t.hour, t.minute)}
                  accessibilityLabel={`提醒时间 ${label}`}
                  style={[styles.timeChip, on && { backgroundColor: theme.accent, borderColor: theme.accent }]}
                >
                  <Text style={[styles.timeText, on && { color: '#fff' }]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
          {reminderDenied && (
            <Pressable
              onPress={async () => {
                const opened = await openReminderSettings();
                onToast(opened ? '已打开系统设置，请允许通知' : '请在浏览器地址栏的权限设置中允许通知');
              }}
              accessibilityRole="button"
              style={styles.notifyDeny}
            >
              <Text style={styles.notifyDenyText}>通知权限被拒绝 · 去设置开启 →</Text>
            </Pressable>
          )}
          {reminder.enabled && reminderWebOnly && (
            <Text style={styles.reminderSub}>Web 已保存设置，但定时本地通知不会在浏览器中弹出。</Text>
          )}
          <Text style={styles.reminderNote}>{reminderScopeNote()}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle}>兑换记录</Text>
            <Pressable onPress={onOpenOrders}>
              <Text style={[styles.cardLink, { color: theme.accent }]}>查看全部 →</Text>
            </Pressable>
          </View>
          {orders.length ? (
            orders.slice(0, 4).map((o: any) => (
              <View key={o.id} style={styles.order}>
                <View style={styles.orderCopy}>
                  <Text style={styles.orderTitle} numberOfLines={1}>
                    {o.items.map((x: any) => `${x.emoji} ${x.title}`).join('、')}
                  </Text>
                  <Text style={styles.orderMeta}>{o.date} · {o.id}</Text>
                </View>
                <Text style={styles.orderTotal}>-{o.total}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyOrder}>还没有兑换记录，去商城用成长值换第一件小礼物吧。</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>今日概览</Text>
          <View style={styles.overviewRow}>
            <Text style={styles.overviewLabel}>今日任务</Text>
            <Text style={styles.overviewValue}>{stats.done} / {stats.total} 已完成</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${stats.percent}%`, backgroundColor: theme.accent }]} />
          </View>
          <View style={styles.overviewRow}>
            <Text style={styles.overviewLabel}>当前阶段今日成长值</Text>
            <Text style={[styles.overviewValue, { color: theme.accent }]}>+{stats.earned}</Text>
          </View>
          <Pressable style={[styles.taskBtn, { backgroundColor: theme.soft }]} onPress={onOpenTasks}>
            <Text style={[styles.taskBtnText, { color: theme.accent }]}>去完成今日任务</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>关于与帮助</Text>
          {[
            { emoji: '🌱', label: '关于我们', sub: `版本 ${appVersionLabel()} · 产品简介`, onPress: onOpenAbout },
            { emoji: '💬', label: '帮助与反馈', sub: '常见问题 · 提交建议', onPress: onOpenHelp },
            { emoji: '🔒', label: '隐私政策', sub: '本机存储与数据删除说明', onPress: onOpenPrivacy },
          ].map((entry) => (
            <Pressable key={entry.label} onPress={entry.onPress} style={styles.toolRow} accessibilityRole="button">
              <Text style={styles.toolEmoji}>{entry.emoji}</Text>
              <View style={styles.toolCopy}>
                <Text style={styles.toolLabel}>{entry.label}</Text>
                <Text style={styles.toolSub}>{entry.sub}</Text>
              </View>
              <Text style={[styles.toolGo, { color: theme.accent }]}>→</Text>
            </Pressable>
          ))}
        </View>

        <Pressable style={styles.dangerBtn} onPress={() => setConfirmReset(true)}>
          <Text style={styles.dangerText}>🧹 清空体验数据</Text>
        </Pressable>
        <Text style={styles.aboutNote}>
          所有阶段、打卡、购物车与收藏数据都保存在本机（Web 使用 localStorage，原生使用 AsyncStorage），换设备或清缓存会丢失。
        </Text>

        {/* 开发调试入口：生产构建 __DEV__ 为 false，整段在渲染层不进入 JSX */}
        {__DEV__ && (
          <View style={styles.devSection}>
            <Text style={styles.devGroupTitle}>开发者选项（仅开发模式可见）</Text>
            <Pressable
              style={styles.devDangerBtn}
              onPress={() => setConfirmHardReset(true)}
              accessibilityRole="button"
            >
              <Text style={styles.devDangerText}>彻底重置（含宝宝档案）</Text>
            </Pressable>
            <Text style={styles.devHint}>
              删除本项目所有 yy.v1.* 本地键，并回到首次引导。仅用于调试，正式包不会出现。
            </Text>
          </View>
        )}
      </ScrollView>

      {identityOpen && (
        <View style={styles.modalMask}>
          <View style={styles.modalCard}>
            <Text style={styles.modalEmoji}>🙋</Text>
            <Text style={styles.modalTitle}>修改我的称呼</Text>
            <Text style={styles.modalText}>称呼只属于当前宝宝档案，切换宝宝后会各自显示。</Text>
            <TextInput
              value={nicknameDraft}
              onChangeText={setNicknameDraft}
              placeholder="宝宝昵称，例如：小花生"
              placeholderTextColor={COLORS.sub}
              maxLength={NICKNAME_UNITS * 2}
              style={styles.identityInput}
              accessibilityLabel="宝宝昵称输入"
            />
            <View style={styles.identityRoles}>
              {(['mom', 'dad', 'other'] as const).map((value) => {
                const on = roleDraft === value;
                return (
                  <Pressable
                    key={value}
                    onPress={() => setRoleDraft(value)}
                    accessibilityLabel={`身份${ROLE_LABELS[value]}`}
                    style={[styles.identityRole, on && { backgroundColor: theme.accent, borderColor: theme.accent }]}
                  >
                    <Text style={[styles.identityRoleText, on && { color: '#fff' }]}>{ROLE_LABELS[value]}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.identityPreview}>预览：{displayName({ nickname: nicknameDraft.trim(), parentRole: roleDraft })}</Text>
            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancel} onPress={() => setIdentityOpen(false)}>
                <Text style={styles.modalCancelText}>取消</Text>
              </Pressable>
              <Pressable
                style={[styles.modalDanger, { backgroundColor: theme.accent }]}
                onPress={() => {
                  setIdentityOpen(false);
                  onUpdateIdentity(nicknameDraft.trim(), roleDraft);
                }}
                accessibilityLabel="保存称呼"
              >
                <Text style={styles.modalDangerText}>保存</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {dateMode && (
        <View style={styles.modalMask}>
          <View style={styles.ageSheet}>
            <View style={styles.sheetHead}>
              <Text style={styles.cardTitle}>{dateMode === 'due' ? '预产期' : '宝宝生日'}</Text>
              <Pressable
                onPress={() => { setDateMode(null); setPendingSwitchDate(null); }}
                accessibilityRole="button"
                style={styles.sheetClose}
              >
                <Text style={styles.sheetCloseText}>关闭</Text>
              </Pressable>
            </View>
            <Text style={styles.sheetSub}>
              当前：{dateText} · {ageText} · {stage.label}
            </Text>
            {dateMode === 'due' ? (
              <Pressable onPress={() => { setDateMode('birth'); setPendingSwitchDate(null); }} accessibilityRole="button" style={styles.sheetSwitch}>
                <Text style={[styles.sheetSwitchText, { color: theme.accent }]}>👶 宝宝出生了 → 改选出生日期</Text>
              </Pressable>
            ) : (
              <Pressable onPress={() => { setDateMode('due'); setPendingSwitchDate(null); }} accessibilityRole="button" style={styles.sheetSwitch}>
                <Text style={[styles.sheetSwitchText, { color: theme.accent }]}>🤰 我现在在孕期 → 改选预产期</Text>
              </Pressable>
            )}
            <ScrollView showsVerticalScrollIndicator={false} style={styles.sheetScroll} contentContainerStyle={styles.sheetContent}>
              <DatePicker
                key={dateMode}
                mode={dateMode}
                initial={dateMode === 'due' ? profile?.dueDate : profile?.birthDate}
                accent={dateMode === 'due' ? '#8B6BE0' : theme.accent}
                onConfirm={(date) => {
                  const targetPregnant = dateMode === 'due';
                  if (!!profile && profile.pregnant !== targetPregnant) {
                    setPendingSwitchDate(date);
                    return;
                  }
                  setDateMode(null);
                  onChangeProfile(
                    targetPregnant ? { pregnant: true, dueDate: date } : { pregnant: false, birthDate: date }
                  );
                }}
              />
            </ScrollView>
            {pendingSwitchDate && (
              <View style={styles.switchConfirm}>
                <Text style={styles.switchConfirmTitle}>
                  确认切换为「{dateMode === 'due' ? '孕期' : '已经出生'}」？
                </Text>
                <Text style={styles.switchConfirmText}>
                  切换后全站内容会同步变化：首页文案、主题色、底部导航、互动页、首页孕期卡片与孕妈课堂入口。
                  {dateMode === 'due' ? '生日记录会被清除，预产期使用你刚选择的日期。' : '预产期会被清除，生日使用你刚选择的日期。'}
                  {'\n'}打卡、收藏、浏览历史、学习时长、成长值、购物车和卡片学习进度都会保留。
                </Text>
                <View style={styles.switchConfirmBtns}>
                  <Pressable onPress={() => setPendingSwitchDate(null)} style={styles.switchCancel}>
                    <Text style={styles.switchCancelText}>再想想</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      const date = pendingSwitchDate;
                      const targetPregnant = dateMode === 'due';
                      setPendingSwitchDate(null);
                      setDateMode(null);
                      onChangeProfile(targetPregnant ? { pregnant: true, dueDate: date } : { pregnant: false, birthDate: date });
                    }}
                    style={styles.switchOk}
                  >
                    <Text style={styles.switchOkText}>确认切换</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        </View>
      )}

      {__DEV__ && confirmHardReset && (
        <View style={styles.modalMask}>
          <View style={styles.modalCard}>
            <Text style={styles.modalEmoji}>🧨</Text>
            <Text style={styles.modalTitle}>彻底重置全部数据？</Text>
            <Text style={styles.modalText}>
              将删除本项目所有本地数据：全部宝宝档案、打卡、收藏、浏览历史、学习记录、成长值、购物车、订单、提醒设置。
              {'\n'}重置后回到首次引导，且不可恢复。
            </Text>
            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancel} onPress={() => setConfirmHardReset(false)}>
                <Text style={styles.modalCancelText}>取消</Text>
              </Pressable>
              <Pressable
                style={styles.modalDanger}
                onPress={() => {
                  setConfirmHardReset(false);
                  onHardReset();
                }}
                accessibilityLabel="确认彻底重置"
              >
                <Text style={styles.modalDangerText}>确认彻底重置</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {confirmReset && (
        <View style={styles.modalMask}>
          <View style={styles.modalCard}>
            <Text style={styles.modalEmoji}>🧹</Text>
            <Text style={styles.modalTitle}>清空体验数据？</Text>
            <Text style={styles.modalText}>
              会清除当前宝宝的打卡、学习进度、收藏与浏览历史，以及账号共享的成长值、购物车和订单，回到初始状态。此操作不可撤销。
            </Text>
            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancel} onPress={() => setConfirmReset(false)}>
                <Text style={styles.modalCancelText}>取消</Text>
              </Pressable>
              <Pressable
                style={styles.modalDanger}
                onPress={() => {
                  setConfirmReset(false);
                  onReset();
                }}
              >
                <Text style={styles.modalDangerText}>确认清空</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16 },
  headCopy: { flex: 1 },
  headTitle: { fontSize: 22, fontWeight: '800', color: COLORS.ink },
  headSub: { fontSize: 11.5, color: COLORS.sub, marginTop: 3 },
  giftBtn: { width: 38, height: 38, borderRadius: 14, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  giftText: { fontSize: 18 },
  content: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 32 },
  profile: { borderRadius: 24, padding: 16, overflow: 'hidden' },
  profileBlob: { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.14)', top: -70, right: -50 },
  profileBody: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 56, height: 56, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.26)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 28 },
  profileCopy: { flex: 1, minWidth: 0 },
  name: { fontSize: 16, fontWeight: '800', color: '#fff' },
  profileMeta: { fontSize: 9.5, color: 'rgba(255,255,255,0.86)', marginTop: 3 },
  coinsPill: { alignSelf: 'flex-start', marginTop: 7, backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  coinsText: { fontSize: 9.5, color: '#fff', fontWeight: '800' },
  statsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 18, paddingVertical: 12, marginTop: 12 },
  stat: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 19, fontWeight: '800' },
  statLabel: { fontSize: 9.5, color: COLORS.sub, marginTop: 2 },
  divider: { width: 1, height: 26, backgroundColor: COLORS.line },
  courseEntry: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.white, borderRadius: 18, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 12, marginTop: 12 },
  courseIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  courseEmoji: { fontSize: 20 },
  courseTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pregTag: { borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2 },
  pregTagText: { fontSize: 8, fontWeight: '800', color: '#fff' },
  card: { backgroundColor: COLORS.white, borderRadius: 20, padding: 14, marginTop: 12 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 13.5, fontWeight: '800', color: COLORS.ink },
  cardMeta: { fontSize: 9.5, color: COLORS.sub },
  cardLink: { fontSize: 10, fontWeight: '800' },
  currentBaby: { fontSize: 9.5, color: COLORS.sub, marginBottom: 7 },
  identityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FBF7F2', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 10 },
  identityCopy: { flex: 1, minWidth: 0 },
  identityLabel: { fontSize: 9, color: COLORS.sub, fontWeight: '700' },
  identityValue: { fontSize: 13, fontWeight: '800', color: COLORS.ink, marginTop: 2 },
  identityAction: { fontSize: 10, fontWeight: '800' },
  identityInput: { alignSelf: 'stretch', height: 44, borderRadius: 12, backgroundColor: '#FBF7F2', paddingHorizontal: 12, fontSize: 14, fontWeight: '700', color: COLORS.ink, marginTop: 14 },
  identityRoles: { flexDirection: 'row', gap: 8, alignSelf: 'stretch', marginTop: 10 },
  identityRole: { flex: 1, height: 38, borderRadius: 11, borderWidth: 1, borderColor: COLORS.line, backgroundColor: '#FBF7F2', alignItems: 'center', justifyContent: 'center' },
  identityRoleText: { fontSize: 12, fontWeight: '800', color: COLORS.ink },
  identityPreview: { alignSelf: 'flex-start', fontSize: 12, fontWeight: '800', color: '#B4745A', marginTop: 10 },
  toolRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderTopWidth: 1, borderTopColor: '#F8F1EA' },
  toolEmoji: { fontSize: 17, width: 22, textAlign: 'center' },
  toolCopy: { flex: 1, minWidth: 0 },
  toolLabel: { fontSize: 11.5, fontWeight: '800', color: COLORS.ink },
  toolSub: { fontSize: 9, color: COLORS.sub, marginTop: 1 },
  toolGo: { fontSize: 13, fontWeight: '800' },
  stageEmoji: { fontSize: 22 },
  stageCopy: { flex: 1, minWidth: 0 },
  stageName: { fontSize: 12, fontWeight: '800', color: COLORS.ink },
  stageSub: { fontSize: 9.5, color: COLORS.sub, marginTop: 2 },
  stageAction: { fontSize: 9.5, fontWeight: '800' },
  ageRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, borderWidth: 1, padding: 11, marginTop: 2 },
  overdueRow: { marginTop: 8, borderRadius: 12, backgroundColor: '#FFF0EA', paddingHorizontal: 12, paddingVertical: 9 },
  overdueText: { fontSize: 11, fontWeight: '800', color: '#D25638' },
  bornBtn: { marginTop: 8, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  bornText: { fontSize: 11, fontWeight: '800' },
  stageLadder: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  stagePill: { borderRadius: 999, backgroundColor: '#F7F1EA', paddingHorizontal: 8, paddingVertical: 4 },
  stagePillText: { fontSize: 9, fontWeight: '600', color: COLORS.sub },
  ageHint: { fontSize: 9, color: COLORS.sub, lineHeight: 14, marginTop: 10 },
  order: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingVertical: 7, borderTopWidth: 1, borderTopColor: '#F8F1EA' },
  orderCopy: { flex: 1, minWidth: 0 },
  orderTitle: { fontSize: 10.5, fontWeight: '700', color: COLORS.ink },
  orderMeta: { fontSize: 9, color: COLORS.sub, marginTop: 2 },
  orderTotal: { fontSize: 11, fontWeight: '800', color: COLORS.coral },
  emptyOrder: { fontSize: 10.5, color: COLORS.sub, lineHeight: 17, paddingVertical: 4 },
  overviewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  overviewLabel: { fontSize: 10.5, color: COLORS.sub },
  overviewValue: { fontSize: 11, fontWeight: '800', color: COLORS.ink },
  track: { height: 6, borderRadius: 999, backgroundColor: '#F5EDE3', marginTop: 6, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999 },
  taskBtn: { height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  taskBtnText: { fontSize: 11, fontWeight: '800' },
  dangerBtn: { height: 44, borderRadius: 14, backgroundColor: '#FFF0EA', borderWidth: 1, borderColor: '#FFD9C9', alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  dangerText: { fontSize: 11.5, fontWeight: '800', color: '#D25638' },
  aboutNote: { fontSize: 9.5, color: COLORS.sub, lineHeight: 15, marginTop: 10, textAlign: 'center' },
  modalMask: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(40,24,12,0.36)', alignItems: 'center', justifyContent: 'center', padding: 30 },
  modalCard: { width: '100%', backgroundColor: COLORS.white, borderRadius: 24, padding: 20, alignItems: 'center' },
  modalEmoji: { fontSize: 40 },
  modalTitle: { fontSize: 17, fontWeight: '800', color: COLORS.ink, marginTop: 8 },
  modalText: { fontSize: 11, color: COLORS.sub, lineHeight: 17, marginTop: 6, textAlign: 'center' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16, alignSelf: 'stretch' },
  modalCancel: { flex: 1, height: 40, borderRadius: 12, backgroundColor: '#F5EDE3', alignItems: 'center', justifyContent: 'center' },
  modalCancelText: { fontSize: 11.5, fontWeight: '800', color: COLORS.ink },
  modalDanger: { flex: 1, height: 40, borderRadius: 12, backgroundColor: '#D25638', alignItems: 'center', justifyContent: 'center' },
  modalDangerText: { fontSize: 11.5, fontWeight: '800', color: '#fff' },
  ageSheet: { width: '100%', maxHeight: '84%', backgroundColor: COLORS.cream, borderRadius: 24, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 12 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetClose: { paddingHorizontal: 12, height: 32, borderRadius: 999, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  sheetCloseText: { fontSize: 11, fontWeight: '800', color: COLORS.sub },
  sheetSub: { fontSize: 10.5, color: COLORS.sub, marginTop: 6 },
  sheetSwitch: { alignSelf: 'flex-start', marginTop: 8, paddingVertical: 4 },
  sheetSwitchText: { fontSize: 11, fontWeight: '800' },
  sheetScroll: { marginTop: 2 },
  sheetContent: { paddingBottom: 14 },
  switchConfirm: { marginTop: 10, backgroundColor: '#FFF4F0', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#F6D3C6' },
  switchConfirmTitle: { fontSize: 12, fontWeight: '800', color: '#8A4632' },
  switchConfirmText: { fontSize: 10.5, color: '#8A4632', lineHeight: 16, marginTop: 6 },
  switchConfirmBtns: { flexDirection: 'row', gap: 8, marginTop: 10 },
  switchCancel: { flex: 1, height: 34, borderRadius: 10, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  switchCancelText: { fontSize: 10.5, fontWeight: '700', color: COLORS.sub },
  switchOk: { flex: 1, height: 34, borderRadius: 10, backgroundColor: '#F8D8CF', alignItems: 'center', justifyContent: 'center' },
  switchOkText: { fontSize: 10.5, fontWeight: '800', color: '#B03A22' },
  reminderSub: { fontSize: 10, color: COLORS.sub, lineHeight: 16, marginTop: 2 },
  timeRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  timeChip: { flex: 1, height: 34, borderRadius: 11, backgroundColor: '#FBF7F2', borderWidth: 1, borderColor: COLORS.line, alignItems: 'center', justifyContent: 'center' },
  timeText: { fontSize: 11, fontWeight: '800', color: COLORS.ink },
  notifyDeny: { marginTop: 10, backgroundColor: '#FFF0EA', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 },
  notifyDenyText: { fontSize: 10.5, fontWeight: '800', color: '#D25638' },
  reminderNote: { fontSize: 9, color: COLORS.sub, lineHeight: 14, marginTop: 8 },
  devSection: { marginTop: 22, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#EFE4D8' },
  devGroupTitle: { fontSize: 9, fontWeight: '700', color: '#B9A794', letterSpacing: 0.4 },
  devDangerBtn: { marginTop: 8, height: 34, borderRadius: 10, borderWidth: 1, borderColor: '#EBD8CB', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  devDangerText: { fontSize: 10.5, fontWeight: '700', color: '#B4745A' },
  devHint: { fontSize: 8.5, color: '#BFAF9F', lineHeight: 13, marginTop: 6 },
});
