import { localTicketRequest, readTicketAccount, clearLocalTicketSession } from './LocalTicketStorage';

export interface TicketAccount {
  _id: string; fullName: string; email: string; phone?: string; role: string; token: string;
}
export const clearTicketAuth = clearLocalTicketSession;
export const getStoredUser = readTicketAccount;
export const getToken = async () => (await getStoredUser())?.token || null;

// Preserve screen/service response contracts while using device storage only.
const api = {
  get: async <T = any>(path: string): Promise<{ data: T }> => ({ data: await localTicketRequest('GET', path) }),
  post: async <T = any>(path: string, body?: unknown): Promise<{ data: T }> => ({ data: await localTicketRequest('POST', path, body) }),
};
export async function loginTicketAccount(email: string, password: string) {
  return (await api.post<TicketAccount>('/users/login', { email, password })).data;
}
export async function registerTicketAccount(fullName: string, email: string, phone: string, password: string) {
  return (await api.post<TicketAccount>('/users/register', { fullName, email, phone, password })).data;
}
export const getUserProfile = () => api.get<TicketAccount>('/users/profile');
export default api;
