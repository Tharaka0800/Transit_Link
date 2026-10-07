import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';

type IconName = keyof typeof Ionicons.glyphMap;

const tabIcons: Record<string, { active: IconName; inactive: IconName }> = {
  home: { active: 'home', inactive: 'home-outline' },
  routes: { active: 'location', inactive: 'location-outline' },
  tickets: { active: 'ticket', inactive: 'ticket-outline' },
  profile: { active: 'person', inactive: 'person-outline' },
  'officer-dashboard/index': {
    active: 'speedometer',
    inactive: 'speedometer-outline',
  },
};

export default function TabLayout() {
  return (
    <Tabs
      initialRouteName="home"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.gray400,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarStyle: {
          borderTopColor: colors.border,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarIcon: ({ focused, color, size }) => {
          const icons = tabIcons[route.name];
          return (
            <Ionicons
              name={icons ? (focused ? icons.active : icons.inactive) : 'ellipse-outline'}
              size={size}
              color={color}
            />
          );
        },
      })}
    >
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="routes" options={{ title: 'Routes' }} />
      <Tabs.Screen name="tickets" options={{ title: 'Tickets' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      <Tabs.Screen name="officer-dashboard/index" options={{ title: 'Officer' }} />
    </Tabs>
  );
}
