import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';
import { getToken } from '../services/api';
import { colors } from '../theme';

type InitialDestination = '/login' | '/(tabs)/home';

export default function Index() {
  const [destination, setDestination] = useState<InitialDestination | null>(null);

  useEffect(() => {
    let active = true;

    const restoreSession = async () => {
      let hasToken = false;
      try {
        hasToken = Boolean(await getToken());
      } catch {
        // A session that cannot be read starts at login.
      }
      if (active) {
        setDestination(hasToken ? '/(tabs)/home' : '/login');
      }
    };

    void restoreSession();
    return () => {
      active = false;
    };
  }, []);

  if (destination) {
    return <Redirect href={destination} />;
  }

  return (
    <View style={styles.boot}>
      <ActivityIndicator size="large" color={colors.brand} />
    </View>
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
