import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

export default function LocalAvatar({ uri, style, size = 48 }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);
  const localUri = typeof uri === 'string' && /^(file:|content:|data:|blob:)/.test(uri);

  if (localUri && !failed) {
    return <Image source={{ uri }} style={style} onError={() => setFailed(true)} />;
  }

  return (
    <View style={[styles.fallback, style]} accessibilityLabel="Profile avatar">
      <Ionicons name="person-outline" size={size} color={colors.brand} />
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brandLight,
  },
});
