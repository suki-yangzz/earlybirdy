/* 多宝宝管理：添加 / 切换 / 编辑 / 删除 */
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { COLORS } from '../theme';
import DatePicker from '../components/DatePicker';
import { STAGES, profileAgeLabel, stageFromProfile, ROLE_LABELS, displayName, dateKey, addDaysKey } from '../sharedAdapter';
import type { Baby, ParentRole } from '../babies';

type DatePatch = { dueDate?: string | null; birthDate?: string | null };
type BabyInput = { name?: string; nickname?: string; parentRole?: ParentRole; pregnant: boolean } & DatePatch;

type Props = {
  babies: Baby[];
  currentId: string | null;
  onBack: () => void;
  onSwitch: (id: string) => void;
  onAdd: (input: BabyInput) => void;
  onUpdate: (id: string, patch: BabyInput) => void;
  onDelete: (id: string) => void;
};

type Editing = {
  id?: string;
  name: string;
  nickname: string;
  parentRole: ParentRole;
  pregnant: boolean;
  /** 进入编辑时的阶段，用于判断是否发生孕期 ↔ 已出生切换 */
  originalPregnant: boolean;
  dueDate?: string;
  birthDate?: string;
};

function stageChip(baby: Baby) {
  const id = stageFromProfile(baby as any);
  return id && STAGES[id] ? STAGES[id].chip : '待补充生日';
}

export default function BabyManagerScreen({ babies, currentId, onBack, onSwitch, onAdd, onUpdate, onDelete }: Props) {
  const [editing, setEditing] = useState<Editing | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  /** 待确认切换的日期：用户点了保存，但阶段发生了变化 */
  const [pendingSwitch, setPendingSwitch] = useState<string | null>(null);

  function startAdd() {
    setConfirmDelete(null);
    setPendingSwitch(null);
    setEditing({ name: `宝宝 ${babies.length + 1}`, nickname: '', parentRole: 'mom', pregnant: false, originalPregnant: false });
  }

  function startEdit(baby: Baby) {
    setConfirmDelete(null);
    setPendingSwitch(null);
    setEditing({
      id: baby.id,
      name: baby.name,
      nickname: baby.nickname || '',
      parentRole: (baby.parentRole || 'mom') as ParentRole,
      pregnant: baby.pregnant,
      originalPregnant: baby.pregnant,
      dueDate: baby.dueDate,
      birthDate: baby.birthDate,
    });
  }

  /** 切换状态：清掉对侧日期，并给新阶段一个可保存的默认日期 */
  function chooseStage(next: boolean) {
    setPendingSwitch(null);
    setEditing((prev) => {
      if (!prev || prev.pregnant === next) return prev;
      const today = dateKey(new Date()) as string;
      if (next) {
        return { ...prev, pregnant: true, dueDate: prev.dueDate || (addDaysKey(today, 280) as string), birthDate: undefined };
      }
      return { ...prev, pregnant: false, birthDate: prev.birthDate || today, dueDate: undefined };
    });
  }

  function persist(date: string) {
    if (!editing) return;
    const payload: BabyInput = {
      name: editing.name.trim() || undefined,
      nickname: editing.nickname.trim(),
      parentRole: editing.parentRole,
      pregnant: editing.pregnant,
      /* 显式清对侧字段：任何时刻只保留一个日期 */
      dueDate: editing.pregnant ? date : null,
      birthDate: editing.pregnant ? null : date,
    };
    if (editing.id) onUpdate(editing.id, payload);
    else onAdd(payload);
    setPendingSwitch(null);
    setEditing(null);
  }

  function save(date: string) {
    if (!editing) return;
    const stageChanged = !!editing.id && editing.pregnant !== editing.originalPregnant;
    if (stageChanged) {
      setPendingSwitch(date);
      return;
    }
    persist(date);
  }

  return (
    <View style={styles.flex}>
      <View style={styles.head}>
        <Pressable onPress={onBack} style={styles.back} accessibilityLabel="返回">
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <View style={styles.headCopy}>
          <Text style={styles.title}>宝宝档案</Text>
          <Text style={styles.sub}>{babies.length} 个宝宝 · 学习数据相互独立</Text>
        </View>
        <Pressable onPress={startAdd} style={styles.addBtn} accessibilityLabel="添加宝宝">
          <Text style={styles.addText}>＋ 添加</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {babies.map((baby) => {
          const on = baby.id === currentId;
          return (
            <View key={baby.id} style={[styles.card, on && styles.cardOn]}>
              <View style={styles.cardTop}>
                <Text style={styles.avatar}>{baby.pregnant ? '🤰' : '👶'}</Text>
                <View style={styles.cardCopy}>
                  <Text style={styles.name}>
                    {baby.name} {on && <Text style={styles.currentTag}>当前</Text>}
                  </Text>
                  <Text style={styles.meta}>
                    {baby.pregnant ? `预产期 ${baby.dueDate}` : `生日 ${baby.birthDate}`} · {profileAgeLabel(baby as any)}
                  </Text>
                  <Text style={styles.stage}>{stageChip(baby)} · {displayName(baby)}</Text>
                </View>
              </View>
              <View style={styles.actions}>
                <Pressable
                  onPress={() => onSwitch(baby.id)}
                  disabled={on}
                  style={[styles.action, on ? styles.actionDisabled : styles.actionPrimary]}
                >
                  <Text style={[styles.actionText, on ? styles.actionTextMuted : styles.actionTextPrimary]}>
                    {on ? '使用中' : '切换到 TA'}
                  </Text>
                </Pressable>
                <Pressable onPress={() => startEdit(baby)} style={styles.action}>
                  <Text style={styles.actionText}>编辑</Text>
                </Pressable>
                <Pressable
                  onPress={() => setConfirmDelete(baby.id)}
                  style={[styles.action, styles.actionDanger]}
                >
                  <Text style={[styles.actionText, styles.actionTextDanger]}>删除</Text>
                </Pressable>
              </View>
              {confirmDelete === baby.id && (
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmText}>
                    删除后该宝宝的打卡、学习进度、收藏与历史将一并清除，购物车/成长值/订单保留。
                  </Text>
                  <View style={styles.confirmBtns}>
                    <Pressable onPress={() => setConfirmDelete(null)} style={styles.smallBtn}>
                      <Text style={styles.smallText}>取消</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => { onDelete(baby.id); setConfirmDelete(null); }}
                      style={[styles.smallBtn, styles.smallDanger]}
                    >
                      <Text style={styles.smallDangerText}>确认删除</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          );
        })}

        {babies.length <= 1 && (
          <Text style={styles.hint}>至少保留一个宝宝档案；如需换宝宝，请先添加新档案再删除旧档案。</Text>
        )}

        {editing && (
          <View style={styles.editor}>
            <View style={styles.editorHead}>
              <Text style={styles.editorTitle}>{editing.id ? '编辑宝宝' : '添加宝宝'}</Text>
              <Pressable onPress={() => setEditing(null)}>
                <Text style={styles.closeText}>取消</Text>
              </Pressable>
            </View>
            <Text style={styles.fieldLabel}>宝宝称呼</Text>
            <TextInput
              value={editing.name}
              onChangeText={(text) => setEditing((prev) => (prev ? { ...prev, name: text } : prev))}
              placeholder="例如：小芽"
              placeholderTextColor={COLORS.sub}
              style={styles.input}
              accessibilityLabel="宝宝称呼输入"
            />
            <Text style={styles.fieldLabel}>宝宝昵称（用于你的称呼）</Text>
            <TextInput
              value={editing.nickname}
              onChangeText={(text) => setEditing((prev) => (prev ? { ...prev, nickname: text } : prev))}
              placeholder="例如：小花生"
              placeholderTextColor={COLORS.sub}
              style={styles.input}
              maxLength={16}
              accessibilityLabel="宝宝昵称输入"
            />
            <Text style={styles.fieldLabel}>我的身份</Text>
            <View style={styles.typeRow}>
              {(['mom', 'dad', 'other'] as const).map((value) => {
                const on = editing.parentRole === value;
                return (
                  <Pressable
                    key={value}
                    onPress={() => setEditing((prev) => (prev ? { ...prev, parentRole: value } : prev))}
                    style={[styles.typeChip, on && styles.typeChipOn]}
                  >
                    <Text style={[styles.typeText, on && styles.typeTextOn]}>{ROLE_LABELS[value]}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.fieldLabel}>状态</Text>
            <View style={styles.typeRow}>
              {[
                { value: false, label: '已经出生' },
                { value: true, label: '还在孕期' },
              ].map((opt) => {
                const on = editing.pregnant === opt.value;
                return (
                  <Pressable
                    key={opt.label}
                    onPress={() => chooseStage(opt.value)}
                    style={[styles.typeChip, on && styles.typeChipOn]}
                    accessibilityRole="button"
                    accessibilityLabel={`切换状态为${opt.label}`}
                  >
                    <Text style={[styles.typeText, on && styles.typeTextOn]}>{opt.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            {!!editing.id && editing.pregnant !== editing.originalPregnant && (
              <Text style={styles.switchHint}>
                保存后会把全站切换为「{editing.pregnant ? '孕期' : '已经出生'}」：首页文案、主题色、底部导航、互动页与孕妈课堂入口都会同步变化。点保存后还需再确认一次。
              </Text>
            )}
            {pendingSwitch ? (
              <View style={styles.switchConfirm}>
                <Text style={styles.switchConfirmTitle}>
                  确认切换为「{editing.pregnant ? '孕期' : '已经出生'}」？
                </Text>
                <Text style={styles.switchConfirmDate}>
                  {editing.pregnant ? '预产期' : '生日'}：{pendingSwitch}
                </Text>
                <Text style={styles.switchConfirmText}>
                  {editing.pregnant
                    ? '切换后全站内容会按孕期重新加载：首页文案、主题色、底部导航、互动页、首页孕期卡片和孕妈课堂入口都会变化；已出生的生日记录会被清除。'
                    : '切换后全站内容会按宝宝月龄重新加载：首页文案、主题色、底部导航、互动页、首页孕期卡片和孕妈课堂入口都会变化；预产期会被清除。'}
                  {'\n'}打卡、收藏、浏览历史、学习时长、成长值、购物车和卡片学习进度都会保留，不会被清空。
                </Text>
                <View style={styles.confirmBtns}>
                  <Pressable onPress={() => setPendingSwitch(null)} style={styles.smallBtn}>
                    <Text style={styles.smallText}>再想想</Text>
                  </Pressable>
                  <Pressable onPress={() => persist(pendingSwitch)} style={[styles.smallBtn, styles.smallDanger]}>
                    <Text style={styles.smallDangerText}>确认切换</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <DatePicker
                key={(editing.id || 'new') + (editing.pregnant ? 'due' : 'birth')}
                mode={editing.pregnant ? 'due' : 'birth'}
                initial={editing.pregnant ? editing.dueDate : editing.birthDate}
                accent={COLORS.coral}
                onConfirm={save}
                confirmLabel={editing.id ? '保存修改' : '保存宝宝'}
              />
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 16, gap: 10 },
  back: { width: 36, height: 36, borderRadius: 13, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 18, fontWeight: '800', color: COLORS.coral },
  headCopy: { flex: 1 },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.ink },
  sub: { fontSize: 11, color: COLORS.sub, marginTop: 3 },
  addBtn: { height: 36, paddingHorizontal: 12, borderRadius: 999, backgroundColor: COLORS.coral, justifyContent: 'center' },
  addText: { fontSize: 11.5, fontWeight: '800', color: '#fff' },
  content: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 32, gap: 10 },
  card: { backgroundColor: COLORS.white, borderRadius: 20, padding: 14, borderWidth: 1, borderColor: COLORS.line },
  cardOn: { borderColor: COLORS.coral, backgroundColor: '#FFF9F4' },
  cardTop: { flexDirection: 'row', gap: 10 },
  avatar: { fontSize: 30 },
  cardCopy: { flex: 1 },
  name: { fontSize: 15, fontWeight: '800', color: COLORS.ink },
  currentTag: { fontSize: 9, color: '#fff', backgroundColor: COLORS.coral, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2 },
  meta: { fontSize: 10.5, color: COLORS.sub, marginTop: 3 },
  stage: { fontSize: 10, color: '#B37A55', marginTop: 3, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  action: { flex: 1, height: 34, borderRadius: 11, backgroundColor: '#F7F1EA', alignItems: 'center', justifyContent: 'center' },
  actionPrimary: { backgroundColor: '#FFE9DF' },
  actionDisabled: { backgroundColor: '#F2EEE9' },
  actionDanger: { backgroundColor: '#FFF0EC' },
  actionText: { fontSize: 11, fontWeight: '800', color: COLORS.ink },
  actionTextPrimary: { color: '#D25638' },
  actionTextMuted: { color: COLORS.sub },
  actionTextDanger: { color: '#C4472E' },
  confirmRow: { marginTop: 10, backgroundColor: '#FFF4F0', borderRadius: 12, padding: 10 },
  confirmText: { fontSize: 10, color: '#8A4632', lineHeight: 15 },
  confirmBtns: { flexDirection: 'row', gap: 8, marginTop: 8 },
  smallBtn: { flex: 1, height: 30, borderRadius: 9, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  smallText: { fontSize: 10.5, fontWeight: '700', color: COLORS.sub },
  smallDanger: { backgroundColor: '#F8D8CF' },
  smallDangerText: { fontSize: 10.5, fontWeight: '800', color: '#B03A22' },
  hint: { fontSize: 10, color: COLORS.sub, textAlign: 'center', marginTop: 4, lineHeight: 15 },
  editor: { marginTop: 10, backgroundColor: COLORS.white, borderRadius: 20, padding: 14, borderWidth: 1, borderColor: COLORS.line },
  editorHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  editorTitle: { fontSize: 14, fontWeight: '800', color: COLORS.ink },
  closeText: { fontSize: 10.5, color: COLORS.sub, fontWeight: '700' },
  fieldLabel: { fontSize: 11, fontWeight: '800', color: COLORS.ink, marginTop: 12 },
  input: { height: 42, borderRadius: 12, backgroundColor: '#FBF7F2', paddingHorizontal: 12, fontSize: 13, color: COLORS.ink, marginTop: 6 },
  typeRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  typeChip: { flex: 1, height: 36, borderRadius: 11, backgroundColor: '#FBF7F2', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.line },
  typeChipOn: { backgroundColor: '#FFE9DF', borderColor: COLORS.coral },
  typeText: { fontSize: 11.5, fontWeight: '800', color: COLORS.sub },
  typeTextOn: { color: '#D25638' },
  switchHint: { fontSize: 10, color: '#B4745A', lineHeight: 15, marginTop: 8 },
  switchConfirm: { marginTop: 12, backgroundColor: '#FFF4F0', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#F6D3C6' },
  switchConfirmTitle: { fontSize: 12, fontWeight: '800', color: '#8A4632' },
  switchConfirmDate: { fontSize: 11, fontWeight: '800', color: '#B03A22', marginTop: 4 },
  switchConfirmText: { fontSize: 10.5, color: '#8A4632', lineHeight: 16, marginTop: 6 },
});
