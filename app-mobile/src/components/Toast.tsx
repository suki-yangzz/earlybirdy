import React, { useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../theme';

type Props = {
  message: string;
  visible: boolean;
};

export default function Toast({ message, visible }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.timing(opacity, { toValue: visible ? 1 : 0, duration: 180, useNativeDriver: true }).start();
  }, [visible, opacity]);

  if (!message) return null;
  return (
    <Animated.View pointerEvents="none" style={[styles.wrap, { opacity }]}>
      <View style={styles.pill}>
        <Text style={styles.text}>{message}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 96, alignItems: 'center' },
  pill: { backgroundColor: 'rgba(59,43,34,0.92)', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 9, maxWidth: '86%' },
  text: { color: COLORS.white, fontSize: 11.5, fontWeight: '700', textAlign: 'center' },
});
