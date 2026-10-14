import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import bcrypt from 'bcryptjs/index.js';
import * as mainAccount from './LocalAppStorage';
import catalogue from '../data/ticketJourneys.json';
import type { TicketAccount } from './ticketApi';
import type { Journey, Quote, Ticket, BusTrip } from './ticketService';

export const TICKET_STORAGE_KEY = '@transitlink_tickets_v1';
type Account = Omit<TicketAccount, 'token'> & { passwordHash: string };
type StoredQuote = Quote & { userId: string; released?: boolean };
type StoredTicket = Ticket & { userId: string };
type Trip = { id: string; journeyId: string; busName: string; departureAt: string };
interface Database {
  version: 1; accounts: Account[]; session: { userId: string; token: string } | null;
  quotes: StoredQuote[]; tickets: StoredTicket[]; trips: Trip[];
}
const journeys: Journey[] = catalogue.map(j => ({ ...j, id: j.code, mode: j.mode as Journey['mode'],
  ticketTypes: j.ticketTypes.map(t => ({ ...t, label: 'Standard - Single journey' })) }));
const labels = Array.from({ length: 5 }, (_, r) => ['A', 'B', 'C', 'D'].map(c => `${String(r + 1).padStart(2, '0')}${c}`)).flat();
let pending: Promise<unknown> = Promise.resolve();
let authGeneration = 0;
function serial<T>(operation: () => Promise<T>): Promise<T> {
  const result = pending.then(operation);
  pending = result.catch(() => undefined);
  return result;
}
class TicketStorageError extends Error {
  response: { status: number; data: { message: string } };
  constructor(message: string, status = 400) { super(message); this.response = { status, data: { message } }; }
}
function fail(message: string, status = 400): never { throw new TicketStorageError(message, status); }
const id = () => Crypto.randomUUID();
bcrypt.setRandomFallback(length => Array.from(Crypto.getRandomValues(new Uint8Array(length))));
mainAccount.subscribeAuth(() => { authGeneration += 1; });
const date = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value));
const object = (value: any) => value && typeof value === 'object' && !Array.isArray(value);
const string = (value: unknown) => typeof value === 'string' && value.length > 0;
function valid(db: any): db is Database {
  return object(db) && db.version === 1 && Array.isArray(db.accounts) && Array.isArray(db.quotes)
    && Array.isArray(db.tickets) && Array.isArray(db.trips)
    && db.accounts.every((a: any) => object(a) && string(a._id) && string(a.fullName) && string(a.email)
      && ['passenger', 'admin'].includes(a.role) && /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(a.passwordHash))
    && (db.session === null || (object(db.session) && string(db.session.token) && db.session.token.startsWith('local-ticket:')
      && db.accounts.some((a: Account) => a._id === db.session.userId)))
    && db.trips.every((t: any) => object(t) && string(t.id) && string(t.journeyId) && string(t.busName) && date(t.departureAt))
    && db.quotes.every((q: any) => object(q) && string(q.id) && string(q.userId) && object(q.journey)
      && date(q.validFrom) && date(q.validUntil) && date(q.expiresAt) && Number.isSafeInteger(q.fareMinor)
      && Number.isInteger(q.passengerCount) && q.passengerCount >= 1 && q.passengerCount <= 10
      && (!q.tripId || (Array.isArray(q.seats) && q.seats.length === q.passengerCount && q.seats.every((s: string) => labels.includes(s)))))
    && db.tickets.every((t: any) => object(t) && string(t.id) && string(t.userId) && string(t.reference)
      && object(t.journey) && date(t.validFrom) && date(t.validUntil) && date(t.purchasedAt)
      && ['Active', 'Upcoming', 'Expired', 'Used'].includes(t.status) && /^TL1:[a-f0-9]{64}$/.test(t.qrPayload));
}
async function read(): Promise<Database> {
  let raw: string | null;
  try { raw = await AsyncStorage.getItem(TICKET_STORAGE_KEY); }
  catch { return fail('Could not read tickets on this device. Try again.', 500); }
  if (raw !== null) {
    let db;
    try { db = JSON.parse(raw); } catch { return fail('Saved ticket data is invalid and has been preserved.', 500); }
    if (!valid(db)) return fail('Saved ticket data is invalid and has been preserved.', 500);
    return db;
  }
  const db: Database = { version: 1, accounts: [], session: null, quotes: [], tickets: [], trips: [] };
  await save(db);
  return db;
}
async function save(db: Database) {
  try { await AsyncStorage.setItem(TICKET_STORAGE_KEY, JSON.stringify(db)); }
  catch { fail('Could not save tickets on this device. Check available storage and try again.', 500); }
}
export async function readTicketAccount(): Promise<TicketAccount | null> {
  const session = await mainAccount.getAuthSession();
  return session ? { ...session.user, token: session.token } : null;
}

// Keep v1 ticket records and credentials until the owner proves the old password.
// Matching email addresses alone never grant ownership of legacy tickets.
async function linkLegacyTickets(user: TicketAccount, password: string) {
  return serial(async () => {
    if (await AsyncStorage.getItem(TICKET_STORAGE_KEY) === null) return;
    const db = await read();
    const legacy = db.accounts.find(a => a.email === user.email);
    if (!legacy || bcrypt.truncates(password) || !(await bcrypt.compare(password, legacy.passwordHash))) return;
    if ((await mainAccount.getAuthSession())?.token !== user.token) fail('Your session changed. Please sign in again.', 401);
    for (const ticket of db.tickets) if (ticket.userId === legacy._id) ticket.userId = user._id;
    for (const quote of db.quotes) if (quote.userId === legacy._id) quote.userId = user._id;
    db.accounts = db.accounts.filter(a => a._id !== legacy._id);
    db.session = null;
    await save(db);
  });
}

export async function loginUnifiedAccount(input: mainAccount.LoginInput): Promise<TicketAccount> {
  const generation = ++authGeneration;
  let user: TicketAccount;
  try { user = await mainAccount.loginUser(input); }
  catch (error) {
    // A ticket-only passenger can upgrade using their existing credentials.
    if ((error as mainAccount.LocalAppError).response?.status !== 401) throw error;
    const legacy = await serial(async () => {
      if (await AsyncStorage.getItem(TICKET_STORAGE_KEY) === null) return null;
      const db = await read();
      const identifier = (input.email || input.phone || '').trim().toLowerCase();
      const a = db.accounts.find(a => a.email === identifier);
      return a && !bcrypt.truncates(input.password) && await bcrypt.compare(input.password, a.passwordHash) ? a : null;
    });
    if (generation !== authGeneration) fail('Your session changed. Please sign in again.', 401);
    if (!legacy || legacy.role !== 'passenger') throw error;
    // Duplicate main accounts reject this import, rather than overriding passwords.
    user = await mainAccount.registerUser({ fullName: legacy.fullName, email: legacy.email, phone: legacy.phone, password: input.password });
  }
  await linkLegacyTickets(user, input.password);
  return user;
}
export async function registerUnifiedAccount(input: mainAccount.RegistrationInput): Promise<TicketAccount> {
  authGeneration += 1;
  const user = await mainAccount.registerUser(input);
  await linkLegacyTickets(user, input.password);
  return user;
}
export function clearLocalTicketSession() {
  authGeneration += 1;
  const clearMain = mainAccount.clearAuth();
  const clearLegacy = serial(async () => {
    const raw = await AsyncStorage.getItem(TICKET_STORAGE_KEY);
    if (raw !== null) { const db = await read(); db.session = null; await save(db); }
    await AsyncStorage.removeItem('@transitlink_online_ticket_session');
  });
  return Promise.all([clearMain, clearLegacy]).then(() => undefined);
}

export function deleteAccountTickets<T>(userId: string, deleteMain: () => Promise<T>): Promise<T> {
  authGeneration += 1;
  return serial(async () => {
    if ((await mainAccount.getUserProfile())._id !== userId) fail('Your session changed. Please try again.', 401);
    if (await AsyncStorage.getItem(TICKET_STORAGE_KEY) === null) return deleteMain();
    const db = await read();
    const original: Database = JSON.parse(JSON.stringify(db));
    db.tickets = db.tickets.filter(t => t.userId !== userId);
    db.quotes = db.quotes.filter(q => q.userId !== userId);
    await save(db);
    try {
      if ((await mainAccount.getUserProfile())._id !== userId) fail('Your session changed. Please try again.', 401);
      return await deleteMain();
    } catch (error) {
      // A rejected main-account deletion must not silently lose its ticket history.
      await save(original);
      throw error;
    }
  });
}
function status(t: Ticket): Ticket['status'] {
  if (t.status === 'Used') return 'Used';
  if (Date.parse(t.validUntil) <= Date.now()) return 'Expired';
  return Date.parse(t.validFrom) > Date.now() ? 'Upcoming' : 'Active';
}
function view(t: StoredTicket, qr = false): Ticket {
  const { userId, qrPayload, ...result } = t;
  return { ...result, status: status(t), ...(qr ? { qrPayload } : {}) };
}
function tripView(db: Database, trip: Trip): BusTrip {
  const seats = labels.map(label => {
    const occupied = db.tickets.some(t => t.tripId === trip.id && t.seatLabel === label);
    const reserved = db.quotes.some(q => q.tripId === trip.id && !q.released && Date.parse(q.expiresAt) > Date.now() && q.seats?.includes(label));
    return { label, status: (occupied ? 'occupied' : reserved ? 'reserved' : 'available') as BusTrip['seats'][number]['status'] };
  });
  return { id: trip.id, busName: trip.busName, departureAt: trip.departureAt, seats, availableSeats: seats.filter(s => s.status === 'available').length };
}
export function localTicketRequest(method: string, path: string, input: unknown = {}): Promise<any> {
  const identity = mainAccount.getAuthSession();
  const generation = authGeneration;
  return serial(async () => {
    if (generation !== authGeneration) fail('Your session changed. Please sign in again.', 401);
    const session = await identity;
    if (!session) fail('Sign in to your app account to continue.', 401);
    const user = { ...session.user, token: session.token };
    const assertSession = async () => {
      if (generation !== authGeneration || (await mainAccount.getAuthSession())?.token !== user.token)
        fail('Your session changed. Please sign in again.', 401);
    };
    await assertSession();
    const db = await read();
    await assertSession();
    const body: any = object(input) ? input : {};
    const commit = async () => { await assertSession(); await save(db); await assertSession(); };
    if (method === 'GET' && path === '/users/profile') return user;
    if (method === 'GET' && path === '/tickets/journeys') return { journeys };
    const tripsMatch = path.match(/^\/tickets\/journeys\/([^/]+)\/trips$/);
    if (method === 'GET' && tripsMatch) {
      const journey = journeys.find(j => j.id === decodeURIComponent(tripsMatch[1]) && j.mode === 'Bus');
      if (!journey) fail('Bus journey not found.', 404);
      const now = Date.now();
      const local = new Date(now + 330 * 60000);
      const midnight = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - 330 * 60000;
      const departures = Array.from({ length: 7 }, (_, day) => [8, 12, 16, 20].map(h => midnight + day * 86400000 + h * 3600000)).flat().filter(d => d > now);
      for (const departure of departures) {
        const departureAt = new Date(departure).toISOString();
        if (!db.trips.some(t => t.journeyId === journey.id && t.departureAt === departureAt))
          db.trips.push({ id: id(), journeyId: journey.id, busName: `${journey.code} - Bus 01`, departureAt });
      }
      await commit();
      return { trips: db.trips.filter(t => t.journeyId === journey.id && departures.includes(Date.parse(t.departureAt))).sort((a, b) => a.departureAt.localeCompare(b.departureAt)).map(t => tripView(db, t)) };
    }
    if (method === 'POST' && path === '/tickets/quotes') {
      const journey = journeys.find(j => j.id === body.journeyId);
      if (!journey) fail('Choose an available journey.', 404);
      const type = journey.ticketTypes.find(t => t.code === body.ticketType);
      if (!type) fail('Choose an available ticket type.');
      const trip = body.tripId ? db.trips.find(t => t.id === body.tripId && t.journeyId === journey.id) : undefined;
      let count = body.passengerCount ?? 1;
      if (journey.mode === 'Bus') {
        if (!trip || Date.parse(trip.departureAt) <= Date.now()) fail('Choose an available bus departure.');
        if (!Array.isArray(body.seats) || !body.seats.length || body.seats.length > 10 || new Set(body.seats).size !== body.seats.length || body.seats.some((s: string) => !labels.includes(s))) fail('Choose 1 to 10 different available seats.');
        count = body.seats.length;
        const available = tripView(db, trip).seats;
        if (body.seats.some((s: string) => available.find(seat => seat.label === s)?.status !== 'available')) fail('Some seats are unavailable. Choose your seats again.', 409);
      } else if (body.tripId || body.seats !== undefined) fail('Seat selection is available for buses only.');
      if (!Number.isInteger(count) || count < 1 || count > 10) fail('Choose between 1 and 10 passengers.');
      const now = Date.now();
      const travelNow = !trip && body.departureAt === 'now';
      const start = trip ? Date.parse(trip.departureAt) : travelNow ? now : typeof body.departureAt === 'string' ? Date.parse(body.departureAt) : NaN;
      if (!Number.isFinite(start) || start < now || start > now + 30 * 86400000) fail('Choose a journey time in the next 30 days.');
      const quote: StoredQuote = { id: id(), userId: user._id,
        journey: { code: journey.code, mode: journey.mode, from: journey.from, to: journey.to, durationMinutes: journey.durationMinutes },
        ticketType: type.code, ticketTypeLabel: type.label, fareMinor: type.fareMinor, passengerCount: count, totalFareMinor: type.fareMinor * count, currency: 'LKR',
        validFrom: new Date(start).toISOString(), validUntil: new Date(start + journey.validityMinutes * 60000).toISOString(),
        expiresAt: new Date(Math.min(now + 5 * 60000, travelNow ? start + journey.validityMinutes * 60000 : start)).toISOString(),
        ...(trip ? { tripId: trip.id, busName: trip.busName, seats: body.seats } : {}) };
      db.quotes.push(quote); await commit();
      const { userId, ...publicQuote } = quote;
      return { quote: publicQuote };
    }
    const release = path.match(/^\/tickets\/quotes\/([^/]+)\/release$/);
    if (method === 'POST' && release) {
      const quote = db.quotes.find(q => q.id === decodeURIComponent(release[1]) && q.userId === user._id);
      if (!quote) fail('Fare quote not found.', 404);
      if (db.tickets.some(t => t.bookingId === quote.id)) fail('This purchase is complete. Check My Tickets.', 409);
      quote.released = true; quote.expiresAt = new Date().toISOString(); await commit();
      return { message: 'Seat hold released.' };
    }
    if (method === 'POST' && path === '/tickets/purchase') {
      const paymentMethod = body.paymentMethod ?? 'transit-balance';
      if (!['transit-balance', 'card', 'mobile-wallet'].includes(paymentMethod)) fail('Choose an available payment method.');
      const quote = db.quotes.find(q => q.id === body.quoteId && q.userId === user._id);
      if (!quote) fail('Fare quote not found. Review your journey again.', 404);
      let tickets = db.tickets.filter(t => t.bookingId === quote.id);
      if (!tickets.length) {
        if (quote.released || Date.parse(quote.expiresAt) <= Date.now()) fail('Your fare quote expired. Review your journey again.', 409);
        if (quote.tripId && db.tickets.some(t => t.tripId === quote.tripId && quote.seats?.includes(t.seatLabel!))) fail('Your seats are no longer available.', 409);
        const { userId, expiresAt, released, seats, ...details } = quote;
        tickets = Array.from({ length: quote.passengerCount! }, (_, i) => {
          const token = Array.from(Crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
          return { ...details, id: id(), userId, bookingId: quote.id, reference: `TL-${id().replace(/-/g, '').toUpperCase()}`,
            passengerName: user.fullName, passengerNumber: i + 1, seatLabel: seats?.[i], paymentMethod,
            purchaseMode: 'demo', status: 'Active', purchasedAt: new Date().toISOString(), usedAt: null, qrPayload: `TL1:${token}` } as StoredTicket;
        });
        db.tickets.push(...tickets); await commit();
      }
      return { ticket: view(tickets[0], true), tickets: tickets.map(t => view(t, true)), bookingId: quote.id, passengerCount: quote.passengerCount, totalFareMinor: quote.totalFareMinor };
    }
    if (method === 'GET' && path === '/tickets') return { tickets: db.tickets.filter(t => t.userId === user._id).sort((a, b) => b.purchasedAt.localeCompare(a.purchasedAt)).map(t => view(t)) };
    if (method === 'POST' && ['/tickets/verify', '/tickets/redeem'].includes(path)) {
      if (user.role !== 'admin') fail('Ticket verification requires the admin app account.', 403);
      const payload = typeof body.payload === 'string' ? body.payload.trim() : '';
      if (!/^TL1:[a-f0-9]{64}$/.test(payload)) fail('This is not a TransitLink ticket QR.');
      const ticket = db.tickets.find(t => t.qrPayload === payload);
      if (!ticket) fail('Ticket not found on this device. Only tickets created on this installation can be verified.', 404);
      if (path === '/tickets/verify') return { ticket: view(ticket), eligible: status(ticket) === 'Active' };
      if (status(ticket) !== 'Active') fail(`Ticket is ${status(ticket).toLowerCase()} and cannot be used.`, 409);
      ticket.status = 'Used'; ticket.usedAt = new Date().toISOString(); await commit();
      return { ticket: view(ticket), message: 'Ticket validated and marked used.' };
    }
    const detail = path.match(/^\/tickets\/([^/]+)$/);
    if (method === 'GET' && detail) {
      const ticket = db.tickets.find(t => t.id === decodeURIComponent(detail[1]) && t.userId === user._id);
      if (!ticket) fail('Ticket not found.', 404);
      return { ticket: view(ticket, true) };
    }
    return fail('Unsupported local ticket operation.', 404);
  });
}
