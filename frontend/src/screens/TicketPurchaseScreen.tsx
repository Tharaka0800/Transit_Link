import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Navbar from '../components/Navbar';
import Button from '../components/Button';
import FormInput from '../components/FormInput';
import { getStoredUser, getToken } from '../services/api';
import {
  Journey,
  Quote,
  loadJourneys,
  quoteJourney,
  purchaseQuote,
  ticketError,
  isSessionError,
} from '../services/ticketService';
import {
  defaultDeparture,
  parseDeparture,
  formatDuration,
  formatFare,
  formatTicketDate,
  formatTicketTime,
} from '../utils/ticketUtils';
import { colors } from '../theme';

export default function TicketPurchaseScreen() {
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [mode, setMode] = useState<'Bus' | 'Train'>('Bus');
  const [search, setSearch] = useState('');
  const [journeyId, setJourneyId] = useState('');
  const [type, setType] = useState('');
  const [departure, setDeparture] = useState(defaultDeparture);
  const [travelNow, setTravelNow] = useState(true);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [passenger, setPassenger] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  const [retry, setRetry] = useState(0);
  const [now, setNow] = useState(Date.now());
  const mounted = useRef(false);
  const submitting = useRef(false);
  const purchaseUncertain = useRef(false);
  useEffect(() => {
    mounted.current = true;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      mounted.current = false;
      clearInterval(timer);
    };
  }, []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    const load = async () => {
      try {
        if (!(await getToken())) {
          if (active) setSignedOut(true);
          return;
        }
        const [data, user] = await Promise.all([
          loadJourneys(),
          getStoredUser(),
        ]);
        if (active) {
          setJourneys(data);
          setPassenger(user?.fullName || 'Passenger');
          setSignedOut(false);
        }
      } catch (failure) {
        if (active) {
          setError(ticketError(failure));
          if (isSessionError(failure)) setSignedOut(true);
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [retry]);
  const journey = journeys.find((j) => j.id === journeyId);
  const selectedType = journey?.ticketTypes.find((t) => t.code === type);
  const available = journeys.filter(
    (j) =>
      j.mode === mode &&
      `${j.from} ${j.to} ${j.code}`
        .toLowerCase()
        .includes(search.toLowerCase().trim())
  );
  const expired = quote ? new Date(quote.expiresAt).getTime() <= now : false;
  const back = () => {
    if (busy) return;
    if (purchaseUncertain.current) {
      router.replace('/(tabs)/tickets');
      return;
    }
    if (quote) {
      setQuote(null);
      setError(null);
      purchaseUncertain.current = false;
    } else if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/tickets');
  };
  const review = async () => {
    if (submitting.current || !journey || !selectedType) return;
    const at = parseDeparture(departure.date, departure.time);
    if (
      !travelNow &&
      (!at ||
        at.getTime() <= Date.now() ||
        at.getTime() > Date.now() + 30 * 86400000)
    ) {
      setDateError('Choose a valid date and time within the next 30 days.');
      return;
    }
    submitting.current = true;
    setBusy(true);
    setError(null);
    setDateError(null);
    try {
      const data = await quoteJourney(
        journey.id,
        type,
        travelNow ? 'now' : at!.toISOString()
      );
      if (mounted.current) {
        setQuote(data);
        purchaseUncertain.current = false;
      }
    } catch (failure) {
      if (mounted.current) {
        setError(ticketError(failure));
        if (isSessionError(failure)) setSignedOut(true);
      }
    } finally {
      submitting.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  const purchase = async () => {
    if (submitting.current || !quote || (expired && !purchaseUncertain.current))
      return;
    submitting.current = true;
    setBusy(true);
    setError(null);
    try {
      const ticket = await purchaseQuote(quote.id);
      if (mounted.current)
        router.replace({
          pathname: '/ticketing/[id]',
          params: { id: ticket.id, purchased: '1' },
        });
    } catch (failure) {
      if (mounted.current) {
        setError(ticketError(failure));
        const response = (failure as { response?: { status?: number } })
          .response;
        purchaseUncertain.current = !response || (response.status || 0) >= 500;
        if (isSessionError(failure)) setSignedOut(true);
      }
    } finally {
      submitting.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Navbar
        title={quote ? 'Review your ticket' : 'New Ticket'}
        onBack={back}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.steps}>
            {['Journey', 'Review', 'Your QR'].map((label, i) => (
              <View key={label} style={styles.step}>
                <View
                  style={[
                    styles.stepDot,
                    i <= (quote ? 1 : 0) && styles.stepDotActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.stepNumber,
                      i <= (quote ? 1 : 0) && styles.white,
                    ]}
                  >
                    {i + 1}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    i === (quote ? 1 : 0) && styles.stepLabelActive,
                  ]}
                >
                  {label}
                </Text>
              </View>
            ))}
          </View>
          {loading ? (
            <ActivityIndicator style={styles.loading} color={colors.brand} />
          ) : signedOut ? (
            <View style={styles.panel}>
              <Text style={styles.title}>Sign in to continue</Text>
              <Text style={styles.subtitle}>
                {error ||
                  'Use your TransitLink account to keep your tickets safe.'}
              </Text>
              <Button onPress={() => router.push('/login')}>Sign in</Button>
            </View>
          ) : quote ? (
            <>
              <Text style={styles.title}>One last look.</Text>
              <Text style={styles.subtitle}>
                Check your journey before we issue your digital ticket.
              </Text>
              <View style={styles.panel}>
                <View style={styles.row}>
                  <Ionicons
                    name={
                      quote.journey.mode === 'Bus'
                        ? 'bus-outline'
                        : 'train-outline'
                    }
                    size={22}
                    color={colors.brand}
                  />
                  <Text style={styles.modeText}>
                    {quote.journey.mode} · {quote.journey.code}
                  </Text>
                </View>
                <Text style={styles.route}>{quote.journey.from}</Text>
                <Ionicons
                  name="arrow-down"
                  size={20}
                  color={colors.brand}
                  style={{ marginVertical: 8 }}
                />
                <Text style={styles.route}>{quote.journey.to}</Text>
                <View style={styles.divider} />
                <Text style={styles.label}>JOURNEY START</Text>
                <Text style={styles.value}>
                  {formatTicketDate(quote.validFrom)} ·{' '}
                  {formatTicketTime(quote.validFrom)}
                </Text>
                <Text style={styles.label}>VALID UNTIL</Text>
                <Text style={styles.value}>
                  {formatTicketDate(quote.validUntil)} ·{' '}
                  {formatTicketTime(quote.validUntil)}
                </Text>
                <Text style={styles.label}>PASSENGER</Text>
                <Text style={styles.value}>{passenger}</Text>
              </View>
              <View style={styles.panel}>
                <Text style={styles.sectionTitle}>Fare breakdown</Text>
                <View style={styles.between}>
                  <Text style={styles.value}>{quote.ticketTypeLabel} × 1</Text>
                  <Text style={styles.value}>
                    {formatFare(quote.fareMinor)}
                  </Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.between}>
                  <Text style={styles.sectionTitle}>Total fare</Text>
                  <Text style={styles.total}>
                    {formatFare(quote.fareMinor)}
                  </Text>
                </View>
              </View>
              <View style={styles.demo}>
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color={colors.brand}
                />
                <Text style={styles.demoText}>
                  University demo purchase. No payment is collected. One ticket
                  admits one passenger and can be validated once.
                </Text>
              </View>
              <Text style={styles.quoteTime}>
                {expired
                  ? 'Quote expired. Review the journey again.'
                  : `Fare reserved for ${Math.ceil((new Date(quote.expiresAt).getTime() - now) / 60000)} min`}
              </Text>
              {error && (
                <Text accessibilityRole="alert" style={styles.error}>
                  {error}
                </Text>
              )}
              {purchaseUncertain.current && (
                <Text style={styles.subtitle}>
                  Your confirmation may have reached the server. Retry safely
                  with the same quote, or check My Tickets before starting
                  another purchase.
                </Text>
              )}
              <Button
                loading={busy}
                disabled={expired && !purchaseUncertain.current}
                onPress={() => {
                  void purchase();
                }}
              >
                {purchaseUncertain.current
                  ? 'Retry confirmation safely'
                  : 'Confirm demo purchase'}
              </Button>
              <Button
                variant="secondary"
                disabled={busy || purchaseUncertain.current}
                style={styles.secondary}
                onPress={back}
              >
                Edit journey
              </Button>
              <TouchableOpacity
                disabled={busy}
                onPress={() => router.replace('/(tabs)/tickets')}
                style={styles.link}
              >
                <Text style={styles.linkText}>Back to My Tickets</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.title}>Where are you heading?</Text>
              <Text style={styles.subtitle}>
                Choose your ride. We’ll take care of the ticket.
              </Text>
              <View style={styles.modeRow}>
                {(['Bus', 'Train'] as const).map((value) => (
                  <TouchableOpacity
                    key={value}
                    style={[
                      styles.modeButton,
                      mode === value && styles.modeActive,
                    ]}
                    disabled={busy}
                    onPress={() => {
                      setMode(value);
                      setJourneyId('');
                      setType('');
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: mode === value }}
                  >
                    <Ionicons
                      name={value === 'Bus' ? 'bus-outline' : 'train-outline'}
                      size={24}
                      color={mode === value ? colors.white : colors.brand}
                    />
                    <Text
                      style={[styles.modeLabel, mode === value && styles.white]}
                    >
                      {value}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.search}>
                <Ionicons
                  name="search-outline"
                  size={20}
                  color={colors.gray500}
                />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search origin, destination or route"
                  value={search}
                  onChangeText={setSearch}
                  accessibilityLabel="Search available journeys"
                />
              </View>
              <Text style={styles.sectionTitle}>Available journeys</Text>
              {error && (
                <View style={styles.panel}>
                  <Text accessibilityRole="alert" style={styles.error}>
                    {error}
                  </Text>
                  <Button
                    variant="secondary"
                    onPress={() => setRetry((n) => n + 1)}
                  >
                    Try again
                  </Button>
                </View>
              )}
              {!available.length && !error && (
                <View style={styles.panel}>
                  <Ionicons name="map-outline" size={32} color={colors.brand} />
                  <Text style={styles.emptyTitle}>No journeys available</Text>
                  <Text style={styles.subtitle}>
                    {journeys.length
                      ? 'Try another search or transport type.'
                      : 'Ticket journeys have not been configured yet. Please check back shortly.'}
                  </Text>
                </View>
              )}
              {available.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  disabled={busy}
                  style={[
                    styles.journeyCard,
                    journeyId === item.id && styles.journeySelected,
                  ]}
                  onPress={() => {
                    setJourneyId(item.id);
                    setType(item.ticketTypes[0]?.code || '');
                    setError(null);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: journeyId === item.id }}
                >
                  <View style={styles.between}>
                    <Text style={styles.routeCode}>{item.code}</Text>
                    <Ionicons
                      name={
                        journeyId === item.id
                          ? 'radio-button-on'
                          : 'radio-button-off'
                      }
                      size={22}
                      color={colors.brand}
                    />
                  </View>
                  <Text style={styles.journeyName}>
                    {item.from} → {item.to}
                  </Text>
                  <Text style={styles.journeyMeta}>
                    {formatDuration(item.durationMinutes)} · From{' '}
                    {formatFare(
                      Math.min(...item.ticketTypes.map((t) => t.fareMinor))
                    )}
                  </Text>
                </TouchableOpacity>
              ))}
              {journey && (
                <View style={styles.panel}>
                  <Text style={styles.sectionTitle}>Make it your journey</Text>
                  <Text style={styles.label}>TICKET TYPE</Text>
                  {journey.ticketTypes.map((item) => (
                    <TouchableOpacity
                      key={item.code}
                      style={[
                        styles.type,
                        type === item.code && styles.typeSelected,
                      ]}
                      disabled={busy}
                      onPress={() => setType(item.code)}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: type === item.code }}
                    >
                      <Text style={styles.value}>{item.label}</Text>
                      <Text style={styles.fare}>
                        {formatFare(item.fareMinor)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  <Text style={styles.label}>WHEN DO YOU WANT TO TRAVEL?</Text>
                  <View style={styles.modeRow}>
                    {[true, false].map((value) => (
                      <TouchableOpacity
                        key={String(value)}
                        style={[
                          styles.type,
                          { flex: 1 },
                          travelNow === value && styles.typeSelected,
                        ]}
                        disabled={busy}
                        onPress={() => {
                          setTravelNow(value);
                          setDateError(null);
                        }}
                        accessibilityRole="radio"
                        accessibilityLabel={
                          value ? 'Travel now' : 'Choose date and time'
                        }
                        accessibilityState={{ checked: travelNow === value }}
                      >
                        <Text style={styles.value}>
                          {value ? 'Travel now' : 'Schedule'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {!travelNow && (
                    <>
                      <FormInput
                        label="Travel date (YYYY-MM-DD)"
                        leftIcon="calendar-outline"
                        value={departure.date}
                        onChangeText={(date: string) => {
                          setDeparture((d) => ({ ...d, date }));
                          setDateError(null);
                        }}
                        placeholder="YYYY-MM-DD"
                        editable={!busy}
                      />
                      <FormInput
                        label="Journey start time (24-hour HH:mm)"
                        leftIcon="time-outline"
                        value={departure.time}
                        onChangeText={(time: string) => {
                          setDeparture((d) => ({ ...d, time }));
                          setDateError(null);
                        }}
                        placeholder="HH:mm"
                        editable={!busy}
                        error={dateError || undefined}
                      />
                    </>
                  )}
                  <Text style={styles.hint}>
                    {travelNow
                      ? 'Ready to board? Your ticket will be valid immediately.'
                      : 'Times use your device’s local timezone.'}{' '}
                    Valid for {formatDuration(journey.validityMinutes)} from the
                    selected start time. This is not a reserved departure or
                    seat.
                  </Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
        {!loading && !signedOut && !quote && (
          <View style={styles.bottom}>
            <View style={styles.between}>
              <Text style={styles.label}>YOUR FARE</Text>
              <Text style={styles.total}>
                {selectedType
                  ? formatFare(selectedType.fareMinor)
                  : 'Select a journey'}
              </Text>
            </View>
            <Button
              style={{ marginTop: 10 }}
              disabled={!journey || !selectedType}
              loading={busy}
              onPress={() => {
                void review();
              }}
            >
              Review ticket
            </Button>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.gray50 },
  flex: { flex: 1 },
  body: { padding: 20, paddingBottom: 32 },
  loading: { marginTop: 40 },
  steps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  step: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepDot: {
    width: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: { backgroundColor: colors.brand },
  stepNumber: { fontSize: 12, fontWeight: '700', color: colors.gray500 },
  stepLabel: { color: colors.gray500, fontSize: 12 },
  stepLabelActive: { color: colors.brand, fontWeight: '700' },
  white: { color: colors.white },
  title: { fontSize: 27, fontWeight: '800', color: colors.gray900 },
  subtitle: {
    fontSize: 14,
    color: colors.gray500,
    lineHeight: 22,
    marginTop: 8,
    marginBottom: 22,
  },
  modeRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 18,
    backgroundColor: colors.brandSoft,
    borderRadius: 16,
  },
  modeActive: { backgroundColor: colors.brand },
  modeLabel: { color: colors.brand, fontWeight: '700', fontSize: 16 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 24,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 15,
    color: colors.gray900,
  },
  sectionTitle: {
    color: colors.gray900,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
  },
  panel: {
    padding: 20,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 18,
  },
  journeyCard: {
    padding: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    marginBottom: 12,
  },
  journeySelected: {
    borderColor: colors.brand,
    backgroundColor: colors.brandSoft,
  },
  between: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  routeCode: { color: colors.brand, fontSize: 12, fontWeight: '700' },
  journeyName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.gray900,
    marginTop: 10,
  },
  journeyMeta: { fontSize: 13, color: colors.gray500, marginTop: 7 },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    color: colors.gray500,
    marginTop: 12,
    marginBottom: 6,
  },
  type: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  typeSelected: {
    borderColor: colors.brand,
    backgroundColor: colors.brandSoft,
  },
  value: { fontSize: 14, color: colors.gray900, lineHeight: 22 },
  fare: { fontSize: 14, fontWeight: '700', color: colors.brand },
  hint: { fontSize: 12, lineHeight: 19, color: colors.gray500 },
  bottom: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 20,
    paddingBottom: 12,
    paddingTop: 8,
  },
  total: { fontSize: 22, fontWeight: '800', color: colors.brand },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modeText: { color: colors.brand, fontSize: 13, fontWeight: '700' },
  route: {
    color: colors.gray900,
    fontSize: 23,
    fontWeight: '700',
    marginTop: 14,
  },
  divider: {
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.gray300,
    marginVertical: 16,
  },
  demo: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.brandSoft,
    padding: 16,
    borderRadius: 14,
    marginBottom: 16,
  },
  demoText: { flex: 1, color: colors.brandDark, fontSize: 12, lineHeight: 19 },
  quoteTime: {
    textAlign: 'center',
    color: colors.gray500,
    fontSize: 12,
    marginBottom: 16,
  },
  error: { color: '#B91C1C', lineHeight: 21, marginBottom: 16 },
  secondary: { marginTop: 12 },
  emptyTitle: {
    fontWeight: '700',
    color: colors.gray900,
    fontSize: 18,
    marginTop: 12,
  },
  link: { padding: 16, alignItems: 'center' },
  linkText: { color: colors.brand, fontWeight: '600' },
});
