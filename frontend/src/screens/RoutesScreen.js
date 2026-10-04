import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

const RoutesScreen = () => {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Text style={styles.title}>Routes</Text>
      <View style={styles.body}>
        <Ionicons name="map-outline" size={48} color={colors.gray300} />
        <Text style={styles.sub}>
          Favourite routes and fare information will appear here.
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  title: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: colors.brand,
    paddingVertical: 14,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  sub: {
    marginTop: 12,
    textAlign: 'center',
    color: colors.gray500,
    fontSize: 14,
  },
});

export default RoutesScreen;
