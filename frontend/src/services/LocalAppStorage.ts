import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
// Resolve the ESM entry so Metro honors its browser map for Node's crypto.
// The package's nested UMD entry has a separate package boundary in SDK 51.
import bcrypt from 'bcryptjs/index.js';
import { favouriteRoutes } from '../data/mockData';
import { defaultJourneys, validAdministration, validJourney, Administration, ManagedJourney, SupportReport, Activity } from './adminTypes';
import { storageIsBusy, recoverStorage, registerStorageQueue } from './StorageMaintenance';

export const STORAGE_KEY = '@transitlink_app_v1';
export const OFFICER_EMAIL = 'officer@transitlink.lk';

export type UserRole = 'passenger' | 'admin' | 'officer';
export type NotificationType = 'delay' | 'service' | 'ticket' | 'info' | 'general';

export interface PublicUser {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  avatar: string;
  createdAt: string;
  updatedAt: string;
  disabled?: boolean;
}

export interface StoredUser extends PublicUser { passwordHash: string }
export interface AuthenticatedUser extends PublicUser { token: string }
export interface AuthSession { token: string; user: PublicUser }
export interface LocalSession { token: string; userId: string; createdAt: string }

export interface LocalNotification {
  _id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  timestamp: string;
  createdAt: string;
  updatedAt: string;
}

export interface SavedRoute {
  id: string;
  userId: string | null;
  from: string;
  to: string;
  mode: 'Bus' | 'Train';
  duration: string;
  favorite: boolean;
  muted: boolean;
}

export interface LocalDatabase {
  version: 1;
  users: StoredUser[];
  notifications: LocalNotification[];
  savedRoutes: SavedRoute[];
  session: LocalSession | null;
  administration?: Administration;
}

export interface RegistrationInput {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
  role?: unknown;
}
export interface LoginInput { email?: string; phone?: string; password: string }
export type ProfileUpdates = Partial<Pick<PublicUser, 'fullName' | 'email' | 'phone' | 'avatar'>> & {
  password?: string;
  role?: unknown;
};
export interface NotificationInput {
  title: string;
  message: string;
  type?: NotificationType;
  userId?: string;
}

export class LocalAppError extends Error {
  readonly response: { status: number; data: { message: string } };
  constructor(message: string, status = 400) {
    super(message);
    this.name = 'LocalAppError';
    this.response = { status, data: { message } };
  }
}

const notificationTypes: NotificationType[] = ['delay', 'service', 'ticket', 'info', 'general'];
const roles: UserRole[] = ['passenger', 'admin', 'officer'];
const listeners = new Set<(session: AuthSession | null) => void>();
let pending: Promise<void> = Promise.resolve();
let sessionSnapshot: AuthSession | null | undefined;
let sessionGeneration = 0;
let signOutGeneration = 0;
registerStorageQueue(() => pending);

// bcrypt needs a secure native random source in Hermes, where Node crypto and
// browser WebCrypto are unavailable. Expo Crypto is included in SDK 51 Expo Go.
bcrypt.setRandomFallback((length) => Array.from(Crypto.getRandomValues(new Uint8Array(length))));

function serially<T>(operation: () => Promise<T>): Promise<T> {
  if (storageIsBusy()) return Promise.reject(new LocalAppError('Backup or restore is running. Please try again shortly.', 503));
  const result = pending.then(async () => {
    try { await recoverStorage(); } catch (e) { throw new LocalAppError(`Could not read saved data on this device. ${e instanceof Error ? e.message : ''}`, 500); }
    return operation();
  });
  pending = result.then(() => undefined, () => undefined);
  return result;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function nonempty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
function validDate(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}
function normalizedEmail(value: string): string { return value.trim().toLowerCase(); }
function phoneKey(value: string): string { return value.replace(/[\s()-]/g, ''); }
function publicUser(user: StoredUser): PublicUser {
  return {
    _id: user._id, fullName: user.fullName, email: user.email, phone: user.phone,
    role: user.role, disabled: user.disabled ?? false, avatar: user.avatar, createdAt: user.createdAt, updatedAt: user.updatedAt,
  };
}
function authSession(database: LocalDatabase): AuthSession | null {
  if (!database.session) return null;
  const user = database.users.find((entry) => entry._id === database.session!.userId);
  return user && !user.disabled ? { token: database.session.token, user: publicUser(user) } : null;
}
function publishAuth(database: LocalDatabase, advanceGeneration = false): void {
  if (advanceGeneration) sessionGeneration += 1;
  sessionSnapshot = authSession(database);
  for (const listener of listeners) {
    try { listener(sessionSnapshot); } catch { /* Observer failures must not undo persisted data. */ }
  }
}

export function subscribeAuth(listener: (session: AuthSession | null) => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

interface Identity { generation: number; token: string | null | undefined }
function captureIdentity(): Identity {
  return { generation: sessionGeneration, token: sessionSnapshot?.token ?? (sessionSnapshot === undefined ? undefined : null) };
}
function assertIdentity(database: LocalDatabase, identity: Identity): void {
  if (identity.generation !== sessionGeneration
    || (identity.token !== undefined && identity.token !== (database.session?.token ?? null))) {
    throw new LocalAppError('Your session changed. Please try again.', 409);
  }
}
function assertGeneration(identity: Identity): void {
  if (identity.generation !== sessionGeneration) throw new LocalAppError('Your session changed. Please try again.', 409);
}
function requireUser(database: LocalDatabase, identity: Identity): StoredUser {
  assertIdentity(database, identity);
  const user = database.users.find((entry) => entry._id === database.session?.userId);
  if (!user || user.disabled || !database.session) throw new LocalAppError('Please log in to continue.', 401);
  return user;
}
function newSession(userId: string): LocalSession {
  return { token: `local:${Crypto.randomUUID()}`, userId, createdAt: new Date().toISOString() };
}

function validUser(value: unknown): value is StoredUser {
  return isObject(value) && nonempty(value._id) && nonempty(value.fullName)
    && nonempty(value.email) && normalizedEmail(value.email) === value.email
    && /^\S+@\S+\.\S+$/.test(value.email) && typeof value.phone === 'string'
    && (value.disabled === undefined || typeof value.disabled === 'boolean')
    && typeof value.avatar === 'string' && roles.includes(value.role as UserRole)
    && validDate(value.createdAt) && validDate(value.updatedAt)
    && typeof value.passwordHash === 'string' && /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(value.passwordHash)
    && (value.role === 'officer' ? value.email === OFFICER_EMAIL : value.email !== OFFICER_EMAIL);
}
function validNotification(value: unknown): value is LocalNotification {
  return isObject(value) && nonempty(value._id) && nonempty(value.userId)
    && nonempty(value.title) && nonempty(value.message) && notificationTypes.includes(value.type as NotificationType)
    && typeof value.isRead === 'boolean' && validDate(value.timestamp)
    && validDate(value.createdAt) && validDate(value.updatedAt);
}
function validRoute(value: unknown): value is SavedRoute {
  return isObject(value) && nonempty(value.id) && (value.userId === null || nonempty(value.userId))
    && nonempty(value.from) && nonempty(value.to) && (value.mode === 'Bus' || value.mode === 'Train')
    && nonempty(value.duration) && typeof value.favorite === 'boolean' && typeof value.muted === 'boolean';
}
function unique(values: string[]): boolean { return new Set(values).size === values.length; }
export function validDatabase(value: unknown): value is LocalDatabase {
  if (!isObject(value) || (value.administration !== undefined && !validAdministration(value.administration)) || value.version !== 1 || !Array.isArray(value.users)
    || !Array.isArray(value.notifications) || !Array.isArray(value.savedRoutes)
    || !value.users.every(validUser) || !value.notifications.every(validNotification)
    || !value.savedRoutes.every(validRoute)) return false;
  const users = value.users as StoredUser[];
  const notifications = value.notifications as LocalNotification[];
  const routes = value.savedRoutes as SavedRoute[];
  const userIds = new Set(users.map((user) => user._id));
  if (!unique(users.map((user) => user._id)) || !unique(users.map((user) => user.email))
    || !unique(users.filter((user) => user.phone.trim()).map((user) => phoneKey(user.phone)))
    || !unique(notifications.map((item) => item._id))
    || !unique(routes.map((item) => `${item.userId ?? 'guest'}:${item.id}`))
    || notifications.some((item) => !userIds.has(item.userId))
    || routes.some((item) => item.userId !== null && !userIds.has(item.userId))) return false;
  return value.session === null || (isObject(value.session) && nonempty(value.session.token)
    && value.session.token.startsWith('local:') && nonempty(value.session.userId)
    && userIds.has(value.session.userId) && validDate(value.session.createdAt));
}

function initialRoutes(userId: string | null): SavedRoute[] {
  return favouriteRoutes.map((route) => ({ ...route, mode: route.mode as SavedRoute['mode'], userId }));
}
function seedDatabase(): LocalDatabase {
  const now = new Date().toISOString();
  // Precomputed cost-10 bcrypt hashes avoid hashing four demo accounts on startup.
  const passengerHash = '$2a$10$eCOP55tIZe9wK98DQZoMoO2ohvgeO1SOJrWBt/q9gmcx24FGozx6y';
  const demos: Array<[string, string, string, string, UserRole, string]> = [
    ['demo-primary', 'Tharukee Amasha', 'tharukee01@gmail.com', '+94 71 123 4567', 'passenger', passengerHash],
    ['demo-secondary', 'Kasun Perera', 'passenger.demo@transitlink.lk', '+94 77 555 1212', 'passenger', passengerHash],
    ['demo-admin', 'TransitLink Admin', 'admin@transitlink.lk', '+94 11 200 3000', 'admin', '$2a$10$/myR7VuZIHU07tDP6eLgW.RZjtAcMn.tYbe.yr2a051YO2g6d8QKO'],
    ['demo-officer', 'Transport Officer', OFFICER_EMAIL, '', 'officer', '$2a$10$07p03zwqDn2F9PrqVu6evuP5Fyl5MYgcNIyeus0fALMSwutP4mRmq'],
  ];
  const users: StoredUser[] = demos.map(([_id, fullName, email, phone, role, passwordHash]) => ({
    _id, fullName, email, phone, role, passwordHash, avatar: '', createdAt: now, updatedAt: now,
  }));
  const templates: Array<[string, string, NotificationType, boolean, number]> = [
    ['Delay Alert: Route 138', 'Due to a sudden breakdown near Maharagama, expect delays of up to 20 minutes on Route 138.', 'delay', false, 0],
    ['Bus Arriving Soon', 'Route 100 (Colombo Fort) is currently 3 stops away. Get ready to board!', 'service', false, 1],
    ['Ticket Purchased Successfully', "Your ticket for Colombo Fort to Kandy has been issued. View it in 'My Tickets'.", 'ticket', true, 24],
    ['Holiday Schedule Update', 'Public transport services will operate under Sunday timetables for tomorrow\'s holiday.', 'info', false, 26],
    ['Delay Alert: Route 177', 'Heavy traffic near Nugegoda Junction. Route 177 delayed by approximately 12 minutes.', 'delay', true, 5],
    ['Ticket Refund Processed', 'Your refund for TXN10492813 (Colombo Fort → Kandy) has been credited to your wallet.', 'ticket', true, 48],
    ['Service Restored: Route 138', 'Route 138 is back on schedule after the earlier breakdown. Normal operations resumed.', 'service', true, 3],
    ['Support Ticket Received', 'Your demonstration issue report is saved on this device. It has not been sent to a remote support team.', 'general', true, 12],
    ['Fare Reminder', 'Standard bus fare Colombo Fort → Kandy is LKR 320. Open Fare Information to calculate fares.', 'info', true, 72],
  ];
  const notifications: LocalNotification[] = templates.map(([title, message, type, isRead, hours], index) => ({
    _id: `demo-notification-${index}`, userId: 'demo-primary', title, message, type, isRead,
    timestamp: new Date(Date.now() - hours * 3_600_000).toISOString(), createdAt: now, updatedAt: now,
  }));
  notifications.push(
    { _id: 'demo-secondary-welcome', userId: 'demo-secondary', title: 'Welcome to TransitLink', message: 'Track buses and trains, buy digital tickets, and manage your profile in one place.', type: 'info', isRead: false, timestamp: now, createdAt: now, updatedAt: now },
    { _id: 'demo-secondary-arrival', userId: 'demo-secondary', title: 'Bus Arriving Soon', message: 'Route 138 (Maharagama) is 2 stops away.', type: 'service', isRead: false, timestamp: now, createdAt: now, updatedAt: now },
  );
  return { version: 1, users, notifications, savedRoutes: [null, ...users.map((user) => user._id)].flatMap(initialRoutes), session: null };
}

async function writeDatabase(database: LocalDatabase): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(database));
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Please try again.';
    throw new LocalAppError(`Could not save data on this device. ${detail}`, 500);
  }
}
async function readDatabase(): Promise<LocalDatabase> {
  let stored: string | null;
  try { stored = await AsyncStorage.getItem(STORAGE_KEY); } catch (error) {
    const detail = error instanceof Error ? error.message : 'Please try again.';
    throw new LocalAppError(`Could not read saved data on this device. ${detail}`, 500);
  }
  if (stored === null) {
    const seeded = seedDatabase();
    // Server JWTs are not local credentials and never grant a privileged role.
    try { await AsyncStorage.multiRemove(['transitlink_token', 'transitlink_user']); } catch (error) {
      const detail = error instanceof Error ? error.message : 'Please try again.';
      throw new LocalAppError(`Could not clear the previous server session. ${detail}`, 500);
    }
    await writeDatabase(seeded);
    return seeded;
  }
  let parsed: unknown;
  try { parsed = JSON.parse(stored); } catch {
    throw new LocalAppError('Saved app data is not valid JSON. Your existing data has been preserved.', 500);
  }
  if (!validDatabase(parsed)) {
    throw new LocalAppError('Saved app data has an invalid format. Your existing data has been preserved.', 500);
  }
  return parsed;
}

function requiredText(value: unknown, label: string): string {
  if (!nonempty(value)) throw new LocalAppError(`${label} is required.`);
  return value.trim();
}
function emailField(value: unknown): string {
  const email = normalizedEmail(requiredText(value, 'Email'));
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new LocalAppError('Please enter a valid email address.');
  return email;
}
function passwordField(value: unknown): string {
  if (typeof value !== 'string' || value.length < 6) throw new LocalAppError('Password must contain at least 6 characters.');
  if (bcrypt.truncates(value)) throw new LocalAppError('Password must not exceed 72 UTF-8 bytes.');
  return value;
}
function phoneField(value: unknown): string {
  if (value === undefined) return '';
  if (typeof value !== 'string') throw new LocalAppError('Please enter a valid phone number.');
  const phone = value.trim();
  if (phone && !/\d/.test(phoneKey(phone))) throw new LocalAppError('Please enter a valid phone number.');
  return phone;
}
function ensureUnique(database: LocalDatabase, email: string, phone: string, excludedId?: string): void {
  if (database.users.some((user) => user._id !== excludedId && user.email === email)) {
    throw new LocalAppError('User already exists with this email.');
  }
  if (phone && database.users.some((user) => user._id !== excludedId && phoneKey(user.phone) === phoneKey(phone))) {
    throw new LocalAppError('User already exists with this phone number.');
  }
}

export function getAuthSession(): Promise<AuthSession | null> {
  const signedOutAtStart = signOutGeneration;
  return serially(async () => {
    const database = await readDatabase();
    if (signedOutAtStart !== signOutGeneration) return null;
    sessionSnapshot = authSession(database);
    return sessionSnapshot;
  });
}
export async function getToken(): Promise<string | null> { return (await getAuthSession())?.token ?? null; }
export async function getStoredUser(): Promise<PublicUser | null> { return (await getAuthSession())?.user ?? null; }

export function registerUser(input: RegistrationInput): Promise<AuthenticatedUser> {
  const signedOutAtStart = signOutGeneration;
  return serially(async () => {
    const database = await readDatabase();
    const fullName = requiredText(input?.fullName, 'Full name');
    const email = emailField(input?.email);
    const phone = phoneField(input?.phone);
    const password = passwordField(input?.password);
    if (email === OFFICER_EMAIL) throw new LocalAppError('This email is reserved for the Transport Officer.', 403);
    ensureUnique(database, email, phone);
    const passwordHash = await bcrypt.hash(password, 10);
    if (signedOutAtStart !== signOutGeneration) throw new LocalAppError('Your session changed. Please try again.', 409);
    const now = new Date().toISOString();
    const user: StoredUser = { _id: `user:${Crypto.randomUUID()}`, fullName, email, phone, passwordHash, role: 'passenger', avatar: '', createdAt: now, updatedAt: now };
    database.users.push(user);
    database.savedRoutes.push(...initialRoutes(user._id));
    database.session = newSession(user._id);
    await writeDatabase(database);
    if (signedOutAtStart !== signOutGeneration) throw new LocalAppError('Your session changed. Please try again.', 409);
    publishAuth(database, true);
    return { ...publicUser(user), token: database.session.token };
  });
}

export function loginUser(input: LoginInput): Promise<AuthenticatedUser> {
  const signedOutAtStart = signOutGeneration;
  return serially(async () => {
    const database = await readDatabase();
    const identifier = requiredText(input?.email || input?.phone, 'Email or phone number');
    const password = typeof input?.password === 'string' ? input.password : '';
    if (!password) throw new LocalAppError('Please enter your password.');
    const user = database.users.find((entry) => entry.email === normalizedEmail(identifier))
      ?? database.users.find((entry) => entry.phone && phoneKey(entry.phone) === phoneKey(identifier));
    if (!user || user.disabled || bcrypt.truncates(password) || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new LocalAppError('Invalid credentials.', 401);
    }
    if (signedOutAtStart !== signOutGeneration) throw new LocalAppError('Your session changed. Please try again.', 409);
    database.session = newSession(user._id);
    await writeDatabase(database);
    if (signedOutAtStart !== signOutGeneration) throw new LocalAppError('Your session changed. Please try again.', 409);
    publishAuth(database, true);
    return { ...publicUser(user), token: database.session.token };
  });
}

export function saveAuth(userData: Pick<AuthenticatedUser, '_id' | 'token'>): Promise<void> {
  const identity = captureIdentity();
  return serially(async () => {
    const database = await readDatabase();
    const user = requireUser(database, identity);
    if (userData?.token !== database.session!.token || userData?._id !== user._id) {
      throw new LocalAppError('This login session is no longer active.', 401);
    }
    // Existing screens call this after login and profile edits. Their supplied
    // role is ignored; only the persisted account determines Officer access.
    publishAuth(database);
  });
}
export function clearAuth(): Promise<void> {
  signOutGeneration += 1;
  sessionGeneration += 1;
  return serially(async () => {
    const database = await readDatabase();
    if (database.session) {
      database.session = null;
      await writeDatabase(database);
    }
    publishAuth(database);
  });
}

export function getUserProfile(): Promise<PublicUser> {
  const identity = captureIdentity();
  return serially(async () => publicUser(requireUser(await readDatabase(), identity)));
}
export function updateUserProfile(updates: ProfileUpdates): Promise<AuthenticatedUser> {
  const identity = captureIdentity();
  return serially(async () => {
    const database = await readDatabase();
    const user = requireUser(database, identity);
    const fullName = updates.fullName === undefined ? user.fullName : requiredText(updates.fullName, 'Full name');
    const email = updates.email === undefined ? user.email : emailField(updates.email);
    const phone = updates.phone === undefined ? user.phone : phoneField(updates.phone);
    if ((user.role === 'officer' && (email !== OFFICER_EMAIL || updates.password !== undefined))
      || (user.role !== 'officer' && email === OFFICER_EMAIL)) {
      throw new LocalAppError('The demonstration Officer login credentials cannot be changed.', 403);
    }
    ensureUnique(database, email, phone, user._id);
    if (updates.password !== undefined) {
      user.passwordHash = await bcrypt.hash(passwordField(updates.password), 10);
      assertIdentity(database, identity);
    }
    user.fullName = fullName;
    user.email = email;
    user.phone = phone;
    if (updates.avatar !== undefined) {
      if (typeof updates.avatar !== 'string') throw new LocalAppError('Avatar must be a string.');
      user.avatar = updates.avatar;
    }
    user.updatedAt = new Date().toISOString();
    assertIdentity(database, identity);
    if (updates.password !== undefined) database.session = newSession(user._id);
    await writeDatabase(database);
    // Logout can occur while AsyncStorage is writing; never republish the old
    // session after its invalidation. Its queued clear will remove persistence.
    assertGeneration(identity);
    publishAuth(database, updates.password !== undefined);
    return { ...publicUser(user), token: database.session!.token };
  });
}
export function deleteUserProfile(): Promise<{ message: string }> {
  const identity = captureIdentity();
  return serially(async () => {
    const database = await readDatabase();
    const user = requireUser(database, identity);
    if (user.role === 'officer') throw new LocalAppError('The demonstration Officer account cannot be deleted.', 403);
    ensureAnotherAdmin(database, user);
    if (database.administration) {
      database.administration.reports = database.administration.reports.filter(r => r.userId !== user._id);
      appendActivity(database, user, 'Account deleted', user.email);
    }
    database.users = database.users.filter((entry) => entry._id !== user._id);
    database.notifications = database.notifications.filter((entry) => entry.userId !== user._id);
    database.savedRoutes = database.savedRoutes.filter((entry) => entry.userId !== user._id);
    database.session = null;
    await writeDatabase(database);
    signOutGeneration += 1;
    publishAuth(database, true);
    return { message: 'User account deleted successfully' };
  });
}

export function getNotifications(params?: { type?: NotificationType | 'all' }): Promise<{ notifications: LocalNotification[]; unreadCount: number }> {
  const identity = captureIdentity();
  return serially(async () => {
    const database = await readDatabase();
    const user = requireUser(database, identity);
    const owned = database.notifications.filter((entry) => entry.userId === user._id);
    if (params?.type && params.type !== 'all' && !notificationTypes.includes(params.type)) throw new LocalAppError('Select a valid notification type.');
    return {
      notifications: owned.filter((entry) => !params?.type || params.type === 'all' || entry.type === params.type)
        .sort((left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp)),
      unreadCount: owned.filter((entry) => !entry.isRead).length,
    };
  });
}
export function createNotification(input: NotificationInput): Promise<LocalNotification> {
  const identity = captureIdentity();
  return serially(async () => {
    const database = await readDatabase();
    const user = requireUser(database, identity);
    const title = requiredText(input?.title, 'Title');
    const message = requiredText(input?.message, 'Message');
    const type = input.type ?? 'general';
    if (!notificationTypes.includes(type)) throw new LocalAppError('Select a valid notification type.');
    const now = new Date().toISOString();
    const item: LocalNotification = { _id: `notification:${Crypto.randomUUID()}`, userId: user._id, title, message, type, isRead: false, timestamp: now, createdAt: now, updatedAt: now };
    database.notifications.push(item);
    await writeDatabase(database);
    assertGeneration(identity);
    return item;
  });
}
export function markNotificationRead(id: string): Promise<LocalNotification> {
  const identity = captureIdentity();
  return serially(async () => {
    const database = await readDatabase();
    const user = requireUser(database, identity);
    const item = database.notifications.find((entry) => entry._id === id && entry.userId === user._id);
    if (!item) throw new LocalAppError('Notification not found.', 404);
    if (!item.isRead) {
      item.isRead = true;
      item.updatedAt = new Date().toISOString();
      await writeDatabase(database);
    }
    assertGeneration(identity);
    return item;
  });
}
export function deleteNotification(id: string): Promise<{ message: string; id: string }> {
  const identity = captureIdentity();
  return serially(async () => {
    const database = await readDatabase();
    const user = requireUser(database, identity);
    if (!database.notifications.some((entry) => entry._id === id && entry.userId === user._id)) throw new LocalAppError('Notification not found.', 404);
    database.notifications = database.notifications.filter((entry) => !(entry._id === id && entry.userId === user._id));
    await writeDatabase(database);
    assertGeneration(identity);
    return { message: 'Notification dismissed', id };
  });
}

function routeOwner(database: LocalDatabase, identity: Identity): string | null {
  assertIdentity(database, identity);
  return database.session?.userId ?? null;
}
export function getSavedRoutes(): Promise<SavedRoute[]> {
  const identity = captureIdentity();
  return serially(async () => {
    const database = await readDatabase();
    const userId = routeOwner(database, identity);
    return database.savedRoutes.filter((entry) => entry.userId === userId);
  });
}
export function addSampleSavedRoute(): Promise<SavedRoute> {
  const identity = captureIdentity();
  return serially(async () => {
    const database = await readDatabase();
    const userId = routeOwner(database, identity);
    const route: SavedRoute = { id: `route:${Crypto.randomUUID()}`, userId, from: 'Pettah', to: 'Moratuwa', mode: 'Bus', duration: '55m', favorite: true, muted: false };
    database.savedRoutes.unshift(route);
    await writeDatabase(database);
    assertGeneration(identity);
    return route;
  });
}
export function toggleSavedRoute(id: string): Promise<SavedRoute> {
  const identity = captureIdentity();
  return serially(async () => {
    const database = await readDatabase();
    const userId = routeOwner(database, identity);
    const route = database.savedRoutes.find((entry) => entry.id === id && entry.userId === userId);
    if (!route) throw new LocalAppError('Saved route not found.', 404);
    route.favorite = !route.favorite;
    route.muted = !route.favorite;
    await writeDatabase(database);
    assertGeneration(identity);
    return route;
  });
}


function administration(database: LocalDatabase): Administration {
  return database.administration ??= { journeys: JSON.parse(JSON.stringify(defaultJourneys)), reports: [], activities: [] };
}
function appendActivity(database: LocalDatabase, actor: PublicUser, action: string, target: string) {
  administration(database).activities.push({ id: Crypto.randomUUID(), actorId: actor._id, actorName: actor.fullName, action, target, at: new Date().toISOString() });
}
function requireAdmin(database: LocalDatabase, identity: Identity): StoredUser {
  const user = requireUser(database, identity);
  if (user.role !== 'admin') throw new LocalAppError('Admin access is required.', 403);
  return user;
}
function ensureAnotherAdmin(database: LocalDatabase, target: StoredUser) {
  if (target.role === 'admin' && !target.disabled && !database.users.some(u => u._id !== target._id && u.role === 'admin' && !u.disabled))
    throw new LocalAppError('The last active admin account must be retained.', 409);
}
export function loadCatalogue(): Promise<ManagedJourney[]> {
  return serially(async () => (await readDatabase()).administration?.journeys ?? JSON.parse(JSON.stringify(defaultJourneys)));
}
export function getAdminState() {
  const identity = captureIdentity();
  return serially(async () => {
    const database = await readDatabase(); requireAdmin(database, identity);
    return { users: database.users.map(publicUser), ...administration(database) };
  });
}
export function updateManagedUser(userId: string, changes: { role?: 'admin' | 'passenger'; disabled?: boolean }) {
  const identity = captureIdentity();
  return serially(async () => {
    const database = await readDatabase(); const actor = requireAdmin(database, identity);
    const target = database.users.find(u => u._id === userId);
    if (!target) throw new LocalAppError('User not found.', 404);
    if (target.role === 'officer') throw new LocalAppError('The demonstration Officer account is protected.', 403);
    if (changes.role !== undefined && !['admin', 'passenger'].includes(changes.role)) throw new LocalAppError('Select a valid role.');
    if (changes.disabled !== undefined && typeof changes.disabled !== 'boolean') throw new LocalAppError('Select a valid account status.');
    if ((changes.role === 'passenger' && target.role === 'admin') || (changes.disabled === true && !target.disabled)) ensureAnotherAdmin(database, target);
    if (target._id === actor._id && (changes.disabled === true || changes.role === 'passenger')) throw new LocalAppError('Use another admin account to change your own access.', 409);
    const before = `${target.role}/${target.disabled ? 'disabled' : 'active'}`;
    if (changes.role !== undefined) target.role = changes.role;
    if (changes.disabled !== undefined) target.disabled = changes.disabled;
    target.updatedAt = new Date().toISOString();
    appendActivity(database, actor, 'User access changed', `${target.email}: ${before} -> ${target.role}/${target.disabled ? 'disabled' : 'active'}`);
    assertIdentity(database, identity); await writeDatabase(database); assertGeneration(identity);
    publishAuth(database, true); return publicUser(target);
  });
}
export function saveManagedJourney(input: ManagedJourney) {
  const identity = captureIdentity();
  return serially(async () => {
    const database = await readDatabase(); const actor = requireAdmin(database, identity);
    if (!validJourney(input)) throw new LocalAppError('Enter valid route details, times, and positive fares.');
    const state = administration(database);
    if (state.journeys.some(j => j.code === input.code && j.id !== input.id)) throw new LocalAppError('Route code already exists.');
    const index = state.journeys.findIndex(j => j.id === input.id);
    const entry: ManagedJourney = JSON.parse(JSON.stringify(input));
    if (index < 0) state.journeys.push(entry); else state.journeys[index] = entry;
    appendActivity(database, actor, index < 0 ? 'Route added' : 'Route updated', `${entry.code}: ${entry.from} to ${entry.to}`);
    assertIdentity(database, identity); await writeDatabase(database); assertGeneration(identity); return entry;
  });
}
export function createSupportReport(title: string, message: string): Promise<SupportReport> {
  const identity = captureIdentity();
  return serially(async () => {
    const database = await readDatabase(); const user = requireUser(database, identity);
    const now = new Date().toISOString();
    const report: SupportReport = { id: Crypto.randomUUID(), userId: user._id, title: requiredText(title, 'Subject'), message: requiredText(message, 'Description'), status: 'Open', response: '', createdAt: now, updatedAt: now };
    administration(database).reports.push(report);
    // Retain the passenger notification alongside the report in one write.
    database.notifications.push({ _id: Crypto.randomUUID(), userId: user._id, title: report.title, message: report.message, type: 'info', isRead: false, timestamp: now, createdAt: now, updatedAt: now });
    assertIdentity(database, identity); await writeDatabase(database); assertGeneration(identity); return report;
  });
}
export function getMySupportReports(): Promise<SupportReport[]> {
  const identity = captureIdentity();
  return serially(async () => {
    const database = await readDatabase(); const user = requireUser(database, identity);
    return administration(database).reports.filter(r => r.userId === user._id);
  });
}
export function respondToReport(reportId: string, status: SupportReport['status'], response: string) {
  const identity = captureIdentity();
  return serially(async () => {
    const database = await readDatabase(); const actor = requireAdmin(database, identity);
    if (!['Open', 'In progress', 'Resolved'].includes(status)) throw new LocalAppError('Select a valid report status.');
    const report = administration(database).reports.find(r => r.id === reportId);
    if (!report) throw new LocalAppError('Report not found.', 404);
    if (typeof response !== 'string') throw new LocalAppError('Enter a response.');
    report.status = status; report.response = response.trim(); report.handledBy = actor._id; report.updatedAt = new Date().toISOString();
    if (report.response && database.users.some(u => u._id === report.userId)) {
      const now = report.updatedAt;
      database.notifications.push({ _id: Crypto.randomUUID(), userId: report.userId, title: `Support: ${report.title} (${status})`, message: report.response, type: 'info', isRead: false, timestamp: now, createdAt: now, updatedAt: now });
    }
    appendActivity(database, actor, 'Support report updated', `${report.title}: ${status}`);
    assertIdentity(database, identity); await writeDatabase(database); assertGeneration(identity); return report;
  });
}
export function recordAdminActivity(action: string, target: string) {
  const identity = captureIdentity();
  return serially(async () => {
    const database = await readDatabase(); const actor = requireAdmin(database, identity);
    appendActivity(database, actor, action, target);
    assertIdentity(database, identity); await writeDatabase(database); assertGeneration(identity);
  });
}
export function notifyStorageRestored() {
  signOutGeneration += 1; sessionGeneration += 1; sessionSnapshot = null;
  for (const listener of listeners) { try { listener(null); } catch {} }
}
