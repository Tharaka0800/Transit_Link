import React from 'react';
import { ActivityIndicator, FlatList, Text, TouchableOpacity } from 'react-native';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import OfficerDashboard from '../app/(tabs)/officer-dashboard';
import { deleteIncident, getIncidents, IncidentAlert, socket } from '../utils/OfficerApiService';
import { INCIDENT_UPDATED_EVENT } from '../../../shared/incident';

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  useFocusEffect: (callback: () => void | (() => void)) => require('react').useEffect(callback, [callback]),
}));
jest.mock('../utils/OfficerApiService', () => ({
  getIncidents: jest.fn(),
  deleteIncident: jest.fn(),
  INCIDENT_UPDATED_EVENT: 'incident_updated',
  socket: { on: jest.fn(), off: jest.fn(), connect: jest.fn(), disconnect: jest.fn() },
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: require('react-native').View }));

const mockGet = jest.mocked(getIncidents);
const mockDelete = jest.mocked(deleteIncident);
const mockOn = jest.mocked(socket.on);
const incident: IncidentAlert = {
  id: 'a38082d2-27c0-4276-9bd7-7a782e7d142d',
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

function listener(event: 'connect' | typeof INCIDENT_UPDATED_EVENT): () => void {
  const registered = mockOn.mock.calls.find(([name]) => name === event);
  if (!registered) throw new Error(`Missing listener for ${event}`);
  return registered[1] as () => void;
}

function button(label: string) {
  const control = screen!.root.findAllByType(TouchableOpacity).find((node) => node.props.accessibilityLabel === label);
  if (!control) throw new Error(`Missing button: ${label}`);
  return control;
}

beforeEach(() => {
  mockGet.mockReset();
  mockDelete.mockReset();
  mockGet.mockResolvedValue([incident]);
  mockDelete.mockResolvedValue(undefined);
});

afterEach(() => {
  if (screen) act(() => { screen!.unmount(); });
  screen = undefined;
});

test('loads API incidents on mount and attaches both listeners before connecting', async () => {
  await renderDashboard();
  expect(mockGet).toHaveBeenCalledTimes(1);
  expect(incidents()).toEqual([incident]);
  expect(mockOn).toHaveBeenCalledWith(INCIDENT_UPDATED_EVENT, expect.any(Function));
  expect(mockOn).toHaveBeenCalledWith('connect', expect.any(Function));
  expect(socket.connect).toHaveBeenCalledTimes(1);
  expect(Math.max(...mockOn.mock.invocationCallOrder)).toBeLessThan(jest.mocked(socket.connect).mock.invocationCallOrder[0]);
});

test('refetches after incident mutations without showing the refresh spinner', async () => {
  await renderDashboard();
  const refresh = deferred<IncidentAlert[]>();
  mockGet.mockReturnValueOnce(refresh.promise);
  act(() => { listener(INCIDENT_UPDATED_EVENT)(); });
  expect(mockGet).toHaveBeenCalledTimes(2);
  expect(screen!.root.findAllByType(ActivityIndicator)).toHaveLength(0);
  await act(async () => { refresh.resolve([{ ...incident, delayTime: '20m' }]); });
  expect(incidents()[0].delayTime).toBe('20m');
});

test('refetches on connection and reconnection to recover missed events', async () => {
  await renderDashboard();
  await act(async () => { listener('connect')(); });
  await act(async () => { listener('connect')(); });
  expect(mockGet).toHaveBeenCalledTimes(3);
  expect(mockOn.mock.calls.filter(([name]) => name === INCIDENT_UPDATED_EVENT)).toHaveLength(1);
});

test('a later refresh cannot be overwritten by an older response', async () => {
  const initial = deferred<IncidentAlert[]>();
  mockGet.mockReturnValueOnce(initial.promise);
  await renderDashboard();
  const updated = { ...incident, delayTime: '25m' };
  mockGet.mockResolvedValueOnce([updated]);
  await act(async () => { listener(INCIDENT_UPDATED_EVENT)(); });
  expect(incidents()).toEqual([updated]);
  await act(async () => { initial.resolve([incident]); });
  expect(incidents()).toEqual([updated]);
});

test('resolve calls DELETE once while pending and reloads after success', async () => {
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
  expect(screen!.root.findAllByType(Text).map((node) => node.props.children).join(' ')).toContain('No incident alerts');
});

test('keeps existing incidents visible after a realtime refresh failure and supports retry', async () => {
  await renderDashboard();
  mockGet.mockRejectedValueOnce(new Error('Unable to reach the server.'));
  await act(async () => { listener(INCIDENT_UPDATED_EVENT)(); });
  expect(incidents()).toEqual([incident]);
  expect(screen!.root.findAllByType(Text).map((node) => node.props.children).join(' ')).toContain('Unable to reach the server.');
  mockGet.mockResolvedValueOnce([]);
  await act(async () => { button('Retry').props.onPress(); });
  expect(incidents()).toEqual([]);
});

test('unmount removes its exact handlers, disconnects, and ignores pending responses', async () => {
  await renderDashboard();
  const updateListener = listener(INCIDENT_UPDATED_EVENT);
  const connectListener = listener('connect');
  const pending = deferred<IncidentAlert[]>();
  mockGet.mockReturnValueOnce(pending.promise);
  act(() => { updateListener(); });
  act(() => { screen!.unmount(); });
  screen = undefined;
  expect(socket.off).toHaveBeenCalledWith(INCIDENT_UPDATED_EVENT, updateListener);
  expect(socket.off).toHaveBeenCalledWith('connect', connectListener);
  expect(socket.disconnect).toHaveBeenCalledTimes(1);
  await act(async () => { pending.resolve([]); });
});
