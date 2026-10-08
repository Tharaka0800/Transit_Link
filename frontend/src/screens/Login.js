import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import FormInput from '../components/FormInput';
import Button from '../components/Button';
import { loginUser, registerUser, saveAuth } from '../services/api';
import { getLandingRoute } from '../auth/AuthProvider';
import { showAlert } from '../components/AppAlert';
import { colors } from '../theme';

const HERO = require('../../assets/login-hero.png');
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HERO_HEIGHT = Math.max(220, Math.round(SCREEN_HEIGHT * 0.32));

const Login = () => {
  const [mode, setMode] = useState('login'); // login | register | forgot
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const submitting = useRef(false);
  const mounted = useRef(false);
  const generation = useRef(0);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
  });

  const setField = (key, value) => setForm((p) => ({ ...p, [key]: value }));

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; generation.current += 1; };
  }, []);

  const changeMode = (nextMode) => {
    if (submitting.current) return;
    generation.current += 1;
    setMode(nextMode);
  };

  const handleSubmit = async () => {
    if (submitting.current) return;
    const registering = mode === 'register';
    if (!form.email.trim() || !form.password || (registering && !form.fullName.trim())) {
      showAlert('Missing fields', registering ? 'Please fill all required fields.' : 'Please enter email/phone and password.');
      return;
    }
    submitting.current = true;
    const currentGeneration = ++generation.current;
    const isCurrent = () => mounted.current && generation.current === currentGeneration;
    setLoading(true);
    try {
      const { data } = registering
        ? await registerUser({ fullName: form.fullName.trim(), email: form.email.trim(), phone: form.phone.trim(), password: form.password })
        : await loginUser({ email: form.email.trim(), password: form.password });
      if (!isCurrent()) return;
      await saveAuth(data);
      if (isCurrent()) router.replace(getLandingRoute(data));
    } catch (err) {
      if (isCurrent()) {
        showAlert(registering ? 'Registration failed' : 'Login failed', err.response?.data?.message || err.message || 'Unable to access local accounts. Please try again.');
      }
    } finally {
      if (isCurrent()) {
        submitting.current = false;
        setLoading(false);
      }
    }
  };

  if (mode === 'forgot') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.forgotWrap}>
          <TouchableOpacity onPress={() => changeMode('login')} style={styles.backBtn} accessibilityLabel="Back to Login">
            <Ionicons name="arrow-back" size={24} color={colors.gray900} />
          </TouchableOpacity>

          <View style={styles.mailCircle}>
            <Ionicons name="mail" size={40} color={colors.brandDark} />
          </View>

          <Text style={styles.forgotTitle}>Forgot Password?</Text>
          <Text style={styles.forgotSub}>
            Accounts are stored on this device. Email and SMS password recovery are unavailable.
          </Text>

          <Button onPress={() => changeMode('login')}>
            Back to Login
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="dark-content"
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          bounces={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scroll}
        >
          <View style={styles.heroWrap}>
            <Image source={HERO} style={styles.hero} resizeMode="cover" />
          </View>

          <View style={styles.content}>
            <View style={styles.logoBox}>
              <Ionicons name="bus" size={28} color={colors.gray900} />
            </View>
            <Text style={styles.brand}>TransitLink</Text>
            <Text style={styles.tagline}>TRACK · RIDE · PAY</Text>

            <Text style={styles.welcome}>
              {mode === 'login' ? 'Welcome Back!' : 'Create Account'}
            </Text>
            <Text style={styles.subtitle}>
              {mode === 'login'
                ? 'Your journey, our priority. Log in to access real-time tracking, digital tickets and more.'
                : 'Join TransitLink to track rides, buy tickets, and manage your journeys.'}
            </Text>

            {mode === 'register' ? (
              <>
                <FormInput
                  leftIcon="person-outline"
                  placeholder="Full Name"
                  value={form.fullName}
                  onChangeText={(v) => setField('fullName', v)}
                  autoCapitalize="words"
                  editable={!loading}
                />
                <FormInput
                  leftIcon="call-outline"
                  placeholder="Phone Number"
                  value={form.phone}
                  onChangeText={(v) => setField('phone', v)}
                  keyboardType="phone-pad"
                  editable={!loading}
                />
              </>
            ) : null}

            <FormInput
              leftIcon="mail-outline"
              placeholder="Email or Phone Number"
              value={form.email}
              onChangeText={(v) => setField('email', v)}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
            />

            <FormInput
              leftIcon="lock-closed-outline"
              placeholder="Password"
              value={form.password}
              onChangeText={(v) => setField('password', v)}
              secureTextEntry={!showPassword}
              rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
              onRightPress={() => setShowPassword((v) => !v)}
              editable={!loading}
            />

            <Button
              loading={loading}
              onPress={handleSubmit}
            >
              {mode === 'login' ? 'Login' : 'Register'}
            </Button>

            {mode === 'login' ? (
              <TouchableOpacity disabled={loading} onPress={() => changeMode('forgot')}>
                <Text style={styles.link}>Forgot Password?</Text>
              </TouchableOpacity>
            ) : null}

            <View style={styles.switchRow}>
              <Text style={styles.switchText}>
                {mode === 'login'
                  ? "Don't have an account? "
                  : 'Already have an account? '}
              </Text>
              <TouchableOpacity
                disabled={loading}
                onPress={() =>
                  changeMode(mode === 'login' ? 'register' : 'login')
                }
              >
                <Text style={styles.linkInline}>
                  {mode === 'login' ? 'Register' : 'Login'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scroll: {
    flexGrow: 1,
  },
  heroWrap: {
    width: SCREEN_WIDTH,
    height: HERO_HEIGHT,
    overflow: 'hidden',
    backgroundColor: '#7EB6E8',
  },
  hero: {
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 32,
    alignItems: 'center',
    backgroundColor: colors.white,
    marginTop: -20,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  logoBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  brand: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.gray900,
  },
  tagline: {
    marginTop: 4,
    fontSize: 11,
    letterSpacing: 3,
    color: colors.gray400,
    fontWeight: '500',
  },
  welcome: {
    marginTop: 20,
    fontSize: 26,
    fontWeight: '700',
    color: colors.brand,
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 20,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
    color: colors.gray500,
  },
  link: {
    marginTop: 16,
    color: colors.brand,
    textDecorationLine: 'underline',
    fontWeight: '500',
    fontSize: 14,
  },
  switchRow: {
    flexDirection: 'row',
    marginTop: 28,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  switchText: {
    color: colors.gray500,
    fontSize: 14,
  },
  linkInline: {
    color: colors.brand,
    fontWeight: '700',
    textDecorationLine: 'underline',
    fontSize: 14,
  },
  forgotWrap: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    alignItems: 'center',
  },
  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: 32,
    padding: 4,
  },
  mailCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  forgotTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.brand,
    marginBottom: 8,
  },
  forgotSub: {
    textAlign: 'center',
    color: colors.gray500,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 28,
    paddingHorizontal: 12,
  },
});

export default Login;
