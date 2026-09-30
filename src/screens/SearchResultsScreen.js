import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { routes } from '../data/buses';

export default function SearchResultsScreen({ route, navigation }) {
  const { from, to } = route.params;
  const [filter, setFilter] = useState('All');

  const filtered = routes.filter(r => {
    if (filter === 'All') return true;
    return r.type === filter;
  });

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{from} → {to}</Text>
      </View>

      <View style={styles.filterRow}>
        {['All', 'AC', 'Non-AC', 'Express'].map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={filter === f ? styles.filterTextActive : styles.filterText}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('BusLiveStatus', { busId: item.id })}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.badge}>{item.routeNumber}</Text>
              <Text style={styles.routeName}>{item.from} → {item.to}</Text>
              <Text style={styles.fare}>Rs.{item.fare}</Text>
            </View>
            <Text style={styles.time}>Departs: {item.departure} • Arrives: {item.arrival}</Text>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{item.type}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16, paddingTop: 50 },
  topBar: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  back: { fontSize: 24, marginRight: 12 },
  title: { fontSize: 18, fontWeight: 'bold' },
  filterRow: { flexDirection: 'row', marginBottom: 16 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6', marginRight: 8 },
  filterActive: { backgroundColor: '#2563EB' },
  filterText: { color: '#6B7280' },
  filterTextActive: { color: '#fff' },
  card: { backgroundColor: '#F9FAFB', padding: 16, borderRadius: 12, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  badge: { backgroundColor: '#2563EB', color: '#fff', padding: 8, borderRadius: 20, fontWeight: 'bold', marginRight: 12 },
  routeName: { flex: 1, fontWeight: 'bold' },
  fare: { color: '#2563EB', fontWeight: 'bold' },
  time: { color: '#6B7280', fontSize: 12, marginBottom: 8 },
  tag: { backgroundColor: '#FEF3C7', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  tagText: { fontSize: 10, color: '#92400E' },
});