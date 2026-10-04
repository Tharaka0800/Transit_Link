import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Button from '../components/Button';
import { getStoredUser, getToken } from '../services/api';
import { colors } from '../theme';

const Home = ({ navigation }) => {
  const [user, setUser] = useState(null);
  const [loggedIn, setLoggedIn] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const token = await getToken();
        const stored = await getStoredUser();
        setLoggedIn(Boolean(token));
        setUser(stored);
      };
      load();
    }, [])
  );

  const firstName = user?.fullName?.split(' ')[0] || 'Passenger';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.brandRow}>
              <View style={styles.brandIcon}>
                <Ionicons name="bus" size={20} color={colors.white} />
              </View>
              <Text style={styles.brandText}>TransitLink</Text>
            </View>
            <TouchableOpacity
              style={styles.bellBtn}
              onPress={() =>
                navigation.navigate(loggedIn ? 'Notifications' : 'Login')
              }
            >
              <Ionicons name="notifications-outline" size={22} color={colors.white} />
            </TouchableOpacity>
          </View>
          <Text style={styles.hello}>
            {loggedIn ? 'Welcome back,' : 'Welcome to'}
          </Text>
          <Text style={styles.title}>
            {loggedIn ? firstName : 'TransitLink'}
          </Text>
          <Text style={styles.subtitle}>
            Track · Ride · Pay — real-time transit at your fingertips.
          </Text>
        </View>

        <View style={styles.cards}>
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('Routes')}
          >
            <View style={styles.cardIcon}>
              <Ionicons name="location" size={22} color={colors.brand} />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>Find Routes</Text>
              <Text style={styles.cardSub}>Plan your next journey</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.gray300} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('Tickets')}
          >
            <View style={styles.cardIcon}>
              <Ionicons name="ticket" size={22} color={colors.brand} />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>My Tickets</Text>
              <Text style={styles.cardSub}>View digital tickets</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.gray300} />
          </TouchableOpacity>

          <View style={styles.quickBox}>
            <Text style={styles.quickTitle}>Quick access</Text>
            <Text style={styles.quickSub}>
              Manage your profile, alerts, and support from one place.
            </Text>
            {loggedIn ? (
              <View style={styles.quickActions}>
                <Button
                  style={styles.halfBtn}
                  onPress={() => navigation.navigate('Profile')}
                >
                  Profile
                </Button>
                <Button
                  variant="secondary"
                  style={styles.halfBtn}
                  onPress={() => navigation.navigate('HelpSupport')}
                >
                  Help
                </Button>
              </View>
            ) : (
              <Button onPress={() => navigation.navigate('Login')}>
                Login / Register
              </Button>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  scroll: { paddingBottom: 24 },
  header: {
    backgroundColor: colors.brand,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  brandIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: { color: colors.white, fontSize: 18, fontWeight: '700', marginLeft: 8 },
  bellBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  hello: { color: '#BFDBFE', fontSize: 14 },
  title: { color: colors.white, fontSize: 26, fontWeight: '700', marginTop: 4 },
  subtitle: { color: '#BFDBFE', fontSize: 14, marginTop: 8 },
  cards: { paddingHorizontal: 16, marginTop: -20 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: { flex: 1, marginLeft: 12 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.gray900 },
  cardSub: { fontSize: 13, color: colors.gray500, marginTop: 2 },
  quickBox: {
    backgroundColor: colors.brandSoft,
    borderRadius: 16,
    padding: 20,
    marginTop: 4,
  },
  quickTitle: { fontSize: 16, fontWeight: '700', color: colors.gray900 },
  quickSub: { fontSize: 13, color: colors.gray500, marginTop: 4, marginBottom: 16 },
  quickActions: { flexDirection: 'row', gap: 8 },
  halfBtn: { flex: 1 },
});

export default Home;
