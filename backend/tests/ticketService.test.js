import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  newTicketToken,
  newTicketReference,
  parseTicketPayload,
  ticketStatus,
  validateJourneyImport,
} from '../services/ticketService.js';

test('secure references and opaque QR payloads are unique and strictly parsed', () => {
  const tokens = Array.from({ length: 100 }, newTicketToken);
  assert.equal(new Set(tokens).size, 100);
  assert.equal(
    new Set(Array.from({ length: 100 }, newTicketReference)).size,
    100
  );
  assert.equal(parseTicketPayload(` TL1:${tokens[0]} `), tokens[0]);
  for (const payload of [
    null,
    {},
    'TL1:abc',
    `https://example.com/TL1:${tokens[0]}`,
    JSON.stringify({ user: 'someone' }),
  ])
    assert.equal(parseTicketPayload(payload), null);
});
test('validity boundaries and used status are deterministic', () => {
  const now = new Date('2026-10-07T10:00:00Z');
  const ticket = {
    status: 'Active',
    validFrom: now,
    validUntil: new Date(now.getTime() + 60000),
  };
  assert.equal(ticketStatus(ticket, now), 'Active');
  assert.equal(ticketStatus(ticket, ticket.validUntil), 'Expired');
  assert.equal(
    ticketStatus({ ...ticket, validFrom: new Date(now.getTime() + 1) }, now),
    'Upcoming'
  );
  assert.equal(
    ticketStatus({ ...ticket, status: 'Used' }, ticket.validUntil),
    'Used'
  );
});
test('catalogue import rejects ambiguous or invalid fare data before writes', () => {
  const journey = {
    code: 'TEST',
    from: 'A',
    to: 'B',
    mode: 'Bus',
    durationMinutes: 10,
    validityMinutes: 60,
    ticketTypes: [{ code: 'standard', label: 'Standard', fareMinor: 100 }],
  };
  assert.equal(
    validateJourneyImport([journey])[0].ticketTypes[0].fareMinor,
    100
  );
  for (const data of [
    [],
    [journey, journey],
    [{ ...journey, durationMinutes: -1 }],
    [{ ...journey, ticketTypes: [{ code: 'x', label: 'X', fareMinor: 1.5 }] }],
    [{ ...journey, from: 'B' }],
  ])
    assert.throws(() => validateJourneyImport(data));
});
