import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform } from 'react-native';
import { buses } from '../data/buses';

let MapView, Marker;
if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
}

export default function BusLiveStatusScreen({ route, navigation }) {
  const { busId } = route.params;
  const bus = buses.find(b => b.id === busId) || buses[0];
  const stops = ['Colombo Fort', 'Kadawatha', 'Kegalle', 'Peradeniya', 'Kandy'];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Bus {bus.routeNumber} - Live</Text>
      </View>

      <View style={styles.mapContainer}>
        {Platform.OS === 'web' ? (
          <View style={styles.mapPlaceholder}>
            <Text style={styles.mapTitle}>🗺️ LIVE MAP</Text>
            <Text style={styles.mapSubtitle}>Bus {bus.routeNumber} • {bus.from} → {bus.to}</Text>
            <View style={styles.mapBusIcon}>
              <Text style={styles.mapBusText}>🚌 {bus.routeNumber}</Text>
            </View>
          </View>
        ) : (
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: bus.lat,
              longitude: bus.lng,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
          >
            <Marker coordinate={{ latitude: bus.lat, longitude: bus.lng }} title={`Bus ${bus.routeNumber}`} />
          </MapView>
        )}
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.busTitle}>Bus {bus.routeNumber}</Text>
        <Text style={styles.route}>{bus.from} → {bus.to}</Text>
        <View style={styles.row}>
          <Text>Next Stop</Text>
          <Text style={styles.blue}>{bus.nextStop} ({bus.nextStopEta} min)</Text>
        </View>
        <View style={styles.row}>
          <Text>Speed</Text>
          <Text>{bus.speed} km/h</Text>
        </View>
        <View style={styles.row}>
          <Text>Seats</Text>
          <Text style={styles.green}>● {bus.seats}</Text>
        </View>
        <View style={styles.row}>
          <Text>Last Updated</Text>
          <Text>Just now</Text>
        </View>
      </View>

      <View style={styles.progressBar}>
        <Text style={styles.stopLabel}>Colombo</Text>
        <View style={styles.progressLine}>
          <View style={[styles.progressFill, { width: '60%' }]} />
        </View>
        <Text style={styles.stopLabel}>Kandy</Text>
      </View>

      <Text style={styles.sectionTitle}>Stops on Route</Text>
      {stops.map((stop, i) => (
        <View key={i} style={styles.stopRow}>
          <Text style={styles.stopIcon}>{i < 3 ? '✔' : i === 3 ? '●' : '○'}</Text>
          <Text>{stop}</Text>
        </View>
      ))}

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.navigate('ETA', { busId: bus.id })}
        >
          <Text style={styles.primaryText}>Track Live</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn}>
          <Text style={styles.secondaryText}>Share</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16, paddingTop: 50 },
  topBar: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  back: { fontSize: 24, marginRight: 12 },
  title: { fontSize: 18, fontWeight: 'bold' },
  mapContainer: { height: 200, borderRadius: 12, marginBottom: 16, overflow: 'hidden' },
  map: { flex: 1 },
  mapPlaceholder: { flex: 1, backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  mapTitle: { fontSize: 20, fontWeight: 'bold', color: '#374151' },
  mapSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  mapBusIcon: { position: 'absolute', backgroundColor: '#2563EB', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, top: '40%' },
  mapBusText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  infoCard: { backgroundColor: '#F9FAFB', padding: 16, borderRadius: 12, marginBottom: 16 },
  busTitle: { fontSize: 20, fontWeight: 'bold' },
  route: { color: '#6B7280', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  blue: { color: '#2563EB', fontWeight: 'bold' },
  green: { color: '#10B981', fontWeight: 'bold' },
  progressBar: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  progressLine: { flex: 1, height: 4, backgroundColor: '#E5E7EB', marginHorizontal: 8, borderRadius: 2 },
  progressFill: { height: 4, backgroundColor: '#2563EB', borderRadius: 2 },
  stopLabel: { fontSize: 12, fontWeight: 'bold' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginTop: 16, marginBottom: 12 },
  stopRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  stopIcon: { marginRight: 12, fontSize: 16 },
  buttonRow: { flexDirection: 'row', marginTop: 20, marginBottom: 40 },
  primaryBtn: { flex: 1, backgroundColor: '#2563EB', padding: 16, borderRadius: 12, marginRight: 8 },
  primaryText: { color: '#fff', textAlign: 'center', fontWeight: 'bold' },
  secondaryBtn: { flex: 1, borderWidth: 2, borderColor: '#2563EB', padding: 16, borderRadius: 12, marginLeft: 8 },
  secondaryText: { color: '#2563EB', textAlign: 'center', fontWeight: 'bold' },
});