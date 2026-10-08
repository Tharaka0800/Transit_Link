import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, router, useFocusEffect } from 'expo-router';
import Navbar from '../components/Navbar';
import FormInput from '../components/FormInput';
import Button from '../components/Button';
import LocalAvatar from '../components/LocalAvatar';
import { useAuth } from '../auth/AuthProvider';
import AuthLoading from '../auth/AuthLoading';
import {
  getUserProfile,
  updateUserProfile,
  deleteUserProfile,
  getNotifications,
  clearAuth,
  saveAuth,
} from '../services/api';
import { showAlert } from '../components/AppAlert';
import { colors } from '../theme';

const menuItems = [
  { key: 'edit', label: 'Edit Profile', icon: 'person-outline' },
  { key: 'tickets', label: 'My Tickets', icon: 'ticket-outline', tab: 'Tickets' },
  { key: 'routes', label: 'Saved Routes', icon: 'location-outline', tab: 'Routes' },
  { key: 'notifications', label: 'Notifications', icon: 'notifications-outline', badge: true },
  { key: 'settings', label: 'Settings', icon: 'settings-outline' },
  { key: 'help', label: 'Help & Support', icon: 'help-circle-outline' },
];

const tabPaths = {
  Tickets: '/(tabs)/tickets',
  Routes: '/(tabs)/routes',
};

const Profile = () => {
  const { session, isRestoring } = useAuth();
  const tokenRef = useRef(session?.token);
  tokenRef.current = session?.token;
  const mountedRef = useRef(true);
  const savePending = useRef(false);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);
  const [user, setUser] = useState(null);
  const [loadedToken, setLoadedToken] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('profile');
  const [editForm, setEditForm] = useState({
    fullName: '',
    email: '',
    phone: '',
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (isActive) => {
    if (!session?.token) return;
    try {
      setLoading(true);
      setLoadError(null);
      const [profileRes, notifRes] = await Promise.all([
        getUserProfile(),
        getNotifications(),
      ]);
      if (!isActive()) return;
      setUser(profileRes.data);
      setLoadedToken(session.token);
      setEditForm({
        fullName: profileRes.data.fullName || '',
        email: profileRes.data.email || '',
        phone: profileRes.data.phone || '',
      });
      setUnreadCount(notifRes.data.unreadCount || 0);
    } catch (err) {
      if (isActive()) {
        setLoadError({ token: session.token, message: err.response?.data?.message || err.message || 'Failed to load profile' });
      }
    } finally {
      if (isActive()) setLoading(false);
    }
  }, [session?.token]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (isRestoring || !session) return;
      setView('profile');
      void load(() => active);
      return () => { active = false; };
    }, [load, isRestoring, session?.token])
  );

  const handleMenu = (item) => {
    if (item.key === 'edit') {
      setView('edit');
      return;
    }
    if (item.key === 'settings') {
      setView('settings');
      return;
    }
    if (item.key === 'notifications') {
      router.navigate('/notifications');
      return;
    }
    if (item.key === 'help') {
      router.navigate('/help-support');
      return;
    }
    if (item.tab) {
      router.navigate(tabPaths[item.tab]);
    }
  };

  const handleSave = async () => {
    if (savePending.current || !session) return;
    const token = session.token;
    const isActive = () => mountedRef.current && tokenRef.current === token;
    savePending.current = true;
    setSaving(true);
    try {
      const { data } = await updateUserProfile(editForm);
      if (!isActive()) return;
      await saveAuth(data);
      if (!isActive()) return;
      setUser(data);
      showAlert('Success', 'Profile updated successfully');
      setView('profile');
    } catch (err) {
      if (isActive()) showAlert('Update failed', err.response?.data?.message || err.message);
    } finally {
      savePending.current = false;
      if (isActive()) setSaving(false);
    }
  };

  const handleLogout = () => {
    const token = session?.token;
    showAlert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          if (tokenRef.current !== token) return;
          try {
            await clearAuth();
            if (mountedRef.current) router.replace('/login');
          } catch (err) {
            if (mountedRef.current) showAlert('Log out failed', err.response?.data?.message || err.message);
          }
        },
      },
    ]);
  };

  const handleDelete = () => {
    const token = session?.token;
    showAlert(
      'Delete Account',
      'This cannot be undone. Delete your account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (tokenRef.current !== token) return;
            try {
              await deleteUserProfile();
              if (mountedRef.current) router.replace('/login');
            } catch (err) {
              if (mountedRef.current) showAlert('Error', err.response?.data?.message || err.message);
            }
          },
        },
      ]
    );
  };

  if (isRestoring) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.brand} /></View>;
  }
  if (!session) return <Redirect href="/login" />;

  if (loadError?.token === session.token) {
    return <AuthLoading error={loadError.message} onRetry={() => {
      const token = session.token;
      void load(() => mountedRef.current && tokenRef.current === token);
    }} />;
  }

  if (loading || loadedToken !== session.token) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  if (view === 'edit') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Navbar
          title="Edit Profile"
          titleColor={colors.gray900}
          onBack={() => setView('profile')}
        />
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.editScroll}>
            <LocalAvatar
              uri={user?.avatar}
              style={styles.editAvatar}
            />
            <FormInput
              label="Full Name"
              value={editForm.fullName}
              onChangeText={(v) => setEditForm((p) => ({ ...p, fullName: v }))}
              autoCapitalize="words"
            />
            <FormInput
              label="Email Address"
              value={editForm.email}
              onChangeText={(v) => setEditForm((p) => ({ ...p, email: v }))}
              keyboardType="email-address"
              editable={user?.role !== 'officer'}
            />
            <FormInput
              label="Phone Number"
              value={editForm.phone}
              onChangeText={(v) => setEditForm((p) => ({ ...p, phone: v }))}
              keyboardType="phone-pad"
            />
            <Button loading={saving} onPress={handleSave} style={{ marginTop: 12 }}>
              Save Changes
            </Button>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  if (view === 'settings') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Navbar title="Settings" onBack={() => setView('profile')} />
        <View style={styles.settingsBody}>
          <Button variant="secondary" onPress={handleLogout}>
            Log Out
          </Button>
          <Button variant="danger" onPress={handleDelete} style={{ marginTop: 12 }}>
            Delete Account
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.navigate('/(tabs)/home')}
          >
            <Ionicons name="arrow-back" size={24} color={colors.gray900} />
          </TouchableOpacity>
          <LocalAvatar
            uri={user?.avatar}
            style={styles.avatar}
          />
          <Text style={styles.name}>{user?.fullName || 'Passenger'}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>

        <View style={styles.menu}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.menuRow,
                index < menuItems.length - 1 && styles.menuBorder,
              ]}
              onPress={() => handleMenu(item)}
              activeOpacity={0.7}
            >
              <View style={styles.menuIcon}>
                <Ionicons name={item.icon} size={20} color={colors.brand} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              {item.badge && unreadCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              ) : null}
              <Ionicons name="chevron-forward" size={20} color={colors.gray300} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  header: {
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    paddingBottom: 28,
    paddingTop: 8,
  },
  backBtn: {
    alignSelf: 'flex-start',
    marginLeft: 12,
    marginBottom: 12,
    padding: 4,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: colors.brand,
  },
  name: {
    marginTop: 12,
    fontSize: 20,
    fontWeight: '700',
    color: colors.gray900,
  },
  email: {
    marginTop: 4,
    fontSize: 14,
    color: colors.gray500,
  },
  menu: {
    backgroundColor: colors.white,
    paddingHorizontal: 8,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  menuBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    fontWeight: '500',
    color: colors.gray900,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginRight: 6,
  },
  badgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  editScroll: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
    alignItems: 'center',
  },
  editAvatar: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 2,
    borderColor: colors.brand,
    marginBottom: 28,
  },
  settingsBody: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
});

export default Profile;
