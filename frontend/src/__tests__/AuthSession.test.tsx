import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { AuthProvider, useAuth } from '../auth/AuthProvider';
import Index from '../app/index';
import TabLayout from '../app/(tabs)/_layout';
import { getAuthSession, subscribeAuth } from '../services/api';

let mockAuthListener: ((session: any) => void) | undefined;
const mockUnsubscribe = jest.fn();

jest.mock('../services/api', () => ({ getAuthSession: jest.fn(), subscribeAuth: jest.fn() }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('expo-router', () => {
  const ReactModule = require('react');
  const { View, Text: NativeText } = require('react-native');
  const Tabs = ({ children }: any) => ReactModule.createElement(View, null, children);
  Tabs.Screen = ({ name, options }: any) => ReactModule.createElement(NativeText, { testID: name }, JSON.stringify(options));
  return { Tabs, Redirect: ({ href }: { href: string }) => ReactModule.createElement(NativeText, { testID: 'redirect' }, href) };
});

function session(role: string) {
  return { token: `local-${role}`, user: { _id: role, role, fullName: role, email: `${role}@example.com` } };
}

function Probe() {
  const auth = useAuth();
  return <><Text testID="session">{JSON.stringify({ role: auth.session?.user.role || null, loading: auth.loading, error: auth.error })}</Text><TouchableOpacity testID="retry" onPress={auth.retry} /></>;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

let screen: ReactTestRenderer | undefined;
async function render(children: React.ReactNode = <Probe />) {
  await act(async () => { screen = create(<AuthProvider>{children}</AuthProvider>); });
}
function state() { return JSON.parse(screen!.root.findByProps({ testID: 'session' }).props.children); }

beforeEach(() => {
  jest.mocked(getAuthSession).mockReset();
  jest.mocked(getAuthSession).mockResolvedValue(null);
  jest.mocked(subscribeAuth).mockReset();
  jest.mocked(subscribeAuth).mockImplementation((listener) => {
    mockAuthListener = listener;
    return mockUnsubscribe;
  });
});

afterEach(() => {
  if (screen) act(() => { screen!.unmount(); });
  screen = undefined;
  mockAuthListener = undefined;
});

test('restores a persisted Officer session without an online verification step', async () => {
  jest.mocked(getAuthSession).mockResolvedValueOnce(session('officer') as any);
  await render();
  expect(state()).toEqual({ role: 'officer', loading: false, error: null });
  expect(getAuthSession).toHaveBeenCalledTimes(1);
});

test.each([
  ['officer', '/(tabs)/officer-dashboard'],
  ['passenger', '/(tabs)/home'],
  ['admin', '/(tabs)/home'],
  [null, '/login'],
])('cold launch routes %s sessions to the correct destination', async (role, destination) => {
  jest.mocked(getAuthSession).mockResolvedValueOnce(role ? session(role) as any : null);
  await render(<Index />);
  expect(screen!.root.findByProps({ testID: 'redirect' }).props.children).toBe(destination);
});

test.each(['passenger', 'admin', null])('hides Officer navigation from %s while preserving the other four tabs', async (role) => {
  jest.mocked(getAuthSession).mockResolvedValueOnce(role ? session(role) as any : null);
  await render(<TabLayout />);
  for (const name of ['home', 'routes', 'tickets', 'profile']) {
    expect(screen!.root.findByProps({ testID: name })).toBeDefined();
  }
  const officerOptions = JSON.parse(screen!.root.findByProps({ testID: 'officer-dashboard/index' }).props.children);
  expect(officerOptions.href).toBeNull();
});

test('offers the fifth Officer tab only for an Officer session', async () => {
  jest.mocked(getAuthSession).mockResolvedValueOnce(session('officer') as any);
  await render(<TabLayout />);
  expect(JSON.parse(screen!.root.findByProps({ testID: 'officer-dashboard/index' }).props.children).href).toBe('/(tabs)/officer-dashboard');
});

test('a newer login event supersedes a pending restoration', async () => {
  const oldRestore = deferred<any>();
  jest.mocked(getAuthSession).mockReturnValueOnce(oldRestore.promise);
  await render();
  expect(state().loading).toBe(true);
  act(() => { mockAuthListener!(session('officer')); });
  await act(async () => { oldRestore.resolve(session('passenger')); });
  expect(state()).toEqual({ role: 'officer', loading: false, error: null });
});

test('logout prevents an older restoration from reopening the Officer session', async () => {
  const oldRestore = deferred<any>();
  jest.mocked(getAuthSession).mockReturnValueOnce(oldRestore.promise);
  await render();
  act(() => { mockAuthListener!(null); });
  await act(async () => { oldRestore.resolve(session('officer')); });
  expect(state()).toEqual({ role: null, loading: false, error: null });
});

test('reports a storage failure and restores access only after a successful retry', async () => {
  jest.mocked(getAuthSession).mockRejectedValueOnce(new Error('Unable to read local accounts.'));
  await render();
  expect(state()).toEqual({ role: null, loading: false, error: 'Unable to read local accounts.' });
  jest.mocked(getAuthSession).mockResolvedValueOnce(session('officer') as any);
  await act(async () => { screen!.root.findByProps({ testID: 'retry' }).props.onPress(); });
  expect(state()).toEqual({ role: 'officer', loading: false, error: null });
});

test('unsubscribes on unmount and ignores a later restoration', async () => {
  const pending = deferred<any>();
  jest.mocked(getAuthSession).mockReturnValueOnce(pending.promise);
  await render();
  act(() => { screen!.unmount(); });
  screen = undefined;
  expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  await act(async () => { pending.resolve(session('officer')); });
});
