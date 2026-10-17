import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Navbar from '../components/Navbar';
import Button from '../components/Button';
import FormInput from '../components/FormInput';
import BusMap from '../components/BusMap';
import { buses, routes } from '../data/buses';
import { colors } from '../theme';
const back = () => router.canGoBack() ? router.back() : router.replace('/(tabs)/routes');
const openBus = bus => router.push({
  pathname: '/bus-status',
  params: {
    busId: bus.id
  }
});
const normalized = value => value.trim().toLowerCase().replace(/^colombo fort$/, 'colombo');
export function matchingRoutes(from, to, type = 'All') {
  return routes.filter(route => normalized(route.from).includes(normalized(from)) && normalized(route.to).includes(normalized(to)) && (type === 'All' || route.type === type));
}
function Page({
  title,
  children
}) {
  return <SafeAreaView style={styles.safe} edges={['top']}><Navbar title={title} onBack={back} /><ScrollView contentContainerStyle={styles.content}><Text style={styles.note}>Demo data · Positions and arrival times are illustrative.</Text>{children}</ScrollView></SafeAreaView>;
}
export function RouteSearchScreen() {
  const [from, setFrom] = useState('Colombo Fort');
  const [to, setTo] = useState('Kandy');
  const [query, setQuery] = useState(null);
  const [type, setType] = useState('All');
  const [error, setError] = useState('');
  const results = query ? matchingRoutes(query.from, query.to, type) : [];
  return <Page title="Search Routes"><FormInput label="From" value={from} onChangeText={setFrom} /><FormInput label="To" value={to} onChangeText={setTo} /><Button variant="secondary" onPress={() => {
      setFrom(to);
      setTo(from);
    }}>Swap locations</Button><Button onPress={() => {
      if (!from.trim() || !to.trim()) {
        setError('Enter both locations.');
        return;
      }
      setError('');
      setType('All');
      setQuery({
        from,
        to
      });
    }}>Search Routes</Button>{error ? <Text accessibilityRole="alert">{error}</Text> : null}{query && <><Text style={styles.heading}>{query.from} → {query.to}</Text><View style={styles.filters}>{['All', 'Express', 'Normal'].map(value => <Button key={value} variant={type === value ? 'primary' : 'secondary'} onPress={() => setType(value)}>{value}</Button>)}</View>{!results.length && <Text>No demo routes match these locations. Try Colombo Fort → Kandy.</Text>}{results.map(route => <View style={styles.card} key={route.id}><Text style={styles.heading}>Bus {route.routeNumber} · {route.type}</Text><Text>{route.from} → {route.to}</Text><Text>Departs {route.departure} · Arrives {route.arrival}</Text><Text>Demo fare: LKR {route.fare}</Text>{buses.find(bus => bus.routeNumber === route.routeNumber) ? <Button onPress={() => openBus(buses.find(bus => bus.routeNumber === route.routeNumber))}>View bus status</Button> : <Text style={styles.note}>Bus status unavailable for this demo route.</Text>}</View>)}</>}<Button variant="secondary" onPress={() => router.push('/bus-map')}>Open bus map</Button></Page>;
}
export function BusMapScreen() {
  return <Page title="Bus Map"><BusMap buses={buses} />{buses.map(bus => <View key={bus.id} style={styles.card}><Text style={styles.heading}>Bus {bus.routeNumber}</Text><Text>{bus.from} → {bus.to} · Demo ETA {bus.eta} min</Text><Button onPress={() => openBus(bus)}>View bus status</Button></View>)}</Page>;
}
export function BusStatusScreen() {
  const {
    busId
  } = useLocalSearchParams();
  const bus = buses.find(item => item.id === busId);
  if (!bus) return <Page title="Bus Status"><Text>Bus not found.</Text><Button onPress={() => router.replace('/bus-map')}>Open bus map</Button></Page>;
  return <Page title={`Bus ${bus.routeNumber}`}><BusMap buses={[bus]} /><View style={styles.card}><Text style={styles.heading}>{bus.from} → {bus.to}</Text><Text>Next stop: {bus.nextStop} · {bus.nextStopEta} min</Text><Text>Demo speed: {bus.speed} km/h</Text><Text>Seats: {bus.seats}</Text><Text>Demo ETA: {bus.eta} min</Text></View><Button onPress={() => router.push({
      pathname: '/bus-eta',
      params: {
        busId: bus.id
      }
    })}>View arrival time</Button></Page>;
}
export function BusETAScreen() {
  const {
    busId
  } = useLocalSearchParams();
  const bus = buses.find(item => item.id === busId);
  return <Page title="Arrival Time">{bus ? <View style={styles.card}><Text style={styles.heading}>Bus {bus.routeNumber} · {bus.from} → {bus.to}</Text><Text style={styles.eta}>{bus.eta} min</Text><Text>Next stop: {bus.nextStop}</Text><Text>Next-stop ETA: {bus.nextStopEta} min</Text><Text style={styles.note}>Fixed demo estimate; this does not update from GPS.</Text></View> : <Text>Bus not found.</Text>}</Page>;
}
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.white
  },
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 32
  },
  card: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.gray50,
    gap: 8
  },
  heading: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray900
  },
  note: {
    color: colors.gray500,
    marginVertical: 8
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  eta: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.brand
  }
});
