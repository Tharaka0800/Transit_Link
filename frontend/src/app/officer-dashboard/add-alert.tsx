import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Navbar from '../../components/Navbar';
import FormInput from '../../components/FormInput';
import Button from '../../components/Button';
import { colors } from '../../theme';
import OfficerGuard from '../../auth/OfficerGuard';
import { addIncident, getIncidents, IncidentAlert, updateIncident } from '../../utils/OfficerStorage';

type AlertFields = Pick<IncidentAlert, 'busId' | 'route' | 'delayTime' | 'status'>;
type FieldErrors = Partial<Record<'busId' | 'route' | 'delayTime', string>>;
const emptyForm: AlertFields = { busId: '', route: '', delayTime: '', status: 'URGENT' };
const statuses: IncidentAlert['status'][] = ['URGENT', 'WARNING', 'RESOLVED'];

export default function AddAlert() {
  return <OfficerGuard><AddAlertContent /></OfficerGuard>;
}

function AddAlertContent() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const editing = id !== undefined;
  const [form, setForm] = useState<AlertFields>({ ...emptyForm });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const [retry, setRetry] = useState(0);
  const submitting = useRef(false);
  const mounted = useRef(false);
  const formGeneration = useRef(0);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    let active = true;
    formGeneration.current += 1;
    submitting.current = false;
    setSaving(false);
    setForm({ ...emptyForm });
    setFieldErrors({});
    setLoadError(null);
    setSaveError(null);
    setMissing(false);
    setLoading(editing);
    if (editing) {
      const load = async () => {
        try {
          const incidents = await getIncidents();
          if (!active) return;
          const incident = incidents.find((item) => item.id === id);
          if (incident) {
            setForm({ busId: incident.busId, route: incident.route, delayTime: incident.delayTime, status: incident.status });
          } else setMissing(true);
        } catch (error) {
          if (active) setLoadError(error instanceof Error ? error.message : 'Unable to load this alert. Please try again.');
        } finally {
          if (active) setLoading(false);
        }
      };
      void load();
    }
    return () => { active = false; };
  }, [id, editing, retry]);

  const returnToDashboard = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/officer-dashboard');
  };

  const setField = (field: 'busId' | 'route' | 'delayTime', value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setSaveError(null);
  };

  const submit = async () => {
    if (submitting.current || loading || missing || loadError) return;
    const trimmed: AlertFields = { ...form, busId: form.busId.trim(), route: form.route.trim(), delayTime: form.delayTime.trim() };
    const errors: FieldErrors = {};
    if (!trimmed.busId) errors.busId = 'Enter a Bus ID.';
    if (!trimmed.route) errors.route = 'Enter a route.';
    if (!trimmed.delayTime) errors.delayTime = 'Enter the delay time.';
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;
    submitting.current = true;
    const generation = formGeneration.current;
    setSaving(true);
    setSaveError(null);
    try {
      if (id !== undefined) await updateIncident(id, trimmed);
      else await addIncident(trimmed);
      if (mounted.current && formGeneration.current === generation) returnToDashboard();
    } catch (error) {
      if (mounted.current && formGeneration.current === generation) {
        setSaveError(error instanceof Error ? error.message : 'Unable to save this alert. Please try again.');
      }
    } finally {
      if (formGeneration.current === generation) {
        submitting.current = false;
        if (mounted.current) setSaving(false);
      }
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Navbar title={editing ? 'Edit Alert' : 'New Alert'} onBack={returnToDashboard} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {loading ? (
            <ActivityIndicator color={colors.brand} accessibilityLabel="Loading alert" style={styles.loading} />
          ) : missing || loadError ? (
            <View>
              <Text accessibilityRole="alert" style={styles.error}>
                {missing ? 'This alert is no longer available.' : loadError}
              </Text>
              {!missing && <Button onPress={() => setRetry((value) => value + 1)}>Retry</Button>}
              <Button variant="secondary" onPress={returnToDashboard} style={styles.returnButton}>Back to Dashboard</Button>
            </View>
          ) : (
            <>
              <FormInput label="Bus ID" leftIcon="bus-outline" placeholder="154" value={form.busId} onChangeText={(value) => setField('busId', value)} error={fieldErrors.busId} editable={!saving} />
              <FormInput label="Route" leftIcon="location-outline" placeholder="CMB → KDY" value={form.route} onChangeText={(value) => setField('route', value)} error={fieldErrors.route} autoCapitalize="characters" editable={!saving} />
              <FormInput label="Delay Time" leftIcon="time-outline" placeholder="15m" value={form.delayTime} onChangeText={(value) => setField('delayTime', value)} error={fieldErrors.delayTime} editable={!saving} />
              <Text style={styles.label}>Status</Text>
              <View style={styles.statusRow} accessibilityRole="radiogroup" accessibilityLabel="Alert status">
                {statuses.map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[styles.statusButton, form.status === status && styles.statusActive]}
                    accessibilityRole="radio"
                    accessibilityLabel={status}
                    accessibilityState={{ checked: form.status === status, disabled: saving }}
                    disabled={saving}
                    onPress={() => { setForm((current) => ({ ...current, status })); setSaveError(null); }}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.statusText, form.status === status && styles.statusTextActive]}>{status}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {saveError && <Text accessibilityRole="alert" style={styles.error}>{saveError}</Text>}
              <Button loading={saving} onPress={() => { void submit(); }} style={styles.submitButton}>
                {editing ? 'Save Changes' : 'Create Alert'}
              </Button>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  flex: { flex: 1 },
  body: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32 },
  label: { fontSize: 13, fontWeight: '500', color: colors.gray500, marginBottom: 8 },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statusButton: { flexGrow: 1, flexBasis: 84, backgroundColor: colors.gray100, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 8, alignItems: 'center' },
  statusActive: { backgroundColor: colors.brand },
  statusText: { fontSize: 15, fontWeight: '700', color: colors.gray700 },
  statusTextActive: { color: colors.white },
  submitButton: { marginTop: 8 },
  returnButton: { marginTop: 12 },
  loading: { marginTop: 32 },
  error: { fontSize: 13, color: colors.red, marginBottom: 12 },
});
