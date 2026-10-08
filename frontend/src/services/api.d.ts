import type {
  AuthenticatedUser, AuthSession, LocalNotification, LoginInput, NotificationInput,
  NotificationType, ProfileUpdates, PublicUser, RegistrationInput, SavedRoute,
} from './LocalAppStorage';

export function registerUser(data: RegistrationInput): Promise<{ data: AuthenticatedUser }>;
export function loginUser(data: LoginInput): Promise<{ data: AuthenticatedUser }>;
export function getUserProfile(): Promise<{ data: PublicUser }>;
export function updateUserProfile(data: ProfileUpdates): Promise<{ data: AuthenticatedUser }>;
export function deleteUserProfile(): Promise<{ data: { message: string } }>;
export function getNotifications(params?: { type?: NotificationType | 'all' }): Promise<{ data: { notifications: LocalNotification[]; unreadCount: number } }>;
export function createNotification(data: NotificationInput): Promise<{ data: LocalNotification }>;
export function markNotificationRead(id: string): Promise<{ data: LocalNotification }>;
export function deleteNotification(id: string): Promise<{ data: { message: string; id: string } }>;
export function getSavedRoutes(): Promise<{ data: SavedRoute[] }>;
export function addSampleSavedRoute(): Promise<{ data: SavedRoute }>;
export function toggleSavedRoute(id: string): Promise<{ data: SavedRoute }>;
export function saveAuth(user: Pick<AuthenticatedUser, '_id' | 'token'>): Promise<void>;
export function clearAuth(): Promise<void>;
export function getStoredUser(): Promise<PublicUser | null>;
export function getToken(): Promise<string | null>;
export function getAuthSession(): Promise<AuthSession | null>;
export function subscribeAuth(listener: (session: AuthSession | null) => void): () => void;

declare const api: {
  registerUser: typeof registerUser; loginUser: typeof loginUser;
  getUserProfile: typeof getUserProfile; updateUserProfile: typeof updateUserProfile;
  deleteUserProfile: typeof deleteUserProfile; getNotifications: typeof getNotifications;
  createNotification: typeof createNotification; markNotificationRead: typeof markNotificationRead;
  deleteNotification: typeof deleteNotification; getSavedRoutes: typeof getSavedRoutes;
  addSampleSavedRoute: typeof addSampleSavedRoute; toggleSavedRoute: typeof toggleSavedRoute;
  saveAuth: typeof saveAuth; clearAuth: typeof clearAuth; getStoredUser: typeof getStoredUser;
  getToken: typeof getToken; getAuthSession: typeof getAuthSession; subscribeAuth: typeof subscribeAuth;
};
export default api;
