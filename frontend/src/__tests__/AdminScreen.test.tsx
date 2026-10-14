import React from 'react';
import { Text, TextInput, TouchableOpacity } from 'react-native';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { router } from 'expo-router';
import AdminScreen from '../screens/AdminScreen';
import { getAdminState, updateManagedUser, respondToReport, saveManagedJourney } from '../services/LocalAppStorage';
import { loadAdminTickets, loadAdminTicketActivities } from '../services/LocalTicketStorage';
import { getIncidents } from '../utils/OfficerStorage';
import { inspectAdminBackup, restoreAdminBackup } from '../services/AdminBackup';
import { showAlert } from '../components/AppAlert';
import { defaultJourneys } from '../services/adminTypes';

let mockAuth: any;
jest.mock('../auth/AuthProvider', () => ({ useAuth: () => mockAuth }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  Redirect: ({ href }: { href: string }) => require('react').createElement(require('react-native').Text, {}, href),
  useFocusEffect: (callback: () => void) => require('react').useEffect(callback, [callback]),
}));
jest.mock('../services/LocalAppStorage', () => ({ getAdminState: jest.fn(), updateManagedUser: jest.fn(), respondToReport: jest.fn(), saveManagedJourney: jest.fn() }));
jest.mock('../services/LocalTicketStorage', () => ({ loadAdminTickets: jest.fn(), loadAdminTicketActivities: jest.fn() }));
jest.mock('../utils/OfficerStorage', () => ({ getIncidents: jest.fn() }));
jest.mock('../services/AdminBackup', () => ({ exportAdminBackup: jest.fn(), inspectAdminBackup: jest.fn(), restoreAdminBackup: jest.fn() }));
jest.mock('../components/AppAlert', () => ({ showAlert: jest.fn() }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: require('react-native').View }));
let screen: ReactTestRenderer | undefined;
const now = new Date().toISOString();
const users: any[] = [
  { _id: 'admin', fullName: 'Admin', email: 'admin@example.test', role: 'admin', disabled: false },
  { _id: 'passenger', fullName: 'Passenger', email: 'passenger@example.test', role: 'passenger', disabled: false },
  { _id: 'officer', fullName: 'Officer', email: 'officer@example.test', role: 'officer', disabled: false },
];
const ticket: any = { id: 'ticket', reference: 'TL-SEARCH', ownerId: 'passenger', passengerName: 'Passenger', passengerCount: 1, passengerNumber: 1,
  status: 'Active', fareMinor: 32000, journey: { from: 'Colombo', to: 'Kandy', mode: 'Train' }, purchasedAt: now, validFrom: now, validUntil: now, usedAt: null, bookingId: 'booking' };
beforeEach(() => {
  mockAuth = { session: { token: 'admin-session', user: users[0] }, loading: false, error: null };
  jest.mocked(getAdminState).mockResolvedValue({ users, journeys: defaultJourneys, reports: [{ id: 'report', userId: 'passenger', title: 'Late bus', message: 'Please check.', status: 'Open', response: '', createdAt: now, updatedAt: now }], activities: [] });
  jest.mocked(loadAdminTickets).mockResolvedValue([ticket]);
  jest.mocked(loadAdminTicketActivities).mockResolvedValue([]);
  jest.mocked(getIncidents).mockResolvedValue([]);
});
afterEach(() => { if (screen) act(() => screen!.unmount()); screen = undefined; });
async function render() { await act(async () => { screen = create(<AdminScreen />); }); }
function button(label: string) { return screen!.root.findAllByType(TouchableOpacity).find(node => node.props.accessibilityLabel === label)!; }
async function press(label: string) { await act(async () => button(label).props.onPress()); }
const text = () => screen!.root.findAllByType(Text).map(node => node.props.children).flat().join(' ');
function input(label: string) { return screen!.root.findAllByType(TextInput).find(node => node.props.accessibilityLabel === label)!; }

test.each(['passenger', 'officer'])('direct Admin links deny %s before reading any administrative records', async role => {
  mockAuth.session.user = { role }; await render();
  expect(text()).toContain('/(tabs)/home'); expect(getAdminState).not.toHaveBeenCalled(); expect(loadAdminTickets).not.toHaveBeenCalled();
});
test('guest Admin links lead to login', async () => { mockAuth.session = null; await render(); expect(text()).toContain('/login'); expect(getAdminState).not.toHaveBeenCalled(); });
test('Admin workspace loads all seven sections and routes to existing verification', async () => {
  await render(); expect(text()).toContain('Admin workspace'); expect(text()).toContain('Bookings');
  for (const section of ['Overview', 'Tickets', 'Users', 'Support', 'Routes & fares', 'Activity', 'Backup']) expect(button(section)).toBeDefined();
  await press('Verify ticket QR'); expect(router.push).toHaveBeenCalledWith('/officer-dashboard/verify-ticket');
});
test('ticket search filters by reference and exposes booking details without a QR token', async () => {
  await render(); await press('Tickets');
  act(() => input('Search tickets').props.onChangeText('missing')); expect(text()).not.toContain('TL-SEARCH');
  act(() => input('Search tickets').props.onChangeText('TL-SEARCH'));
  await press('Inspect TL-SEARCH'); expect(text()).toContain('passenger@example.test'); expect(text()).toContain('LKR 320.00'); expect(text()).not.toContain('TL1:');
});
test('user access changes require explicit confirmation and protect own/Officer controls', async () => {
  await render(); await press('Users'); await press('Disable account');
  expect(updateManagedUser).not.toHaveBeenCalled();
  const choices = jest.mocked(showAlert).mock.calls[0][2]!;
  await act(async () => choices.find((c: any) => c.text === 'Confirm')!.onPress!());
  expect(updateManagedUser).toHaveBeenCalledWith('passenger', { disabled: true });
});
test('support review saves status and reply through the service', async () => {
  await render(); await press('Support'); await press('Review report');
  act(() => input('Admin response').props.onChangeText('Reviewed locally.'));
  await press('Save as Resolved'); expect(respondToReport).toHaveBeenCalledWith('report', 'Resolved', 'Reviewed locally.');
});
test('route editor saves configured fares from human-readable LKR input', async () => {
  await render(); await press('Routes & fares'); await press(`Edit ${defaultJourneys[0].code}`);
  act(() => input('Standard - Single journey fare (LKR)').props.onChangeText('456.78'));
  await press('Save journey'); expect(saveManagedJourney).toHaveBeenCalledWith(expect.objectContaining({ ticketTypes: [expect.objectContaining({ fareMinor: 45678 })] }));
});
test('restore requires validation, preview and explicit replacement confirmation', async () => {
  await render(); await press('Backup'); act(() => input('Backup JSON').props.onChangeText('backup-content'));
  expect(button('Restore validated backup')).toBeUndefined();
  jest.mocked(inspectAdminBackup).mockResolvedValue({ createdAt: now, users: 4, tickets: 1, incidents: 2, routes: 10, reports: 1 });
  await press('Validate backup'); await press('Restore validated backup'); expect(restoreAdminBackup).not.toHaveBeenCalled();
  const choices = jest.mocked(showAlert).mock.calls[0][2]!;
  await act(async () => choices.find((c: any) => c.text === 'Confirm')!.onPress!());
  expect(restoreAdminBackup).toHaveBeenCalledWith('backup-content'); expect(router.replace).toHaveBeenCalledWith('/login');
});
