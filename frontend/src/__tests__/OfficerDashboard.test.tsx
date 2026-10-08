import React from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { router } from 'expo-router';
import OfficerDashboard from '../app/(tabs)/officer-dashboard';
import { deleteIncident, getIncidents, IncidentAlert } from '../utils/OfficerStorage';
import { colors } from '../theme';

type FocusCallback = () => void | (() => void);
let mockFocusSetup: FocusCallback | undefined;
let mockFocusCleanup: void | (() => void);
let mockAuth: any;

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  Redirect: ({ href }: { href: string }) => require('react').createElement(require('react-native').Text, { testID: 'auth-redirect' }, href),
  useFocusEffect: (callback: FocusCallback) => require('react').useEffect(() => {
    mockFocusSetup = callback;
    mockFocusCleanup = callback();
    return () => {
      if (mockFocusCleanup) mockFocusCleanup();
      mockFocusSetup = undefined;
      mockFocusCleanup = undefined;
    };
  }, [callback]),
}));
jest.mock('../auth/AuthProvider', () => ({ useAuth: () => mockAuth }));
jest.mock('../utils/OfficerStorage', () => ({
  getIncidents: jest.fn(),
  deleteIncident: jest.fn(),
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: require('react-native').View }));

const mockGet = jest.mocked(getIncidents);
const mockDelete = jest.mocked(deleteIncident);
const incident: IncidentAlert = {
  id: 'incident-154',
  busId: '154',
  route: 'CMB to KDY',
  delayTime: '15m',
  status: 'URGENT',
  createdAt: 1720000000000,
};
let screen: ReactTestRenderer | undefined;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => { resolve = resolvePromise; });
  return { promise, resolve };
}

async function renderDashboard() {
  await act(async () => { screen = create(<OfficerDashboard />); });
}

function incidents(): IncidentAlert[] {
  return screen!.root.findByType(FlatList).props.data;
}

async function refocus() {
  await act(async () => {
    if (mockFocusCleanup) mockFocusCleanup();
    mockFocusCleanup = mockFocusSetup?.();
  });
}

function button(label: string) {
  const control = screen!.root.findAllByType(TouchableOpacity).find((node) => node.props.accessibilityLabel === label);
  if (!control) throw new Error(`Missing button: ${label}`);
  return control;
}

function textContent() {
  return screen!.root.findAllByType(Text).map((node) => node.props.children).join(' ');
}

beforeEach(() => {
  mockAuth = { session: { token: 'local-officer-session', user: { _id: 'officer', role: 'officer' } }, loading: false, isRestoring: false, error: null, retry: jest.fn() };
  mockGet.mockReset();
  mockDelete.mockReset();
  mockGet.mockResolvedValue([incident]);
  mockDelete.mockResolvedValue(undefined);
});

test.each(['passenger', 'admin'])('rejects direct dashboard access by a %s before reading local incidents', async (role) => {
  mockAuth.session.user.role = role;
  await renderDashboard();
  expect(textContent()).toContain('/(tabs)/home');
  expect(mockGet).not.toHaveBeenCalled();
  expect(mockDelete).not.toHaveBeenCalled();
  expect(screen!.root.findAllByType(FlatList)).toHaveLength(0);
});

test('rejects a guest dashboard link without initializing incidents', async () => {
  mockAuth.session = null;
  await renderDashboard();
  expect(textContent()).toContain('/login');
  expect(mockGet).not.toHaveBeenCalled();
});

test('waits for session restoration before mounting the dashboard', async () => {
  mockAuth.loading = true;
  mockAuth.isRestoring = true;
  await renderDashboard();
  expect(mockGet).not.toHaveBeenCalled();
  expect(screen!.root.findAllByType(ActivityIndicator)).toHaveLength(1);
});

afterEach(() => {
  if (screen) act(() => { screen!.unmount(); });
  screen = undefined;
});

test('loads local incidents once on mount and shows all six prototype metrics', async () => {
  await renderDashboard();
  expect(mockGet).toHaveBeenCalledTimes(1);
  expect(incidents()).toEqual([incident]);
  for (const label of ['SmartBus Dashboard', 'Active Buses', 'On Time', 'Total Routes', 'Urgent Alerts', 'Delay Hotspots', 'Rerouting']) {
    expect(textContent()).toContain(label);
  }
});

test('refreshes locally saved changes when returning to the Officer tab', async () => {
  await renderDashboard();
  const updated = { ...incident, delayTime: '20m' };
  mockGet.mockResolvedValueOnce([updated]);
  await refocus();
  expect(mockGet).toHaveBeenCalledTimes(2);
  expect(incidents()).toEqual([updated]);
});

test('a later focus refresh cannot be overwritten by an older response', async () => {
  const initial = deferred<IncidentAlert[]>();
  mockGet.mockReturnValueOnce(initial.promise);
  await renderDashboard();
  expect(screen!.root.findAllByType(ActivityIndicator)).toHaveLength(1);
  const updated = { ...incident, delayTime: '25m' };
  mockGet.mockResolvedValueOnce([updated]);
  await refocus();
  expect(incidents()).toEqual([updated]);
  await act(async () => { initial.resolve([incident]); });
  expect(incidents()).toEqual([updated]);
});

test('resolve deletes locally once while pending and reloads after success', async () => {
  await renderDashboard();
  const deletion = deferred<void>();
  mockDelete.mockReturnValueOnce(deletion.promise);
  const resolve = button('Resolve alert for bus 154').props.onPress;
  act(() => { resolve(); resolve(); });
  expect(mockDelete).toHaveBeenCalledTimes(1);
  expect(mockDelete).toHaveBeenCalledWith(incident.id);
  expect(button('Resolve alert for bus 154').props.disabled).toBe(true);
  mockGet.mockResolvedValueOnce([]);
  await act(async () => { deletion.resolve(); });
  expect(incidents()).toEqual([]);
  expect(textContent()).toContain('No incident alerts');
});

test('keeps the incident and re-enables resolve after a local delete failure', async () => {
  mockDelete.mockRejectedValueOnce(new Error('Unable to save incident alerts on this device.'));
  await renderDashboard();
  await act(async () => { button('Resolve alert for bus 154').props.onPress(); });
  expect(incidents()).toEqual([incident]);
  expect(textContent()).toContain('Unable to save incident alerts on this device.');
  expect(button('Resolve alert for bus 154').props.disabled).toBe(false);
  expect(mockGet).toHaveBeenCalledTimes(1);
});

test('retains existing incidents after a focus refresh failure and supports retry', async () => {
  await renderDashboard();
  mockGet.mockRejectedValueOnce(new Error('Unable to read incident alerts on this device.'));
  await refocus();
  expect(incidents()).toEqual([incident]);
  expect(textContent()).toContain('Unable to read incident alerts on this device.');
  mockGet.mockResolvedValueOnce([]);
  await act(async () => { button('Retry').props.onPress(); });
  expect(incidents()).toEqual([]);
});

test('shows the empty state for a deliberately cleared local list', async () => {
  mockGet.mockResolvedValueOnce([]);
  await renderDashboard();
  expect(textContent()).toContain('No incident alerts');
  expect(screen!.root.findAllByType(ActivityIndicator)).toHaveLength(0);
});

test('opens the full-screen alert form with the edit ID and without one for creation', async () => {
  await renderDashboard();
  act(() => { button('Edit alert for bus 154').props.onPress(); });
  expect(router.push).toHaveBeenCalledWith({ pathname: '/officer-dashboard/add-alert', params: { id: incident.id } });
  act(() => { button('+ New Alert').props.onPress(); });
  expect(router.push).toHaveBeenCalledWith('/officer-dashboard/add-alert');
});

test('uses the shared orange warning color with dark badge text', async () => {
  mockGet.mockResolvedValueOnce([{ ...incident, status: 'WARNING' }]);
  await renderDashboard();
  const badgeText = screen!.root.findAllByType(Text).find((node) => node.props.children === 'WARNING')!;
  expect(StyleSheet.flatten(badgeText.props.style).color).toBe(colors.gray900);
  expect(StyleSheet.flatten(badgeText.parent!.props.style).backgroundColor).toBe(colors.orange);
});

test('ignores a pending load after blur until a fresh focus read completes', async () => {
  const initial = deferred<IncidentAlert[]>();
  mockGet.mockReturnValueOnce(initial.promise);
  await renderDashboard();
  act(() => { if (mockFocusCleanup) mockFocusCleanup(); });
  await act(async () => { initial.resolve([incident]); });
  expect(incidents()).toEqual([]);
  const updated = { ...incident, route: 'KDY to CMB' };
  mockGet.mockResolvedValueOnce([updated]);
  await refocus();
  expect(incidents()).toEqual([updated]);
});

test('ignores pending local reads after the dashboard unmounts', async () => {
  const pending = deferred<IncidentAlert[]>();
  mockGet.mockReturnValueOnce(pending.promise);
  await renderDashboard();
  act(() => { screen!.unmount(); });
  screen = undefined;
  await act(async () => { pending.resolve([incident]); });
});
