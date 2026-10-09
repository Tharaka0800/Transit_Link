import { Platform } from 'react-native';

// Expo inlines EXPO_PUBLIC_* values into the client bundle. Only a public server
// address belongs here for the existing account and notification APIs.
const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
const defaultUrl = Platform.OS === 'android'
  ? 'http://10.0.2.2:5000'
  : 'http://localhost:5000';

export const BACKEND_URL = (configuredUrl || defaultUrl).replace(/\/+$/, '');
export const API_URL = `${BACKEND_URL}/api`;
