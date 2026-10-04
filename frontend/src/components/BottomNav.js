import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

const tabs = [
  { key: 'Home', label: 'Home', icon: 'home-outline', iconActive: 'home' },
  { key: 'Routes', label: 'Routes', icon: 'location-outline', iconActive: 'location' },
  { key: 'Tickets', label: 'Tickets', icon: 'ticket-outline', iconActive: 'ticket' },
  { key: 'Profile', label: 'Profile', icon: 'person-outline', iconActive: 'person' },
];

/**
 * Visual bottom nav used inside stack screens that sit above the tab navigator.
 * For primary tabs, prefer React Navigation bottom-tabs in AppNavigator.
 */
const BottomNav = ({ active = 'Home', onNavigate }) => {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {tabs.map((tab) => {
          const isActive = active === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tab}
              onPress={() => onNavigate?.(tab.key)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isActive ? tab.iconActive : tab.icon}
                size={24}
                color={isActive ? colors.brand : colors.gray400}
              />
              <Text style={[styles.label, isActive && styles.labelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.homeIndicator} />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
    paddingTop: 8,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tab: {
    alignItems: 'center',
    minWidth: 64,
    paddingVertical: 4,
  },
  label: {
    marginTop: 2,
    fontSize: 11,
    color: colors.gray400,
    fontWeight: '500',
  },
  labelActive: {
    color: colors.brand,
    fontWeight: '700',
  },
  homeIndicator: {
    alignSelf: 'center',
    marginTop: 6,
    width: 112,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.gray300,
  },
});

export default BottomNav;
