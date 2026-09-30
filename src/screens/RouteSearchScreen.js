import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

export default function RouteSearchScreen({ navigation }) {
  const [from, setFrom] = useState('Colombo Fort');
  const [to, setTo] = useState('Kandy');

  const handleSearch = () => {
    navigation.navigate('SearchResults', { from, to });
  };

  const swap = () => {
    const temp = from;
    setFrom(to);
    setTo(temp);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Find Your Route</Text>
      </View>

      <View style={styles.searchCard}>
        <TextInput
          style={styles.input}
          value={from}
          onChangeText={setFrom}
          placeholder="Enter starting point"
        />
        <TouchableOpacity style={styles.swapBtn} onPress={swap}>
          <Text style={styles.swapText}>⇅</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          value={to}
          onChangeText={setTo}
          placeholder="Enter destination"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
          <Text style={styles.searchBtnText}>Search Routes</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Recent Searches</Text>
      {['Colombo → Kandy', 'Maharagama → Pettah', 'Negombo → Colombo'].map((item, i) => (
        <TouchableOpacity
          key={i}
          style={styles.recentItem}
          onPress={() => {
            const [f, t] = item.split(' → ');
            setFrom(f);
            setTo(t);
          }}
        >
          <Text>🕐 {item}</Text>
        </TouchableOpacity>
      ))}

      <Text style={styles.sectionTitle}>Popular Routes</Text>
      <View style={styles.chipRow}>
        {['154', '138', '177', '122'].map((chip, i) => (
          <View key={i} style={styles.chip}>
            <Text>{chip}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16, paddingTop: 50 },
  topBar: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  back: { fontSize: 24, marginRight: 12 },
  title: { fontSize: 18, fontWeight: 'bold' },
  searchCard: { backgroundColor: '#F9FAFB', padding: 16, borderRadius: 12, marginBottom: 20 },
  input: { backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  swapBtn: { alignSelf: 'flex-end', marginBottom: 8, padding: 4 },
  swapText: { fontSize: 18, color: '#2563EB' },
  searchBtn: { backgroundColor: '#2563EB', padding: 14, borderRadius: 8, marginTop: 8 },
  searchBtnText: { color: '#fff', textAlign: 'center', fontWeight: 'bold' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginTop: 16, marginBottom: 12 },
  recentItem: { padding: 12, backgroundColor: '#F9FAFB', borderRadius: 8, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { backgroundColor: '#EFF6FF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8, marginBottom: 8 },
});