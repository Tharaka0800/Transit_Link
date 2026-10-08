import React from 'react';
import { Alert, Modal, Platform, Text, TouchableOpacity } from 'react-native';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { router } from 'expo-router';
import { AppAlertProvider, showAlert } from '../components/AppAlert';
import Button from '../components/Button';
import Profile from '../screens/Profile';
import { clearAuth, getNotifications, getUserProfile } from '../services/api';

const mockUser = { _id: 'local-user', fullName: 'Offline Passenger', email: 'passenger@example.com', role: 'passenger', phone: '', avatar: '' };
jest.mock('../auth/AuthProvider', () => ({ useAuth: () => ({ session: { token: 'local:session', user: mockUser }, isRestoring: false }) }));
jest.mock('../services/api', () => ({ getUserProfile: jest.fn(), getNotifications: jest.fn(), clearAuth: jest.fn() }));
jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), navigate: jest.fn() },
  useFocusEffect: (callback: () => void | (() => void)) => require('react').useEffect(callback, [callback]),
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: require('react-native').View }));

let screen: ReactTestRenderer | undefined;
async function render(children: React.ReactNode = <Text>TransitLink</Text>) {
  await act(async () => { screen = create(<AppAlertProvider>{children}</AppAlertProvider>); });
}
function dialog() { return screen!.root.findByType(Modal); }
function title() { return dialog().findAllByType(Text).find((node) => node.props.accessibilityRole === 'header')!.props.children; }
async function choose(label: string) {
  const button = dialog().findAllByType(Button).find((node) => node.props.children === label)!;
  await act(async () => { button.props.onPress(); });
}
async function pressScreen(label: string) {
  const button = screen!.root.findAllByType(TouchableOpacity).find((node) => node.props.accessibilityLabel === label)
    || screen!.root.findAllByType(TouchableOpacity).find((node) => node.findAllByType(Text).some((text) => text.props.children === label));
  await act(async () => { button!.props.onPress(); });
}

beforeEach(() => {
  jest.replaceProperty(Platform, 'OS', 'web');
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.mocked(getUserProfile).mockResolvedValue({ data: mockUser } as any);
  jest.mocked(getNotifications).mockResolvedValue({ data: { notifications: [], unreadCount: 0 } });
  jest.mocked(clearAuth).mockResolvedValue(undefined);
});
afterEach(() => {
  if (screen) act(() => { screen!.unmount(); });
  screen = undefined;
  jest.restoreAllMocks();
});

test('native alerts forward the original arguments and callbacks to React Native', () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  const onPress = jest.fn();
  const buttons = [{ text: 'Cancel', style: 'cancel' as const }, { text: 'Delete', style: 'destructive' as const, onPress }];
  const options = { cancelable: false };
  showAlert('Delete Account', 'Confirm deletion', buttons, options);
  expect(Alert.alert).toHaveBeenCalledWith('Delete Account', 'Confirm deletion', buttons, options);
  expect(onPress).not.toHaveBeenCalled();
});

test('web dialogs render multiple actions and invoke the chosen callback without the unsupported native alert', async () => {
  const addSample = jest.fn();
  const fare = jest.fn();
  await render();
  act(() => { showAlert('Add Favourite Route', 'Choose an action', [{ text: 'Cancel', style: 'cancel' }, { text: 'Fare Information', onPress: fare }, { text: 'Add Sample', onPress: addSample }]); });
  expect(title()).toBe('Add Favourite Route');
  expect(dialog().findAllByType(Button).map((node) => node.props.children)).toEqual(['Cancel', 'Fare Information', 'Add Sample']);
  await choose('Add Sample');
  expect(addSample).toHaveBeenCalledTimes(1);
  expect(fare).not.toHaveBeenCalled();
  expect(Alert.alert).not.toHaveBeenCalled();
  expect(screen!.root.findAllByType(Modal)).toHaveLength(0);
});

test('Cancel closes the web confirmation without running its destructive callback', async () => {
  const remove = jest.fn();
  const cancel = jest.fn();
  await render();
  act(() => { showAlert('Delete Account', 'This cannot be undone.', [{ text: 'Cancel', style: 'cancel', onPress: cancel }, { text: 'Delete', style: 'destructive', onPress: remove }]); });
  const buttons = dialog().findAllByType(Button);
  expect(buttons.find((node) => node.props.children === 'Delete')!.props.variant).toBe('danger');
  expect(buttons.find((node) => node.props.children === 'Cancel')!.props.variant).toBe('secondary');
  await choose('Cancel');
  expect(cancel).toHaveBeenCalledTimes(1);
  expect(remove).not.toHaveBeenCalled();
  expect(screen!.root.findAllByType(Modal)).toHaveLength(0);
});

test('queued validation messages appear in order and close with the default OK action', async () => {
  await render();
  act(() => { showAlert('Missing fields', 'Enter a password.'); showAlert('Registration failed', 'Email already exists.'); });
  expect(title()).toBe('Missing fields');
  await choose('OK');
  expect(title()).toBe('Registration failed');
  await choose('OK');
  expect(screen!.root.findAllByType(Modal)).toHaveLength(0);
});

test('dismissal respects cancelable:false and fires onDismiss only for a permitted dismissal', async () => {
  const onDismiss = jest.fn();
  await render();
  act(() => { showAlert('Required action', undefined, undefined, { cancelable: false, onDismiss }); });
  act(() => { dialog().props.onRequestClose(); });
  expect(title()).toBe('Required action');
  expect(onDismiss).not.toHaveBeenCalled();
  await choose('OK');
  act(() => { showAlert('Optional action', undefined, undefined, { cancelable: true, onDismiss }); });
  act(() => { dialog().props.onRequestClose(); });
  expect(onDismiss).toHaveBeenCalledTimes(1);
  expect(screen!.root.findAllByType(Modal)).toHaveLength(0);
});

test('an asynchronous action failure appears as a web error message after its confirmation closes', async () => {
  await render();
  act(() => { showAlert('Delete Account', undefined, [{ text: 'Delete', onPress: async () => { throw new Error('Could not save data on this device.'); } }]); });
  await choose('Delete');
  expect(title()).toBe('Error');
  expect(dialog().findAllByType(Text).some((node) => node.props.children === 'Could not save data on this device.')).toBe(true);
  await choose('OK');
});

test('Profile’s web Log Out confirmation runs local logout and returns to login', async () => {
  await render(<Profile />);
  await pressScreen('Settings');
  await pressScreen('Log Out');
  expect(title()).toBe('Log Out');
  expect(clearAuth).not.toHaveBeenCalled();
  await choose('Log Out');
  expect(clearAuth).toHaveBeenCalledTimes(1);
  expect(router.replace).toHaveBeenCalledWith('/login');
  expect(Alert.alert).not.toHaveBeenCalled();
  expect(screen!.root.findAllByType(Modal)).toHaveLength(0);
});

test('canceling Profile’s web Log Out confirmation preserves the session', async () => {
  await render(<Profile />);
  await pressScreen('Settings');
  await pressScreen('Log Out');
  await choose('Cancel');
  expect(clearAuth).not.toHaveBeenCalled();
  expect(router.replace).not.toHaveBeenCalled();
  expect(screen!.root.findAllByType(Modal)).toHaveLength(0);
});
