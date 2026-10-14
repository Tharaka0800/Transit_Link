import AsyncStorage from '@react-native-async-storage/async-storage';
import * as main from '../LocalAppStorage';
import { loadAdminTickets } from '../LocalTicketStorage';
import { loadJourneys, quoteJourney, purchaseQuote, loadTickets, redeemQR, verifyQR } from '../ticketService';
import { exportAdminBackup, inspectAdminBackup, restoreAdminBackup } from '../AdminBackup';
import { BACKUP_KEYS, runMaintenance, recoverStorage } from '../StorageMaintenance';
import { addIncident, getIncidents } from '../../utils/OfficerStorage';

jest.mock('expo-crypto', () => ({
  randomUUID: () => require('crypto').randomUUID(),
  getRandomValues: (bytes: Uint8Array) => { require('crypto').randomFillSync(bytes); return bytes; },
  CryptoDigestAlgorithm: { SHA256: 'SHA256' },
  digestStringAsync: async (_algorithm: string, value: string) => require('crypto').createHash('sha256').update(value).digest('hex'),
}));
const admin = () => main.loginUser({ email: 'admin@transitlink.lk', password: 'admin123' });
const passenger = () => main.loginUser({ email: 'passenger.demo@transitlink.lk', password: 'password123' });
beforeEach(async () => { await AsyncStorage.clear(); });
async function ticket() {
  const journey = (await loadJourneys()).find(j => j.mode === 'Train')!;
  return purchaseQuote((await quoteJourney(journey.id, 'standard', 'now')).id);
}

test.each(['passenger', 'officer'])('rejects %s admin reads and mutations at the service boundary', async role => {
  if (role === 'officer') await main.loginUser({ email: 'officer@transitlink.lk', password: 'OfficerDemo@2026' }); else await passenger();
  await expect(main.getAdminState()).rejects.toMatchObject({ response: { status: 403 } });
  await expect(loadAdminTickets()).rejects.toMatchObject({ response: { status: 403 } });
  await expect(main.updateManagedUser('demo-primary', { disabled: true })).rejects.toMatchObject({ response: { status: 403 } });
  await expect(exportAdminBackup()).rejects.toThrow(/Admin access/);
  await expect(restoreAdminBackup('{}')).rejects.toThrow(/Admin access/);
});
test('admin data lists local accounts without hashes/tokens and tickets without QR credentials', async () => {
  await passenger(); const issued = await ticket(); await admin();
  const state = await main.getAdminState();
  expect(state.users).toHaveLength(4);
  expect(state.users.every(u => !('passwordHash' in u) && !('token' in u))).toBe(true);
  expect((await loadAdminTickets())[0]).toMatchObject({ id: issued.id, passengerName: issued.passengerName, ownerId: 'demo-secondary' });
  expect((await loadAdminTickets())[0]).not.toHaveProperty('qrPayload');
});
test('cannot demote/disable/delete the last active admin or modify the protected Officer', async () => {
  await admin();
  await expect(main.updateManagedUser('demo-admin', { role: 'passenger' })).rejects.toThrow(/last active admin/);
  await expect(main.updateManagedUser('demo-admin', { disabled: true })).rejects.toThrow(/last active admin/);
  await expect(main.deleteUserProfile()).rejects.toThrow(/last active admin/);
  await expect(main.updateManagedUser('demo-officer', { disabled: true })).rejects.toThrow(/protected/);
});
test('admin can promote/disable/enable other users and disabled users cannot authenticate', async () => {
  await admin();
  await main.updateManagedUser('demo-primary', { role: 'admin' });
  await main.updateManagedUser('demo-primary', { disabled: true });
  await expect(main.loginUser({ email: 'tharukee01@gmail.com', password: 'password123' })).rejects.toMatchObject({ response: { status: 401 } });
  await main.updateManagedUser('demo-primary', { disabled: false });
  expect((await main.getAdminState()).activities).toHaveLength(3);
  expect((await main.loginUser({ email: 'tharukee01@gmail.com', password: 'password123' })).role).toBe('admin');
});
test('failed user writes do not grant new roles or append activity', async () => {
  await admin();
  const original = await AsyncStorage.getItem(main.STORAGE_KEY);
  jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('Full'));
  await expect(main.updateManagedUser('demo-primary', { role: 'admin' })).rejects.toThrow(/save data/);
  expect(await AsyncStorage.getItem(main.STORAGE_KEY)).toBe(original);
  expect((await main.getAdminState()).users.find(u => u._id === 'demo-primary')?.role).toBe('passenger');
});
test('reports persist separately, admin replies notify the owner, and other passengers cannot read them', async () => {
  await passenger(); const report = await main.createSupportReport('Bus delay', 'Please check the departure.');
  expect((await main.getMySupportReports())[0].id).toBe(report.id);
  await admin(); expect((await main.getAdminState()).reports).toHaveLength(1);
  await main.respondToReport(report.id, 'Resolved', 'The departure has been reviewed.');
  await passenger();
  expect((await main.getMySupportReports())[0]).toMatchObject({ status: 'Resolved', response: 'The departure has been reviewed.' });
  expect((await main.getNotifications()).notifications.some(n => n.message === 'The departure has been reviewed.')).toBe(true);
  await main.loginUser({ email: 'tharukee01@gmail.com', password: 'password123' });
  expect(await main.getMySupportReports()).toEqual([]);
});
test('route/fare updates feed the public catalogue and ticket quotes while preserving issued tickets', async () => {
  await admin(); const route = (await main.loadCatalogue()).find(j => j.mode === 'Train')!;
  await main.saveManagedJourney({ ...route, ticketTypes: [{ ...route.ticketTypes[0], fareMinor: 98765 }] });
  await passenger();
  expect((await loadJourneys()).find(j => j.id === route.id)?.ticketTypes[0].fareMinor).toBe(98765);
  const q = await quoteJourney(route.id, 'standard', 'now'); expect(q.fareMinor).toBe(98765);
  const issued = await purchaseQuote(q.id);
  await admin(); await main.saveManagedJourney({ ...route, active: false });
  await passenger();
  expect((await loadJourneys()).some(j => j.id === route.id)).toBe(false);
  expect((await loadTickets())[0]).toMatchObject({ id: issued.id, fareMinor: 98765 });
  await expect(quoteJourney(route.id, 'standard', 'now')).rejects.toThrow(/available journey/);
});
test('withdrawing a journey invalidates unpurchased quotes and invalid fares cannot be saved', async () => {
  await passenger(); const route = (await main.loadCatalogue()).find(j => j.mode === 'Train')!;
  const quote = await quoteJourney(route.id, 'standard', 'now');
  await admin();
  await expect(main.saveManagedJourney({ ...route, ticketTypes: [{ ...route.ticketTypes[0], fareMinor: -1 }] })).rejects.toThrow(/valid route/);
  await main.saveManagedJourney({ ...route, active: false });
  await passenger(); await expect(purchaseQuote(quote.id)).rejects.toMatchObject({ response: { status: 409 } });
});
test('verification records the admin identity and timestamp with consumption', async () => {
  await passenger(); const issued = await ticket(); await admin();
  await redeemQR(issued.qrPayload!);
  expect((await loadAdminTickets())[0]).toMatchObject({ status: 'Used', verifiedBy: 'demo-admin', verifierName: 'TransitLink Admin', usedAt: expect.any(String) });
  expect((await verifyQR(issued.qrPayload!)).eligible).toBe(false);
});
test('backup round trip restores accounts, tickets, reports, catalogue and incidents, excluding sessions', async () => {
  await passenger(); const issued = await ticket(); await main.createSupportReport('Original report', 'Original message');
  await addIncident({ busId: 'backup-bus', route: 'Backup route', delayTime: '5m', status: 'URGENT' });
  await admin();
  const backup = await exportAdminBackup(); const parsed = JSON.parse(backup);
  expect(parsed.payload[BACKUP_KEYS[0]].session).toBeNull(); expect(parsed.payload[BACKUP_KEYS[1]].session).toBeNull();
  expect(await inspectAdminBackup(backup)).toMatchObject({ users: 4, tickets: 1, reports: 1, incidents: 3 });
  await main.updateManagedUser('demo-primary', { disabled: true });
  await restoreAdminBackup(backup);
  expect(await main.getAuthSession()).toBeNull();
  await admin(); expect((await main.getAdminState()).users.find(u => u._id === 'demo-primary')?.disabled).toBe(false);
  expect((await loadAdminTickets())[0].id).toBe(issued.id);
  expect((await main.getAdminState()).activities.some(a => a.action === 'Backup restored')).toBe(true);
  expect((await getIncidents()).some(i => i.busId === 'backup-bus')).toBe(true);
});
test('invalid and checksum-mismatched backups preserve all stored bytes', async () => {
  await admin(); const backup = await exportAdminBackup();
  const before = await AsyncStorage.multiGet([...BACKUP_KEYS]);
  await expect(restoreAdminBackup('not-json')).rejects.toThrow(/complete JSON/);
  const parsed = JSON.parse(backup); parsed.payload[BACKUP_KEYS[0]].users[0].fullName = 'Modified';
  await expect(restoreAdminBackup(JSON.stringify(parsed))).rejects.toThrow(/checksum/);
  expect(await AsyncStorage.multiGet([...BACKUP_KEYS])).toEqual(before);
});
test('restore rejects incomplete ownership and backups lacking an active admin before any write', async () => {
  await admin(); const parsed = JSON.parse(await exportAdminBackup());
  parsed.payload[BACKUP_KEYS[0]].users.find((u: any) => u.role === 'admin').disabled = true;
  await expect(inspectAdminBackup(JSON.stringify(parsed))).rejects.toThrow(/active admin/);
});
test('failed restore writes roll back the original records and retain the current admin session', async () => {
  await admin(); const backup = await exportAdminBackup(); await main.updateManagedUser('demo-primary', { disabled: true });
  const before = await AsyncStorage.multiGet([...BACKUP_KEYS]);
  jest.mocked(AsyncStorage.multiSet).mockRejectedValueOnce(new Error('Restore disk failure'));
  await expect(restoreAdminBackup(backup)).rejects.toThrow('Restore disk failure');
  expect(await AsyncStorage.multiGet([...BACKUP_KEYS])).toEqual(before);
  expect((await main.getAuthSession())?.user.role).toBe('admin');
});
test('an interrupted restore journal recovers the prior snapshot before normal reads', async () => {
  await admin(); await exportAdminBackup(); const before = await AsyncStorage.multiGet([...BACKUP_KEYS]);
  await AsyncStorage.setItem('@transitlink_restore_journal_v1', JSON.stringify(before));
  await AsyncStorage.setItem(main.STORAGE_KEY, 'interrupted-write');
  await recoverStorage();
  expect(await AsyncStorage.multiGet([...BACKUP_KEYS])).toEqual(before);
  expect(await AsyncStorage.getItem('@transitlink_restore_journal_v1')).toBeNull();
});
test('maintenance refuses concurrent mutations instead of racing a snapshot', async () => {
  await admin(); let release!: () => void; let entered!: () => void;
  const start = new Promise<void>(r => { entered = r; });
  const work = runMaintenance(async () => { entered(); await new Promise<void>(r => { release = r; }); });
  await start;
  await expect(main.updateManagedUser('demo-primary', { disabled: true })).rejects.toMatchObject({ response: { status: 503 } });
  release(); await work;
  expect((await main.getAdminState()).users.find(u => u._id === 'demo-primary')?.disabled).toBe(false);
});


test('Admin passenger operations are denied while management and verification remain available', async () => {
  await passenger(); const issued = await ticket(); await admin();
  await expect(loadTickets()).rejects.toMatchObject({ response: { status: 403 } });
  await expect(quoteJourney('DEMO-T-KDY', 'standard', 'now')).rejects.toMatchObject({ response: { status: 403 } });
  await expect(purchaseQuote('any-quote')).rejects.toMatchObject({ response: { status: 403 } });
  await expect(main.getSavedRoutes()).rejects.toMatchObject({ response: { status: 403 } });
  await expect(main.addSampleSavedRoute()).rejects.toMatchObject({ response: { status: 403 } });
  await expect(main.getNotifications()).rejects.toMatchObject({ response: { status: 403 } });
  await expect(main.createSupportReport('Admin report', 'A report')).rejects.toMatchObject({ response: { status: 403 } });
  expect((await loadAdminTickets())[0].id).toBe(issued.id);
  expect((await verifyQR(issued.qrPayload!)).eligible).toBe(true);
  await redeemQR(issued.qrPayload!);
  expect((await main.getUserProfile()).role).toBe('admin');
});
