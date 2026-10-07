import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import Navbar from '../components/Navbar';
import Button from '../components/Button';
import {
  getNotifications,
  deleteNotification,
  markNotificationRead,
  createNotification,
  getToken,
} from '../services/api';
import { colors } from '../theme';

const filters = [
  { key: 'all', label: 'All' },
  { key: 'service', label: 'Service Updates' },
  { key: 'ticket', label: 'Tickets' },
];

const typeMeta = {
  delay: { icon: 'warning', bg: colors.redSoft, color: colors.red },
  service: { icon: 'bus', bg: colors.brandLight, color: colors.brand },
  ticket: { icon: 'checkmark-circle', bg: colors.greenSoft, color: colors.green },
  info: { icon: 'information-circle', bg: colors.gray100, color: colors.gray500 },
  general: { icon: 'information-circle', bg: colors.gray100, color: colors.gray500 },
};

const formatTime = (dateStr) => {
  const date = new Date(dateStr);
  const now = new Date();
  const isYesterday =
    now.getDate() - date.getDate() === 1 &&
    now.getMonth() === date.getMonth();
  if (isYesterday) return 'Yesterday';
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();
  if (isToday) {
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const Notifications = () => {
  const [activeFilter, setActiveFilter] = useState('all');
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadNotifications = useCallback(async (filter = 'all') => {
    try {
      setLoading(true);
      const { data } = await getNotifications();
      let list = data.notifications || [];
      if (filter === 'service') {
        list = list.filter((n) => n.type === 'service' || n.type === 'delay');
      } else if (filter === 'ticket') {
        list = list.filter((n) => n.type === 'ticket');
      }
      setNotifications(list);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const init = async () => {
        const token = await getToken();
        if (!token) {
          router.replace('/login');
          return;
        }
        loadNotifications('all');
      };
      init();
    }, [loadNotifications])
  );

  const handleOpen = async (item) => {
    setSelectedId((prev) => (prev === item._id ? null : item._id));
    if (!item.isRead) {
      try {
        await markNotificationRead(item._id);
        setNotifications((prev) =>
          prev.map((n) => (n._id === item._id ? { ...n, isRead: true } : n))
        );
      } catch {
        /* non-blocking */
      }
    }
  };

  const handleDismiss = async (id) => {
    try {
      await deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      setSelectedId(null);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Dismiss failed');
    }
  };

  const handleCreateDemo = async () => {
    setActionLoading(true);
    try {
      const { data } = await createNotification({
        title: 'Service Update',
        message:
          'Route 138 is now running on schedule. Thank you for your patience.',
        type: 'service',
      });
      setNotifications((prev) => [data, ...prev]);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Create failed');
    } finally {
      setActionLoading(false);
    }
  };

  const renderItem = ({ item }) => {
    const meta = typeMeta[item.type] || typeMeta.general;
    const open = selectedId === item._id;

    return (
      <View style={styles.cardWrap}>
        <TouchableOpacity
          style={[styles.card, !item.isRead && styles.cardUnread]}
          onPress={() => handleOpen(item)}
          activeOpacity={0.85}
        >
          <View style={[styles.iconCircle, { backgroundColor: meta.bg }]}>
            <Ionicons name={meta.icon} size={22} color={meta.color} />
          </View>
          <View style={styles.cardBody}>
            <View style={styles.titleRow}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              {!item.isRead ? <View style={styles.dot} /> : null}
            </View>
            <Text style={styles.cardMessage}>{item.message}</Text>
            <Text style={styles.cardTime}>
              {formatTime(item.timestamp || item.createdAt)}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.gray300} />
        </TouchableOpacity>

        {open ? (
          <View style={styles.actions}>
            {item.type === 'delay' ? (
              <Button
                style={styles.actionBtn}
                onPress={() => router.navigate('/(tabs)/routes')}
              >
                Find Alternative Route
              </Button>
            ) : null}
            {item.type === 'ticket' ? (
              <Button
                style={styles.actionBtn}
                onPress={() => router.navigate('/(tabs)/tickets')}
              >
                View Ticket
              </Button>
            ) : null}
            <Button
              variant="secondary"
              style={styles.dismissBtn}
              onPress={() => handleDismiss(item._id)}
            >
              Dismiss
            </Button>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Navbar
        title="Notifications"
        onBack={() =>
          router.canGoBack() ? router.back() : router.replace('/(tabs)/home')
        }
        rightIcon="notifications-outline"
      />

      <View style={styles.filters}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.chip, activeFilter === f.key && styles.chipActive]}
            onPress={() => {
              setActiveFilter(f.key);
              loadNotifications(f.key);
            }}
          >
            <Text
              style={[
                styles.chipText,
                activeFilter === f.key && styles.chipTextActive,
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="notifications-off-outline" size={40} color={colors.gray300} />
              <Text style={styles.emptyText}>No notifications yet</Text>
              <Button
                loading={actionLoading}
                onPress={handleCreateDemo}
                style={{ marginTop: 16, width: 200 }}
              >
                Create Demo Alert
              </Button>
            </View>
          }
          ListFooterComponent={
            notifications.length > 0 ? (
              <TouchableOpacity onPress={handleCreateDemo} disabled={actionLoading}>
                <Text style={styles.addTest}>+ Add test notification</Text>
              </TouchableOpacity>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  chip: {
    backgroundColor: colors.gray100,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipActive: { backgroundColor: colors.brand },
  chipText: { fontSize: 13, fontWeight: '500', color: colors.gray500 },
  chipTextActive: { color: colors.white },
  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32 },
  cardWrap: { marginBottom: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 14,
    backgroundColor: colors.white,
  },
  cardUnread: {
    borderColor: colors.brandLight,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1, marginHorizontal: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  cardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.gray900,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.brand,
    marginLeft: 6,
  },
  cardMessage: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: colors.gray500,
  },
  cardTime: {
    marginTop: 8,
    fontSize: 12,
    color: colors.gray400,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  actionBtn: { flexGrow: 1, minWidth: '48%' },
  dismissBtn: { flexGrow: 1, minWidth: 100 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { marginTop: 12, color: colors.gray500 },
  addTest: {
    textAlign: 'center',
    color: colors.brand,
    textDecorationLine: 'underline',
    fontWeight: '500',
    marginTop: 8,
    marginBottom: 16,
  },
});

export default Notifications;
