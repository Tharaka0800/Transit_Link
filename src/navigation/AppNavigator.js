import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from '../screens/HomeScreen';
import RouteSearchScreen from '../screens/RouteSearchScreen';
import SearchResultsScreen from '../screens/SearchResultsScreen';
import BusLiveStatusScreen from '../screens/BusLiveStatusScreen';
import ETAScreen from '../screens/ETAScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="RouteSearch" component={RouteSearchScreen} />
        <Stack.Screen name="SearchResults" component={SearchResultsScreen} />
        <Stack.Screen name="BusLiveStatus" component={BusLiveStatusScreen} />
        <Stack.Screen name="ETA" component={ETAScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}