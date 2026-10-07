import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Navbar from '../components/Navbar';
import { favouriteRoutes as initialRoutes } from '../data/mockData';
import { colors } from '../theme';

const RoutesScreen = () => {
  const [routes, setRoutes] = useState(initialRoutes);

  const toggleFavorite = (id) => {
    setRoutes((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, favorite: !r.favorite, muted: r.favorite } : r
      )
    );
  };

  const handleAdd = () => {
    Alert.alert(
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
            setRoutes((prev) => [
              {
                id: `r${Date.now()}`,
                from: 'Pettah',
                to: 'Moratuwa',
                mode: 'Bus',
                duration: '55m',
                favorite: true,
                muted: false,
              },
              ...prev,
            ]);
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
        {routes.map((route) => {
          const isTrain = route.mode === 'Train';
          return (
            <TouchableOpacity
              key={route.id}
              style={styles.card}
              activeOpacity={0.85}
              onPress={() =>
                Alert.alert(
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
                  color={route.favorite ? '#F97316' : colors.gray400}
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
