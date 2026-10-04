import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Android emulator maps host machine localhost via 10.0.2.2
// iOS simulator can use localhost; physical devices need your LAN IP
const getBaseURL = () => {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000/api';
  }
  return 'http://localhost:5000/api';
};

const TOKEN_KEY = 'transitlink_token';
const USER_KEY = 'transitlink_user';

const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const isAuthRoute =
        error.config?.url?.includes('/users/login') ||
        error.config?.url?.includes('/users/register');
      if (!isAuthRoute) {
        await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
      }
    }
    return Promise.reject(error);
  }
);

// Auth & Profile
export const registerUser = (data) => api.post('/users/register', data);
export const loginUser = (data) => api.post('/users/login', data);
export const getUserProfile = () => api.get('/users/profile');
export const updateUserProfile = (data) => api.put('/users/profile', data);
export const deleteUserProfile = () => api.delete('/users/profile');

// Notifications
export const getNotifications = (params) =>
  api.get('/notifications', { params });
export const createNotification = (data) => api.post('/notifications', data);
export const markNotificationRead = (id) => api.put(`/notifications/${id}`);
export const deleteNotification = (id) => api.delete(`/notifications/${id}`);

export const saveAuth = async (userData) => {
  await AsyncStorage.setItem(TOKEN_KEY, userData.token);
  await AsyncStorage.setItem(
    USER_KEY,
    JSON.stringify({
      _id: userData._id,
      fullName: userData.fullName,
      email: userData.email,
      phone: userData.phone,
      role: userData.role,
      avatar: userData.avatar,
    })
  );
};

export const clearAuth = async () => {
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
};

export const getStoredUser = async () => {
  const raw = await AsyncStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
};

export const getToken = async () => AsyncStorage.getItem(TOKEN_KEY);

export default api;
