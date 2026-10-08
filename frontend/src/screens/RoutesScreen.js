import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import Navbar from '../components/Navbar';
import { getSavedRoutes, addSampleSavedRoute, toggleSavedRoute } from '../services/api';
import { useAuth } from '../auth/AuthProvider';
import { showAlert } from '../components/AppAlert';
import { colors } from '../theme';

const RoutesScreen = () => {
  const { session, isRestoring } = useAuth();
  const owner = session?.user._id || 'guest';
  const identity = session?.token || 'guest';
  const identityRef = useRef(identity);
  identityRef.current = identity;
  const mountedRef = useRef(true);
  const pendingRef = useRef(new Set());
  const [saved, setSaved] = useState({ owner: null, routes: [] });
  const [loading, setLoading] = useState(true);
  const routes = saved.owner === owner ? saved.routes : [];
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useFocusEffect(useCallback(() => {
    if (isRestoring) return;
    let active = true;
    setLoading(true);
    const load = async () => {
      try {
        const { data } = await getSavedRoutes();
        if (active && identityRef.current === identity) setSaved({ owner, routes: data });
      } catch (err) {
        if (active && identityRef.current === identity) {
          showAlert('Error', err.response?.data?.message || err.message);
        }
      } finally {
        if (active && identityRef.current === identity) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [identity, owner, isRestoring]));

  const toggleFavorite = async (id) => {
    if (pendingRef.current.has(id)) return;
    pendingRef.current.add(id);
    try {
      const { data } = await toggleSavedRoute(id);
      if (!mountedRef.current || identityRef.current !== identity) return;
      setSaved((prev) => ({ owner, routes: prev.routes.map((route) => route.id === id ? data : route) }));
    } catch (err) {
      if (mountedRef.current && identityRef.current === identity) {
        showAlert('Error', err.response?.data?.message || err.message);
      }
    } finally {
      pendingRef.current.delete(id);
    }
  };

  const addSample = async () => {
    if (pendingRef.current.has('add')) return;
    pendingRef.current.add('add');
    try {
      const { data } = await addSampleSavedRoute();
      if (!mountedRef.current || identityRef.current !== identity) return;
      setSaved((prev) => ({ owner, routes: [data, ...prev.routes] }));
    } catch (err) {
      if (mountedRef.current && identityRef.current === identity) {
        showAlert('Error', err.response?.data?.message || err.message);
      }
    } finally {
      pendingRef.current.delete('add');
    }
  };

  const handleAdd = () => {
    showAlert(
      'Add Favourite Route',
      'Create a new saved route or open the fare calculator.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Fare Information',
          onPress: () => router.navigate('/fare-information'),
        },
        {
          text: 'Add Sample',
          onPress: () => {
            if (identityRef.current === identity) void addSample();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Navbar
        title="Favourite Routes"
        showBack
        onBack={() => router.navigate('/(tabs)/home')}
        rightIcon="add"
        rightIconColor={colors.brand}
        onRightPress={handleAdd}
      />

      <TouchableOpacity
        style={styles.fareLink}
        onPress={() => router.navigate('/fare-information')}
        activeOpacity={0.85}
      >
        <View style={styles.fareIcon}>
          <Ionicons name="calculator-outline" size={20} color={colors.brand} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.fareTitle}>Fare Information</Text>
          <Text style={styles.fareSub}>Calculate bus & train fares</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.gray300} />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.list}>
        {(loading || isRestoring) && <ActivityIndicator color={colors.brand} style={{ marginVertical: 16 }} />}
        {routes.map((route) => {
          const isTrain = route.mode === 'Train';
          return (
            <TouchableOpacity
              key={route.id}
              style={styles.card}
              activeOpacity={0.85}
              onPress={() =>
                showAlert(
                  `${route.from} → ${route.to}`,
                  `${route.mode} · ${route.duration}`
                )
              }
            >
              <View style={styles.routeIcon}>
                <Ionicons
                  name={isTrain ? 'train' : 'bus'}
                  size={22}
                  color={colors.brand}
                />
              </View>
              <View style={styles.routeInfo}>
                <Text style={styles.routeName}>
                  {route.from} → {route.to}
                </Text>
                <Text style={styles.routeMeta}>
                  {route.mode} · {route.duration}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => toggleFavorite(route.id)}
                hitSlop={10}
                style={styles.actionIcon}
              >
                <Ionicons
                  name={route.favorite ? 'star-outline' : 'notifications-off-outline'}
                  size={22}
                  color={route.favorite ? colors.orange : colors.gray400}
                />
              </TouchableOpacity>
              <Ionicons name="chevron-forward" size={20} color={colors.gray300} />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.gray50 },
  fareLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 10,
    marginTop: 4,
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  fareIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  fareTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.gray900,
  },
  fareSub: {
    fontSize: 12,
    color: colors.gray500,
    marginTop: 2,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  routeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeInfo: {
    flex: 1,
    marginLeft: 12,
  },
  routeName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.gray900,
  },
  routeMeta: {
    marginTop: 3,
    fontSize: 13,
    color: colors.gray500,
  },
  actionIcon: {
    marginRight: 6,
    padding: 4,
  },
});

export default RoutesScreen;
