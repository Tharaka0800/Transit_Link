import AsyncStorage from '@react-native-async-storage/async-storage';
import bcrypt from 'bcryptjs';
import * as api from '../api';
import { LocalDatabase, STORAGE_KEY } from '../LocalAppStorage';

jest.mock('expo-crypto', () => ({
  randomUUID: () => require('crypto').randomUUID(),
  getRandomValues: (bytes: Uint8Array) => { require('crypto').randomFillSync(bytes); return bytes; },
}));

const getItem = jest.mocked(AsyncStorage.getItem);
const setItem = jest.mocked(AsyncStorage.setItem);
const officer = { email: 'officer@transitlink.lk', password: 'OfficerDemo@2026' };
const primary = { email: 'tharukee01@gmail.com', password: 'password123' };
const secondary = { email: 'passenger.demo@transitlink.lk', password: 'password123' };
const registration = { fullName: 'Offline Passenger', email: 'offline@example.com', phone: '0772345678', password: 'LocalPass123' };
let seed: string;

async function database(): Promise<LocalDatabase> {
  return JSON.parse((await AsyncStorage.getItem(STORAGE_KEY))!);
}

beforeAll(async () => {
  await AsyncStorage.clear();
  await api.getAuthSession();
  seed = (await AsyncStorage.getItem(STORAGE_KEY))!;
});

beforeEach(async () => {
  jest.restoreAllMocks();
  await AsyncStorage.clear();
  await AsyncStorage.setItem(STORAGE_KEY, seed);
  await api.getAuthSession();
  jest.clearAllMocks();
});

test('initializes the four demo accounts only once, including overlapping first reads', async () => {
  await AsyncStorage.clear();
  setItem.mockClear();
  expect(await Promise.all([api.getAuthSession(), api.getAuthSession(), api.getAuthSession()])).toEqual([null, null, null]);
  const stored = await database();
  expect(stored.version).toBe(1);
  expect(stored.users.map((user) => user.email)).toEqual(expect.arrayContaining([
    'tharukee01@gmail.com', 'passenger.demo@transitlink.lk', 'admin@transitlink.lk', officer.email,
  ]));
  expect(stored.users).toHaveLength(4);
  expect(setItem.mock.calls.filter(([key]) => key === STORAGE_KEY)).toHaveLength(1);
});

test.each([
  [primary.email, primary.password, 'passenger'],
  [secondary.email, secondary.password, 'passenger'],
  ['admin@transitlink.lk', 'admin123', 'admin'],
  [officer.email, officer.password, 'officer'],
])('authenticates the documented local account %s without network requests', async (email, password, role) => {
  const fetchSpy = jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Network unavailable'));
  const response = await api.loginUser({ email, password });
  expect(response.data.role).toBe(role);
  expect(response.data.token).toMatch(/^local:/);
  expect(response.data).not.toHaveProperty('passwordHash');
  expect(response.data).not.toHaveProperty('password');
  expect(await api.getAuthSession()).toMatchObject({ token: response.data.token, user: { role } });
  expect(fetchSpy).not.toHaveBeenCalled();
});

test('registers a passenger using salted cost-10 hashes and normalizes email', async () => {
  const first = await api.registerUser({ ...registration, email: '  OFFLINE@example.com ', role: 'officer' });
  const second = await api.registerUser({ ...registration, email: 'second@example.com', phone: '' });
  const stored = await database();
  const one = stored.users.find((user) => user._id === first.data._id)!;
  const two = stored.users.find((user) => user._id === second.data._id)!;
  expect(first.data.email).toBe('offline@example.com');
  expect(first.data.role).toBe('passenger');
  expect(first.data._id).not.toBe(second.data._id);
  expect(bcrypt.getRounds(one.passwordHash)).toBe(10);
  expect(await bcrypt.compare(registration.password, one.passwordHash)).toBe(true);
  expect(one.passwordHash).not.toBe(two.passwordHash);
  expect(JSON.stringify(stored)).not.toContain(registration.password);
  expect(first.data).not.toHaveProperty('passwordHash');
});

test('rejects duplicate emails case-insensitively and duplicate non-empty phone numbers', async () => {
  await api.registerUser(registration);
  await expect(api.registerUser({ ...registration, email: 'OFFLINE@EXAMPLE.COM', phone: '' })).rejects.toThrow(/already exists.*email/i);
  await expect(api.registerUser({ ...registration, email: 'different@example.com', phone: '077 234 5678' })).rejects.toThrow(/already exists.*phone/i);
  await expect(api.registerUser({ ...registration, email: 'empty-phone@example.com', phone: '' })).resolves.toMatchObject({ data: { role: 'passenger' } });
});

test('prevents registration with the reserved Officer email', async () => {
  const original = (await database()).users.find((user) => user.role === 'officer');
  await expect(api.registerUser({ ...registration, email: ' OFFICER@TRANSITLINK.LK ' })).rejects.toThrow(/reserved/i);
  expect((await database()).users.find((user) => user.role === 'officer')).toEqual(original);
  expect(await api.getAuthSession()).toBeNull();
});

test.each([
  { ...registration, fullName: ' ' },
  { ...registration, email: 'not-an-email' },
  { ...registration, password: '123' },
  { ...registration, password: 'x'.repeat(73) },
])('requires valid registration fields without persisting a partial account', async (input) => {
  await expect(api.registerUser(input)).rejects.toThrow();
  expect((await database()).users).toHaveLength(4);
  expect(await api.getAuthSession()).toBeNull();
});

test('login accepts a normalized phone identifier and rejects invalid credentials', async () => {
  await expect(api.loginUser({ email: '+94 71 123 4567', password: primary.password })).resolves.toMatchObject({ data: { email: primary.email } });
  const before = await api.getAuthSession();
  await expect(api.loginUser({ ...officer, password: 'wrong' })).rejects.toMatchObject({ response: { status: 401 } });
  expect(await api.getAuthSession()).toEqual(before);
});

test('restores a local session after module restart and clears it on logout', async () => {
  const { data } = await api.loginUser(officer);
  let restored: any;
  await jest.isolateModulesAsync(async () => {
    const restarted = require('../LocalAppStorage');
    restored = await restarted.getAuthSession();
  });
  expect(restored).toMatchObject({ token: data.token, user: { role: 'officer' } });
  await api.clearAuth();
  expect(await api.getToken()).toBeNull();
  expect(await api.getStoredUser()).toBeNull();
  expect((await database()).session).toBeNull();
});

test('ignores forged cached roles and rejects a stale or fabricated session save', async () => {
  const { data } = await api.loginUser(primary);
  const forgedProfile = { ...data, role: 'officer' };
  await api.saveAuth(forgedProfile);
  expect((await api.getAuthSession())!.user.role).toBe('passenger');
  await expect(api.saveAuth({ ...data, token: 'local:invented' })).rejects.toThrow(/no longer active/i);
  await api.clearAuth();
  await api.loginUser(secondary);
  await expect(api.saveAuth(data)).rejects.toThrow(/no longer active/i);
  expect((await api.getAuthSession())!.user.email).toBe(secondary.email);
});

test('publishes persisted login, profile, and logout changes to auth observers', async () => {
  const listener = jest.fn();
  const unsubscribe = api.subscribeAuth(listener);
  try {
    await api.loginUser(primary);
    expect(listener).toHaveBeenLastCalledWith(expect.objectContaining({ user: expect.objectContaining({ email: primary.email }) }));
    await api.updateUserProfile({ fullName: 'Changed Name' });
    expect(listener).toHaveBeenLastCalledWith(expect.objectContaining({ user: expect.objectContaining({ fullName: 'Changed Name' }) }));
    await api.clearAuth();
    expect(listener).toHaveBeenLastCalledWith(null);
  } finally { unsubscribe(); }
});

test('persists profile updates and password changes without accepting role changes', async () => {
  const { data: account } = await api.registerUser(registration);
  const original = await database();
  const { data: updated } = await api.updateUserProfile({ fullName: 'Updated Passenger', email: 'renamed@example.com', phone: '0779876543', password: 'ChangedPass123', role: 'officer' });
  expect(updated).toMatchObject({ _id: account._id, role: 'passenger', fullName: 'Updated Passenger', email: 'renamed@example.com' });
  expect(updated.createdAt).toBe(original.users.find((user) => user._id === account._id)!.createdAt);
  expect(updated.token).not.toBe(account.token);
  await api.clearAuth();
  await expect(api.loginUser({ email: updated.email, password: registration.password })).rejects.toThrow(/credentials/i);
  await expect(api.loginUser({ email: updated.email, password: 'ChangedPass123' })).resolves.toMatchObject({ data: { fullName: 'Updated Passenger' } });
  expect((await api.getUserProfile()).data.role).toBe('passenger');
});

test('protects the Officer credentials and account deletion while allowing its display name update', async () => {
  await api.loginUser(officer);
  await expect(api.updateUserProfile({ email: 'changed@example.com' })).rejects.toThrow(/cannot be changed/i);
  await expect(api.updateUserProfile({ password: 'ChangedPass123' })).rejects.toThrow(/cannot be changed/i);
  await expect(api.deleteUserProfile()).rejects.toThrow(/cannot be deleted/i);
  await expect(api.updateUserProfile({ fullName: 'Transport Officer Demo', role: 'passenger' })).resolves.toMatchObject({ data: { role: 'officer', email: officer.email } });
  await api.clearAuth();
  await expect(api.loginUser(officer)).resolves.toMatchObject({ data: { role: 'officer' } });
});

test('creates, filters, marks read, and deletes persisted notifications with correct unread counts', async () => {
  const { data: account } = await api.registerUser(registration);
  const { data: first } = await api.createNotification({ title: ' Delay alert ', message: ' Bus 154 is delayed ', type: 'delay', userId: 'demo-officer' });
  const { data: second } = await api.createNotification({ title: 'Ticket', message: 'Purchased', type: 'ticket' });
  expect(first).toMatchObject({ userId: account._id, title: 'Delay alert', message: 'Bus 154 is delayed', isRead: false });
  expect((await api.getNotifications({ type: 'delay' })).data).toMatchObject({ notifications: [first], unreadCount: 2 });
  await api.markNotificationRead(first._id);
  await api.markNotificationRead(first._id);
  expect((await api.getNotifications()).data.unreadCount).toBe(1);
  await api.deleteNotification(second._id);
  const remaining = (await api.getNotifications()).data;
  expect(remaining.notifications).toHaveLength(1);
  expect(remaining.notifications[0].isRead).toBe(true);
  expect(remaining.unreadCount).toBe(0);
  await api.clearAuth();
  await api.loginUser({ email: registration.email, password: registration.password });
  expect((await api.getNotifications()).data).toEqual(remaining);
});

test('prevents another account from reading, marking, or deleting a notification', async () => {
  await api.loginUser(primary);
  const { data: note } = await api.createNotification({ title: 'Private report', message: 'Local only' });
  await api.clearAuth();
  await api.loginUser(secondary);
  expect((await api.getNotifications()).data.notifications.some((entry) => entry._id === note._id)).toBe(false);
  await expect(api.markNotificationRead(note._id)).rejects.toMatchObject({ response: { status: 404 } });
  await expect(api.deleteNotification(note._id)).rejects.toMatchObject({ response: { status: 404 } });
  expect((await database()).notifications.find((entry) => entry._id === note._id)!.isRead).toBe(false);
});

test('returns demo notifications newest first and counts unread across filters', async () => {
  await api.loginUser(primary);
  const all = (await api.getNotifications()).data;
  const timestamps = all.notifications.map((entry) => Date.parse(entry.timestamp));
  expect(timestamps).toEqual([...timestamps].sort((a, b) => b - a));
  expect(all.unreadCount).toBe(3);
  expect((await api.getNotifications({ type: 'ticket' })).data.unreadCount).toBe(3);
});

test('keeps intentionally emptied notifications and saved routes empty across restart', async () => {
  await api.loginUser(primary);
  const stored = await database();
  stored.notifications = stored.notifications.filter((entry) => entry.userId !== 'demo-primary');
  stored.savedRoutes = stored.savedRoutes.filter((entry) => entry.userId !== 'demo-primary');
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  let restarted: any;
  await jest.isolateModulesAsync(async () => { restarted = require('../LocalAppStorage'); await restarted.getAuthSession(); });
  expect(await restarted.getNotifications()).toEqual({ notifications: [], unreadCount: 0 });
  expect(await restarted.getSavedRoutes()).toEqual([]);
  expect((await database()).notifications.some((entry) => entry.userId === 'demo-primary')).toBe(false);
});

test('persists saved-route additions and favorites without changing another user or guest routes', async () => {
  const guestRoutes = (await api.getSavedRoutes()).data;
  await api.loginUser(primary);
  const before = (await api.getSavedRoutes()).data;
  const { data: added } = await api.addSampleSavedRoute();
  expect((await api.getSavedRoutes()).data).toHaveLength(before.length + 1);
  await api.toggleSavedRoute(added.id);
  await api.clearAuth();
  expect((await api.getSavedRoutes()).data).toEqual(guestRoutes);
  await api.loginUser(secondary);
  expect((await api.getSavedRoutes()).data.some((entry) => entry.id === added.id)).toBe(false);
  await expect(api.toggleSavedRoute(added.id)).rejects.toThrow(/not found/i);
  await api.clearAuth();
  await api.loginUser(primary);
  expect((await api.getSavedRoutes()).data.find((entry) => entry.id === added.id)).toMatchObject({ favorite: false, muted: true });
});

test('deletes an account and its related data while preserving other users and Officer incidents', async () => {
  const incidents = '[{"id":"keep-officer-incident"}]';
  await AsyncStorage.setItem('@transit_incidents', incidents);
  const { data: account } = await api.registerUser(registration);
  await api.createNotification({ title: 'Delete with account', message: 'Owned notification' });
  await api.addSampleSavedRoute();
  await api.deleteUserProfile();
  const stored = await database();
  expect(stored.users.some((entry) => entry._id === account._id)).toBe(false);
  expect(stored.notifications.some((entry) => entry.userId === account._id)).toBe(false);
  expect(stored.savedRoutes.some((entry) => entry.userId === account._id)).toBe(false);
  expect(stored.users).toHaveLength(4);
  expect(stored.session).toBeNull();
  expect(await AsyncStorage.getItem('@transit_incidents')).toBe(incidents);
  await expect(api.loginUser({ email: registration.email, password: registration.password })).rejects.toThrow(/credentials/i);
});

test('does not convert obsolete backend sessions into local Officer access', async () => {
  await AsyncStorage.clear();
  await AsyncStorage.setItem('transitlink_token', 'old-server-jwt');
  await AsyncStorage.setItem('transitlink_user', JSON.stringify({ role: 'officer', email: officer.email }));
  await AsyncStorage.setItem('@transit_incidents', '[]');
  expect(await api.getAuthSession()).toBeNull();
  expect(await AsyncStorage.getItem('transitlink_token')).toBeNull();
  expect(await AsyncStorage.getItem('transitlink_user')).toBeNull();
  expect(await AsyncStorage.getItem('@transit_incidents')).toBe('[]');
});

test('serializes simultaneous registrations so duplicate email creation cannot race', async () => {
  const outcomes = await Promise.allSettled([api.registerUser(registration), api.registerUser(registration)]);
  expect(outcomes.map((entry) => entry.status)).toEqual(['fulfilled', 'rejected']);
  expect((await database()).users.filter((entry) => entry.email === registration.email)).toHaveLength(1);
});

test('serializes overlapping mutations without losing notifications or route changes', async () => {
  await api.registerUser(registration);
  const [first, second, route] = await Promise.all([
    api.createNotification({ title: 'First', message: 'First pending mutation' }),
    api.createNotification({ title: 'Second', message: 'Second pending mutation' }),
    api.addSampleSavedRoute(),
  ]);
  expect((await api.getNotifications()).data.notifications.map((entry) => entry._id)).toEqual(expect.arrayContaining([first.data._id, second.data._id]));
  expect((await api.getSavedRoutes()).data.some((entry) => entry.id === route.data.id)).toBe(true);
});

test.each(['{broken JSON', JSON.stringify({ version: 99, users: [], notifications: [], savedRoutes: [], session: null })])('rejects invalid storage without overwriting the existing bytes', async (raw) => {
  await AsyncStorage.setItem(STORAGE_KEY, raw);
  setItem.mockClear();
  await expect(api.getAuthSession()).rejects.toThrow(/preserved/i);
  expect(await AsyncStorage.getItem(STORAGE_KEY)).toBe(raw);
  expect(setItem).not.toHaveBeenCalled();
  await AsyncStorage.setItem(STORAGE_KEY, seed);
  await expect(api.getAuthSession()).resolves.toBeNull();
});

const invalidRecords: Array<[string, (stored: LocalDatabase) => void]> = [
  ['orphaned session', (stored) => {
    stored.session = { token: 'local:orphaned', userId: 'missing-user', createdAt: new Date().toISOString() };
  }],
  ['orphaned notification', (stored) => { stored.notifications[0].userId = 'missing-user'; }],
  ['orphaned saved route', (stored) => { stored.savedRoutes[0].userId = 'missing-user'; }],
  ['duplicate email', (stored) => { stored.users[1].email = stored.users[0].email; }],
  ['duplicate normalized phone', (stored) => { stored.users[1].phone = stored.users[0].phone.replace(/\s/g, ''); }],
  ['invalid password hash', (stored) => { stored.users[0].passwordHash = 'invalid-unhashed-password'; }],
  ['privileged role on a passenger account', (stored) => { stored.users[0].role = 'officer'; }],
  ['obsolete server token attached to Officer', (stored) => {
    stored.session = { token: 'obsolete-server-jwt', userId: 'demo-officer', createdAt: new Date().toISOString() };
  }],
];

test.each(invalidRecords)('preserves version-1 data containing an %s without granting a session, then recovers', async (_scenario, invalidate) => {
  const stored = JSON.parse(seed) as LocalDatabase;
  invalidate(stored);
  const raw = JSON.stringify(stored);
  await AsyncStorage.setItem(STORAGE_KEY, raw);
  setItem.mockClear();
  const listener = jest.fn();
  const unsubscribe = api.subscribeAuth(listener);
  try {
    await expect(api.getAuthSession()).rejects.toThrow(/invalid format.*preserved/i);
    await expect(api.getToken()).rejects.toThrow(/preserved/i);
    expect(listener).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
    expect(await AsyncStorage.getItem(STORAGE_KEY)).toBe(raw);
    await AsyncStorage.setItem(STORAGE_KEY, seed);
    expect(await api.getAuthSession()).toBeNull();
  } finally { unsubscribe(); }
});

test('reports a read failure and recovers without changing saved data', async () => {
  getItem.mockRejectedValueOnce(new Error('Device read unavailable'));
  await expect(api.getAuthSession()).rejects.toThrow(/read.*Device read unavailable/i);
  expect(setItem).not.toHaveBeenCalled();
  expect(await AsyncStorage.getItem(STORAGE_KEY)).toBe(seed);
  await expect(api.getAuthSession()).resolves.toBeNull();
});

test('reports failed writes, preserves the existing profile, and recovers for later mutations', async () => {
  await api.loginUser(primary);
  const before = (await api.getUserProfile()).data;
  const bytes = await AsyncStorage.getItem(STORAGE_KEY);
  setItem.mockRejectedValueOnce(new Error('Device full'));
  await expect(api.updateUserProfile({ fullName: 'Failed write' })).rejects.toThrow(/save.*Device full/i);
  expect(await AsyncStorage.getItem(STORAGE_KEY)).toBe(bytes);
  expect((await api.getUserProfile()).data).toEqual(before);
  await expect(api.updateUserProfile({ fullName: 'Recovered write' })).resolves.toMatchObject({ data: { fullName: 'Recovered write' } });
});

test('failed login persistence does not grant a new session or publish authentication', async () => {
  const listener = jest.fn();
  const unsubscribe = api.subscribeAuth(listener);
  try {
    setItem.mockRejectedValueOnce(new Error('Disk full'));
    await expect(api.loginUser(officer)).rejects.toThrow(/save/i);
    expect(listener).not.toHaveBeenCalled();
    expect(await api.getAuthSession()).toBeNull();
    await expect(api.loginUser(officer)).resolves.toMatchObject({ data: { role: 'officer' } });
  } finally { unsubscribe(); }
});

test('a queued profile mutation cannot apply after logout', async () => {
  await api.loginUser(primary);
  const before = (await api.getUserProfile()).data;
  const update = api.updateUserProfile({ fullName: 'Stale update' });
  const logout = api.clearAuth();
  await expect(update).rejects.toThrow(/session changed/i);
  await logout;
  await api.loginUser(primary);
  expect((await api.getUserProfile()).data.fullName).toBe(before.fullName);
});

test('logout during password verification prevents a stale login from reopening a session', async () => {
  let entered!: () => void;
  const verificationStarted = new Promise<void>((resolve) => { entered = resolve; });
  let complete!: (value: boolean) => void;
  const verification = new Promise<boolean>((resolve) => { complete = resolve; });
  jest.spyOn(bcrypt, 'compare').mockImplementationOnce((() => { entered(); return verification; }) as typeof bcrypt.compare);
  const login = api.loginUser(officer);
  await verificationStarted;
  const logout = api.clearAuth();
  complete(true);
  await expect(login).rejects.toThrow(/session changed/i);
  await logout;
  expect(await api.getAuthSession()).toBeNull();
});

test('logout during a held authentication write does not publish a stale Officer login', async () => {
  let entered!: () => void;
  const writeStarted = new Promise<void>((resolve) => { entered = resolve; });
  let release!: () => void;
  const writeAllowed = new Promise<void>((resolve) => { release = resolve; });
  const persist = setItem.getMockImplementation()!;
  setItem.mockImplementationOnce(async (key, value) => {
    entered();
    await writeAllowed;
    return persist(key, value);
  });
  const listener = jest.fn();
  const unsubscribe = api.subscribeAuth(listener);
  try {
    const login = api.loginUser(officer);
    await writeStarted;
    const logout = api.clearAuth();
    release();
    await expect(login).rejects.toThrow(/session changed/i);
    await logout;
    expect(listener.mock.calls.some(([value]) => value?.user.role === 'officer')).toBe(false);
    expect(await api.getAuthSession()).toBeNull();
  } finally { unsubscribe(); }
});
