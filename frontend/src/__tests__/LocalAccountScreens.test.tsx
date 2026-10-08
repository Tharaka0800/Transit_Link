import React from 'react';
import { Alert, FlatList, Text, TextInput, TouchableOpacity } from 'react-native';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { router } from 'expo-router';
import Profile from '../screens/Profile';
import Notifications from '../screens/Notifications';
import RoutesScreen from '../screens/RoutesScreen';
import HelpSupport from '../screens/HelpSupport';
import Navbar from '../components/Navbar';
import * as api from '../services/api';

let mockAuth: any;
let mockFocusSetup: (() => void | (() => void)) | undefined;
let mockFocusCleanup: void | (() => void);
jest.mock('../auth/AuthProvider', () => ({ useAuth: () => mockAuth }));
jest.mock('../services/api', () => ({
  getUserProfile: jest.fn(), updateUserProfile: jest.fn(), deleteUserProfile: jest.fn(),
  getNotifications: jest.fn(), clearAuth: jest.fn(), saveAuth: jest.fn(),
  createNotification: jest.fn(), markNotificationRead: jest.fn(), deleteNotification: jest.fn(),
  getSavedRoutes: jest.fn(), addSampleSavedRoute: jest.fn(), toggleSavedRoute: jest.fn(),
}));
jest.mock('expo-router', () => ({
  router: { navigate: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
  Redirect: ({ href }: { href: string }) => require('react').createElement(require('react-native').Text, { testID: 'redirect' }, href),
  useFocusEffect: (callback: () => void | (() => void)) => require('react').useEffect(() => {
    mockFocusSetup = callback;
    mockFocusCleanup = callback();
    return () => {
      if (mockFocusCleanup) mockFocusCleanup();
      mockFocusSetup = undefined;
      mockFocusCleanup = undefined;
    };
  }, [callback]),
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: ({ name }: { name: string }) => require('react').createElement(require('react-native').Text, { testID: `icon-${name}` }) }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: require('react-native').View }));

const user = { _id: 'local-passenger', fullName: 'Offline Passenger', email: 'passenger@example.com', phone: '0772345678', role: 'passenger', avatar: '', createdAt: '2026-10-08T00:00:00.000Z', updatedAt: '2026-10-08T00:00:00.000Z' };
const notification = { _id: 'local-note', userId: user._id, title: 'Delay Alert: Bus 154', message: '15m delay', type: 'delay', isRead: false, timestamp: '2026-10-08T00:00:00.000Z', createdAt: '2026-10-08T00:00:00.000Z', updatedAt: '2026-10-08T00:00:00.000Z' };
const route = { id: 'local-route', userId: user._id, from: 'Colombo', to: 'Kandy', mode: 'Bus', duration: '3h', favorite: true, muted: false };
let screen: ReactTestRenderer | undefined;

function control(label: string) {
  const match = screen!.root.findAllByType(TouchableOpacity).find((node) => node.props.accessibilityLabel === label)
    || screen!.root.findAllByType(TouchableOpacity).find((node) => node.findAllByType(Text).some((text) => text.props.children === label));
  if (!match) throw new Error(`Missing control ${label}`);
  return match;
}
function input(label: string) {
  return screen!.root.findAllByType(TextInput).find((node) => node.props.accessibilityLabel === label || node.props.placeholder === label)!;
}
async function render(component: React.ReactElement) { await act(async () => { screen = create(component); }); }
async function press(label: string) { await act(async () => { control(label).props.onPress(); }); }
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
function list() { return screen!.root.findByType(FlatList).props.data; }
function text() { return screen!.root.findAllByType(Text).map((node) => node.props.children).join(' '); }

beforeEach(() => {
  mockAuth = { session: { token: 'local:passenger-session', user }, isRestoring: false, loading: false };
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.mocked(api.getUserProfile).mockResolvedValue({ data: user } as any);
  jest.mocked(api.updateUserProfile).mockResolvedValue({ data: { ...user, token: mockAuth.session.token } } as any);
  jest.mocked(api.getNotifications).mockResolvedValue({ data: { notifications: [notification], unreadCount: 1 } } as any);
  jest.mocked(api.markNotificationRead).mockResolvedValue({ data: { ...notification, isRead: true } } as any);
  jest.mocked(api.deleteNotification).mockResolvedValue({ data: { message: 'Dismissed', id: notification._id } });
  jest.mocked(api.createNotification).mockResolvedValue({ data: notification } as any);
  jest.mocked(api.getSavedRoutes).mockResolvedValue({ data: [route] } as any);
  jest.mocked(api.toggleSavedRoute).mockResolvedValue({ data: { ...route, favorite: false, muted: true } } as any);
  jest.mocked(api.addSampleSavedRoute).mockResolvedValue({ data: { ...route, id: 'new-saved-route', from: 'Pettah' } } as any);
  jest.mocked(api.saveAuth).mockResolvedValue(undefined);
  jest.mocked(api.clearAuth).mockResolvedValue(undefined);
});
afterEach(() => {
  if (screen) act(() => { screen!.unmount(); });
  screen = undefined;
  jest.restoreAllMocks();
});

test.each([['profile', Profile], ['notifications', Notifications]] as const)('a guest cannot read another account’s %s records', async (_name, Component) => {
  mockAuth.session = null;
  await render(<Component />);
  expect(text()).toContain('/login');
  expect(api.getUserProfile).not.toHaveBeenCalled();
  expect(api.getNotifications).not.toHaveBeenCalled();
});

test('profile edits preserve the shared form and use the local response contract', async () => {
  await render(<Profile />);
  expect(text()).toContain(user.fullName);
  await press('Edit Profile');
  act(() => { input('Full Name').props.onChangeText('Updated Passenger'); });
  jest.mocked(api.updateUserProfile).mockResolvedValueOnce({ data: { ...user, fullName: 'Updated Passenger', token: mockAuth.session.token } } as any);
  await press('Save Changes');
  expect(api.updateUserProfile).toHaveBeenCalledWith({ fullName: 'Updated Passenger', email: user.email, phone: user.phone });
  expect(api.saveAuth).toHaveBeenCalledWith(expect.objectContaining({ fullName: 'Updated Passenger' }));
  expect(text()).toContain('Updated Passenger');
  expect(Alert.alert).toHaveBeenCalledWith('Success', 'Profile updated successfully');
});

test('profile storage failures show a retry state and recover without a backend', async () => {
  jest.mocked(api.getUserProfile).mockRejectedValueOnce(new Error('Could not read saved data on this device.'));
  await render(<Profile />);
  expect(text()).toContain('Could not read saved data on this device.');
  await press('Retry');
  expect(api.getUserProfile).toHaveBeenCalledTimes(2);
  expect(text()).toContain(user.fullName);
});

test('an old profile read cannot replace the new account or expose its private fields while loading', async () => {
  const previous = deferred<any>();
  jest.mocked(api.getUserProfile).mockReturnValueOnce(previous.promise);
  await render(<Profile />);
  const next = deferred<any>();
  jest.mocked(api.getUserProfile).mockReturnValueOnce(next.promise);
  const nextUser = { ...user, _id: 'next-user', fullName: 'Next Passenger', email: 'next@example.com' };
  mockAuth.session = { token: 'local:next-session', user: nextUser };
  await act(async () => { screen!.update(<Profile />); });
  expect(text()).not.toContain(user.email);
  await act(async () => { next.resolve({ data: nextUser }); });
  expect(text()).toContain(nextUser.email);
  await act(async () => { previous.resolve({ data: user }); });
  expect(text()).toContain(nextUser.email);
  expect(text()).not.toContain(user.email);
});

test('Officer profile email cannot be edited through the shared input', async () => {
  mockAuth.session.user = { ...user, role: 'officer', email: 'officer@transitlink.lk' };
  jest.mocked(api.getUserProfile).mockResolvedValueOnce({ data: mockAuth.session.user } as any);
  await render(<Profile />);
  await press('Edit Profile');
  expect(input('Email Address').props.editable).toBe(false);
});

test('duplicate profile saves are blocked and a save completing after logout cannot restore the UI', async () => {
  const pending = deferred<any>();
  jest.mocked(api.updateUserProfile).mockReturnValueOnce(pending.promise);
  await render(<Profile />);
  await press('Edit Profile');
  const save = control('Save Changes').props.onPress;
  act(() => { save(); save(); });
  expect(api.updateUserProfile).toHaveBeenCalledTimes(1);
  mockAuth.session = null;
  await act(async () => { screen!.update(<Profile />); });
  await act(async () => { pending.resolve({ data: { ...user, token: 'old-local-session' } }); });
  expect(api.saveAuth).not.toHaveBeenCalled();
  expect(text()).toContain('/login');
  expect(Alert.alert).not.toHaveBeenCalledWith('Success', expect.anything());
});

test('an old logout confirmation cannot log out a newly selected account', async () => {
  await render(<Profile />);
  await press('Settings');
  await press('Log Out');
  const buttons = jest.mocked(Alert.alert).mock.calls.find(([title]) => title === 'Log Out')![2]!;
  const confirm = buttons.find((button) => button.text === 'Log Out')!.onPress!;
  mockAuth.session = { token: 'local:new-account', user: { ...user, _id: 'new-user' } };
  await act(async () => { screen!.update(<Profile />); });
  await act(async () => { await confirm(); });
  expect(api.clearAuth).not.toHaveBeenCalled();
  expect(router.replace).not.toHaveBeenCalled();
});

test('notifications mark local records read and dismiss them using their IDs', async () => {
  await render(<Notifications />);
  expect(list()).toEqual([notification]);
  await press(notification.title);
  expect(api.markNotificationRead).toHaveBeenCalledWith(notification._id);
  expect(list()[0].isRead).toBe(true);
  await press('Dismiss');
  expect(api.deleteNotification).toHaveBeenCalledWith(notification._id);
  expect(list()).toEqual([]);
});

test('notification storage failures provide a retry that restores the local list', async () => {
  jest.mocked(api.getNotifications).mockRejectedValueOnce(new Error('Could not read saved notifications.'));
  await render(<Notifications />);
  expect(text()).toContain('Could not read saved notifications.');
  expect(screen!.root.findAllByType(FlatList)).toHaveLength(0);
  await press('Retry');
  expect(api.getNotifications).toHaveBeenCalledTimes(2);
  expect(list()).toEqual([notification]);
});

test('switching accounts hides the previous notification list until the new read completes', async () => {
  await render(<Notifications />);
  expect(list()).toEqual([notification]);
  const next = deferred<any>();
  jest.mocked(api.getNotifications).mockReturnValueOnce(next.promise);
  mockAuth.session = { token: 'local:next-session', user: { ...user, _id: 'next-user' } };
  await act(async () => { screen!.update(<Notifications />); });
  expect(screen!.root.findAllByType(FlatList)).toHaveLength(0);
  expect(text()).not.toContain(notification.title);
  await act(async () => { next.resolve({ data: { notifications: [], unreadCount: 0 } }); });
  expect(list()).toEqual([]);
});

test('an older notification load cannot replace the current account’s records', async () => {
  const oldLoad = deferred<any>();
  jest.mocked(api.getNotifications).mockReturnValueOnce(oldLoad.promise);
  await render(<Notifications />);
  const nextNote = { ...notification, _id: 'next-note', userId: 'next-user', title: 'Next user notification' };
  jest.mocked(api.getNotifications).mockResolvedValueOnce({ data: { notifications: [nextNote], unreadCount: 1 } } as any);
  mockAuth.session = { token: 'local:next-session', user: { ...user, _id: 'next-user' } };
  await act(async () => { screen!.update(<Notifications />); });
  expect(list()).toEqual([nextNote]);
  await act(async () => { oldLoad.resolve({ data: { notifications: [notification], unreadCount: 1 } }); });
  expect(list()).toEqual([nextNote]);
});

test('pending notification creation is de-duplicated and cannot change a later account’s list', async () => {
  const pending = deferred<any>();
  jest.mocked(api.createNotification).mockReturnValueOnce(pending.promise);
  await render(<Notifications />);
  const createAlert = control('+ Add test notification').props.onPress;
  act(() => { createAlert(); createAlert(); });
  expect(api.createNotification).toHaveBeenCalledTimes(1);
  const nextNote = { ...notification, _id: 'next-note', title: 'Next notification' };
  mockAuth.session = { token: 'local:next-session', user: { ...user, _id: 'next-user' } };
  jest.mocked(api.getNotifications).mockResolvedValueOnce({ data: { notifications: [nextNote], unreadCount: 1 } } as any);
  await act(async () => { screen!.update(<Notifications />); });
  await act(async () => { pending.resolve({ data: notification }); });
  expect(list()).toEqual([nextNote]);
});

test('Routes loads local records and persists favorite changes through the service', async () => {
  await render(<RoutesScreen />);
  expect(text()).toContain(route.from);
  const star = screen!.root.findAllByType(TouchableOpacity).filter((node) => node.findAllByProps({ testID: 'icon-star-outline' }).length > 0).pop()!;
  await act(async () => { star.props.onPress(); });
  expect(api.toggleSavedRoute).toHaveBeenCalledWith(route.id);
  expect(screen!.root.findAllByProps({ testID: 'icon-notifications-off-outline' }).length).toBeGreaterThan(0);
});

test('Routes adds a persisted sample and ignores an old Add confirmation after switching users', async () => {
  await render(<RoutesScreen />);
  act(() => { screen!.root.findByType(Navbar).props.onRightPress(); });
  let buttons = jest.mocked(Alert.alert).mock.calls.find(([title]) => title === 'Add Favourite Route')![2]!;
  await act(async () => { buttons.find((button) => button.text === 'Add Sample')!.onPress!(); });
  expect(api.addSampleSavedRoute).toHaveBeenCalledTimes(1);
  expect(text()).toContain('Pettah');
  jest.mocked(Alert.alert).mockClear();
  act(() => { screen!.root.findByType(Navbar).props.onRightPress(); });
  buttons = jest.mocked(Alert.alert).mock.calls[0][2]!;
  mockAuth.session = null;
  jest.mocked(api.getSavedRoutes).mockResolvedValueOnce({ data: [] });
  await act(async () => { screen!.update(<RoutesScreen />); });
  await act(async () => { buttons.find((button) => button.text === 'Add Sample')!.onPress!(); });
  expect(api.addSampleSavedRoute).toHaveBeenCalledTimes(1);
  expect(text()).not.toContain('Pettah');
});

test('Help & Support saves reports locally once and states that they were saved on this device', async () => {
  const pending = deferred<any>();
  jest.mocked(api.createNotification).mockReturnValueOnce(pending.promise);
  await render(<HelpSupport />);
  await press('Report an Issue');
  act(() => { input('Subject').props.onChangeText('Bus issue'); input('Tell us what went wrong...').props.onChangeText('No announcement'); });
  const report = control('Submit Issue').props.onPress;
  act(() => { report(); report(); });
  expect(api.createNotification).toHaveBeenCalledTimes(1);
  expect(api.createNotification).toHaveBeenCalledWith({ title: 'Bus issue', message: 'No announcement', type: 'info' });
  await act(async () => { pending.resolve({ data: notification }); });
  expect(Alert.alert).toHaveBeenCalledWith('Saved', 'Your issue has been saved on this device.');
});
