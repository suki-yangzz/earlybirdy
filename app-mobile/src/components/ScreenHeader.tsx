import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../theme';

type Props = {
  title: string;
  sub?: string;
  accent: string;
  onBack?: () => void;
  right?: React.ReactNode;
};

export default function ScreenHeader({ title, sub, accent, onBack, right }: Props) {
  return (
    <View style={styles.head}>
      {onBack ? (
        <Pressable onPress={onBack} style={styles.back} accessibilityLabel="返回">
          <Text style={[styles.backText, { color: accent }]}>←</Text>
        </Pressable>
      ) : (
        <View style={styles.back} />
      )}
      <View style={styles.titleWrap}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {!!sub && <Text style={styles.sub} numberOfLines={1}>{sub}</Text>}
      </View>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 12 },
  back: { width: 38, height: 38, borderRadius: 14, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 18, fontWeight: '800' },
  titleWrap: { flex: 1, minWidth: 0, alignItems: 'center' },
  title: { fontSize: 17, fontWeight: '800', color: COLORS.ink },
  sub: { fontSize: 10.5, color: COLORS.sub, marginTop: 2 },
  right: { minWidth: 38, alignItems: 'flex-end' },
});
