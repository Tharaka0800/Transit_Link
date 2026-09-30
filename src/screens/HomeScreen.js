import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { buses as initialBuses } from '../data/buses';

// Map only for mobile
let MapView, Marker;
if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
}

export default function HomeScreen({ navigation }) {
  const [buses, setBuses] = useState(initialBuses);

  useEffect(() => {
    const interval = setInterval(() => {
      setBuses(prev =>
        prev.map(bus => ({
          ...bus,
          eta: Math.max(1, bus.eta - 1),
        }))
      );
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.logo}>SmartBus</Text>
        <Text style={styles.bell}>🔔</Text>
      </View>

      <TouchableOpacity
        style={styles.searchBar}
        onPress={() => navigation.navigate('RouteSearch')}
      >
        <Text style={styles.searchText}>Search bus, route, or stop</Text>
      </TouchableOpacity>

      {/* Map placeholder for web, real map for mobile */}
      <View style={styles.mapContainer}>
        {Platform.OS === 'web' ? (
          <View style={styles.mapPlaceholder}>
            <Text style={styles.mapTitle}>🗺️ LIVE MAP</Text>
            <Text style={styles.mapSubtitle}>Colombo Area</Text>
            <View style={styles.mapBuses}>
              {buses.map((bus, i) => (
                <View key={bus.id} style={[styles.mapBusIcon, { top: 30 + i * 60, left: 40 + i * 80 }]}>
                  <Text style={styles.mapBusText}>🚌 {bus.routeNumber}</Text>
                  <Text style={styles.mapBusEta}>{bus.eta} min</Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: 6.9271,
              longitude: 79.8612,
              latitudeDelta: 0.2,
              longitudeDelta: 0.2,
            }}
          >
            {buses.map(bus => (
              <Marker
                key={bus.id}
                coordinate={{ latitude: bus.lat, longitude: bus.lng }}
                title={`Bus ${bus.routeNumber}`}
                description={`${bus.from} → ${bus.to} | ${bus.eta} min`}
              />
            ))}
          </MapView>
        )}
      </View>

      <View style={styles.bottomSheet}>
        <Text style={styles.sheetTitle}>Nearby Buses</Text>
        {buses.map(bus => (
          <TouchableOpacity
            key={bus.id}
            style={styles.busCard}
            onPress={() => navigation.navigate('BusLiveStatus', { busId: bus.id })}
          >
            <Text style={styles.busBadge}>{bus.routeNumber}</Text>
            <Text style={styles.busName}>{bus.from} → {bus.to}</Text>
            <Text style={styles.etaPill}>{bus.eta} min</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, paddingTop: 50 },
  logo: { fontSize: 20, fontWeight: 'bold', color: '#2563EB' },
  bell: { fontSize: 20 },
  searchBar: { backgroundColor: '#F3F4F6', margin: 16, padding: 12, borderRadius: 12 },
  searchText: { color: '#6B7280' },
  mapContainer: { flex: 1, marginHorizontal: 16, borderRadius: 12, overflow: 'hidden' },
  map: { flex: 1 },
  mapPlaceholder: { flex: 1, backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  mapTitle: { fontSize: 24, fontWeight: 'bold', color: '#374151' },
  mapSubtitle: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  mapBuses: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  mapBusIcon: { position: 'absolute', backgroundColor: '#2563EB', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  mapBusText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  mapBusEta: { color: '#BFDBFE', fontSize: 8 },
  bottomSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, maxHeight: 250, marginTop: 16 },
  sheetTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  busCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', padding: 12, borderRadius: 12, marginBottom: 8 },
  busBadge: { backgroundColor: '#2563EB', color: '#fff', padding: 6, borderRadius: 8, fontWeight: 'bold', marginRight: 12 },
  busName: { flex: 1, fontSize: 14 },
  etaPill: { color: '#2563EB', fontWeight: 'bold' },
});