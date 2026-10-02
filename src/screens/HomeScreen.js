import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import WebMap from '../components/WebMap';
import { buses as initialBuses } from '../data/buses';

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

      {/* Real Map with OpenStreetMap - works on web AND phone */}
      <View style={styles.mapContainer}>
        <WebMap buses={buses} />
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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 50,
  },
  logo: { fontSize: 20, fontWeight: 'bold', color: '#2563EB' },
  bell: { fontSize: 20 },
  searchBar: {
    backgroundColor: '#F3F4F6',
    margin: 16,
    padding: 12,
    borderRadius: 12,
  },
  searchText: { color: '#6B7280' },
  mapContainer: {
    flex: 1,
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  bottomSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: 250,
    marginTop: 16,
  },
  sheetTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  busCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  busBadge: {
    backgroundColor: '#2563EB',
    color: '#fff',
    padding: 6,
    borderRadius: 8,
    fontWeight: 'bold',
    marginRight: 12,
  },
  busName: { flex: 1, fontSize: 14 },
  etaPill: { color: '#2563EB', fontWeight: 'bold' },
});