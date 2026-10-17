import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Button from '../Button';
import { BusTrip, Journey, loadBusTrips, ticketError } from '../../services/ticketService';
import { formatFare, formatTicketDate, formatTicketTime } from '../../utils/ticketUtils';

type Selection = { trip: BusTrip; seats: string[] };
export default function BusSeatPicker({ journey, fareMinor, value, onSelect, onClose }: {
  journey: Journey; fareMinor: number; value: Selection | null;
  onSelect: (selection: Selection) => void; onClose: () => void;
}) {
  const [trips, setTrips] = useState<BusTrip[]>([]);
  const [tripId, setTripId] = useState(value?.trip.id || '');
  const [selected, setSelected] = useState<string[]>(value?.seats || []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const tripIdRef = useRef(tripId);
  tripIdRef.current = tripId;
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const data = await loadBusTrips(journey.id);
        if (!active) return;
        setTrips(data);
        setError(null);
        const current = data.find(trip => trip.id === tripIdRef.current) || data[0];
        if (current) {
          if (current.id !== tripIdRef.current) {
            setTripId(current.id);
            setSelected([]);
          } else {
            setSelected(seats => seats.filter(label => current.seats.some(seat => seat.label === label && seat.status === 'available')));
          }
        } else { setTripId(''); setSelected([]); }
      } catch (failure) {
        if (active) setError(ticketError(failure));
      } finally { if (active) setLoading(false); }
    };
    void load();
    const timer = setInterval(() => { void load(); }, 15000);
    return () => { active = false; clearInterval(timer); };
  }, [journey.id, retry]);
  const trip = trips.find(item => item.id === tripId);
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Close seat selection" style={styles.close}>
            <Ionicons name="chevron-back" size={26} color="#18233B" />
          </TouchableOpacity>
          <View style={styles.flex}>
            <Text style={styles.title}>Choose your seats</Text>
            <Text style={styles.subtitle}>{journey.from} → {journey.to}</Text>
          </View>
          <Ionicons name="bus-outline" size={26} color="#0057D9" />
        </View>
        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.section}>SELECT A DEPARTURE</Text>
          <Text style={styles.subtitle}>Demo timetable · times shown in your device timezone</Text>
          {loading && <ActivityIndicator color="#0057D9" style={styles.loading} />}
          {!!error && <View style={styles.notice}><Text accessibilityRole="alert" style={styles.error}>{error}</Text><Button variant="secondary" onPress={() => setRetry(n => n + 1)}>Refresh availability</Button></View>}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.departures}>
            {trips.map(item => <TouchableOpacity key={item.id} style={[styles.departure, tripId === item.id && styles.departureSelected]}
              accessibilityRole="radio" accessibilityState={{ checked: tripId === item.id }}
              accessibilityLabel={`Departure ${formatTicketDate(item.departureAt)} ${formatTicketTime(item.departureAt)}`}
              onPress={() => { setTripId(item.id); setSelected([]); }}>
              <Text style={styles.date}>{formatTicketDate(item.departureAt)}</Text>
              <Text style={styles.time}>{formatTicketTime(item.departureAt)}</Text>
              <Text style={styles.subtitle}>{item.availableSeats} available</Text>
            </TouchableOpacity>)}
          </ScrollView>
          {!loading && !trips.length && !error && <Text style={styles.notice}>No bus departures are available.</Text>}
          {trip && <>
            <View style={styles.summary}><Text style={styles.section}>{trip.busName}</Text><Text style={styles.subtitle}>{trip.availableSeats} of {trip.seats.length} seats available</Text></View>
            <View style={styles.legend}>
              {(['available', 'selected', 'occupied', 'reserved'] as const).map(status => <View key={status} style={styles.legendItem}>
                <View style={[styles.swatch, styles[status]]} /><Text style={styles.legendText}>{status[0].toUpperCase() + status.slice(1)}</Text>
              </View>)}
            </View>
            <View style={styles.bus}>
              <View style={styles.driver}><Ionicons name="navigate-outline" size={19} color="#0078A4" /><Text style={styles.driverText}>FRONT / DRIVER CABIN</Text><Ionicons name="speedometer-outline" size={23} color="#0078A4" /></View>
              <View style={styles.line} />
              {[1, 2, 3, 4, 5].map(row => <View key={row} style={styles.row}>
                {['A', 'B', 'aisle', 'C', 'D'].map(column => {
                  if (column === 'aisle') return <View key={column} style={styles.aisle}><Text style={styles.rowLabel}>R{row}</Text><Ionicons name="arrow-down" size={16} color="#B2C6F9" /></View>;
                  const label = `${String(row).padStart(2, '0')}${column}`;
                  const seat = trip.seats.find(item => item.label === label);
                  const checked = selected.includes(label);
                  const disabled = !seat || seat.status !== 'available' || (!checked && selected.length >= 10);
                  const status = checked ? 'selected' : seat?.status || 'occupied';
                  return <TouchableOpacity key={label} style={[styles.seat, styles[status]]} disabled={disabled}
                    accessibilityRole="checkbox" accessibilityLabel={`Seat ${label}, ${status}`}
                    accessibilityState={{ checked, disabled }} onPress={() => setSelected(previous => previous.includes(label) ? previous.filter(item => item !== label) : [...previous, label].sort())}>
                    <Text style={[styles.seatText, checked && styles.white]}>{label}</Text>
                    <Ionicons name={checked ? 'checkmark-circle' : status === 'reserved' ? 'time-outline' : status === 'occupied' ? 'person-outline' : 'grid-outline'} size={16} color={checked ? '#FFFFFF' : status === 'available' ? '#0078A4' : '#7C8BA5'} />
                  </TouchableOpacity>;
                })}
              </View>)}
              <View style={styles.footer}><Text style={styles.subtitle}>✱ Emergency exit at rear</Text><Text style={styles.subtitle}>A / D · Window seats</Text></View>
            </View>
            <Text style={styles.hint}>Select up to 10 seats. Each selected seat counts as one passenger. Seats are held for up to 5 minutes when you review the fare.</Text>
          </>}
        </ScrollView>
        <View style={styles.bottom}>
          <View style={styles.summary}><Text style={styles.title}>{selected.length} {selected.length === 1 ? 'passenger' : 'passengers'}</Text><Text style={styles.total}>{formatFare(selected.length * fareMinor)}</Text></View>
          <Text style={styles.subtitle}>{selected.length ? `Seats ${selected.join(', ')}` : 'Tap available seats to select passengers'}</Text>
          <Button style={styles.action} disabled={!trip || !selected.length || !!error || loading} onPress={() => { if (trip) onSelect({ trip, seats: selected }); }}>Use selected seats</Button>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F7FF' }, flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 10, backgroundColor: '#FFFFFF' },
  close: { padding: 6 }, title: { fontSize: 19, fontWeight: '700', color: '#18233B' },
  subtitle: { fontSize: 11, lineHeight: 17, color: '#67728A' }, body: { padding: 16, paddingBottom: 24 },
  section: { fontSize: 12, fontWeight: '700', color: '#344467' }, loading: { padding: 20 },
  departures: { marginVertical: 14 }, departure: { padding: 12, marginRight: 8, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E1E6F3' },
  departureSelected: { borderColor: '#0057D9', backgroundColor: '#EDF4FF' }, date: { fontSize: 12, color: '#344467' }, time: { fontSize: 17, fontWeight: '700', color: '#0057D9', marginVertical: 4 },
  summary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, backgroundColor: '#F0F0FF', padding: 12, borderRadius: 12, marginVertical: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 }, legendText: { fontSize: 10, color: '#344467' }, swatch: { width: 13, height: 13, borderRadius: 3, borderWidth: 1, borderColor: '#D7DFF0' },
  available: { backgroundColor: '#FFFFFF', borderColor: '#D7DFF0' }, selected: { backgroundColor: '#0057D9', borderColor: '#0057D9' }, occupied: { backgroundColor: '#E1E7FB', borderColor: '#E1E7FB' }, reserved: { backgroundColor: '#B6F5D8', borderColor: '#B6F5D8' },
  bus: { backgroundColor: '#FFFFFF', padding: 14, borderRadius: 20 }, driver: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8, backgroundColor: '#E9EDFF', borderRadius: 12 }, driverText: { flex: 1, fontSize: 11, fontWeight: '700', color: '#0078A4' },
  line: { height: 5, backgroundColor: '#A9DDFB', borderRadius: 3, marginVertical: 17 }, row: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 },
  seat: { flex: 1, height: 53, borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center', gap: 3 },
  seatText: { fontSize: 12, fontWeight: '600', color: '#18233B' }, white: { color: '#FFFFFF' }, aisle: { width: 30, alignItems: 'center', gap: 7 }, rowLabel: { fontSize: 9, color: '#8794AF' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, gap: 8 }, hint: { fontSize: 12, lineHeight: 19, color: '#67728A', marginTop: 14 },
  bottom: { padding: 16, borderTopWidth: 1, borderColor: '#E1E6F3', backgroundColor: '#FFFFFF' }, total: { fontSize: 20, fontWeight: '800', color: '#0057D9' }, action: { marginTop: 12 }, notice: { padding: 14 }, error: { color: '#B91C1C', marginBottom: 12 },
});
