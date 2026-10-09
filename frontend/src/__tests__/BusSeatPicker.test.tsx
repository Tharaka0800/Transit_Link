import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import BusSeatPicker from '../components/ticketing/BusSeatPicker';
import { BusTrip, Journey, loadBusTrips } from '../services/ticketService';
import { formatTicketDate, formatTicketTime } from '../utils/ticketUtils';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: require('react-native').View }));
jest.mock('../services/ticketService', () => ({ ...jest.requireActual('../services/ticketService'), loadBusTrips: jest.fn() }));
const journey: Journey = { id: 'bus-1', code: 'BUS', mode: 'Bus', from: 'Colombo', to: 'Kandy', durationMinutes: 180, validityMinutes: 300, ticketTypes: [{code: 'standard', label: 'Standard', fareMinor: 20000}] };
const trip: BusTrip = { id: 'trip-1', busName: 'Bus 01', departureAt: '2026-10-12T02:30:00Z', availableSeats: 18,
  seats: Array.from({length: 5}, (_, row) => ['A', 'B', 'C', 'D'].map(column => ({label: `${String(row + 1).padStart(2, '0')}${column}`, status: 'available' as BusTrip['seats'][number]['status']}))).flat()
};
trip.seats[2].status = 'occupied';
trip.seats[3].status = 'reserved';
let screen: ReactTestRenderer;
const selected = jest.fn();
const close = jest.fn();
function control(label: string) {
  const result = screen.root.findAllByType(TouchableOpacity).find(node => node.props.accessibilityLabel === label);
  if (!result) throw new Error(`Missing ${label}`);
  return result;
}
const content = () => screen.root.findAllByType(Text).map(node => node.props.children).flat().join(' ').replace(/\s+/g, ' ');
const press = async (label: string) => { await act(async () => control(label).props.onPress()); };
beforeEach(() => { jest.useFakeTimers({ doNotFake: ['setImmediate', 'nextTick'] }); jest.mocked(loadBusTrips).mockResolvedValue([trip]); });
afterEach(() => { if (screen) act(() => screen.unmount()); jest.useRealTimers(); });
async function render() { await act(async () => { screen = create(<BusSeatPicker journey={journey} fareMinor={20000} value={null} onSelect={selected} onClose={close} />); }); }

test('available seats derive passenger total; occupied and held seats cannot be selected', async () => {
  await render();
  expect(control('Seat 01C, occupied').props.disabled).toBe(true);
  expect(control('Seat 01D, reserved').props.disabled).toBe(true);
  expect(control('Use selected seats').props.disabled).toBe(true);
  await press('Seat 01A, available');
  await press('Seat 01B, available');
  expect(content()).toContain('2 passengers');
  expect(content()).toContain('LKR 400.00');
  await press('Use selected seats');
  expect(selected).toHaveBeenCalledWith({trip, seats: ['01A', '01B']});
  await press('Seat 01A, selected');
  expect(content()).toContain('1 passenger');
});

test('changing bus departure clears seats and refresh removes newly unavailable selections', async () => {
  const next = {...trip, id: 'trip-2', departureAt: '2026-10-12T06:30:00Z'};
  jest.mocked(loadBusTrips).mockResolvedValue([trip, next]);
  await render();
  await press('Seat 01A, available');
  await press(`Departure ${formatTicketDate(next.departureAt)} ${formatTicketTime(next.departureAt)}`);
  expect(control('Use selected seats').props.disabled).toBe(true);
  await press('Seat 01A, available');
  jest.mocked(loadBusTrips).mockResolvedValue([trip, {...next, seats: next.seats.map(seat => seat.label === '01A' ? {...seat, status: 'occupied'} : seat)}]);
  await act(async () => { jest.advanceTimersByTime(15000); });
  expect(control('Use selected seats').props.disabled).toBe(true);
  expect(control('Seat 01A, occupied').props.disabled).toBe(true);
});

test('network failures show a retry and block submission until availability is restored', async () => {
  jest.mocked(loadBusTrips).mockRejectedValueOnce(new Error('offline'));
  await render();
  expect(content()).toContain('We could not reach TransitLink');
  await press('Refresh availability');
  expect(content()).toContain('18 of 20 seats available');
  await press('Close seat selection');
  expect(close).toHaveBeenCalled();
});
