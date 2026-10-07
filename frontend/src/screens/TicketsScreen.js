import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Navbar from '../components/Navbar';
import Button from '../components/Button';
import { upcomingTickets, pastTickets } from '../data/mockData';
import { colors } from '../theme';

const TicketCard = ({ ticket, onView }) => {
  const isTrain = ticket.mode === 'Train';
  const isActive = ticket.status === 'Active';

  return (
    <View style={styles.card}>
      <View style={styles.badgeRow}>
        <View style={styles.modeBadge}>
          <Ionicons
            name={isTrain ? 'train-outline' : 'bus-outline'}
            size={14}
            color={colors.brand}
          />
          <Text style={styles.modeText}>{ticket.mode}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            isActive ? styles.statusActive : styles.statusUsed,
          ]}
        >
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isActive ? colors.green : colors.gray400 },
            ]}
          />
          <Text
            style={[
              styles.statusText,
              { color: isActive ? colors.green : colors.gray500 },
            ]}
          >
            {ticket.status}
          </Text>
        </View>
      </View>

      <View style={styles.contentRow}>
        <View style={styles.qrBox}>
          <Ionicons name="qr-code-outline" size={40} color={colors.gray700} />
        </View>
        <View style={styles.info}>
          <Text style={styles.route}>
            {ticket.from} → {ticket.to}
          </Text>
          <Text style={styles.meta}>
            {ticket.date} - {ticket.time}
          </Text>
          <Text style={styles.meta}>ID: {ticket.id}</Text>
        </View>
      </View>

      <Button onPress={() => onView(ticket)} style={styles.detailBtn}>
        View Ticket Details
      </Button>
    </View>
  );
};

const TicketsScreen = () => {
  const [tab, setTab] = useState('upcoming');
  const list = tab === 'upcoming' ? upcomingTickets : pastTickets;

  const handleView = (ticket) => {
    Alert.alert(
      `${ticket.mode} Ticket`,
      `${ticket.from} → ${ticket.to}\n${ticket.date} · ${ticket.time}\nID: ${ticket.id}\nStatus: ${ticket.status}`,
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Navbar
        title="My Tickets"
        showBack
        onBack={() => router.navigate('/(tabs)/home')}
      />

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'upcoming' && styles.tabActive]}
          onPress={() => setTab('upcoming')}
        >
          <Text style={[styles.tabText, tab === 'upcoming' && styles.tabTextActive]}>
            Upcoming
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'past' && styles.tabActive]}
          onPress={() => setTab('past')}
        >
          <Text style={[styles.tabText, tab === 'past' && styles.tabTextActive]}>
            Past
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {list.map((ticket) => (
          <TicketCard key={ticket.id} ticket={ticket} onView={handleView} />
        ))}
        {list.length === 0 ? (
          <Text style={styles.empty}>No tickets in this category.</Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: colors.gray100,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.brand,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray500,
  },
  tabTextActive: {
    color: colors.white,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 14,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brandSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  modeText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '600',
    color: colors.brand,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusActive: {
    backgroundColor: colors.greenSoft,
  },
  statusUsed: {
    backgroundColor: colors.gray100,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  qrBox: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    marginLeft: 14,
  },
  route: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.gray900,
    marginBottom: 4,
  },
  meta: {
    fontSize: 13,
    color: colors.gray500,
    marginTop: 2,
  },
  detailBtn: {
    marginTop: 2,
  },
  empty: {
    textAlign: 'center',
    color: colors.gray500,
    marginTop: 40,
  },
});

export default TicketsScreen;
