import React from 'react';
import { Alert, Text, TextInput, TouchableOpacity } from 'react-native';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { router } from 'expo-router';
import Login from '../screens/Login';
import { loginUser, registerUser, saveAuth } from '../services/api';

jest.mock('expo-router', () => ({ router: { replace: jest.fn() } }));
jest.mock('../services/api', () => ({ loginUser: jest.fn(), registerUser: jest.fn(), saveAuth: jest.fn() }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: require('react-native').View }));

let screen: ReactTestRenderer | undefined;
const mockLogin = jest.mocked(loginUser);
const mockRegister = jest.mocked(registerUser);
const mockSave = jest.mocked(saveAuth);

function control(label: string) {
  const matches = screen!.root.findAllByType(TouchableOpacity);
  return matches.find((node) => node.props.accessibilityLabel === label) || matches.find((node) =>
    node.findAllByType(Text).some((text) => text.props.children === label));
}

function field(label: string) {
  return screen!.root.findAllByType(TextInput).find((node) => node.props.placeholder === label)!;
}

function enter(label: string, value: string) {
  act(() => { field(label).props.onChangeText(value); });
}

async function press(label: string) {
  await act(async () => { control(label)!.props.onPress(); });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

beforeEach(async () => {
  mockLogin.mockReset();
  mockRegister.mockReset();
  mockSave.mockReset();
  mockSave.mockResolvedValue(undefined);
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await act(async () => { screen = create(<Login />); });
});

afterEach(() => {
  if (screen) act(() => { screen!.unmount(); });
  screen = undefined;
  jest.restoreAllMocks();
});

test('removes the unauthenticated Officer shortcut from login and registration', async () => {
  expect(control('Open Officer Dashboard')).toBeUndefined();
  await press('Register');
  expect(control('Open Officer Dashboard')).toBeUndefined();
  expect(loginUser).not.toHaveBeenCalled();
});

test.each([
  ['officer', '/(tabs)/officer-dashboard'],
  ['passenger', '/(tabs)/home'],
  ['admin', '/(tabs)/home'],
])('routes authenticated %s accounts to their own landing screen', async (role, destination) => {
  const account = { _id: role, role, email: `${role}@transitlink.lk`, token: 'opaque-local-session' };
  mockLogin.mockResolvedValueOnce({ data: account } as any);
  enter('Email or Phone Number', account.email);
  enter('Password', 'a-local-password');
  await press('Login');
  expect(mockLogin).toHaveBeenCalledWith({ email: account.email, password: 'a-local-password' });
  expect(mockSave).toHaveBeenCalledWith(account);
  expect(router.replace).toHaveBeenCalledWith(destination);
});

test('registers locally without sending a privileged role and opens Home', async () => {
  await press('Register');
  enter('Full Name', 'New Passenger');
  enter('Phone Number', '0771234567');
  enter('Email or Phone Number', 'new@example.com');
  enter('Password', 'LocalPass123');
  mockRegister.mockResolvedValueOnce({ data: { _id: 'new', role: 'passenger', token: 'local-session' } } as any);
  await press('Register');
  expect(mockRegister).toHaveBeenCalledWith({ fullName: 'New Passenger', phone: '0771234567', email: 'new@example.com', password: 'LocalPass123' });
  expect(router.replace).toHaveBeenCalledWith('/(tabs)/home');
});

test('invalid credentials retain entered values without granting dashboard access', async () => {
  mockLogin.mockRejectedValueOnce(new Error('Invalid email/phone or password.'));
  enter('Email or Phone Number', 'officer@transitlink.lk');
  enter('Password', 'wrong-password');
  await press('Login');
  expect(Alert.alert).toHaveBeenCalledWith('Login failed', 'Invalid email/phone or password.');
  expect(field('Email or Phone Number').props.value).toBe('officer@transitlink.lk');
  expect(field('Password').props.value).toBe('wrong-password');
  expect(mockSave).not.toHaveBeenCalled();
  expect(router.replace).not.toHaveBeenCalled();
});

test('requires fields before calling authentication', async () => {
  await press('Login');
  expect(Alert.alert).toHaveBeenCalled();
  expect(mockLogin).not.toHaveBeenCalled();
  expect(router.replace).not.toHaveBeenCalled();
});

test('prevents duplicate login submissions while authentication is pending', async () => {
  const pending = deferred<any>();
  mockLogin.mockReturnValueOnce(pending.promise);
  enter('Email or Phone Number', 'officer@transitlink.lk');
  enter('Password', 'OfficerDemo@2026');
  const submit = control('Login')!.props.onPress;
  act(() => { submit(); submit(); });
  expect(mockLogin).toHaveBeenCalledTimes(1);
  expect(control('Login')!.props.disabled).toBe(true);
  await act(async () => { pending.resolve({ data: { _id: 'officer', role: 'officer', token: 'local' } }); });
  expect(router.replace).toHaveBeenCalledTimes(1);
});

test('a completed login cannot navigate after the screen unmounts', async () => {
  const pending = deferred<any>();
  mockLogin.mockReturnValueOnce(pending.promise);
  enter('Email or Phone Number', 'officer@transitlink.lk');
  enter('Password', 'OfficerDemo@2026');
  await press('Login');
  act(() => { screen!.unmount(); });
  screen = undefined;
  await act(async () => { pending.resolve({ data: { _id: 'officer', role: 'officer', token: 'local' } }); });
  expect(router.replace).not.toHaveBeenCalled();
});

test('password recovery explains the offline limitation without claiming an email was sent', async () => {
  await press('Forgot Password?');
  const text = screen!.root.findAllByType(Text).map((node) => node.props.children).join(' ');
  expect(text.toLowerCase()).toContain('unavailable');
  expect(text.toLowerCase()).not.toContain("we'll send you a reset link");
  expect(mockLogin).not.toHaveBeenCalled();
  expect(mockRegister).not.toHaveBeenCalled();
});
