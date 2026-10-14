import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { getAuthSession, getAdminState, validDatabase, notifyStorageRestored, recordAdminActivity, LocalDatabase } from './LocalAppStorage';
import { loadAdminTickets, validTicketDatabase } from './LocalTicketStorage';
import { getIncidents, validateIncident } from '../utils/OfficerStorage';
import { BACKUP_KEYS, runMaintenance, replaceStorage } from './StorageMaintenance';
import { defaultJourneys } from './adminTypes';

type Payload = Record<typeof BACKUP_KEYS[number], unknown>;
const checksum = (payload: Payload) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, JSON.stringify(payload));
async function requireAdmin() {
  const session = await getAuthSession();
  if (!session || session.user.role !== 'admin') throw new Error('Admin access is required.');
  return session;
}
function validatePayload(payload: any) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload) || Object.keys(payload).length !== BACKUP_KEYS.length
    || !BACKUP_KEYS.every(k => Object.prototype.hasOwnProperty.call(payload, k))) throw new Error('Backup contains invalid storage sections.');
  const app = payload[BACKUP_KEYS[0]];
  if (!validDatabase(app) || app.session !== null || !app.users.some(u => u.role === 'admin' && !u.disabled)
    || !app.users.some(u => u.role === 'officer' && !u.disabled)) throw new Error('Backup accounts are invalid or lack an active admin/Officer.');
  const ticket = payload[BACKUP_KEYS[1]];
  if (!validTicketDatabase(ticket) || ticket.session !== null) throw new Error('Backup tickets are invalid.');
  const incidents = payload[BACKUP_KEYS[2]];
  if (!Array.isArray(incidents) || !incidents.every(validateIncident) || new Set(incidents.map(i => i.id)).size !== incidents.length)
    throw new Error('Backup incidents are invalid.');
  const owners = new Set([...app.users.map(u => u._id), ...ticket.accounts.map(a => a._id)]);
  if (ticket.tickets.some(t => !owners.has(t.userId)) || ticket.quotes.some(q => !owners.has(q.userId)))
    throw new Error('Backup contains tickets without their account records.');
  const quoteIds = new Set(ticket.quotes.map(q => q.id));
  const tripIds = new Set(ticket.trips.map(t => t.id));
  if (new Set(ticket.tickets.map(t => t.id)).size !== ticket.tickets.length
    || new Set(ticket.tickets.map(t => t.qrPayload)).size !== ticket.tickets.length
    || new Set(ticket.quotes.map(q => q.id)).size !== ticket.quotes.length
    || new Set(ticket.trips.map(t => t.id)).size !== ticket.trips.length
    || ticket.tickets.some(t => !quoteIds.has(t.bookingId!) || (t.tripId && !tripIds.has(t.tripId)))
    || ticket.quotes.some(q => q.tripId && !tripIds.has(q.tripId))) throw new Error('Backup booking relationships are invalid.');
  const quoteMap = new Map(ticket.quotes.map(q => [q.id, q]));
  const bookedSeats = ticket.tickets.filter(t => t.tripId).map(t => `${t.tripId}:${t.seatLabel}`);
  if (new Set(ticket.tickets.map(t => t.reference)).size !== ticket.tickets.length || new Set(bookedSeats).size !== bookedSeats.length
    || ticket.tickets.some(t => { const q = quoteMap.get(t.bookingId!); return !q || q.userId !== t.userId || q.passengerCount !== t.passengerCount || q.fareMinor !== t.fareMinor || q.tripId !== t.tripId || (q.tripId && q.seats?.[t.passengerNumber! - 1] !== t.seatLabel); })
    || ticket.quotes.some(q => { const group = ticket.tickets.filter(t => t.bookingId === q.id); return group.length > 0 && (group.length !== q.passengerCount || new Set(group.map(t => t.passengerNumber)).size !== group.length); }))
    throw new Error('Backup contains inconsistent bookings or duplicate seat claims.');
  const ids = new Set(app.users.map(u => u._id));
  if (app.administration?.reports.some(r => !ids.has(r.userId))) throw new Error('Backup support report ownership is invalid.');
}
function fromEntries(entries: ReadonlyArray<readonly [string, string | null]>): Payload {
  return Object.fromEntries(entries.map(([key, value]) => [key, value === null ? null : JSON.parse(value)])) as Payload;
}
function checkSnapshot(payload: Payload, token: string) {
  const app = payload[BACKUP_KEYS[0]] as LocalDatabase;
  if (!validDatabase(app) || app.session?.token !== token || !app.users.some(u => u._id === app.session?.userId && u.role === 'admin' && !u.disabled))
    throw new Error('Your admin session changed. Please try again.');
}
export async function exportAdminBackup(): Promise<string> {
  const session = await requireAdmin();
  // Initialize absent stores using their normal validators before the snapshot.
  await Promise.all([getAdminState(), loadAdminTickets(), getIncidents()]);
  await recordAdminActivity('Backup requested', 'All local app records');
  return runMaintenance(async () => {
    const payload = fromEntries(await AsyncStorage.multiGet([...BACKUP_KEYS]));
    checkSnapshot(payload, session.token);
    (payload[BACKUP_KEYS[0]] as LocalDatabase).session = null;
    (payload[BACKUP_KEYS[1]] as any).session = null;
    validatePayload(payload);
    return JSON.stringify({ format: 'TransitLink backup', version: 1, createdAt: new Date().toISOString(), payload, checksum: await checksum(payload) }, null, 2);
  });
}
export async function inspectAdminBackup(text: string) {
  await requireAdmin();
  if (text.length > 25 * 1024 * 1024) throw new Error('Backup is too large (maximum 25 MB).');
  let backup: any;
  try { backup = JSON.parse(text); } catch { throw new Error('Paste a complete JSON backup.'); }
  if (backup?.format !== 'TransitLink backup' || backup.version !== 1 || typeof backup.createdAt !== 'string' || !Number.isFinite(Date.parse(backup.createdAt))) throw new Error('Unsupported backup format.');
  validatePayload(backup.payload);
  if (backup.checksum !== await checksum(backup.payload)) throw new Error('Backup checksum does not match. The file may be incomplete or changed.');
  const app = backup.payload[BACKUP_KEYS[0]] as LocalDatabase;
  return { createdAt: backup.createdAt as string, users: app.users.length, tickets: backup.payload[BACKUP_KEYS[1]].tickets.length as number,
    incidents: backup.payload[BACKUP_KEYS[2]].length as number, routes: (app.administration?.journeys ?? defaultJourneys).length,
    reports: app.administration?.reports.length ?? 0 };
}
export async function restoreAdminBackup(text: string) {
  const session = await requireAdmin();
  await inspectAdminBackup(text);
  const backup = JSON.parse(text);
  await runMaintenance(async () => {
    const current = fromEntries(await AsyncStorage.multiGet([...BACKUP_KEYS]));
    checkSnapshot(current, session.token);
    const app = backup.payload[BACKUP_KEYS[0]] as LocalDatabase;
    app.administration ??= { journeys: JSON.parse(JSON.stringify(defaultJourneys)), reports: [], activities: [] };
    app.administration.activities.push({ id: Crypto.randomUUID(), actorId: session.user._id, actorName: session.user.fullName,
      action: 'Backup restored', target: backup.createdAt, at: new Date().toISOString() });
    await replaceStorage(BACKUP_KEYS.map(key => [key, JSON.stringify(backup.payload[key])]));
  });
  notifyStorageRestored();
}
