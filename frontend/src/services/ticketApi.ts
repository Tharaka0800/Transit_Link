import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from './backendConfig';

const SESSION_KEY = '@transitlink_online_ticket_session';
export interface TicketAccount {
  _id: string; fullName: string; email: string; phone?: string; role: string; token: string;
}
export const clearTicketAuth = () => AsyncStorage.removeItem(SESSION_KEY);
export async function getStoredUser(): Promise<TicketAccount | null> {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
}
export const getToken = async () => (await getStoredUser())?.token || null;
const api = axios.create({ baseURL: API_URL, timeout: 15000, headers: { 'Content-Type': 'application/json' } });
api.interceptors.request.use(async config => {
  const token = await getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use(response => response, async error => {
  if (error.response?.status === 401 && !['/users/login', '/users/register'].includes(error.config?.url))
    await clearTicketAuth();
  return Promise.reject(error);
});
export async function loginTicketAccount(email: string, password: string) {
  const { data } = await api.post<TicketAccount>('/users/login', { email: email.trim(), password });
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(data));
  return data;
}
export async function registerTicketAccount(fullName: string, email: string, phone: string, password: string) {
  const { data } = await api.post<TicketAccount>('/users/register', { fullName: fullName.trim(), email: email.trim(), phone: phone.trim(), password });
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(data));
  return data;
}
export const getUserProfile = () => api.get<TicketAccount>('/users/profile');
export default api;
