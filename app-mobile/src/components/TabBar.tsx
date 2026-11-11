import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { COLORS } from '../theme';

export type TabItem = { key: string; label: string; icon: string; badge?: number };

type Props = {
  items: TabItem[];
  active: string;
  accent: string;
  onChange: (key: string) => void;
};

export default function TabBar({ items, active, accent, onChange }: Props) {
  return (
    <View style={styles.bar}>
      {items.map((item) => {
        const on = active === item.key;
        return (
          <Pressable key={item.key} style={styles.item} onPress={() => onChange(item.key)} accessibilityLabel={item.label}>
            {!!item.badge && item.badge > 0 && (
              <View style={[styles.badge, { backgroundColor: accent }]}>
                <Text style={styles.badgeText}>{item.badge > 99 ? '99+' : item.badge}</Text>
              </View>
            )}
            <Text style={[styles.icon, on && { color: accent }]}>{item.icon}</Text>
            <Text style={[styles.label, on && { color: accent, fontWeight: '800' }]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    paddingTop: 8,
    paddingBottom: 20,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  icon: { fontSize: 19, color: COLORS.muted },
  label: { fontSize: 10.5, color: COLORS.muted, fontWeight: '600' },
  badge: { position: 'absolute', top: -2, right: '28%', minWidth: 15, height: 15, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  badgeText: { color: '#fff', fontSize: 8.5, fontWeight: '800' },
});
