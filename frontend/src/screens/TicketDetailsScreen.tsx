import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import Navbar from '../components/Navbar';
import Button from '../components/Button';
import TicketQRCode from '../components/ticketing/TicketQRCode';
import TicketStatusBadge from '../components/ticketing/TicketStatusBadge';
import {
  Ticket,
  loadTicket,
  ticketError,
  isSessionError,
} from '../services/ticketService';
import {
  currentTicketStatus,
  formatFare,
  formatTicketDate,
  formatTicketTime,
} from '../utils/ticketUtils';
import { colors } from '../theme';
import useTicketAutoRefresh from '../hooks/useTicketAutoRefresh';

export default function TicketDetailsScreen() {
  const params = useLocalSearchParams<{
    id?: string | string[];
    purchased?: string;
    present?: string;
  }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [, tick] = useState(0);
  const request = useRef(0);
  useEffect(() => {
    const timer = setInterval(() => tick((n) => n + 1), 10000);
    return () => clearInterval(timer);
  }, []);
  const load = useCallback(
    async (showLoading = true) => {
      const generation = ++request.current;
      if (showLoading) {
        setLoading(true);
        setError(null);
      }
      try {
        if (!id) {
          setError('Ticket not found.');
          return;
        }
        const data = await loadTicket(id);
        if (request.current === generation) {
          setTicket(data);
          setSignedOut(false);
          setError(null);
        }
      } catch (failure) {
        if (request.current === generation) {
          setError(ticketError(failure));
          if (isSessionError(failure)) {
            setSignedOut(true);
            setTicket(null);
            setFullscreen(false);
          }
        }
      } finally {
        if (request.current === generation) setLoading(false);
      }
    },
    [id]
  );
  useTicketAutoRefresh(useCallback(() => load(false), [load]));
  useEffect(() => {
    if (params.present === '1') setFullscreen(true);
  }, [id, params.present]);
  useEffect(() => {
    if (ticket && !['Active', 'Upcoming'].includes(currentTicketStatus(ticket)))
      setFullscreen(false);
  }, [ticket]);
  useFocusEffect(
    useCallback(() => {
      setTicket(null);
      void load();
      return () => {
        request.current += 1;
      };
    }, [load])
  );
  const status = ticket ? currentTicketStatus(ticket) : null;
  const usable = status === 'Active' || status === 'Upcoming';
  const back = () => router.replace('/(tabs)/tickets');
  const qr =
    ticket?.qrPayload && usable ? (
      <TicketQRCode key={ticket.id} payload={ticket.qrPayload} />
    ) : null;
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Navbar title="Digital Ticket" onBack={back} />
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
        {params.purchased === '1' && ticket && (
          <View style={styles.success}>
            <Ionicons name="checkmark-circle" size={24} color={colors.green} />
            <View style={styles.flex}>
              <Text style={styles.successTitle}>Your ticket is ready!</Text>
              {(ticket.passengerCount || 1) > 1 && (
                <Text style={styles.successText}>
                  {ticket.passengerCount} tickets booked. Open My Tickets to view each passenger's QR.
                </Text>
              )}
              <Text style={styles.successText}>
                Demo purchase confirmed. No payment was collected.
              </Text>
            </View>
          </View>
        )}
        {error && (
          <View style={styles.errorBox}>
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
            <Button
              variant="secondary"
              onPress={() => (signedOut ? router.push('/login') : void load())}
            >
              {signedOut ? 'Sign in' : 'Try again'}
            </Button>
          </View>
        )}
        {loading && !ticket ? (
          <ActivityIndicator color={colors.brand} style={styles.loading} />
        ) : ticket && status ? (
          <>
            <View style={styles.pass}>
              <View style={styles.passHeader}>
                <View style={styles.between}>
                  <Text style={styles.brand}>TransitLink</Text>
                  <Ionicons
                    name={
                      ticket.journey.mode === 'Bus'
                        ? 'bus-outline'
                        : 'train-outline'
                    }
                    size={25}
                    color={colors.white}
                  />
                </View>
                <Text style={styles.eyebrow}>
                  {ticket.journey.mode.toUpperCase()} · {ticket.journey.code} ·
                  SINGLE JOURNEY
                </Text>
                <View style={styles.routeRow}>
                  <View style={styles.flex}>
                    <Text style={styles.endpointLabel}>FROM</Text>
                    <Text style={styles.place}>{ticket.journey.from}</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={22} color="#BFDBFE" />
                  <View style={styles.flex}>
                    <Text style={styles.endpointLabel}>TO</Text>
                    <Text style={styles.place}>{ticket.journey.to}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.passBody}>
                <View style={styles.between}>
                  <Text style={styles.ticketLabel}>DIGITAL BOARDING PASS</Text>
                  <TicketStatusBadge status={status} />
                </View>
                <View style={styles.infoGrid}>
                  <View style={styles.infoCell}>
                    <Text style={styles.label}>JOURNEY DATE</Text>
                    <Text style={styles.value}>
                      {formatTicketDate(ticket.validFrom)}
                    </Text>
                  </View>
                  <View style={styles.infoCell}>
                    <Text style={styles.label}>START TIME</Text>
                    <Text style={styles.value}>
                      {formatTicketTime(ticket.validFrom)}
                    </Text>
                  </View>
                  <View style={styles.infoCell}>
                    <Text style={styles.label}>TICKET TYPE</Text>
                    <Text style={styles.value}>{ticket.ticketTypeLabel}</Text>
                  </View>
                  <View style={styles.infoCell}>
                    <Text style={styles.label}>FARE</Text>
                    <Text style={styles.fare}>
                      {formatFare(ticket.fareMinor)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.label}>PASSENGER</Text>
                <Text style={styles.value}>{ticket.passengerName}</Text>
                {(ticket.passengerCount || 1) > 1 && (
                  <Text style={styles.hint}>Passenger {ticket.passengerNumber} of {ticket.passengerCount}</Text>
                )}
                <View style={styles.tear}>
                  <View style={styles.notchLeft} />
                  <View style={styles.dashed} />
                  <View style={styles.notchRight} />
                </View>
                {qr || (
                  <View style={styles.inactive}>
                    <Ionicons
                      name={
                        status === 'Used'
                          ? 'checkmark-done-circle-outline'
                          : 'time-outline'
                      }
                      size={48}
                      color={colors.gray400}
                    />
                    <Text style={styles.inactiveTitle}>
                      Ticket {status.toLowerCase()}
                    </Text>
                    <Text style={styles.hint}>
                      This ticket is no longer available for travel.
                    </Text>
                  </View>
                )}
                <Text style={styles.scanTitle}>
                  {status === 'Upcoming'
                    ? 'Ready for your upcoming journey'
                    : status === 'Active'
                      ? 'Show this QR when you board'
                      : 'Saved in your journey history'}
                </Text>
                {usable && (
                  <Text style={styles.hint}>
                    An authorized officer will scan and validate your ticket.{' '}
                    {status === 'Upcoming'
                      ? 'Valid from the start time shown above.'
                      : 'Valid for one use.'}
                  </Text>
                )}
                <Text selectable style={styles.reference}>
                  {ticket.reference}
                </Text>
                <View style={styles.validity}>
                  <Ionicons
                    name="time-outline"
                    size={18}
                    color={colors.brand}
                  />
                  <Text style={styles.validityText}>
                    Valid until {formatTicketDate(ticket.validUntil)} at{' '}
                    {formatTicketTime(ticket.validUntil)}
                  </Text>
                </View>
              </View>
            </View>
            {usable && !!ticket.qrPayload && (
              <Button onPress={() => setFullscreen(true)}>
                Present QR fullscreen
              </Button>
            )}
            {usable && !!ticket.qrPayload && (
              <>
                <Button
                  variant="secondary"
                  style={styles.secondary}
                  onPress={() => setShowToken((value) => !value)}
                >
                  {showToken
                    ? 'Hide verification token'
                    : 'Camera unavailable? Show token'}
                </Button>
                {showToken && (
                  <View style={styles.errorBox}>
                    <Text style={styles.hint}>
                      Show this only to the verifying officer. It represents
                      your ticket.
                    </Text>
                    <Text selectable style={styles.reference}>
                      {ticket.qrPayload}
                    </Text>
                  </View>
                )}
              </>
            )}
            <Button variant="secondary" style={styles.secondary} onPress={back}>
              Back to My Tickets
            </Button>
            <Text style={styles.receipt}>
              Issued {formatTicketDate(ticket.purchasedAt)} ·{' '}
              {formatTicketTime(ticket.purchasedAt)}
              {ticket.usedAt
                ? `\nValidated ${formatTicketDate(ticket.usedAt)} · ${formatTicketTime(ticket.usedAt)}`
                : ''}
            </Text>
          </>
        ) : null}
      </ScrollView>
      <Modal
        visible={fullscreen && usable && !!ticket?.qrPayload}
        animationType="fade"
        onRequestClose={() => setFullscreen(false)}
      >
        <SafeAreaView style={styles.present}>
          <Text style={styles.presentTitle}>Ready to board</Text>
          <Text style={styles.hint}>
            Hold your screen steady for the officer.
          </Text>
          {qr}
          <Text style={styles.presentRoute}>
            {ticket?.journey.from} → {ticket?.journey.to}
          </Text>
          {status && (
            <View>
              <TicketStatusBadge status={status} />
            </View>
          )}
          <Text style={styles.reference}>{ticket?.reference}</Text>
          <Button variant="secondary" onPress={() => setFullscreen(false)}>
            Close QR
          </Button>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.gray50 },
  body: { padding: 20, paddingBottom: 32 },
  flex: { flex: 1 },
  loading: { padding: 40 },
  success: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    backgroundColor: colors.greenSoft,
    borderRadius: 16,
    marginBottom: 20,
  },
  successTitle: { color: '#166534', fontWeight: '700', fontSize: 15 },
  successText: { color: '#166534', fontSize: 12, lineHeight: 18, marginTop: 3 },
  pass: {
    borderRadius: 24,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    marginBottom: 20,
  },
  passHeader: { backgroundColor: colors.brand, padding: 22 },
  between: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  brand: { color: colors.white, fontSize: 20, fontWeight: '800' },
  eyebrow: { color: '#DBEAFE', fontSize: 10, letterSpacing: 1, marginTop: 18 },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 22,
  },
  endpointLabel: { color: '#BFDBFE', fontSize: 10, letterSpacing: 1 },
  place: { color: colors.white, fontSize: 21, fontWeight: '700', marginTop: 7 },
  passBody: { padding: 20 },
  ticketLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: colors.gray500,
  },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, gap: 12 },
  infoCell: { flexBasis: '45%', flexGrow: 1 },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.gray500,
    letterSpacing: 0.5,
    marginTop: 14,
    marginBottom: 6,
  },
  value: { fontSize: 14, fontWeight: '600', color: colors.gray900 },
  fare: { fontSize: 17, fontWeight: '800', color: colors.brand },
  tear: { marginVertical: 26, position: 'relative' },
  dashed: {
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.gray300,
  },
  notchLeft: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.gray50,
    left: -33,
    top: -12,
  },
  notchRight: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.gray50,
    right: -33,
    top: -12,
  },
  scanTitle: {
    color: colors.gray900,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 18,
  },
  hint: {
    color: colors.gray500,
    fontSize: 12,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 8,
  },
  reference: {
    color: colors.gray500,
    fontSize: 11,
    textAlign: 'center',
    letterSpacing: 0.5,
    marginVertical: 16,
  },
  validity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.brandSoft,
    padding: 12,
    borderRadius: 12,
  },
  validityText: {
    flex: 1,
    color: colors.brandDark,
    fontSize: 12,
    lineHeight: 18,
  },
  secondary: { marginTop: 12 },
  receipt: {
    color: colors.gray500,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 18,
  },
  present: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.white,
    gap: 18,
  },
  presentTitle: { fontSize: 28, fontWeight: '800', color: colors.gray900 },
  presentRoute: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray900,
    textAlign: 'center',
  },
  errorBox: {
    padding: 16,
    borderRadius: 14,
    backgroundColor: colors.redSoft,
    marginBottom: 16,
  },
  error: { color: '#B91C1C', marginBottom: 12, lineHeight: 20 },
  inactive: { alignItems: 'center', paddingVertical: 20 },
  inactiveTitle: {
    fontWeight: '700',
    color: colors.gray700,
    marginTop: 12,
    fontSize: 18,
  },
});
