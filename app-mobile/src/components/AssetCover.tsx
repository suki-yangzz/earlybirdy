import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { assetUrl } from '../sharedAdapter';

type Props = {
  cover?: string;
  emoji?: string;
  color?: string;
  bg?: string;
  height?: number;
  radius?: number;
  label?: string;
};

/**
 * 素材封面：优先加载内容服务图片，缺失/失败时回落到 emoji 色块。
 * 目的：素材被删除或服务不可用时不留白屏。
 */
export default function AssetCover({ cover, emoji, color = '#8B6BE0', bg = '#F1EBFF', height = 92, radius = 16, label }: Props) {
  const [failed, setFailed] = useState(false);
  const uri = assetUrl(cover || '');

  useEffect(() => {
    setFailed(false);
  }, [uri]);

  return (
    <View style={[styles.wrap, { height, borderRadius: radius, backgroundColor: bg }]}>
      {!!uri && !failed ? (
        <Image
          source={{ uri }}
          style={[styles.image, { borderRadius: radius }]}
          resizeMode="cover"
          onError={() => setFailed(true)}
          accessibilityLabel={label || '课程封面'}
        />
      ) : (
        <Text style={[styles.emoji, { color }]}>{emoji || '📚'}</Text>
      )}
      {!!uri && failed && <Text style={styles.fallbackTag}>封面缺失</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  emoji: { fontSize: 34 },
  fallbackTag: { position: 'absolute', bottom: 4, right: 6, fontSize: 8, color: '#8A6A58', backgroundColor: 'rgba(255,255,255,0.75)', borderRadius: 6, paddingHorizontal: 4, paddingVertical: 1 },
});
