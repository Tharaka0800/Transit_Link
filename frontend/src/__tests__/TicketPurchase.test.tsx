import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import JourneyDateTimePicker from '../components/ticketing/JourneyDateTimePicker';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { router } from 'expo-router';
import TicketPurchaseScreen from '../screens/TicketPurchaseScreen';
import { getToken, getStoredUser } from '../services/api';
import {
  loadJourneys,
  quoteJourney,
  purchaseQuote,
  Journey,
  Quote,
  Ticket,
} from '../services/ticketService';

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: () => true,
  },
}));
jest.mock('../services/api', () => ({
  getToken: jest.fn(),
  getStoredUser: jest.fn(),
}));
jest.mock('../services/ticketService', () => ({
  ...jest.requireActual('../services/ticketService'),
  loadJourneys: jest.fn(),
  quoteJourney: jest.fn(),
  purchaseQuote: jest.fn(),
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
}));

const journey: Journey = {
  id: 'journey-1',
  code: 'TEST',
  from: 'Origin',
  to: 'Destination',
  mode: 'Bus',
  durationMinutes: 60,
  validityMinutes: 120,
  ticketTypes: [{ code: 'standard', label: 'Standard', fareMinor: 12500 }],
};
const quote: Quote = {
  id: 'quote-1',
  journey,
  ticketType: 'standard',
  ticketTypeLabel: 'Standard',
  fareMinor: 12500,
  currency: 'LKR',
  validFrom: new Date().toISOString(),
  validUntil: new Date(Date.now() + 7200000).toISOString(),
  expiresAt: new Date(Date.now() + 300000).toISOString(),
};
const ticket: Ticket = {
  ...quote,
  id: 'ticket-1',
  reference: 'TL-TEST',
  passengerName: 'Passenger',
  status: 'Active',
  purchaseMode: 'demo',
  purchasedAt: new Date().toISOString(),
  usedAt: null,
};
let screen: ReactTestRenderer;
function button(label: string) {
  const control = screen.root
    .findAllByType(TouchableOpacity)
    .find((node) => node.props.accessibilityLabel === label);
  if (!control) throw new Error(`Missing button ${label}`);
  return control;
}
const content = () =>
  screen.root
    .findAllByType(Text)
    .map((node) => node.props.children)
    .join(' ');
async function press(label: string) {
  await act(async () => {
    button(label).props.onPress();
  });
}
async function renderJourney() {
  await act(async () => {
    screen = create(<TicketPurchaseScreen />);
  });
  // Select the journey card rather than a transport radio.
  act(() => {
    screen.root
      .findAllByType(TouchableOpacity)
      .find((n) =>
        n.findAllByType(Text).some((t) => t.props.children === 'TEST')
      )!
      .props.onPress();
  });
}
beforeEach(() => {
  jest.mocked(getToken).mockResolvedValue('existing-session');
  jest.mocked(getStoredUser).mockResolvedValue({ fullName: 'Passenger' });
  jest.mocked(loadJourneys).mockResolvedValue([journey]);
  jest.mocked(quoteJourney).mockResolvedValue(quote);
  jest.mocked(purchaseQuote).mockResolvedValue(ticket);
});
afterEach(() => {
  if (screen) act(() => screen.unmount());
});

test('requires login and never loads fares or creates a ticket without a session', async () => {
  jest.mocked(getToken).mockResolvedValue(null);
  await act(async () => {
    screen = create(<TicketPurchaseScreen />);
  });
  expect(content()).toContain('Sign in to continue');
  expect(loadJourneys).not.toHaveBeenCalled();
  expect(purchaseQuote).not.toHaveBeenCalled();
});

test('shows server fare for review and issues only after explicit confirmation', async () => {
  await renderJourney();
  await press('Review ticket');
  expect(quoteJourney).toHaveBeenCalledWith(journey.id, 'standard', 'now');
  expect(content()).toContain('LKR 125.00');
  expect(content()).toContain('No payment is collected');
  expect(purchaseQuote).not.toHaveBeenCalled();
  await press('Confirm demo purchase');
  expect(purchaseQuote).toHaveBeenCalledWith(quote.id);
  expect(router.replace).toHaveBeenCalledWith({
    pathname: '/ticketing/[id]',
    params: { id: ticket.id, purchased: '1' },
  });
});

test('duplicate presses and uncertain network retries keep the same purchase quote', async () => {
  await renderJourney();
  await press('Review ticket');
  let reject!: (error: Error) => void;
  jest.mocked(purchaseQuote).mockReturnValueOnce(
    new Promise((_, no) => {
      reject = no;
    })
  );
  const confirm = button('Confirm demo purchase').props.onPress;
  act(() => {
    confirm();
    confirm();
  });
  expect(purchaseQuote).toHaveBeenCalledTimes(1);
  await act(async () => {
    reject(new Error('offline'));
  });
  expect(content()).toContain('Retry safely');
  await press('Retry confirmation safely');
  expect(jest.mocked(purchaseQuote).mock.calls.map((call) => call[0])).toEqual([
    quote.id,
    quote.id,
  ]);
});

test('scheduled invalid date cannot request a quote', async () => {
  await renderJourney();
  await press('Choose date and time');
  act(() => {
    screen.root
      .findByType(JourneyDateTimePicker)
      .props.onChange({ date: '2026-02-30', time: '12:00' });
  });
  await press('Review ticket');
  expect(content()).toContain('Choose a valid date');
  expect(quoteJourney).not.toHaveBeenCalled();
});

test('an uncertain server failure sends the passenger to My Tickets instead of creating a new quote', async () => {
  await renderJourney();
  await press('Review ticket');
  jest
    .mocked(purchaseQuote)
    .mockRejectedValueOnce({ response: { status: 500 } });
  await press('Confirm demo purchase');
  expect(button('Edit journey').props.disabled).toBe(true);
  await press('Go back');
  expect(router.replace).toHaveBeenCalledWith('/(tabs)/tickets');
  expect(quoteJourney).toHaveBeenCalledTimes(1);
});

test('no late navigation when confirmation finishes after leaving the screen', async () => {
  await renderJourney();
  await press('Review ticket');
  let resolve!: (ticket: Ticket) => void;
  jest.mocked(purchaseQuote).mockReturnValueOnce(
    new Promise((yes) => {
      resolve = yes;
    })
  );
  act(() => {
    button('Confirm demo purchase').props.onPress();
  });
  act(() => screen.unmount());
  await act(async () => {
    resolve(ticket);
  });
  expect(router.replace).not.toHaveBeenCalled();
});
