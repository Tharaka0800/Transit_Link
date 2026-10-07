import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Navbar from '../components/Navbar';
import FormInput from '../components/FormInput';
import Button from '../components/Button';
import { createNotification, getToken } from '../services/api';
import { colors } from '../theme';

const supportItems = [
  {
    key: 'faqs',
    title: 'FAQs',
    subtitle: 'Common questions and answers',
    icon: 'help-circle-outline',
  },
  {
    key: 'contact',
    title: 'Contact Us',
    subtitle: 'Get in touch with our support team',
    icon: 'headset-outline',
  },
  {
    key: 'report',
    title: 'Report an Issue',
    subtitle: 'Tell us about a problem',
    icon: 'warning-outline',
  },
  {
    key: 'terms',
    title: 'Terms & Conditions',
    subtitle: 'Read our terms and policies',
    icon: 'document-text-outline',
  },
  {
    key: 'about',
    title: 'About TransitLink',
    subtitle: 'App version 1.0.0',
    icon: 'information-circle-outline',
  },
];

const faqContent = [
  {
    q: 'How do I buy a digital ticket?',
    a: 'Go to Tickets from the bottom navigation, select your route, and complete payment.',
  },
  {
    q: 'Can I track buses in real time?',
    a: 'Yes. Open Routes, pick a line, and view live vehicle positions on the map.',
  },
  {
    q: 'How do I reset my password?',
    a: 'On the Login screen, tap Forgot Password and follow the reset link instructions.',
  },
];

const HelpSupport = () => {
  const [query, setQuery] = useState('');
  const [activePanel, setActivePanel] = useState(null);
  const [issueForm, setIssueForm] = useState({ title: '', message: '' });
  const [loading, setLoading] = useState(false);

  const filtered = useMemo(() => {
    if (!query.trim()) return supportItems;
    const q = query.toLowerCase();
    return supportItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q)
    );
  }, [query]);

  const handleReport = async () => {
    const token = await getToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    if (!issueForm.title.trim() || !issueForm.message.trim()) {
      Alert.alert('Required', 'Please fill subject and description.');
      return;
    }
    setLoading(true);
    try {
      await createNotification({
        title: issueForm.title,
        message: issueForm.message,
        type: 'info',
      });
      Alert.alert('Submitted', 'Your issue has been submitted.');
      setIssueForm({ title: '', message: '' });
      setActivePanel(null);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderPanel = () => {
    switch (activePanel) {
      case 'faqs':
        return faqContent.map((item) => (
          <View key={item.q} style={styles.panelCard}>
            <Text style={styles.panelTitle}>{item.q}</Text>
            <Text style={styles.panelBody}>{item.a}</Text>
          </View>
        ));
      case 'contact':
        return (
          <View style={styles.panelCard}>
            <Text style={styles.panelHeading}>Contact Us</Text>
            <Text style={styles.panelBody}>
              Reach TransitLink support anytime.
            </Text>
            <Text style={styles.contactLine}>Email: support@transitlink.lk</Text>
            <Text style={styles.contactLine}>Hotline: +94 11 200 3000</Text>
            <Text style={styles.contactLine}>Hours: 24/7</Text>
          </View>
        );
      case 'report':
        return (
          <View style={styles.panelCard}>
            <Text style={styles.panelHeading}>Report an Issue</Text>
            <FormInput
              label="Subject"
              value={issueForm.title}
              onChangeText={(v) => setIssueForm((p) => ({ ...p, title: v }))}
              placeholder="Brief summary"
            />
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={styles.textarea}
              value={issueForm.message}
              onChangeText={(v) => setIssueForm((p) => ({ ...p, message: v }))}
              placeholder="Tell us what went wrong..."
              placeholderTextColor={colors.gray400}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <Button loading={loading} onPress={handleReport}>
              Submit Issue
            </Button>
          </View>
        );
      case 'terms':
        return (
          <View style={styles.panelCard}>
            <Text style={styles.panelHeading}>Terms & Conditions</Text>
            <Text style={styles.panelBody}>
              By using TransitLink you agree to follow local transport
              regulations, keep your account credentials secure, and use digital
              tickets only for personal travel.
            </Text>
            <Text style={[styles.panelBody, { marginTop: 10 }]}>
              TransitLink may update schedules, fares, and service availability
              without prior notice.
            </Text>
          </View>
        );
      case 'about':
        return (
          <View style={[styles.panelCard, { alignItems: 'center' }]}>
            <View style={styles.aboutIcon}>
              <Ionicons name="information-circle" size={28} color={colors.brand} />
            </View>
            <Text style={styles.panelHeading}>TransitLink</Text>
            <Text style={styles.panelBody}>Version 1.0.0</Text>
            <Text style={[styles.panelBody, { textAlign: 'center', marginTop: 12 }]}>
              Track · Ride · Pay — your all-in-one public transit companion.
            </Text>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Navbar
        title="Help & Support"
        onBack={() =>
          router.canGoBack() ? router.back() : router.replace('/(tabs)/home')
        }
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color={colors.gray400} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search for help..."
            placeholderTextColor={colors.gray400}
          />
        </View>

        {activePanel ? (
          <View>
            <TouchableOpacity onPress={() => setActivePanel(null)}>
              <Text style={styles.backLink}>← Back to Help</Text>
            </TouchableOpacity>
            {renderPanel()}
          </View>
        ) : (
          <View style={styles.listCard}>
            {filtered.map((item, index) => (
              <TouchableOpacity
                key={item.key}
                style={[
                  styles.row,
                  index < filtered.length - 1 && styles.rowBorder,
                ]}
                onPress={() => setActivePanel(item.key)}
              >
                <View style={styles.iconCircle}>
                  <Ionicons name={item.icon} size={22} color={colors.brand} />
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>{item.title}</Text>
                  <Text style={styles.rowSub}>{item.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.gray300} />
              </TouchableOpacity>
            ))}
            {filtered.length === 0 ? (
              <Text style={styles.noResults}>No results for "{query}"</Text>
            ) : null}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.gray50 },
  scroll: { padding: 16, paddingBottom: 40 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray100,
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 48,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: colors.gray900,
    paddingVertical: 10,
  },
  listCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, marginLeft: 12 },
  rowTitle: { fontSize: 15, fontWeight: '700', color: colors.gray900 },
  rowSub: { fontSize: 13, color: colors.gray400, marginTop: 2 },
  noResults: {
    textAlign: 'center',
    padding: 24,
    color: colors.gray500,
  },
  backLink: {
    color: colors.brand,
    fontWeight: '600',
    marginBottom: 12,
  },
  panelCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    marginBottom: 12,
  },
  panelHeading: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray900,
    marginBottom: 8,
  },
  panelTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.gray900,
  },
  panelBody: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.gray500,
    marginTop: 6,
  },
  contactLine: {
    marginTop: 8,
    fontSize: 14,
    color: colors.gray700,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.gray500,
    marginBottom: 6,
  },
  textarea: {
    backgroundColor: colors.gray100,
    borderRadius: 12,
    padding: 14,
    minHeight: 110,
    fontSize: 15,
    color: colors.gray900,
    marginBottom: 16,
  },
  aboutIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
});

export default HelpSupport;
