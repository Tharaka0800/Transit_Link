import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { AuthProvider } from '../auth/AuthProvider';
import { AppAlertProvider } from '../components/AppAlert';

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(Ionicons.font);

  if (!fontsLoaded && !fontError) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  return (
    <AppAlertProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="help-support" />
          <Stack.Screen name="fare-information" />
          <Stack.Screen name="route-search" />
          <Stack.Screen name="bus-map" />
          <Stack.Screen name="bus-status" />
          <Stack.Screen name="bus-eta" />
          <Stack.Screen name="officer-dashboard/add-alert" />
          <Stack.Screen name="officer-dashboard/verify-ticket" />
          <Stack.Screen name="ticketing/purchase" />
          <Stack.Screen name="ticketing/[id]" />
          <Stack.Screen name="ticketing/login" />
        </Stack>
      </AuthProvider>
    </AppAlertProvider>

  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
});
