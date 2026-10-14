import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import AdminGuard from '../auth/AdminGuard';
import { useAuth } from '../auth/AuthProvider';
import Navbar from '../components/Navbar';
import Button from '../components/Button';
import FormInput from '../components/FormInput';
import { showAlert } from '../components/AppAlert';
import { getAdminState, updateManagedUser, saveManagedJourney, respondToReport } from '../services/LocalAppStorage';
import { loadAdminTickets, loadAdminTicketActivities } from '../services/LocalTicketStorage';
import { exportAdminBackup, inspectAdminBackup, restoreAdminBackup } from '../services/AdminBackup';
import { getIncidents } from '../utils/OfficerStorage';
import type { ManagedJourney, SupportReport, Activity } from '../services/adminTypes';
import { colors } from '../theme';

type Section = 'Overview' | 'Tickets' | 'Users' | 'Support' | 'Routes & fares' | 'Activity' | 'Backup';
type State = Awaited<ReturnType<typeof getAdminState>> & { ticketActivities: Activity[]; tickets: Awaited<ReturnType<typeof loadAdminTickets>>; incidents: Awaited<ReturnType<typeof getIncidents>> };
const sections: Section[] = ['Overview', 'Tickets', 'Users', 'Support', 'Routes & fares', 'Activity', 'Backup'];
const money = (minor: number) => `LKR ${(minor / 100).toFixed(2)}`;
const date = (value: string) => new Date(value).toLocaleString();

export default function AdminScreen() { return <AdminGuard><AdminContent /></AdminGuard>; }

function AdminContent() {
  const { session } = useAuth();
  const [section, setSection] = useState<Section>('Overview');
  const [data, setData] = useState<State | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [route, setRoute] = useState<ManagedJourney | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [report, setReport] = useState<SupportReport | null>(null);
  const [response, setResponse] = useState('');
  const [backup, setBackup] = useState('');
  const [restoreText, setRestoreText] = useState('');
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof inspectAdminBackup>> | null>(null);
  const generation = useRef(0);
  const pending = useRef(false);
  const sessionToken = useRef(session?.token); sessionToken.current = session?.token;
  const load = useCallback(async () => {
    const current = ++generation.current; const token = session?.token;
    setLoading(true); setError(null);
    try {
      const [state, tickets, incidents, ticketActivities] = await Promise.all([getAdminState(), loadAdminTickets(), getIncidents(), loadAdminTicketActivities()]);
      if (generation.current === current && sessionToken.current === token) setData({ ...state, tickets, incidents, ticketActivities });
    } catch (e) { if (generation.current === current) { setData(null); setError(e instanceof Error ? e.message : 'Could not load Admin data.'); } }
    finally { if (generation.current === current) setLoading(false); }
  }, [session?.token]);
  useFocusEffect(useCallback(() => { void load(); return () => { generation.current += 1; }; }, [load]));
  const action = async (work: () => Promise<unknown>, success?: string, refresh = true) => {
    if (pending.current) return;
    pending.current = true; const token = sessionToken.current; const current = generation.current;
    setBusy(true); setError(null); setMessage(null);
    try {
      await work();
      if (sessionToken.current !== token || generation.current !== current) return;
      if (success) setMessage(success);
      if (refresh) await load();
    } catch (e) { if (sessionToken.current === token && generation.current === current) setError(e instanceof Error ? e.message : 'Could not save changes.'); }
    finally { pending.current = false; if (sessionToken.current === token) setBusy(false); }
  };
  const confirm = (title: string, detail: string, work: () => Promise<unknown>) => {
    const token = sessionToken.current;
    showAlert(title, detail, [{ text: 'Cancel', style: 'cancel' }, { text: 'Confirm', style: 'destructive', onPress: () => {
      if (sessionToken.current === token) void action(work, 'Changes saved.');
    } }]);
  };
  const editRoute = (entry?: ManagedJourney) => {
    const value: ManagedJourney = entry ?? { id: '', code: '', mode: 'Bus', from: '', to: '', durationMinutes: 60, validityMinutes: 120, active: true,
      routeNumber: '', serviceType: 'Normal', departureLabel: 'See departures', arrivalLabel: 'See validity', ticketTypes: [{ code: 'standard', label: 'Standard - Single journey', fareMinor: 10000 }] };
    setRoute(value);
    setDraft({ code: value.code, from: value.from, to: value.to, routeNumber: value.routeNumber,
      durationMinutes: String(value.durationMinutes), validityMinutes: String(value.validityMinutes), departureLabel: value.departureLabel, arrivalLabel: value.arrivalLabel,
      ...Object.fromEntries(value.ticketTypes.map(t => [`fare:${t.code}`, (t.fareMinor / 100).toFixed(2)])) });
  };
  const saveRoute = async () => {
    if (!route) return;
    const types = route.ticketTypes.map(t => {
      const value = draft[`fare:${t.code}`] ?? '';
      if (!/^\d+(\.\d{1,2})?$/.test(value)) throw new Error('Enter fares in LKR with at most two decimal places.');
      return { ...t, fareMinor: Math.round(Number(value) * 100) };
    });
    await saveManagedJourney({ ...route, id: route.id || `journey:${draft.code.trim()}`, code: draft.code.trim(), from: draft.from.trim(), to: draft.to.trim(), routeNumber: draft.routeNumber.trim(),
      durationMinutes: Number(draft.durationMinutes), validityMinutes: Number(draft.validityMinutes), departureLabel: draft.departureLabel.trim(), arrivalLabel: draft.arrivalLabel.trim(), ticketTypes: types });
    setRoute(null);
  };
  const ticketList = data?.tickets.filter(t => `${t.reference} ${t.passengerName} ${t.journey.from} ${t.journey.to} ${t.purchasedAt.slice(0, 10)} ${data.users.find(u => u._id === t.ownerId)?.email ?? ''}`.toLowerCase().includes(search.toLowerCase())) ?? [];
  const activities: Activity[] = data ? [...data.activities, ...data.ticketActivities].sort((a, b) => b.at.localeCompare(a.at)) : [];
  const stats = data ? {
    'Local users': data.users.length,
    'Active accounts': data.users.filter(u => !u.disabled).length,
    'Bookings': new Set(data.tickets.map(t => t.bookingId)).size,
    'Active tickets': data.tickets.filter(t => t.status === 'Active').length,
    'Used tickets': data.tickets.filter(t => t.status === 'Used').length,
    'Open incidents': data.incidents.filter(i => i.status !== 'RESOLVED').length,
    'Open reports': data.reports.filter(r => r.status !== 'Resolved').length,
    'Available journeys': data.journeys.filter(j => j.active).length,
  } : {};
  return <SafeAreaView style={styles.safe} edges={['top']}>
    <Navbar title="Admin workspace" showBack={false} />
    <ScrollView horizontal style={styles.sectionBar} contentContainerStyle={styles.sections}>
      {sections.map(name => <TouchableOpacity key={name} accessibilityRole="button" accessibilityLabel={name} disabled={busy} onPress={() => { setSection(name); setSearch(''); setError(null); setMessage(null); }} style={[styles.section, section === name && styles.active]}><Text style={{ color: section === name ? colors.white : colors.brand }}>{name}</Text></TouchableOpacity>)}
    </ScrollView>
    <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
      <Text style={styles.note}>This installation only. Records do not synchronize with other phones.</Text>
      {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {message && <Text accessibilityRole="alert" style={styles.message}>{message}</Text>}
      {(loading || busy) && <ActivityIndicator accessibilityLabel="Loading Admin data" color={colors.brand} />}
      <Button variant="secondary" disabled={busy || loading} onPress={() => { void load(); }}>Refresh Admin data</Button>
      {data && section === 'Overview' && <>
        <View style={styles.stats}>{Object.entries(stats).map(([label, count]) => <View style={styles.stat} key={label}><Text style={styles.count}>{count}</Text><Text>{label}</Text></View>)}</View>
        <Button onPress={() => router.push('/officer-dashboard/verify-ticket')}>Verify ticket QR</Button>
        <Text style={styles.note}>Payments and transport data are demonstrations. Ticket validity uses this device's clock.</Text>
      </>}
      {data && section === 'Tickets' && <>
        <FormInput label="Search tickets" value={search} onChangeText={setSearch} placeholder="Reference, passenger, email, route, or YYYY-MM-DD" />
        <Text>{ticketList.length} matching tickets</Text>
        {ticketList.map(t => <View style={styles.card} key={t.id}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Inspect ${t.reference}`} onPress={() => setSelectedTicket(selectedTicket === t.id ? null : t.id)}><Text style={styles.title}>{t.reference}</Text><Text>{t.passengerName} · {t.status}</Text><Text>{t.journey.from} → {t.journey.to}</Text></TouchableOpacity>
          {selectedTicket === t.id && <View style={styles.details}><Text>Account: {data.users.find(u => u._id === t.ownerId)?.email || 'Legacy account'}</Text><Text>Booking: {t.bookingId}</Text><Text>Passenger {t.passengerNumber} of {t.passengerCount}</Text><Text>{t.ticketTypeLabel} · {money(t.fareMinor)}</Text><Text>Seat: {t.seatLabel || 'Not assigned'} · {t.busName || t.journey.mode}</Text><Text>Purchased: {date(t.purchasedAt)}</Text><Text>Valid: {date(t.validFrom)} – {date(t.validUntil)}</Text><Text>Payment: {t.paymentMethod} (demo)</Text>{t.usedAt && <Text>Used: {date(t.usedAt)} · {t.verifierName || 'Verifier not recorded'}</Text>}</View>}
        </View>)}
      </>}
      {data && section === 'Users' && <>
        <FormInput label="Search users" value={search} onChangeText={setSearch} placeholder="Name or email" />
        {data.users.filter(u => `${u.fullName} ${u.email}`.toLowerCase().includes(search.toLowerCase())).map(u => <View style={styles.card} key={u._id}><Text style={styles.title}>{u.fullName}</Text><Text>{u.email}</Text><Text>{u.role} · {u.disabled ? 'Disabled' : 'Active'}{u._id === session?.user._id ? ' · You' : ''}</Text>
          {u.role !== 'officer' && u._id !== session?.user._id && <View style={styles.details}>
            <Button variant="secondary" disabled={busy} onPress={() => confirm(u.disabled ? 'Enable account?' : 'Disable account?', `Change access for ${u.email}?`, () => updateManagedUser(u._id, { disabled: !u.disabled }))}>{u.disabled ? 'Enable account' : 'Disable account'}</Button>
            <Button variant="secondary" disabled={busy} onPress={() => confirm('Change role?', `Make ${u.email} ${u.role === 'admin' ? 'a passenger' : 'an admin'}?`, () => updateManagedUser(u._id, { role: u.role === 'admin' ? 'passenger' : 'admin' }))}>{u.role === 'admin' ? 'Make passenger' : 'Make admin'}</Button>
          </View>}
        </View>)}
      </>}
      {data && section === 'Support' && <>
        <FormInput label="Search support reports" value={search} onChangeText={setSearch} />
        {!data.reports.length && <Text>No support reports yet.</Text>}
        {data.reports.filter(r => `${r.title} ${r.status} ${r.message}`.toLowerCase().includes(search.toLowerCase())).slice().reverse().map(r => <View style={styles.card} key={r.id}>
          <Text style={styles.title}>{r.title}</Text><Text>{r.status} · {data.users.find(u => u._id === r.userId)?.email || 'Deleted account'}</Text><Text>{r.message}</Text><Text>{date(r.createdAt)}</Text>{r.response && <Text>Response: {r.response}</Text>}
          <Button variant="secondary" disabled={busy} onPress={() => { setReport(r); setResponse(r.response); }}>Review report</Button>
        </View>)}
        {report && <View style={styles.card}><Text style={styles.title}>Reply: {report.title}</Text><TextInput accessibilityLabel="Admin response" placeholder="Admin response" multiline style={styles.input} value={response} onChangeText={setResponse} editable={!busy} />
          {(['Open', 'In progress', 'Resolved'] as const).map(status => <Button key={status} disabled={busy} onPress={() => { void action(async () => { await respondToReport(report.id, status, response); setReport(null); }, 'Report updated and response saved.'); }}>{`Save as ${status}`}</Button>)}
          <Button variant="secondary" disabled={busy} onPress={() => setReport(null)}>Cancel report edit</Button>
        </View>}
      </>}
      {data && section === 'Routes & fares' && <>
        <Button disabled={busy} onPress={() => editRoute()}>Add journey</Button>
        <Text style={styles.note}>Changes apply to route search, the fare calculator, and new ticket quotes. Issued tickets retain their original fare. Disable a journey to withdraw it.</Text>
        <FormInput label="Search journeys" value={search} onChangeText={setSearch} />
        {!route && data.journeys.filter(j => `${j.code} ${j.from} ${j.to}`.toLowerCase().includes(search.toLowerCase())).map(j => <View style={styles.card} key={j.id}><Text style={styles.title}>{j.from} → {j.to}</Text><Text>{j.code} · {j.mode} · {j.active ? 'Available' : 'Disabled'}</Text><Text>{j.ticketTypes.map(t => `${t.label}: ${money(t.fareMinor)}`).join('\n')}</Text><Button variant="secondary" disabled={busy} onPress={() => editRoute(j)}>{`Edit ${j.code}`}</Button></View>)}
        {route && <View style={styles.card}><Text style={styles.title}>{route.id ? 'Edit journey' : 'New journey'}</Text>
          {([['code', 'Route code'], ['from', 'Origin'], ['to', 'Destination'], ['routeNumber', 'Route number'], ['durationMinutes', 'Duration (minutes)'], ['validityMinutes', 'Validity (minutes)'], ['departureLabel', 'Departure label'], ['arrivalLabel', 'Arrival label']] as const).map(([key, label]) => <FormInput key={key} label={label} value={draft[key]} onChangeText={(value: string) => setDraft(d => ({ ...d, [key]: value }))} editable={!busy} />)}
          {route.ticketTypes.map(t => <FormInput key={t.code} label={`${t.label} fare (LKR)`} keyboardType="decimal-pad" value={draft[`fare:${t.code}`]} onChangeText={(value: string) => setDraft(d => ({ ...d, [`fare:${t.code}`]: value }))} editable={!busy} />)}
          <Button variant="secondary" disabled={busy} onPress={() => setRoute({ ...route, mode: route.mode === 'Bus' ? 'Train' : 'Bus' })}>{`Mode: ${route.mode}`}</Button>
          <Button variant="secondary" disabled={busy} onPress={() => setRoute({ ...route, serviceType: route.serviceType === 'Normal' ? 'Express' : 'Normal' })}>{`Service: ${route.serviceType}`}</Button>
          <Button variant="secondary" disabled={busy} onPress={() => setRoute({ ...route, active: !route.active })}>{`Availability: ${route.active ? 'Available' : 'Disabled'}`}</Button>
          <Button disabled={busy} onPress={() => { void action(saveRoute, 'Journey saved.'); }}>Save journey</Button>
          <Button variant="secondary" disabled={busy} onPress={() => setRoute(null)}>Cancel journey edit</Button>
        </View>}
      </>}
      {data && section === 'Activity' && <>
        <Text style={styles.note}>Local administrative changes and ticket validations recorded after this feature was installed.</Text>
        {!activities.length && <Text>No activity recorded yet.</Text>}
        {activities.map(a => <View key={a.id} style={styles.card}><Text style={styles.title}>{a.action}</Text><Text>{a.target}</Text><Text>{a.actorName} · {date(a.at)}</Text></View>)}
      </>}
      {section === 'Backup' && <>
        <Text style={styles.title}>Export local records</Text><Text style={styles.note}>Backups contain personal data, password hashes, and ticket credentials. Keep them private. Login sessions are excluded.</Text>
        <Button disabled={busy} onPress={() => { void action(async () => setBackup(await exportAdminBackup()), 'Backup ready.', false); }}>Create backup</Button>
        {backup && <><Text selectable style={styles.backup} numberOfLines={12}>{backup}</Text><Button variant="secondary" disabled={busy} onPress={() => { void action(async () => {
          if (Platform.OS === 'web') { const url = URL.createObjectURL(new Blob([backup], { type: 'application/json' })); const link = document.createElement('a'); link.href = url; link.download = `transitlink-backup-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(url); }
          else await Share.share({ title: 'TransitLink backup', message: backup });
        }, undefined, false); }}>{Platform.OS === 'web' ? 'Download backup JSON' : 'Share backup JSON'}</Button></>}
        <Text style={styles.title}>Restore from a backup</Text><Text style={styles.note}>Restore replaces all local records, including Officer incidents, and signs you out. Save a current backup first. Use an account and password from the restored backup afterward.</Text>
        <TextInput accessibilityLabel="Backup JSON" multiline style={styles.input} value={restoreText} editable={!busy} onChangeText={value => { setRestoreText(value); setPreview(null); }} placeholder="Paste your complete backup JSON" />
        <Button variant="secondary" disabled={busy || !restoreText.trim()} onPress={() => { void action(async () => setPreview(await inspectAdminBackup(restoreText)), 'Backup validated. Review the contents before restoring.', false); }}>Validate backup</Button>
        {preview && <View style={styles.card}><Text>Created: {date(preview.createdAt)}</Text><Text>{preview.users} users · {preview.tickets} tickets · {preview.incidents} incidents · {preview.routes} journeys · {preview.reports} reports</Text><Button variant="danger" disabled={busy} onPress={() => confirm('Replace all local data?', 'This replaces current accounts, tickets, reports, routes, activity, and Officer incidents. You will be signed out.', async () => { await restoreAdminBackup(restoreText); router.replace('/login'); })}>Restore validated backup</Button></View>}
      </>}
    </ScrollView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white }, sectionBar: { flexGrow: 0, maxHeight: 56 }, sections: { gap: 8, padding: 12 },
  section: { borderRadius: 16, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: colors.brandSoft }, active: { backgroundColor: colors.brand },
  body: { padding: 16, gap: 12, paddingBottom: 36 }, note: { fontSize: 13, color: colors.gray500, lineHeight: 19 },
  title: { fontSize: 17, fontWeight: '700', color: colors.gray900 }, card: { padding: 14, borderWidth: 1, borderColor: colors.border, borderRadius: 12, gap: 8 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, stat: { width: '47%', padding: 14, backgroundColor: colors.brandSoft, borderRadius: 12 },
  count: { fontSize: 25, color: colors.brand, fontWeight: '700' }, details: { gap: 8, paddingTop: 8 }, error: { color: colors.red }, message: { color: colors.green },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, minHeight: 150, textAlignVertical: 'top' },
  backup: { fontSize: 11, color: colors.gray500 },
});
