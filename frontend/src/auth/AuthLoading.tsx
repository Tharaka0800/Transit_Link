import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Button from '../components/Button';
import { colors } from '../theme';

export default function AuthLoading({ error, onRetry }: { error?: string | null; onRetry?: () => void }) {
  return (
    <View style={styles.boot}>
      {error ? (
        <View style={styles.message}>
          <Text accessibilityRole="alert" style={styles.error}>{error}</Text>
          <Button onPress={onRetry}>Retry</Button>
        </View>
      ) : <ActivityIndicator size="large" color={colors.brand} accessibilityLabel="Loading your account" />}
    </View>
  );
}

const styles = StyleSheet.create({
  boot: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  message: { padding: 24, width: '100%', maxWidth: 420 },
  error: { fontSize: 14, color: colors.red, marginBottom: 16 },
});
