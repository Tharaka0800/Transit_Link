import AsyncStorage from '@react-native-async-storage/async-storage';
import { getToken, loginTicketAccount, registerTicketAccount, getUserProfile, clearTicketAuth } from '../ticketApi';
import { loadJourneys, loadBusTrips, quoteJourney, purchaseQuote, loadTickets, loadTicket, verifyQR, redeemQR, releaseSeatHold } from '../ticketService';
import { TICKET_STORAGE_KEY } from '../LocalTicketStorage';
import * as localApi from '../api';

jest.mock('expo-crypto', () => ({
  randomUUID: () => require('crypto').randomUUID(),
  getRandomValues: (bytes: Uint8Array) => { require('crypto').randomFillSync(bytes); return bytes; },
}));
const passenger = () => loginTicketAccount('passenger.demo@transitlink.lk', 'password123');
const admin = () => loginTicketAccount('admin@transitlink.lk', 'admin123');
beforeEach(async () => { jest.restoreAllMocks(); await AsyncStorage.clear(); });
async function trainQuote(count = 1) {
  const journey = (await loadJourneys()).find(j => j.mode === 'Train')!;
  return quoteJourney(journey.id, journey.ticketTypes[0].code, 'now', count);
}
async function busQuote() {
  const journey = (await loadJourneys()).find(j => j.mode === 'Bus')!;
  const trip = (await loadBusTrips(journey.id))[0];
  return { journey, trip, quote: await quoteJourney(journey.id, 'standard', trip.departureAt, 2, { tripId: trip.id, seats: ['01A', '01B'] }) };
}

test('ticket login is local, hashes passwords, and preserves other app storage', async () => {
  await AsyncStorage.setItem('@transitlink_app_v1', 'local-data-sentinel');
  await AsyncStorage.setItem('@transit_incidents', 'officer-sentinel');
  await AsyncStorage.setItem('@transitlink_online_ticket_session', JSON.stringify({ role: 'admin', token: 'jwt' }));
  expect(await getToken()).toBeNull();
  await passenger();
  expect(await getToken()).toMatch(/^local-ticket:/);
  expect((await getUserProfile()).data.role).toBe('passenger');
  expect(await AsyncStorage.getItem('@transitlink_app_v1')).toBe('local-data-sentinel');
  expect(await AsyncStorage.getItem('@transit_incidents')).toBe('officer-sentinel');
  const db = JSON.parse((await AsyncStorage.getItem(TICKET_STORAGE_KEY))!);
  expect(db.accounts[0].passwordHash).toMatch(/^\$2/);
  expect(db.accounts[0]).not.toHaveProperty('password');
  expect((await getUserProfile()).data).not.toHaveProperty('passwordHash');
});

test('registration normalizes email, persists across sign-in, and never grants admin', async () => {
  const a = await registerTicketAccount(' New User ', ' USER@example.test ', '0771234567', 'SafePass123');
  expect(a).toMatchObject({ fullName: 'New User', email: 'user@example.test', role: 'passenger' });
  await clearTicketAuth();
  expect(await getToken()).toBeNull();
  expect((await loginTicketAccount('user@example.test', 'SafePass123'))._id).toBe(a._id);
  await expect(registerTicketAccount('Other', 'USER@example.test', '', 'SafePass123')).rejects.toThrow(/already exists/);
  await expect(loginTicketAccount('user@example.test', 'wrong')).rejects.toMatchObject({ response: { status: 401 } });
});

test('local app logout clears the ticket session without deleting tickets', async () => {
  await localApi.getAuthSession();
  await localApi.loginUser({ email: 'tharukee01@gmail.com', password: 'password123' });
  await passenger();
  const ticket = await purchaseQuote((await trainQuote()).id);
  await localApi.clearAuth();
  expect(await getToken()).toBeNull();
  expect(await localApi.getAuthSession()).toBeNull();
  await passenger();
  expect((await loadTicket(ticket.id)).id).toBe(ticket.id);
});

test('group purchases persist independent tickets and concurrent retries are idempotent', async () => {
  await passenger();
  const quote = await trainQuote(3);
  const results = await Promise.all([purchaseQuote(quote.id, 'card'), purchaseQuote(quote.id, 'mobile-wallet')]);
  expect(results[0].id).toBe(results[1].id);
  const tickets = await loadTickets();
  expect(tickets).toHaveLength(3);
  expect(new Set(tickets.map(t => t.reference)).size).toBe(3);
  expect(tickets.every(t => t.paymentMethod === 'card')).toBe(true);
  const detail = await loadTicket(tickets[0].id);
  expect(detail.qrPayload).toMatch(/^TL1:[a-f0-9]{64}$/);
  expect(tickets[0]).not.toHaveProperty('qrPayload');
  await clearTicketAuth(); await passenger();
  expect(await loadTickets()).toHaveLength(3);
});

test('ticket ownership and verification permissions are enforced locally', async () => {
  await passenger();
  const ticket = await purchaseQuote((await trainQuote()).id);
  await expect(verifyQR(ticket.qrPayload!)).rejects.toMatchObject({ response: { status: 403 } });
  await registerTicketAccount('Other User', 'other@example.test', '', 'SafePass123');
  expect(await loadTickets()).toEqual([]);
  await expect(loadTicket(ticket.id)).rejects.toMatchObject({ response: { status: 404 } });
  await admin();
  expect((await verifyQR(ticket.qrPayload!)).eligible).toBe(true);
});

test('QR preview does not consume and concurrent redemption accepts once', async () => {
  await passenger();
  const ticket = await purchaseQuote((await trainQuote()).id);
  await admin();
  expect((await verifyQR(ticket.qrPayload!)).ticket.status).toBe('Active');
  expect((await verifyQR(ticket.qrPayload!)).eligible).toBe(true);
  const results = await Promise.allSettled([redeemQR(ticket.qrPayload!), redeemQR(ticket.qrPayload!)]);
  expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
  expect((await verifyQR(ticket.qrPayload!)).ticket.status).toBe('Used');
  await expect(verifyQR('invalid')).rejects.toMatchObject({ response: { status: 400 } });
  await expect(verifyQR(`TL1:${'a'.repeat(64)}`)).rejects.toThrow(/on this device/);
});

test('bus holds block competing quotes, release frees seats, purchase books them', async () => {
  await passenger();
  const { journey, trip, quote } = await busQuote();
  expect((await loadBusTrips(journey.id))[0].seats[0].status).toBe('reserved');
  await expect(quoteJourney(journey.id, 'standard', trip.departureAt, 1, { tripId: trip.id, seats: ['01A'] })).rejects.toMatchObject({ response: { status: 409 } });
  await releaseSeatHold(quote.id);
  await expect(purchaseQuote(quote.id)).rejects.toMatchObject({ response: { status: 409 } });
  expect((await loadBusTrips(journey.id))[0].seats[0].status).toBe('available');
  const next = await quoteJourney(journey.id, 'standard', trip.departureAt, 1, { tripId: trip.id, seats: ['01A'] });
  await purchaseQuote(next.id);
  expect((await loadBusTrips(journey.id))[0].seats[0].status).toBe('occupied');
  await expect(releaseSeatHold(next.id)).rejects.toMatchObject({ response: { status: 409 } });
});

test('expired quotes cannot purchase and their bus holds expire', async () => {
  await passenger();
  const { journey, quote } = await busQuote();
  const db = JSON.parse((await AsyncStorage.getItem(TICKET_STORAGE_KEY))!);
  db.quotes[0].expiresAt = new Date(Date.now() - 1000).toISOString();
  await AsyncStorage.setItem(TICKET_STORAGE_KEY, JSON.stringify(db));
  await expect(purchaseQuote(quote.id)).rejects.toMatchObject({ response: { status: 409 } });
  expect((await loadBusTrips(journey.id))[0].seats[0].status).toBe('available');
});

test('future and expired tickets cannot be redeemed', async () => {
  await passenger();
  const journey = (await loadJourneys()).find(j => j.mode === 'Train')!;
  const quote = await quoteJourney(journey.id, 'standard', new Date(Date.now() + 600000).toISOString());
  const ticket = await purchaseQuote(quote.id);
  expect(ticket.status).toBe('Upcoming');
  await admin();
  expect((await verifyQR(ticket.qrPayload!)).eligible).toBe(false);
  await expect(redeemQR(ticket.qrPayload!)).rejects.toMatchObject({ response: { status: 409 } });
  const db = JSON.parse((await AsyncStorage.getItem(TICKET_STORAGE_KEY))!);
  db.tickets[0].validFrom = new Date(Date.now() - 120000).toISOString();
  db.tickets[0].validUntil = new Date(Date.now() - 60000).toISOString();
  await AsyncStorage.setItem(TICKET_STORAGE_KEY, JSON.stringify(db));
  expect((await verifyQR(ticket.qrPayload!)).ticket.status).toBe('Expired');
  await expect(redeemQR(ticket.qrPayload!)).rejects.toMatchObject({ response: { status: 409 } });
});

test('invalid passenger counts, dates, seat selections, and payment methods fail', async () => {
  await passenger();
  const journey = (await loadJourneys()).find(j => j.mode === 'Train')!;
  for (const count of [0, 11, 1.5]) await expect(quoteJourney(journey.id, 'standard', 'now', count)).rejects.toThrow(/passengers/);
  await expect(quoteJourney(journey.id, 'standard', 'invalid')).rejects.toThrow(/30 days/);
  await expect(quoteJourney(journey.id, 'missing', 'now')).rejects.toThrow(/ticket type/);
  const { journey: bus, trip } = await busQuote();
  await expect(quoteJourney(bus.id, 'standard', trip.departureAt, 2, { tripId: trip.id, seats: ['02A', '02A'] })).rejects.toThrow(/different/);
  await expect(purchaseQuote((await trainQuote()).id, 'unknown' as any)).rejects.toThrow(/payment method/);
});

test.each(['not-json', JSON.stringify({ version: 2 }), JSON.stringify({ version: 1, accounts: [], session: null, trips: [], quotes: [], tickets: [{}] })])('corrupt data is preserved instead of replaced: %s', async raw => {
  await AsyncStorage.setItem(TICKET_STORAGE_KEY, raw);
  await expect(getToken()).rejects.toThrow(/preserved/);
  expect(await AsyncStorage.getItem(TICKET_STORAGE_KEY)).toBe(raw);
});

test('failed purchase writes do not book seats or issue partial tickets; retry recovers', async () => {
  await passenger();
  const { journey, quote } = await busQuote();
  const before = await AsyncStorage.getItem(TICKET_STORAGE_KEY);
  jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('disk full'));
  await expect(purchaseQuote(quote.id)).rejects.toThrow(/save tickets/);
  expect(await AsyncStorage.getItem(TICKET_STORAGE_KEY)).toBe(before);
  expect(await loadTickets()).toEqual([]);
  await purchaseQuote(quote.id);
  expect(await loadTickets()).toHaveLength(2);
  expect((await loadBusTrips(journey.id))[0].seats[0].status).toBe('occupied');
});

test('read failures are surfaced without seeding over stored records', async () => {
  await passenger();
  const before = await AsyncStorage.getItem(TICKET_STORAGE_KEY);
  jest.mocked(AsyncStorage.getItem).mockRejectedValueOnce(new Error('read unavailable'));
  await expect(loadTickets()).rejects.toThrow(/read tickets/);
  expect(await AsyncStorage.getItem(TICKET_STORAGE_KEY)).toBe(before);
});

test('logout and account switching invalidate queued purchases', async () => {
  await passenger();
  const quote = await trainQuote();
  const purchase = purchaseQuote(quote.id);
  const logout = clearTicketAuth();
  await expect(purchase).rejects.toMatchObject({ response: { status: 401 } });
  await logout;
  await passenger();
  expect(await loadTickets()).toEqual([]);
  const queued = purchaseQuote(quote.id);
  const switchAccount = admin();
  await expect(queued).rejects.toMatchObject({ response: { status: 401 } });
  await switchAccount;
  expect((await getUserProfile()).data.role).toBe('admin');
});
