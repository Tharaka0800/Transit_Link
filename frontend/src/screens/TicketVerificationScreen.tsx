import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Navbar from '../components/Navbar';
import Button from '../components/Button';
import TicketStatusBadge from '../components/ticketing/TicketStatusBadge';
import { getToken, getUserProfile } from '../services/ticketApi';
import {
  Ticket,
  verifyQR,
  redeemQR,
  ticketError,
  isSessionError,
} from '../services/ticketService';
import {
  formatFare,
  formatTicketDate,
  formatTicketTime,
} from '../utils/ticketUtils';
import { colors } from '../theme';

export default function TicketVerificationScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [access, setAccess] = useState<
    'loading' | 'signedOut' | 'denied' | 'allowed' | 'error'
  >('loading');
  const [focused, setFocused] = useState(false);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [eligible, setEligible] = useState(false);
  const [payload, setPayload] = useState('');
  const [manual, setManual] = useState('');
  const [cameraOn, setCameraOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const generation = useRef(0);
  const inFlight = useRef(false);
  const scanLocked = useRef(false);
  const authorize = useCallback(async () => {
    const current = ++generation.current;
    setAccess('loading');
    setError(null);
    try {
      if (!(await getToken())) {
        if (generation.current === current) setAccess('signedOut');
        return;
      }
      const { data } = await getUserProfile();
      if (generation.current === current)
        setAccess(data.role === 'admin' ? 'allowed' : 'denied');
    } catch (failure) {
      if (generation.current === current) {
        setAccess(isSessionError(failure) ? 'signedOut' : 'error');
        setError(ticketError(failure));
      }
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      setTicket(null);
      setPayload('');
      setSuccess(false);
      setCameraOn(false);
      setBusy(false);
      inFlight.current = false;
      scanLocked.current = false;
      void authorize();
      return () => {
        setFocused(false);
        generation.current += 1;
      };
    }, [authorize])
  );
  const verify = async (value: string) => {
    if (inFlight.current || access !== 'allowed') return;
    inFlight.current = true;
    scanLocked.current = true;
    const current = generation.current;
    setBusy(true);
    setCameraOn(false);
    setError(null);
    setSuccess(false);
    setTicket(null);
    setEligible(false);
    setPayload(value.trim());
    try {
      const result = await verifyQR(value.trim());
      if (generation.current === current) {
        setTicket(result.ticket);
        setEligible(result.eligible);
      }
    } catch (failure) {
      if (generation.current === current) {
        setError(ticketError(failure));
        if (isSessionError(failure)) setAccess('signedOut');
      }
    } finally {
      if (generation.current === current) {
        inFlight.current = false;
        setBusy(false);
      }
    }
  };
  const redeem = async () => {
    if (inFlight.current || !eligible || !payload) return;
    inFlight.current = true;
    const current = generation.current;
    setBusy(true);
    setError(null);
    try {
      const result = await redeemQR(payload);
      if (generation.current === current) {
        setTicket(result.ticket);
        setEligible(false);
        setSuccess(true);
      }
    } catch (failure) {
      if (generation.current === current) {
        setError(ticketError(failure));
        const updated = (
          failure as { response?: { data?: { ticket?: Ticket } } }
        ).response?.data?.ticket;
        if (updated) {
          setTicket(updated);
          setEligible(false);
        }
        if (isSessionError(failure)) {
          setAccess('signedOut');
          setTicket(null);
        }
      }
    } finally {
      if (generation.current === current) {
        inFlight.current = false;
        setBusy(false);
      }
    }
  };
  const startScan = async () => {
    if (inFlight.current) return;
    const current = generation.current;
    setTicket(null);
    setSuccess(false);
    setError(null);
    setPayload('');
    scanLocked.current = false;
    if (!permission?.granted) {
      try {
        const result = await requestPermission();
        if (result.granted && generation.current === current) setCameraOn(true);
      } catch {
        if (generation.current === current)
          setError(
            'Camera access is unavailable. You can enter a ticket token below.'
          );
      }
    } else setCameraOn(true);
  };
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Navbar
        title="Verify Ticket"
        onBack={() =>
          router.canGoBack()
            ? router.back()
            : router.replace('/(tabs)/officer-dashboard')
        }
      />
      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.heading}>
          <View style={styles.icon}>
            <Ionicons name="scan-outline" size={28} color={colors.brand} />
          </View>
          <Text style={styles.title}>Scan. Check. Welcome aboard.</Text>
          <Text style={styles.subtitle}>
            Preview the ticket first, then confirm its use.
          </Text>
        </View>
        {access === 'loading' ? (
          <ActivityIndicator color={colors.brand} style={styles.loading} />
        ) : access !== 'allowed' ? (
          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>
              {access === 'signedOut'
                ? 'Sign in to verify tickets'
                : access === 'denied'
                  ? 'Authorized account required'
                  : 'Could not check your access'}
            </Text>
            <Text style={styles.subtitle}>
              {error ||
                'Verification requires the online admin account for this university demo. Officer alerts use your local Officer account.'}
            </Text>
            {access === 'signedOut' ? (
              <Button onPress={() => router.push({ pathname: '/ticketing/login', params: { next: 'verify' } })}>Sign in</Button>
            ) : access === 'error' ? (
              <Button
                onPress={() => {
                  void authorize();
                }}
              >
                Try again
              </Button>
            ) : (
              <Button
                variant="secondary"
                onPress={() => router.push({ pathname: '/ticketing/login', params: { next: 'verify' } })}
              >
                Switch online account
              </Button>
            )}
          </View>
        ) : (
          <>
            {!ticket && (
              <View style={styles.cameraCard}>
                {cameraOn &&
                focused &&
                permission?.granted &&
                Platform.OS !== 'web' ? (
                  <View style={styles.cameraFrame}>
                    <CameraView
                      style={StyleSheet.absoluteFill}
                      facing="back"
                      barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                      onBarcodeScanned={({ data }) => {
                        if (!scanLocked.current) void verify(data);
                      }}
                      onMountError={() => {
                        setCameraOn(false);
                        setError(
                          'The camera could not start. Enter the ticket token below.'
                        );
                      }}
                    />
                    <View pointerEvents="none" style={styles.scanFrame} />
                  </View>
                ) : (
                  <View style={styles.cameraPlaceholder}>
                    <Ionicons
                      name="qr-code-outline"
                      size={72}
                      color={colors.brand}
                    />
                    <Text style={styles.sectionTitle}>
                      Scan a TransitLink QR
                    </Text>
                    <Text style={styles.subtitle}>
                      {Platform.OS === 'web'
                        ? 'Use the mobile app to scan, or enter the ticket token below.'
                        : permission &&
                            !permission.granted &&
                            !permission.canAskAgain
                          ? 'Camera permission is denied. Enable it in device settings or use manual entry below.'
                          : 'Point your camera at the passenger’s ticket.'}
                    </Text>
                  </View>
                )}
                {Platform.OS !== 'web' && (
                  <Button
                    loading={busy}
                    onPress={() => {
                      if (cameraOn) setCameraOn(false);
                      else void startScan();
                    }}
                  >
                    {cameraOn ? 'Pause camera' : 'Open camera'}
                  </Button>
                )}
              </View>
            )}
            {busy && (
              <ActivityIndicator
                color={colors.brand}
                style={styles.loading}
                accessibilityLabel="Checking ticket"
              />
            )}
            {error && (
              <View style={styles.errorBox}>
                <Text accessibilityRole="alert" style={styles.error}>
                  {error}
                </Text>
                {payload && !ticket && (
                  <Button
                    variant="secondary"
                    disabled={busy}
                    onPress={() => {
                      void verify(payload);
                    }}
                  >
                    Retry verification
                  </Button>
                )}
              </View>
            )}
            {ticket && (
              <View style={styles.panel}>
                {success && (
                  <View style={styles.success}>
                    <Ionicons
                      name="checkmark-circle"
                      size={32}
                      color={colors.green}
                    />
                    <Text style={styles.successTitle}>
                      Validated. Passenger may board.
                    </Text>
                  </View>
                )}
                <View style={styles.between}>
                  <Text style={styles.sectionTitle}>Ticket preview</Text>
                  <TicketStatusBadge status={ticket.status} />
                </View>
                <Text style={styles.route}>
                  {ticket.journey.from} → {ticket.journey.to}
                </Text>
                <Text style={styles.subtitle}>
                  {ticket.journey.mode} · {ticket.journey.code} ·{' '}
                  {ticket.ticketTypeLabel}
                </Text>
                <Text style={styles.label}>PASSENGER</Text>
                <Text style={styles.value}>{ticket.passengerName}</Text>
                <Text style={styles.label}>VALID FROM</Text>
                <Text style={styles.value}>
                  {formatTicketDate(ticket.validFrom)} ·{' '}
                  {formatTicketTime(ticket.validFrom)}
                </Text>
                <Text style={styles.label}>VALID UNTIL</Text>
                <Text style={styles.value}>
                  {formatTicketDate(ticket.validUntil)} ·{' '}
                  {formatTicketTime(ticket.validUntil)}
                </Text>
                <Text style={styles.label}>FARE / REFERENCE</Text>
                <Text style={styles.value}>{formatFare(ticket.fareMinor)}</Text>
                <Text style={styles.reference}>{ticket.reference}</Text>
                <Text style={styles.demo}>
                  Demo-issued ticket · no payment collected
                </Text>
                {eligible ? (
                  <>
                    <Text style={styles.subtitle}>
                      This action marks the ticket used and cannot be undone.
                    </Text>
                    <Button
                      loading={busy}
                      onPress={() => {
                        void redeem();
                      }}
                    >
                      Validate & mark used
                    </Button>
                  </>
                ) : (
                  !success && (
                    <Text accessibilityRole="alert" style={styles.error}>
                      This ticket is {ticket.status.toLowerCase()} and is not
                      valid for boarding now.
                    </Text>
                  )
                )}
                <Button
                  variant="secondary"
                  disabled={busy}
                  style={{ marginTop: 12 }}
                  onPress={() => {
                    setTicket(null);
                    setPayload('');
                    setManual('');
                    setError(null);
                    setSuccess(false);
                    scanLocked.current = false;
                  }}
                >
                  Check another ticket
                </Button>
              </View>
            )}
            {!ticket && (
              <View style={styles.panel}>
                <Text style={styles.sectionTitle}>Manual verification</Text>
                <Text style={styles.subtitle}>
                  Enter the complete TL1: token from a ticket QR when camera
                  scanning is unavailable.
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="TL1:…"
                  value={manual}
                  onChangeText={setManual}
                  autoCapitalize="none"
                  autoCorrect={false}
                  multiline
                  editable={!busy}
                  accessibilityLabel="Ticket QR token"
                />
                <Button
                  variant="secondary"
                  loading={busy}
                  disabled={!manual.trim()}
                  onPress={() => {
                    void verify(manual);
                  }}
                >
                  Check ticket
                </Button>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.gray50 },
  body: { padding: 20, paddingBottom: 32 },
  heading: { marginBottom: 24 },
  icon: {
    alignSelf: 'flex-start',
    backgroundColor: colors.brandSoft,
    padding: 12,
    borderRadius: 16,
    marginBottom: 16,
  },
  title: {
    color: colors.gray900,
    fontSize: 26,
    lineHeight: 33,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.gray500,
    fontSize: 13,
    lineHeight: 21,
    marginTop: 8,
    marginBottom: 16,
  },
  panel: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 20,
    marginBottom: 18,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.gray900 },
  cameraCard: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 18,
  },
  cameraFrame: {
    height: 300,
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  scanFrame: {
    width: 210,
    height: 210,
    borderWidth: 3,
    borderColor: colors.white,
    borderRadius: 20,
  },
  cameraPlaceholder: { alignItems: 'center', paddingVertical: 24, gap: 10 },
  loading: { padding: 20 },
  errorBox: {
    padding: 16,
    borderRadius: 14,
    backgroundColor: colors.redSoft,
    marginBottom: 18,
  },
  error: { color: '#B91C1C', lineHeight: 21, marginBottom: 12 },
  success: {
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    backgroundColor: colors.greenSoft,
    marginBottom: 20,
    gap: 10,
  },
  successTitle: {
    color: '#166534',
    fontWeight: '700',
    fontSize: 16,
    textAlign: 'center',
  },
  between: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    alignItems: 'center',
  },
  route: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.gray900,
    marginTop: 22,
  },
  label: {
    fontSize: 10,
    letterSpacing: 1,
    color: colors.gray500,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 6,
  },
  value: { fontSize: 14, color: colors.gray900, lineHeight: 22 },
  reference: { fontSize: 11, color: colors.gray500, marginTop: 6 },
  demo: { marginTop: 16, color: colors.brand, fontSize: 12 },
  input: {
    backgroundColor: colors.gray100,
    padding: 14,
    borderRadius: 12,
    fontSize: 13,
    color: colors.gray900,
    minHeight: 70,
    marginBottom: 14,
  },
});
