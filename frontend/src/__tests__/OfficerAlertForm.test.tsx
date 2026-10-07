import React from 'react';
import { Text, TextInput, TouchableOpacity } from 'react-native';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { router } from 'expo-router';
import AddAlert from '../app/officer-dashboard/add-alert';
import { addIncident, getIncidents, IncidentAlert, updateIncident } from '../utils/OfficerStorage';

let mockParams: { id?: string | string[] } = {};

jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    replace: jest.fn(),
    canGoBack: jest.fn(() => true),
  },
  useLocalSearchParams: () => mockParams,
}));

jest.mock('../utils/OfficerStorage', () => ({
  addIncident: jest.fn(),
  getIncidents: jest.fn(),
  updateIncident: jest.fn(),
}));

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
}));

const mockAdd = jest.mocked(addIncident);
const mockGet = jest.mocked(getIncidents);
const mockUpdate = jest.mocked(updateIncident);
const incidentA: IncidentAlert = {
  id: 'incident-a',
  busId: '154',
  route: 'CMB → KDY',
  delayTime: '15m',
  status: 'WARNING',
  createdAt: 100,
};
const incidentB: IncidentAlert = {
  id: 'incident-b',
  busId: '138',
  route: 'KDY → CMB',
  delayTime: '8m',
  status: 'URGENT',
  createdAt: 200,
};

let screen: ReactTestRenderer | undefined;

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

async function renderForm() {
  await act(async () => { screen = create(<AddAlert />); });
}

function field(label: string) {
  const input = screen!.root.findAllByType(TextInput).find((node) => node.props.accessibilityLabel === label);
  if (!input) throw new Error(`Missing input: ${label}`);
  return input;
}

function button(label: string) {
  const control = screen!.root.findAllByType(TouchableOpacity).find((node) => node.props.accessibilityLabel === label);
  if (!control) throw new Error(`Missing control: ${label}`);
  return control;
}

function enter(label: string, value: string) {
  act(() => { field(label).props.onChangeText(value); });
}

async function press(label: string) {
  await act(async () => { button(label).props.onPress(); });
}

function textContent() {
  return screen!.root.findAllByType(Text).map((node) => node.props.children).join(' ');
}

beforeEach(() => {
  mockParams = {};
  mockAdd.mockReset();
  mockGet.mockReset();
  mockUpdate.mockReset();
  jest.mocked(router.canGoBack).mockReturnValue(true);
  mockGet.mockResolvedValue([incidentA, incidentB]);
  mockAdd.mockResolvedValue(incidentA);
  mockUpdate.mockResolvedValue(incidentA);
});

afterEach(() => {
  if (screen) act(() => { screen!.unmount(); });
  screen = undefined;
});

test('shows required-field errors without creating or updating an incident', async () => {
  await renderForm();
  enter('Bus ID', '   ');
  await press('Create Alert');

  expect(textContent()).toContain('Enter a Bus ID.');
  expect(textContent()).toContain('Enter a route.');
  expect(textContent()).toContain('Enter the delay time.');
  expect(mockAdd).not.toHaveBeenCalled();
  expect(mockUpdate).not.toHaveBeenCalled();
  expect(router.back).not.toHaveBeenCalled();
});

test('creates trimmed input with the chosen status and goes back after saving', async () => {
  await renderForm();
  expect(button('URGENT').props.accessibilityState.checked).toBe(true);
  enter('Bus ID', ' 154 ');
  enter('Route', ' CMB → KDY ');
  enter('Delay Time', ' 15m ');
  await press('WARNING');
  await press('Create Alert');

  expect(mockAdd).toHaveBeenCalledWith({ busId: '154', route: 'CMB → KDY', delayTime: '15m', status: 'WARNING' });
  expect(mockUpdate).not.toHaveBeenCalled();
  expect(router.back).toHaveBeenCalledTimes(1);
  expect(router.replace).not.toHaveBeenCalled();
});

test('preserves entered values and shows save failure without navigating', async () => {
  mockAdd.mockRejectedValueOnce(new Error('Storage is unavailable.'));
  await renderForm();
  enter('Bus ID', '154');
  enter('Route', 'CMB → KDY');
  enter('Delay Time', '15m');
  await press('Create Alert');

  expect(textContent()).toContain('Storage is unavailable.');
  expect(field('Bus ID').props.value).toBe('154');
  expect(field('Route').props.value).toBe('CMB → KDY');
  expect(field('Delay Time').props.value).toBe('15m');
  expect(button('Create Alert').props.disabled).toBe(false);
  expect(router.back).not.toHaveBeenCalled();
  expect(router.replace).not.toHaveBeenCalled();
});

test('hydrates an existing incident and updates its ID with all current field values', async () => {
  mockParams = { id: incidentA.id };
  await renderForm();

  expect(field('Bus ID').props.value).toBe(incidentA.busId);
  expect(field('Route').props.value).toBe(incidentA.route);
  expect(field('Delay Time').props.value).toBe(incidentA.delayTime);
  expect(button('WARNING').props.accessibilityState.checked).toBe(true);
  enter('Delay Time', ' 20m ');
  await press('RESOLVED');
  await press('Save Changes');

  expect(mockUpdate).toHaveBeenCalledWith(incidentA.id, {
    busId: incidentA.busId,
    route: incidentA.route,
    delayTime: '20m',
    status: 'RESOLVED',
  });
  expect(mockAdd).not.toHaveBeenCalled();
  expect(router.back).toHaveBeenCalledTimes(1);
});

test('prevents duplicate submissions while a create request is pending', async () => {
  const save = deferred<IncidentAlert>();
  mockAdd.mockReturnValueOnce(save.promise);
  await renderForm();
  enter('Bus ID', '154');
  enter('Route', 'CMB → KDY');
  enter('Delay Time', '15m');
  const submit = button('Create Alert').props.onPress;

  act(() => { submit(); submit(); });

  expect(mockAdd).toHaveBeenCalledTimes(1);
  expect(button('Create Alert').props.accessibilityState.busy).toBe(true);
  expect(field('Bus ID').props.editable).toBe(false);
  expect(router.back).not.toHaveBeenCalled();
  await act(async () => { save.resolve(incidentA); });
  expect(router.back).toHaveBeenCalledTimes(1);
});

test.each(['success', 'failure'] as const)('ignores stale %s from an incident save after route parameters change', async (outcome) => {
  const previousSave = deferred<IncidentAlert>();
  mockUpdate.mockReturnValueOnce(previousSave.promise);
  mockParams = { id: incidentA.id };
  await renderForm();
  await press('Save Changes');
  expect(mockUpdate).toHaveBeenCalledTimes(1);

  mockParams = { id: incidentB.id };
  await act(async () => { screen!.update(<AddAlert />); });
  expect(field('Bus ID').props.value).toBe(incidentB.busId);
  expect(button('Save Changes').props.disabled).toBe(false);

  await act(async () => {
    if (outcome === 'success') previousSave.resolve(incidentA);
    else previousSave.reject(new Error('Old incident save failed.'));
  });

  expect(router.back).not.toHaveBeenCalled();
  expect(router.replace).not.toHaveBeenCalled();
  expect(textContent()).not.toContain('Old incident save failed.');
  expect(field('Bus ID').props.value).toBe(incidentB.busId);
  expect(field('Route').props.value).toBe(incidentB.route);
  expect(button('URGENT').props.accessibilityState.checked).toBe(true);
  expect(button('Save Changes').props.disabled).toBe(false);
});

test('returns directly opened alerts to the dashboard when there is no back history', async () => {
  jest.mocked(router.canGoBack).mockReturnValue(false);
  await renderForm();
  enter('Bus ID', '154');
  enter('Route', 'CMB → KDY');
  enter('Delay Time', '15m');
  await press('Create Alert');

  expect(router.replace).toHaveBeenCalledWith('/(tabs)/officer-dashboard');
  expect(router.back).not.toHaveBeenCalled();
});
