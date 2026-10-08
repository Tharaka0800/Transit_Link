import AsyncStorage from '@react-native-async-storage/async-storage';
import { AxiosError } from 'axios';
import ticketApi, { getToken, loginTicketAccount, getUserProfile } from '../ticketApi';
import * as localApi from '../api';

jest.mock('expo-crypto', () => ({
  randomUUID: () => require('crypto').randomUUID(),
  getRandomValues: (bytes: Uint8Array) => { require('crypto').randomFillSync(bytes); return bytes; },
}));
const account = { _id: 'remote-user', email: 'remote@example.test', fullName: 'Remote User', role: 'passenger', token: 'server-jwt' };
const originalAdapter = ticketApi.defaults.adapter;
beforeEach(async () => { await AsyncStorage.clear(); });
afterEach(() => { ticketApi.defaults.adapter = originalAdapter; });

test('online login keeps the local account database separate and uses the server JWT', async () => {
  await AsyncStorage.setItem('@transitlink_app_v1', 'local-data-sentinel');
  const configs: any[] = [];
  ticketApi.defaults.adapter = async config => {
    configs.push(config);
    return { data: account, status: 200, statusText: 'OK', headers: {}, config };
  };
  await loginTicketAccount(' remote@example.test ', 'password');
  expect(await getToken()).toBe('server-jwt');
  expect(await AsyncStorage.getItem('@transitlink_app_v1')).toBe('local-data-sentinel');
  await getUserProfile();
  expect(configs[1].headers.Authorization).toBe('Bearer server-jwt');
  expect(JSON.parse((await AsyncStorage.getItem('@transitlink_online_ticket_session'))!)).not.toHaveProperty('password');
});

test('expired backend session clears only online credentials', async () => {
  await AsyncStorage.setItem('@transitlink_online_ticket_session', JSON.stringify(account));
  await AsyncStorage.setItem('@transitlink_app_v1', 'local-data-sentinel');
  ticketApi.defaults.adapter = async config => {
    throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, undefined,
      { data: {message: 'Expired'}, status: 401, statusText: 'Unauthorized', headers: {}, config });
  };
  await expect(getUserProfile()).rejects.toThrow('Unauthorized');
  expect(await getToken()).toBeNull();
  expect(await AsyncStorage.getItem('@transitlink_app_v1')).toBe('local-data-sentinel');
});

test('logging out of the local app also clears the online ticket account', async () => {
  await localApi.getAuthSession();
  await localApi.loginUser({email: 'tharukee01@gmail.com', password: 'password123'});
  await AsyncStorage.setItem('@transitlink_online_ticket_session', JSON.stringify(account));
  await localApi.clearAuth();
  expect(await getToken()).toBeNull();
  expect(await localApi.getAuthSession()).toBeNull();
});
