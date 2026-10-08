import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import Navbar from '../../../components/Navbar';
import Button from '../../../components/Button';
import { colors } from '../../../theme';
import { deleteIncident, getIncidents, IncidentAlert } from '../../../utils/OfficerStorage';
import OfficerGuard from '../../../auth/OfficerGuard';

const metrics = [
  { label: 'Active Buses', value: '150', icon: 'bus-outline' },
  { label: 'On Time', value: '85%', icon: 'time-outline' },
  { label: 'Total Routes', value: '30', icon: 'map-outline' },
  { label: 'Urgent Alerts', value: '12', icon: 'alert-circle-outline' },
  { label: 'Delay Hotspots', icon: 'location-outline' },
  { label: 'Rerouting', icon: 'git-branch-outline' },
] satisfies Array<{ label: string; value?: string; icon: React.ComponentProps<typeof Ionicons>['name'] }>;

const statusColors: Record<IncidentAlert['status'], { color: string; backgroundColor: string }> = {
  URGENT: { color: colors.red, backgroundColor: colors.redSoft },
  WARNING: { color: colors.gray900, backgroundColor: colors.orange },
  RESOLVED: { color: colors.green, backgroundColor: colors.greenSoft },
};

export default function OfficerDashboard() {
  return <OfficerGuard><OfficerDashboardContent /></OfficerGuard>;
}

function OfficerDashboardContent() {
  const [incidents, setIncidents] = useState<IncidentAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const deletingIds = useRef(new Set<string>());
  const mounted = useRef(false);
  const requestId = useRef(0);
  const firstFocus = useRef(true);

  const loadIncidents = useCallback(async (showLoading = true) => {
    const currentRequest = ++requestId.current;
    if (showLoading) setLoading(true);
    setLoadError(null);
    try {
      const items = await getIncidents();
      if (mounted.current && requestId.current === currentRequest) setIncidents(items);
    } catch (error) {
      if (mounted.current && requestId.current === currentRequest) {
        setLoadError(error instanceof Error ? error.message : 'Unable to load alerts. Please try again.');
      }
    } finally {
      if (mounted.current && requestId.current === currentRequest) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void loadIncidents();
    return () => {
      mounted.current = false;
      requestId.current += 1;
    };
  }, [loadIncidents]);

  useFocusEffect(useCallback(() => {
    // The mount effect handles the initial read; later visits refresh saved changes.
    if (firstFocus.current) firstFocus.current = false;
    else void loadIncidents();
    return () => { requestId.current += 1; };
  }, [loadIncidents]));

  const resolveIncident = async (id: string) => {
    if (deletingIds.current.has(id)) return;
    deletingIds.current.add(id);
    setPendingIds(new Set(deletingIds.current));
    setActionError(null);
    try {
      await deleteIncident(id);
      if (mounted.current) await loadIncidents();
    } catch (error) {
      if (mounted.current) {
        setActionError(error instanceof Error ? error.message : 'Unable to resolve this alert. Please try again.');
      }
    } finally {
      deletingIds.current.delete(id);
      if (mounted.current) setPendingIds(new Set(deletingIds.current));
    }
  };

  const renderIncident = ({ item }: { item: IncidentAlert }) => {
    const badge = statusColors[item.status];
    const pending = pendingIds.has(item.id);
    return (
      <View style={styles.card}>
        <View style={styles.incidentHeader}>
          <View style={styles.busInfo}>
            <View style={styles.busIcon}>
              <Ionicons name="bus-outline" size={22} color={colors.brand} />
            </View>
            <Text style={styles.busTitle}>Bus {item.busId}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: badge.backgroundColor }]}>
            <Text style={[styles.badgeText, { color: badge.color }]}>{item.status}</Text>
          </View>
        </View>
        <Text style={styles.route}>Route: {item.route}</Text>
        <Text style={styles.metadata}>Delay: {item.delayTime}</Text>
        <View style={styles.actions}>
          <Button
            variant="secondary"
            style={styles.actionButton}
            disabled={pending}
            accessibilityLabel={`Edit alert for bus ${item.busId}`}
            onPress={() => router.push({ pathname: '/officer-dashboard/add-alert', params: { id: item.id } })}
          >
            Edit
          </Button>
          <Button
            style={styles.actionButton}
            loading={pending}
            accessibilityLabel={`Resolve alert for bus ${item.busId}`}
            onPress={() => { void resolveIncident(item.id); }}
          >
            Resolve
          </Button>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Navbar title="SmartBus Dashboard" showBack={false} />
      <FlatList
        data={incidents}
        keyExtractor={(item) => item.id}
        renderItem={renderIncident}
        contentContainerStyle={styles.list}
        ListHeaderComponent={(
          <View>
            {[metrics.slice(0, 3), metrics.slice(3)].map((row, index) => (
              <View key={index} style={styles.statsRow}>
                {row.map((metric) => {
                  const urgent = metric.label === 'Urgent Alerts';
                  const tint = urgent ? colors.red : colors.brand;
                  return (
                    <View key={metric.label} style={styles.metricCard}>
                      <Ionicons name={metric.icon} size={24} color={tint} />
                      {'value' in metric && <Text style={[styles.metricValue, { color: tint }]}>{metric.value}</Text>}
                      <Text style={[styles.metricLabel, urgent && { color: colors.red }]}>{metric.label}</Text>
                    </View>
                  );
                })}
              </View>
            ))}
            <Button style={styles.newButton} onPress={() => router.push('/officer-dashboard/add-alert')}>
              + New Alert
            </Button>
            <Button variant="secondary" style={styles.newButton} onPress={() => router.push('/officer-dashboard/verify-ticket')}>
              Verify Ticket
            </Button>
            <Text style={styles.sectionTitle}>Incident Alerts</Text>
            {actionError && <Text accessibilityRole="alert" style={styles.error}>{actionError}</Text>}
            {loadError && (
              <View style={styles.errorBox}>
                <Text accessibilityRole="alert" style={styles.error}>{loadError}</Text>
                <Button variant="secondary" onPress={() => { void loadIncidents(); }}>Retry</Button>
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={loading ? (
          <ActivityIndicator accessibilityLabel="Loading alerts" color={colors.brand} style={styles.empty} />
        ) : !loadError ? (
          <View style={styles.empty}>
            <Ionicons name="checkmark-circle-outline" size={36} color={colors.green} />
            <Text style={styles.emptyTitle}>No incident alerts</Text>
            <Text style={styles.emptyText}>Create a new alert to report a delay.</Text>
          </View>
        ) : null}
        ListFooterComponent={loading && incidents.length > 0 ? (
          <ActivityIndicator accessibilityLabel="Refreshing alerts" color={colors.brand} />
        ) : null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  metricCard: {
    flex: 1, minWidth: 0, backgroundColor: colors.white, borderRadius: 16,
    borderWidth: 1, borderColor: colors.border, padding: 16, alignItems: 'center', justifyContent: 'center',
  },
  metricValue: { fontSize: 22, fontWeight: '700', marginTop: 8 },
  metricLabel: { fontSize: 13, color: colors.gray500, textAlign: 'center', marginTop: 6 },
  newButton: { marginTop: 4, marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.gray900, marginBottom: 12 },
  card: {
    backgroundColor: colors.white, borderRadius: 16, borderWidth: 1,
    borderColor: colors.border, padding: 16, marginBottom: 12,
  },
  incidentHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 },
  busInfo: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  busIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  busTitle: { flexShrink: 1, marginLeft: 12, fontSize: 16, fontWeight: '700', color: colors.gray900 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  badgeText: { fontSize: 13, fontWeight: '600' },
  route: { fontSize: 15, fontWeight: '700', color: colors.gray900 },
  metadata: { fontSize: 13, color: colors.gray500, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 16 },
  actionButton: { width: undefined, flex: 1 },
  empty: { paddingVertical: 32, alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.gray900, marginTop: 12 },
  emptyText: { fontSize: 13, color: colors.gray500, marginTop: 4, textAlign: 'center' },
  errorBox: { marginBottom: 12 },
  error: { fontSize: 13, color: colors.red, marginBottom: 12 },
});
