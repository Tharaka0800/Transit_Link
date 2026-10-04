import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import Login from '../screens/Login';
import Home from '../screens/Home';
import Profile from '../screens/Profile';
import Notifications from '../screens/Notifications';
import HelpSupport from '../screens/HelpSupport';
import RoutesScreen from '../screens/RoutesScreen';
import TicketsScreen from '../screens/TicketsScreen';
import FareInformation from '../screens/FareInformation';
import { getToken } from '../services/api';
import { colors } from '../theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const tabIcon = (routeName, focused) => {
  const map = {
    Home: focused ? 'home' : 'home-outline',
    Routes: focused ? 'location' : 'location-outline',
    Tickets: focused ? 'ticket' : 'ticket-outline',
    Profile: focused ? 'person' : 'person-outline',
  };
  return map[routeName] || 'ellipse-outline';
};

function MainTabs() {
  return (
    <Tab.Navigator
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
        tabBarIcon: ({ focused, color, size }) => (
          <Ionicons
            name={tabIcon(route.name, focused)}
            size={size}
            color={color}
          />
        ),
      })}
    >
      <Tab.Screen name="Home" component={Home} />
      <Tab.Screen name="Routes" component={RoutesScreen} />
      <Tab.Screen name="Tickets" component={TicketsScreen} />
      <Tab.Screen name="Profile" component={Profile} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const [booting, setBooting] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await getToken();
        setIsLoggedIn(Boolean(token));
      } finally {
        setBooting(false);
      }
    };
    checkAuth();
  }, []);

  if (booting) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      initialRouteName={isLoggedIn ? 'MainTabs' : 'Login'}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="Notifications" component={Notifications} />
      <Stack.Screen name="HelpSupport" component={HelpSupport} />
      <Stack.Screen name="FareInformation" component={FareInformation} />
    </Stack.Navigator>
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
