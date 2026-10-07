import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { router } from 'expo-router';
import Login from '../screens/Login';
import { loginUser, registerUser, saveAuth } from '../services/api';

jest.mock('expo-router', () => ({ router: { replace: jest.fn() } }));
jest.mock('../services/api', () => ({
  loginUser: jest.fn(),
  registerUser: jest.fn(),
  saveAuth: jest.fn(),
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: require('react-native').View }));

let screen: ReactTestRenderer | undefined;

function control(label: string) {
  return screen!.root.findAllByType(TouchableOpacity).find((node) =>
    node.findAllByType(Text).some((text) => text.props.children === label));
}

beforeEach(async () => {
  await act(async () => { screen = create(<Login />); });
});

afterEach(() => {
  if (screen) act(() => { screen!.unmount(); });
  screen = undefined;
});

test('opens the Officer tab from fresh login without a backend call or creating a session', () => {
  const shortcut = control('Open Officer Dashboard');
  expect(shortcut).toBeDefined();
  act(() => { shortcut!.props.onPress(); });
  expect(router.replace).toHaveBeenCalledWith('/(tabs)/officer-dashboard');
  expect(loginUser).not.toHaveBeenCalled();
  expect(registerUser).not.toHaveBeenCalled();
  expect(saveAuth).not.toHaveBeenCalled();
});

test('keeps the shortcut exclusive to login mode', () => {
  act(() => { control('Register')!.props.onPress(); });
  expect(control('Open Officer Dashboard')).toBeUndefined();
  act(() => { control('Login')!.props.onPress(); });
  expect(control('Open Officer Dashboard')).toBeDefined();
  act(() => { control('Forgot Password?')!.props.onPress(); });
  expect(control('Open Officer Dashboard')).toBeUndefined();
});
