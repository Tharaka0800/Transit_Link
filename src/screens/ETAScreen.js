import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { buses } from '../data/buses';

export default function ETAScreen({ route, navigation }) {
  const { busId } = route.params;
  const bus = buses.find(b => b.id === busId) || buses[0];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Arrival Time</Text>
      </View>

      <View style={styles.etaCard}>
        <Text style={styles.nextBus}>NEXT BUS</Text>
        <Text style={styles.etaBig}>{bus.eta} min</Text>
        <Text style={styles.busInfo}>Bus {bus.routeNumber} • {bus.from} → {bus.to}</Text>
        <Text style={styles.traffic}>🟢 Traffic: Light</Text>
      </View>

      <Text style={styles.sectionTitle}>Following Buses</Text>
      {[5, 18, 32].map((eta, i) => (
        <View key={i} style={styles.followRow}>
          <Text>Bus {bus.routeNumber}</Text>
          <Text style={styles.followEta}>{eta} min</Text>
        </View>
      ))}

      <Text style={styles.sectionTitle}>Your Stop</Text>
      <Text style={styles.stopName}>Kandy Clock Tower</Text>
      <Text style={styles.distance}>2.3 km away</Text>

      <TouchableOpacity style={styles.reminderBtn}>
        <Text style={styles.reminderText}>Set Reminder</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16, paddingTop: 50 },
  topBar: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  back: { fontSize: 24, marginRight: 12 },
  title: { fontSize: 18, fontWeight: 'bold' },
  etaCard: { backgroundColor: '#2563EB', padding: 24, borderRadius: 16, marginBottom: 20 },
  nextBus: { color: '#BFDBFE', fontSize: 12, fontWeight: 'bold' },
  etaBig: { color: '#fff', fontSize: 48, fontWeight: 'bold' },
  busInfo: { color: '#fff', marginTop: 8 },
  traffic: { color: '#fff', marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginTop: 16, marginBottom: 12 },
  followRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, backgroundColor: '#F9FAFB', borderRadius: 8, marginBottom: 8 },
  followEta: { color: '#2563EB', fontWeight: 'bold' },
  stopName: { fontWeight: 'bold' },
  distance: { color: '#6B7280', marginBottom: 16 },
  reminderBtn: { backgroundColor: '#2563EB', padding: 16, borderRadius: 12, marginTop: 20, marginBottom: 40 },
  reminderText: { color: '#fff', textAlign: 'center', fontWeight: 'bold' },
});