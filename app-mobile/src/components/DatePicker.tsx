import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../theme';
import { addDaysKey, dateKey, daysInMonth, isDateKey } from '../sharedAdapter';

type Mode = 'birth' | 'due';

type Props = {
  mode: Mode;
  /** 已有日期 YYYY-MM-DD */
  initial?: string;
  accent: string;
  onConfirm: (dateKey: string) => void;
  /** 自定义确认按钮文案（默认按生日/预产期生成） */
  confirmLabel?: string;
};

function todayParts() {
  const now = new Date();
  return { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() };
}

function partsOf(key: string | undefined, mode: Mode) {
  if (key && isDateKey(key)) {
    const [y, m, d] = key.split('-').map(Number);
    return { y, m, d };
  }
  const today = todayParts();
  if (mode === 'due') {
    const due = addDaysKey(dateKey(new Date()), 280) as string;
    const [y, m, d] = due.split('-').map(Number);
    return { y, m, d };
  }
  return today;
}

export default function DatePicker({ mode, initial, accent, onConfirm, confirmLabel }: Props) {
  const start = partsOf(initial, mode);
  const [year, setYear] = useState(start.y);
  const [month, setMonth] = useState(start.m);
  const [day, setDay] = useState(start.d);

  const today = dateKey(new Date()) as string;
  const currentYear = todayParts().y;
  const minYear = mode === 'birth' ? Math.max(2000, currentYear - 10) : currentYear - 1;
  const maxYear = mode === 'birth' ? currentYear : currentYear + 2;

  const maxDay = daysInMonth(year, month);
  const safeDay = Math.min(day, maxDay);
  const key = `${year}-${String(month).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
  const futureBirth = mode === 'birth' && key > today;

  function changeYear(next: number) {
    if (next < minYear || next > maxYear) return;
    setYear(next);
    const nextMax = daysInMonth(next, month);
    if (day > nextMax) setDay(nextMax);
  }

  function changeMonth(next: number) {
    setMonth(next);
    const nextMax = daysInMonth(year, next);
    if (day > nextMax) setDay(nextMax);
  }

  function jumpToday() {
    const t = todayParts();
    setYear(t.y);
    setMonth(t.m);
    setDay(t.d);
  }

  function jumpDefault() {
    const p = partsOf(undefined, mode);
    setYear(p.y);
    setMonth(p.m);
    setDay(p.d);
  }

  const weekday = new Date(year, month - 1, safeDay, 12).toLocaleDateString('zh-CN', { weekday: 'long' });

  return (
    <View style={styles.card}>
      <Text style={styles.preview}>{year} 年 {month} 月 {safeDay} 日</Text>
      <Text style={styles.weekday}>{weekday} · {mode === 'due' ? '预产期' : '出生日期'}</Text>

      <View style={styles.yearRow}>
        <Pressable onPress={() => changeYear(year - 1)} accessibilityRole="button" style={styles.yearBtn}>
          <Text style={styles.yearBtnText}>−</Text>
        </Pressable>
        <Text style={styles.yearText}>{year} 年</Text>
        <Pressable onPress={() => changeYear(year + 1)} accessibilityRole="button" style={styles.yearBtn}>
          <Text style={styles.yearBtnText}>＋</Text>
        </Pressable>
      </View>

      <View style={styles.quickRow}>
        <Pressable onPress={jumpToday} accessibilityRole="button" style={styles.quickBtn}>
          <Text style={styles.quickText}>回到今天</Text>
        </Pressable>
        {mode === 'due' && (
          <Pressable onPress={jumpDefault} accessibilityRole="button" style={styles.quickBtn}>
            <Text style={styles.quickText}>默认 40 周</Text>
          </Pressable>
        )}
      </View>

      <Text style={styles.groupTitle}>月份</Text>
      <View style={styles.grid}>
        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
          const on = m === month;
          return (
            <Pressable
              key={m}
              onPress={() => changeMonth(m)}
              accessibilityRole="button"
              style={[styles.monthChip, on && { backgroundColor: accent, borderColor: accent }]}
            >
              <Text style={[styles.chipText, on && { color: '#fff' }]}>{m}月</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.groupTitle}>日期</Text>
      <View style={styles.grid}>
        {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => {
          const on = d === safeDay;
          return (
            <Pressable
              key={d}
              onPress={() => setDay(d)}
              accessibilityRole="button"
              style={[styles.dayChip, on && { backgroundColor: accent, borderColor: accent }]}
            >
              <Text style={[styles.chipText, on && { color: '#fff' }]}>{d}日</Text>
            </Pressable>
          );
        })}
      </View>

      {futureBirth && <Text style={styles.warn}>出生日期不能晚于今天</Text>}

      <Pressable
        onPress={() => { if (!futureBirth) onConfirm(key); }}
        accessibilityRole="button"
        disabled={futureBirth}
        style={[styles.confirm, { backgroundColor: futureBirth ? '#D9CEC2' : accent }]}
      >
        <Text style={styles.confirmText}>{confirmLabel || (mode === 'due' ? '预产期就定这天' : '就用这个生日')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.white, borderRadius: 22, padding: 16, marginTop: 12 },
  preview: { fontSize: 24, fontWeight: '800', color: COLORS.ink, textAlign: 'center' },
  weekday: { fontSize: 11, color: COLORS.sub, textAlign: 'center', marginTop: 2 },

  yearRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18, marginTop: 14 },
  yearBtn: { width: 38, height: 38, borderRadius: 14, backgroundColor: '#F7F1EA', alignItems: 'center', justifyContent: 'center' },
  yearBtnText: { fontSize: 20, fontWeight: '800', color: COLORS.ink },
  yearText: { fontSize: 16, fontWeight: '800', color: COLORS.ink, minWidth: 84, textAlign: 'center' },

  quickRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 10 },
  quickBtn: { height: 28, paddingHorizontal: 12, borderRadius: 999, backgroundColor: '#F7F1EA', alignItems: 'center', justifyContent: 'center' },
  quickText: { fontSize: 10.5, fontWeight: '700', color: COLORS.sub },

  groupTitle: { fontSize: 11, fontWeight: '800', color: COLORS.ink, marginTop: 14, marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  monthChip: { width: 50, height: 34, borderRadius: 11, backgroundColor: '#FBF7F2', borderWidth: 1, borderColor: COLORS.line, alignItems: 'center', justifyContent: 'center' },
  dayChip: { width: 39, height: 34, borderRadius: 11, backgroundColor: '#FBF7F2', borderWidth: 1, borderColor: COLORS.line, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontSize: 10.5, fontWeight: '700', color: COLORS.ink },

  warn: { fontSize: 10.5, color: '#D25638', marginTop: 10, textAlign: 'center' },
  confirm: { height: 46, borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  confirmText: { fontSize: 13, fontWeight: '800', color: '#fff' },
});
