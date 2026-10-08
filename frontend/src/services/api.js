import * as local from './LocalAppStorage';
import { clearTicketAuth } from './ticketApi';

// Keep the response shapes used by teammates' screens while performing every
// operation locally. No server URL, HTTP client, or internet connection is used.
export const registerUser = async (data) => ({ data: await local.registerUser(data) });
export const loginUser = async (data) => ({ data: await local.loginUser(data) });
export const getUserProfile = async () => ({ data: await local.getUserProfile() });
export const updateUserProfile = async (data) => ({ data: await local.updateUserProfile(data) });
export const deleteUserProfile = async () => {
  await clearTicketAuth();
  return { data: await local.deleteUserProfile() };
};

export const getNotifications = async (params) => ({ data: await local.getNotifications(params) });
export const createNotification = async (data) => ({ data: await local.createNotification(data) });
export const markNotificationRead = async (id) => ({ data: await local.markNotificationRead(id) });
export const deleteNotification = async (id) => ({ data: await local.deleteNotification(id) });

export const getSavedRoutes = async () => ({ data: await local.getSavedRoutes() });
export const addSampleSavedRoute = async () => ({ data: await local.addSampleSavedRoute() });
export const toggleSavedRoute = async (id) => ({ data: await local.toggleSavedRoute(id) });

export const saveAuth = local.saveAuth;
export const clearAuth = async () => {
  await clearTicketAuth();
  await local.clearAuth();
};
export const getStoredUser = local.getStoredUser;
export const getToken = local.getToken;
export const getAuthSession = local.getAuthSession;
export const subscribeAuth = local.subscribeAuth;

export default {
  registerUser, loginUser, getUserProfile, updateUserProfile, deleteUserProfile,
  getNotifications, createNotification, markNotificationRead, deleteNotification,
  getSavedRoutes, addSampleSavedRoute, toggleSavedRoute,
  saveAuth, clearAuth, getStoredUser, getToken, getAuthSession, subscribeAuth,
};
