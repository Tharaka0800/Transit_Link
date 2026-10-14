import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Navbar from '../components/Navbar';
import FormInput from '../components/FormInput';
import Button from '../components/Button';
import { generalFares } from '../data/mockData';
import { loadCatalogue } from '../services/LocalAppStorage';
import { showAlert } from '../components/AppAlert';
import { colors } from '../theme';

const normalize = (value) => value.trim().toLowerCase();

const FareInformation = () => {
  const [tab, setTab] = useState('calculator');
  const [from, setFrom] = useState('Colombo Fort');
  const [to, setTo] = useState('Kandy');
  const [transport, setTransport] = useState('Bus');
  const [result, setResult] = useState(null);

  const calculateFare = async () => {
    if (!from.trim() || !to.trim()) {
      showAlert('Missing fields', 'Please enter both From and To locations.');
      return;
    }

    try {
      const journeys = (await loadCatalogue()).filter(j => j.active && j.mode === transport);
      const journey = journeys.find(j => normalize(j.from) === normalize(from) && normalize(j.to) === normalize(to));
      if (!journey) { setResult(null); showAlert('Unavailable journey', 'No configured fare matches this journey. Check Route Search for available services.'); return; }
      setResult({ amount: journey.ticketTypes[0].fareMinor / 100, transport, classType: journey.ticketTypes[0].label, estimated: false });
    } catch (e) { showAlert('Could not load fares', e.message); }

  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Navbar
        title="Fare Information"
        showBack
        onBack={() =>
          router.canGoBack() ? router.back() : router.replace('/(tabs)/home')
        }
      />

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'calculator' && styles.tabActive]}
          onPress={() => setTab('calculator')}
        >
          <Text
            style={[styles.tabText, tab === 'calculator' && styles.tabTextActive]}
          >
            Fare Calculator
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'general' && styles.tabActive]}
          onPress={() => setTab('general')}
        >
          <Text
            style={[styles.tabText, tab === 'general' && styles.tabTextActive]}
          >
            General Fares
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {tab === 'calculator' ? (
          <>
            <FormInput
              label="From"
              leftIcon="location-outline"
              value={from}
              onChangeText={setFrom}
              placeholder="Colombo Fort"
              autoCapitalize="words"
            />
            <FormInput
              label="To"
              leftIcon="location-outline"
              value={to}
              onChangeText={setTo}
              placeholder="Kandy"
              autoCapitalize="words"
            />

            <Text style={styles.label}>Transport Type</Text>
            <View style={styles.transportRow}>
              {['Bus', 'Train'].map((type, index) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.transportBtn,
                    index === 0 && styles.transportBtnSpacing,
                    transport === type && styles.transportBtnActive,
                  ]}
                  onPress={() => {
                    setTransport(type);
                    setResult(null);
                  }}
                >
                  <Text
                    style={[
                      styles.transportText,
                      transport === type && styles.transportTextActive,
                    ]}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Button onPress={calculateFare} style={{ marginTop: 8 }}>
              Calculate Fare
            </Button>

            {result ? (
              <View style={styles.resultCard}>
                <Text style={styles.resultLabel}>Configured Fare</Text>
                <View style={styles.resultRow}>
                  <Ionicons
                    name="card-outline"
                    size={26}
                    color={colors.gray900}
                  />
                  <Text style={styles.resultAmount}>LKR {result.amount}</Text>
                </View>
                <Text style={styles.resultMeta}>
                  ({result.transport} · {result.classType}
                  {result.estimated ? ' · Estimate' : ''})
                </Text>
              </View>
            ) : null}
          </>
        ) : (
          <View style={styles.generalList}>
            {generalFares.map((item) => (
              <View key={item.route} style={styles.generalCard}>
                <Text style={styles.generalRoute}>{item.route}</Text>
                <Text style={styles.generalFare}>
                  Bus: LKR {item.bus}
                  {item.train != null ? `  ·  Train: LKR ${item.train}` : ''}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: colors.gray100,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.brand,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gray500,
  },
  tabTextActive: {
    color: colors.white,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.gray500,
    marginBottom: 8,
  },
  transportRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  transportBtn: {
    flex: 1,
    backgroundColor: colors.gray100,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  transportBtnSpacing: {
    marginRight: 10,
  },
  transportBtnActive: {
    backgroundColor: colors.brand,
  },
  transportText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.gray700,
  },
  transportTextActive: {
    color: colors.white,
  },
  resultCard: {
    marginTop: 20,
    backgroundColor: colors.brandSoft,
    borderRadius: 16,
    padding: 20,
  },
  resultLabel: {
    fontSize: 14,
    color: colors.gray700,
    marginBottom: 8,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultAmount: {
    marginLeft: 10,
    fontSize: 28,
    fontWeight: '700',
    color: colors.brand,
  },
  resultMeta: {
    marginTop: 6,
    fontSize: 13,
    color: colors.gray500,
  },
  generalList: {
    gap: 12,
  },
  generalCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  generalRoute: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.gray900,
  },
  generalFare: {
    marginTop: 6,
    fontSize: 13,
    color: colors.gray500,
  },
});

export default FareInformation;
