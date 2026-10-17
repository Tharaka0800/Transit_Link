import React from 'react';
import { act, create } from 'react-test-renderer';
import QRCode from 'react-native-qrcode-svg';
import TicketQRCode from '../components/ticketing/TicketQRCode';
import {
  currentTicketStatus,
  formatFare,
  parseDeparture,
} from '../utils/ticketUtils';

jest.mock('react-native-qrcode-svg', () => jest.fn(() => null));

test('QR component passes only the opaque ticket payload with a scan margin and high contrast', () => {
  const payload = `TL1:${'a'.repeat(64)}`;
  let screen: ReturnType<typeof create>;
  act(() => {
    screen = create(<TicketQRCode payload={payload} />);
  });
  const props = screen!.root.findByType(QRCode).props;
  expect(props.value).toBe(payload);
  expect(props.quietZone).toBeGreaterThan(0);
  expect(props.color).toBe('#111827');
  expect(props.backgroundColor).toBe('#FFFFFF');
  act(() => screen!.unmount());
});

test('real QR encoder produces a matrix for a ticket payload', () => {
  const encoder = require('qrcode');
  const result = encoder.create(`TL1:${'f'.repeat(64)}`, {
    errorCorrectionLevel: 'M',
  });
  expect(result.modules.size).toBeGreaterThan(20);
  expect(result.modules.data.some((bit: number) => bit === 1)).toBe(true);
});

test('ticket status changes at validity boundaries and keeps consumed tickets used', () => {
  const ticket = {
    status: 'Active' as const,
    validFrom: '2026-10-07T10:00:00Z',
    validUntil: '2026-10-07T11:00:00Z',
  };
  expect(currentTicketStatus(ticket, Date.parse(ticket.validFrom) - 1)).toBe(
    'Upcoming'
  );
  expect(currentTicketStatus(ticket, Date.parse(ticket.validFrom))).toBe(
    'Active'
  );
  expect(currentTicketStatus(ticket, Date.parse(ticket.validUntil))).toBe(
    'Expired'
  );
  expect(
    currentTicketStatus(
      { ...ticket, status: 'Used' },
      Date.parse(ticket.validUntil)
    )
  ).toBe('Used');
  expect(parseDeparture('2026-02-30', '10:00')).toBeNull();
  expect(parseDeparture('2026-10-07', '24:10')).toBeNull();
  expect(parseDeparture('2026-10-07', '10:30')).not.toBeNull();
  expect(formatFare(12345)).toBe('LKR 123.45');
});
