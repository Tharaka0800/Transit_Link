import React from 'react';
import { Text, TouchableOpacity, TextInput } from 'react-native';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { router } from 'expo-router';
import { RouteSearchScreen, BusStatusScreen, BusETAScreen } from '../screens/BusDemoScreens';

let mockParams: { busId?: string } = {};
jest.mock('expo-router', () => ({ router: { push: jest.fn(), canGoBack: () => false, replace: jest.fn() }, useLocalSearchParams: () => mockParams }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: require('react-native').View }));
jest.mock('../components/BusMap', () => () => null);
let screen: ReactTestRenderer;
const content = () => screen.root.findAllByType(Text).map(node => node.props.children).flat().join(' ').replace(/\s+/g, ' ');
function press(label: string) {
  act(() => screen.root.findAllByType(TouchableOpacity).find(node => node.props.accessibilityLabel === label)!.props.onPress());
}
afterEach(() => { act(() => screen.unmount()); mockParams = {}; });

test('route search filters entered locations and links the matching bus', () => {
  act(() => { screen = create(<RouteSearchScreen />); });
  press('Search Routes');
  expect(content()).toContain('Bus 154');
  expect(content()).toContain('Bus status unavailable');
  press('View bus status');
  expect(router.push).toHaveBeenCalledWith({ pathname: '/bus-status', params: { busId: '1' } });
  act(() => screen.root.findAllByType(TextInput)[1].props.onChangeText('Galle'));
  press('Search Routes');
  expect(content()).toContain('No demo routes match');
  expect(content()).not.toContain('Bus 154');
});

test('empty search locations report validation instead of displaying all routes', () => {
  act(() => { screen = create(<RouteSearchScreen />); });
  act(() => screen.root.findAllByType(TextInput)[0].props.onChangeText(' '));
  press('Search Routes');
  expect(content()).toContain('Enter both locations');
  expect(content()).not.toContain('Bus 154');
});

test('selected bus identity survives navigation to ETA', () => {
  mockParams = { busId: '2' };
  act(() => { screen = create(<BusStatusScreen />); });
  expect(content()).toContain('Nugegoda');
  press('View arrival time');
  expect(router.push).toHaveBeenCalledWith({ pathname: '/bus-eta', params: { busId: '2' } });
  act(() => screen.update(<BusETAScreen />));
  expect(content()).toContain('12 min');
  expect(content()).toContain('Fixed demo estimate');
});

test('unknown bus never falls back to a different vehicle', () => {
  mockParams = { busId: 'unknown' };
  act(() => { screen = create(<BusStatusScreen />); });
  expect(content()).toContain('Bus not found');
  expect(content()).not.toContain('Peradeniya');
});
