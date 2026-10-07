import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import Navbar from '../components/Navbar';
import Button from '../components/Button';
import TicketCard from '../components/ticketing/TicketCard';
import { getToken } from '../services/api';
import {
  isSessionError,
  loadTickets,
  Ticket,
  ticketError,
} from '../services/ticketService';
import { currentTicketStatus } from '../utils/ticketUtils';
import { colors } from '../theme';

export default function MyTicketsScreen() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [tab, setTab] = useState<'active' | 'history'>('active');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  const [, setClock] = useState(0);
  const request = useRef(0);
  useEffect(() => {
    const timer = setInterval(() => setClock((n) => n + 1), 30000);
    return () => clearInterval(timer);
  }, []);
  const load = useCallback(async () => {
    const generation = ++request.current;
    setLoading(true);
    setError(null);
    setTickets([]);
    try {
      if (!(await getToken())) {
        if (request.current === generation) {
          setSignedOut(true);
          setTickets([]);
        }
        return;
      }
      const data = await loadTickets();
      if (request.current === generation) {
        setTickets(data);
        setSignedOut(false);
      }
    } catch (failure) {
      if (request.current === generation) {
        setError(ticketError(failure));
        if (isSessionError(failure)) {
          setSignedOut(true);
          setTickets([]);
        }
      }
    } finally {
      if (request.current === generation) setLoading(false);
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        request.current += 1;
      };
    }, [load])
  );
  const active = tickets.filter((t) =>
    ['Active', 'Upcoming'].includes(currentTicketStatus(t))
  );
  const history = tickets.filter((t) =>
    ['Used', 'Expired'].includes(currentTicketStatus(t))
  );
  const list = tab === 'active' ? active : history;
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Navbar
        title="My Tickets"
        showBack
        onBack={() => router.navigate('/(tabs)/home')}
      />
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => {
              void load();
            }}
            tintColor={colors.brand}
          />
        }
      >
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.heroIcon}>
              <Ionicons name="ticket-outline" size={26} color={colors.white} />
            </View>
            <Text style={styles.heroTag}>YOUR JOURNEY, SIMPLIFIED</Text>
          </View>
          <Text style={styles.heroTitle}>{'Less waiting.\nMore moving.'}</Text>
          <Text style={styles.heroSub}>
            Your next ride starts here. Keep every ticket in one place.
          </Text>
          <Button
            style={styles.heroButton}
            textStyle={{ color: colors.brandDark }}
            onPress={() =>
              router.push(signedOut ? '/login' : '/ticketing/purchase')
            }
          >
            + New Ticket
          </Button>
        </View>
        {signedOut ? (
          <View style={styles.empty}>
            <Ionicons
              name="lock-closed-outline"
              size={38}
              color={colors.brand}
            />
            <Text style={styles.emptyTitle}>Your tickets belong to you</Text>
            <Text style={styles.emptyText}>
              {error ||
                'Sign in to purchase a ticket and access your journey history.'}
            </Text>
            <Button onPress={() => router.push('/login')}>Sign in</Button>
          </View>
        ) : (
          <>
            <View style={styles.tabs}>
              {(['active', 'history'] as const).map((key) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.tab, tab === key && styles.selected]}
                  onPress={() => setTab(key)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: tab === key }}
                >
                  <Text
                    style={[styles.tabText, tab === key && styles.selectedText]}
                  >
                    {key === 'active'
                      ? `Active & upcoming (${active.length})`
                      : `History (${history.length})`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {error && (
              <View style={styles.errorBox}>
                <Text accessibilityRole="alert" style={styles.error}>
                  {error}
                </Text>
                <Button
                  variant="secondary"
                  onPress={() => {
                    void load();
                  }}
                >
                  Try again
                </Button>
              </View>
            )}
            {loading && !tickets.length ? (
              <ActivityIndicator
                color={colors.brand}
                style={styles.spinner}
                accessibilityLabel="Loading tickets"
              />
            ) : (
              list.map((ticket) => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  onPress={() =>
                    router.push({
                      pathname: '/ticketing/[id]',
                      params: { id: ticket.id },
                    })
                  }
                />
              ))
            )}
            {!loading && !error && !list.length && (
              <View style={styles.empty}>
                <Ionicons
                  name={tab === 'active' ? 'ticket-outline' : 'time-outline'}
                  size={44}
                  color={colors.brand}
                />
                <Text style={styles.emptyTitle}>
                  {tab === 'active'
                    ? 'Ready for your next journey?'
                    : 'Your journeys will appear here'}
                </Text>
                <Text style={styles.emptyText}>
                  {tab === 'active'
                    ? 'Choose your journey, review the fare, and get a QR ticket in a few steps.'
                    : 'Used and expired tickets stay here for your records.'}
                </Text>
                {tab === 'active' && (
                  <Button onPress={() => router.push('/ticketing/purchase')}>
                    Plan a journey
                  </Button>
                )}
              </View>
            )}
          </>
        )}
        <View style={styles.note}>
          <Ionicons
            name="shield-checkmark-outline"
            size={18}
            color={colors.gray500}
          />
          <Text style={styles.noteText}>
            Secure ticket references. No personal details in your QR.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.gray50 },
  body: { padding: 16, paddingBottom: 32 },
  hero: {
    backgroundColor: colors.brand,
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  heroIcon: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: 10,
    borderRadius: 14,
  },
  heroTag: {
    flex: 1,
    color: '#DBEAFE',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  heroTitle: {
    fontSize: 30,
    lineHeight: 36,
    color: colors.white,
    fontWeight: '800',
    marginTop: 16,
  },
  heroSub: { fontSize: 14, lineHeight: 21, color: '#DBEAFE', marginTop: 10 },
  heroButton: { backgroundColor: colors.white, marginTop: 22 },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#E5E7EB',
    borderRadius: 14,
    padding: 4,
    marginBottom: 18,
  },
  tab: { flex: 1, paddingVertical: 12, borderRadius: 11, alignItems: 'center' },
  selected: { backgroundColor: colors.white },
  tabText: { color: colors.gray500, fontSize: 12, fontWeight: '700' },
  selectedText: { color: colors.brand },
  empty: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    color: colors.gray900,
    fontSize: 19,
    fontWeight: '700',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyText: {
    color: colors.gray500,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    marginTop: 12,
  },
  noteText: { flex: 1, fontSize: 12, lineHeight: 18, color: colors.gray500 },
  spinner: { padding: 40 },
  errorBox: {
    padding: 16,
    backgroundColor: colors.redSoft,
    borderRadius: 14,
    marginBottom: 16,
  },
  error: { color: '#B91C1C', marginBottom: 12, lineHeight: 20 },
});
