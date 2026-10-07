import React from 'react';
import { AxiosHeaders } from 'axios';
import { Text, TextInput, TouchableOpacity } from 'react-native';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import TicketVerificationScreen from '../screens/TicketVerificationScreen';
import { getToken, getUserProfile } from '../services/api';
import { verifyQR, redeemQR, Ticket } from '../services/ticketService';

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
    canGoBack: () => true,
  },
  useFocusEffect: (callback: () => void) =>
    require('react').useEffect(callback, [callback]),
}));
jest.mock('expo-camera', () => ({
  CameraView: () => null,
  useCameraPermissions: () => [
    { granted: false, canAskAgain: true },
    jest.fn(),
  ],
}));
jest.mock('../services/api', () => ({
  getToken: jest.fn(),
  getUserProfile: jest.fn(),
}));
jest.mock('../services/ticketService', () => ({
  ...jest.requireActual('../services/ticketService'),
  verifyQR: jest.fn(),
  redeemQR: jest.fn(),
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
}));

const ticket: Ticket = {
  id: 'ticket-1',
  reference: 'TL-TEST',
  journey: {
    code: 'TEST',
    mode: 'Bus',
    from: 'Origin',
    to: 'Destination',
    durationMinutes: 60,
  },
  passengerName: 'Passenger',
  status: 'Active',
  ticketType: 'standard',
  ticketTypeLabel: 'Standard',
  fareMinor: 12300,
  currency: 'LKR',
  validFrom: new Date(Date.now() - 60000).toISOString(),
  validUntil: new Date(Date.now() + 60000).toISOString(),
  purchasedAt: new Date().toISOString(),
  purchaseMode: 'demo',
  usedAt: null,
};
const profileResponse = (role: string) => ({
  data: { role },
  status: 200,
  statusText: 'OK',
  headers: {},
  config: { headers: new AxiosHeaders() },
});
let screen: ReactTestRenderer;
const text = () =>
  screen.root
    .findAllByType(Text)
    .map((node) => node.props.children)
    .join(' ');
const button = (label: string) =>
  screen.root
    .findAllByType(TouchableOpacity)
    .find((node) => node.props.accessibilityLabel === label)!;
async function press(label: string) {
  await act(async () => {
    button(label).props.onPress();
  });
}
async function render() {
  await act(async () => {
    screen = create(<TicketVerificationScreen />);
  });
}
async function check() {
  act(() => {
    screen.root
      .findByType(TextInput)
      .props.onChangeText(`TL1:${'a'.repeat(64)}`);
  });
  await press('Check ticket');
}
beforeEach(() => {
  jest.mocked(getToken).mockResolvedValue('session');
  jest.mocked(getUserProfile).mockResolvedValue(profileResponse('admin'));
  jest.mocked(verifyQR).mockResolvedValue({ ticket, eligible: true });
  jest
    .mocked(redeemQR)
    .mockResolvedValue({
      ticket: { ...ticket, status: 'Used' },
      message: 'Validated',
    });
});
afterEach(() => {
  if (screen) act(() => screen.unmount());
});

test('offline Officer entry does not silently grant verification access', async () => {
  jest.mocked(getToken).mockResolvedValue(null);
  await render();
  expect(text()).toContain('Sign in to verify tickets');
  expect(getUserProfile).not.toHaveBeenCalled();
  expect(verifyQR).not.toHaveBeenCalled();
});
test('passengers cannot access the scanner', async () => {
  jest.mocked(getUserProfile).mockResolvedValue(profileResponse('passenger'));
  await render();
  expect(text()).toContain('Authorized account required');
  expect(screen.root.findAllByType(TextInput)).toHaveLength(0);
});
test('scanning previews only; explicit confirmation marks the ticket used', async () => {
  await render();
  await check();
  expect(text()).toContain('Ticket preview');
  expect(redeemQR).not.toHaveBeenCalled();
  await press('Validate & mark used');
  expect(redeemQR).toHaveBeenCalledTimes(1);
  expect(text()).toContain('Passenger may board');
});
test('expired ticket cannot expose a validation action', async () => {
  jest
    .mocked(verifyQR)
    .mockResolvedValue({
      ticket: { ...ticket, status: 'Expired' },
      eligible: false,
    });
  await render();
  await check();
  expect(text()).toContain('not valid for boarding');
  expect(button('Validate & mark used')).toBeUndefined();
  expect(redeemQR).not.toHaveBeenCalled();
});
test('duplicate confirmation is suppressed and consumption conflict updates the preview', async () => {
  await render();
  await check();
  let reject!: (error: unknown) => void;
  jest.mocked(redeemQR).mockReturnValueOnce(
    new Promise((_, no) => {
      reject = no;
    })
  );
  const confirm = button('Validate & mark used').props.onPress;
  act(() => {
    confirm();
    confirm();
  });
  expect(redeemQR).toHaveBeenCalledTimes(1);
  await act(async () => {
    reject({
      response: {
        status: 409,
        data: {
          message: 'Already used',
          ticket: { ...ticket, status: 'Used' },
        },
      },
    });
  });
  expect(text()).toContain('Already used');
  expect(button('Validate & mark used')).toBeUndefined();
});
