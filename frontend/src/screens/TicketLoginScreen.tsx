import React, { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Navbar from '../components/Navbar';
import FormInput from '../components/FormInput';
import Button from '../components/Button';
import { loginTicketAccount, registerTicketAccount } from '../services/ticketApi';
import { ticketError } from '../services/ticketService';
import { colors } from '../theme';

export default function TicketLoginScreen() {
  const { next } = useLocalSearchParams<{ next?: string }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(false);
  const submit = async () => {
    if (pending.current) return;
    if (!email.trim() || !password || (register && (!fullName.trim() || !phone.trim()))) {
      setError('Complete all fields to continue.'); return;
    }
    pending.current = true; setBusy(true); setError(null);
    try {
      if (register) await registerTicketAccount(fullName, email, phone, password);
      else await loginTicketAccount(email, password);
      router.replace(next === 'verify' ? '/officer-dashboard/verify-ticket' : '/(tabs)/tickets');
    } catch (failure) { setError(ticketError(failure)); }
    finally { pending.current = false; setBusy(false); }
  };
  return <SafeAreaView style={styles.safe}>
    <Navbar title="Online ticket account" onBack={() => { if (!busy) router.replace('/(tabs)/tickets'); }} />
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{register ? 'Create a ticket account' : 'Sign in for tickets'}</Text>
        <Text style={styles.description}>Bookings and seat availability use your online ticket account. Your existing backend account still works here. Local profiles and Officer alerts remain available offline.</Text>
        {register && <>
          <FormInput label="Full name" value={fullName} onChangeText={setFullName} editable={!busy} />
          <FormInput label="Phone number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" editable={!busy} />
        </>}
        <FormInput label="Email" accessibilityLabel="Online ticket email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" editable={!busy} />
        <FormInput label="Password" accessibilityLabel="Online ticket password" value={password} onChangeText={setPassword} secureTextEntry editable={!busy} />
        {error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
        <Button loading={busy} onPress={() => { void submit(); }}>{register ? 'Create ticket account' : 'Sign in to tickets'}</Button>
        <Button style={styles.secondary} variant="secondary" disabled={busy} onPress={() => { setRegister(value => !value); setError(null); }}>{register ? 'Use an existing ticket account' : 'Create an online ticket account'}</Button>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.white }, flex: { flex: 1 }, body: { padding: 24 }, title: { fontSize: 24, fontWeight: '700', color: colors.gray900, marginBottom: 12 }, description: { color: colors.gray500, lineHeight: 21, marginBottom: 24 }, error: { color: '#B91C1C', marginBottom: 16 }, secondary: { marginTop: 12 } });
