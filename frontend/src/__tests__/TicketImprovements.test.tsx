import React from 'react';
import {
  AppState,
  Modal,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { router } from 'expo-router';
import JourneyDateTimePicker from '../components/ticketing/JourneyDateTimePicker';
import TicketCard from '../components/ticketing/TicketCard';
import useTicketAutoRefresh from '../hooks/useTicketAutoRefresh';
import MyTicketsScreen from '../screens/MyTicketsScreen';
import TicketDetailsScreen from '../screens/TicketDetailsScreen';
import { getToken } from '../services/api';
import { loadTicket, loadTickets, Ticket } from '../services/ticketService';
import { formatTicketDate } from '../utils/ticketUtils';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), navigate: jest.fn() },
  useLocalSearchParams: () => ({ id: 'ticket-1', present: '1' }),
  useFocusEffect: (effect: () => void) =>
    require('react').useEffect(effect, [effect]),
}));
jest.mock('../services/api', () => ({ getToken: jest.fn() }));
jest.mock('../services/ticketService', () => ({
  ...jest.requireActual('../services/ticketService'),
  loadTicket: jest.fn(),
  loadTickets: jest.fn(),
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('react-native-qrcode-svg', () => () => null);
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
}));

const ticket: Ticket = {
  id: 'ticket-1',
  reference: 'TL-TEST',
  journey: {
    code: 'TEST',
    from: 'Origin',
    to: 'Destination',
    mode: 'Bus',
    durationMinutes: 60,
  },
  ticketType: 'standard',
  ticketTypeLabel: 'Standard',
  fareMinor: 12500,
  currency: 'LKR',
  passengerName: 'Passenger',
  status: 'Active',
  purchaseMode: 'demo',
  validFrom: new Date(2026, 9, 7, 9).toISOString(),
  validUntil: new Date(2026, 9, 7, 12).toISOString(),
  purchasedAt: new Date(2026, 9, 7, 9).toISOString(),
  usedAt: null,
  qrPayload: `TL1:${'a'.repeat(64)}`,
};
let screen: ReactTestRenderer;
let changeState: (state: 'active' | 'background') => void;
const remove = jest.fn();
function control(label: string) {
  const node = screen.root
    .findAllByType(TouchableOpacity)
    .find((n) => n.props.accessibilityLabel === label);
  if (!node) throw new Error(`Missing control ${label}`);
  return node;
}
function press(label: string) {
  act(() => control(label).props.onPress());
}
beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2026, 9, 7, 10));
  AppState.currentState = 'active';
  jest
    .spyOn(AppState, 'addEventListener')
    .mockImplementation((_event, callback) => {
      changeState = (state) => {
        AppState.currentState = state;
        callback(state);
      };
      return { remove };
    });
  jest.mocked(getToken).mockResolvedValue('session');
  jest.mocked(loadTickets).mockResolvedValue([ticket]);
  jest.mocked(loadTicket).mockResolvedValue(ticket);
});
afterEach(() => {
  if (screen) act(() => screen.unmount());
  jest.restoreAllMocks();
  jest.useRealTimers();
});

test('calendar disables past days and confirms the selected local date and time', () => {
  const onChange = jest.fn();
  act(() => {
    screen = create(
      <JourneyDateTimePicker
        value={{ date: '2026-10-07', time: '10:15' }}
        onChange={onChange}
      />
    );
  });
  press('Choose travel date');
  expect(
    control(formatTicketDate(new Date(2026, 9, 6).toISOString())).props.disabled
  ).toBe(true);
  press(formatTicketDate(new Date(2026, 9, 8).toISOString()));
  press('Choose time');
  press('hour 09');
  press('minute 30');
  expect(onChange).not.toHaveBeenCalled();
  press('Set journey time');
  expect(onChange).toHaveBeenCalledWith({ date: '2026-10-08', time: '09:30' });
  expect(screen.root.findByType(Modal).props.visible).toBe(false);
});

test('picker cancels draft changes and rejects elapsed times and the 30-day boundary', () => {
  const onChange = jest.fn();
  act(() => {
    screen = create(
      <JourneyDateTimePicker
        value={{ date: '2026-10-07', time: '10:15' }}
        onChange={onChange}
      />
    );
  });
  press('Choose journey time');
  press('hour 09');
  expect(control('Set journey time').props.disabled).toBe(true);
  press('Close date and time picker');
  expect(onChange).not.toHaveBeenCalled();
  press('Choose journey time');
  expect(control('hour 10').props.accessibilityState.checked).toBe(true);
  act(() => jest.advanceTimersByTime(16 * 60000));
  expect(control('Set journey time').props.disabled).toBe(true);
  press('Change date');
  press('Next month');
  expect(
    control(formatTicketDate(new Date(2026, 10, 7).toISOString())).props
      .disabled
  ).toBe(true);
  press(formatTicketDate(new Date(2026, 10, 6).toISOString()));
  press('Choose time');
  press('hour 23');
  expect(control('Set journey time').props.disabled).toBe(true);
});

test('refresh pauses in background, checks foreground immediately, and stops on unmount', async () => {
  const refresh = jest.fn().mockResolvedValue(undefined);
  function Harness() {
    useTicketAutoRefresh(refresh);
    return null;
  }
  act(() => {
    screen = create(<Harness />);
  });
  await act(async () => {
    jest.advanceTimersByTime(15000);
  });
  expect(refresh).toHaveBeenCalledTimes(1);
  act(() => changeState('background'));
  await act(async () => {
    jest.advanceTimersByTime(30000);
  });
  expect(refresh).toHaveBeenCalledTimes(1);
  await act(async () => changeState('active'));
  expect(refresh).toHaveBeenCalledTimes(2);
  act(() => screen.unmount());
  await act(async () => {
    jest.advanceTimersByTime(30000);
  });
  expect(refresh).toHaveBeenCalledTimes(2);
  expect(remove).toHaveBeenCalled();
});

test('refresh does not overlap requests and recovers after a rejected request', async () => {
  let reject!: (reason: Error) => void;
  const refresh = jest
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise((_yes, no) => {
          reject = no;
        })
    )
    .mockResolvedValue(undefined);
  function Harness() {
    useTicketAutoRefresh(refresh);
    return null;
  }
  act(() => {
    screen = create(<Harness />);
  });
  await act(async () => {
    jest.advanceTimersByTime(45000);
  });
  expect(refresh).toHaveBeenCalledTimes(1);
  await act(async () => reject(new Error('offline')));
  await act(async () => {
    jest.advanceTimersByTime(15000);
  });
  expect(refresh).toHaveBeenCalledTimes(2);
});

test('My Tickets opens QR directly and quietly moves a redeemed ticket to History', async () => {
  await act(async () => {
    screen = create(<MyTicketsScreen />);
  });
  press('Show QR for TL-TEST');
  expect(router.push).toHaveBeenCalledWith({
    pathname: '/ticketing/[id]',
    params: { id: ticket.id, present: '1' },
  });
  jest.mocked(loadTickets).mockResolvedValue([{ ...ticket, status: 'Used' }]);
  await act(async () => {
    jest.advanceTimersByTime(15000);
  });
  expect(screen.root.findAllByType(TicketCard)).toHaveLength(0);
  expect(screen.root.findByType(RefreshControl).props.refreshing).toBe(false);
  const history = screen.root
    .findAllByType(TouchableOpacity)
    .find(
      (n) =>
        n.props.accessibilityRole === 'tab' &&
        !n.props.accessibilityState.selected
    );
  expect(history).toBeDefined();
  act(() => history!.props.onPress());
  expect(screen.root.findByType(TicketCard).props.ticket.status).toBe('Used');
  expect(
    screen.root
      .findAllByType(TouchableOpacity)
      .some((n) => n.props.accessibilityLabel === 'Show QR for TL-TEST')
  ).toBe(false);
});

test('quick presentation loads the owner ticket and closes QR after officer redemption', async () => {
  await act(async () => {
    screen = create(<TicketDetailsScreen />);
  });
  expect(loadTicket).toHaveBeenCalledWith('ticket-1');
  expect(screen.root.findByType(Modal).props.visible).toBe(true);
  jest.mocked(loadTicket).mockResolvedValue({ ...ticket, status: 'Used' });
  await act(async () => {
    jest.advanceTimersByTime(15000);
  });
  expect(screen.root.findByType(Modal).props.visible).toBe(false);
  expect(screen.root.findByType(RefreshControl).props.refreshing).toBe(false);
});
