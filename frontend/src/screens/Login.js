import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import FormInput from '../components/FormInput';
import Button from '../components/Button';
import { loginUser, registerUser, saveAuth } from '../services/api';
import { colors } from '../theme';

const HERO = require('../../assets/login-hero.png');
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HERO_HEIGHT = Math.max(220, Math.round(SCREEN_HEIGHT * 0.32));

const Login = ({ navigation }) => {
  const [mode, setMode] = useState('login'); // login | register | forgot
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
  });

  const setField = (key, value) => setForm((p) => ({ ...p, [key]: value }));

  const handleLogin = async () => {
    if (!form.email || !form.password) {
      Alert.alert('Missing fields', 'Please enter email/phone and password.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await loginUser({
        email: form.email,
        password: form.password,
      });
      await saveAuth(data);
      navigation.replace('MainTabs');
    } catch (err) {
      Alert.alert('Login failed', err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!form.fullName || !form.email || !form.password) {
      Alert.alert('Missing fields', 'Please fill all required fields.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await registerUser({
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        password: form.password,
      });
      await saveAuth(data);
      navigation.replace('MainTabs');
    } catch (err) {
      Alert.alert(
        'Registration failed',
        err.response?.data?.message || err.message
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async () => {
    if (!form.email.trim()) {
      Alert.alert('Required', 'Enter your email or phone number.');
      return;
    }
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      Alert.alert(
        'Reset link sent',
        `If an account exists for ${form.email}, a reset link has been sent.`
      );
      setMode('login');
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'forgot') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.forgotWrap}>
          <TouchableOpacity onPress={() => setMode('login')} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.gray900} />
          </TouchableOpacity>

          <View style={styles.mailCircle}>
            <Ionicons name="mail" size={40} color={colors.brandDark} />
          </View>

          <Text style={styles.forgotTitle}>Forgot Password?</Text>
          <Text style={styles.forgotSub}>
            Enter your email or phone number and we'll send you a reset link.
          </Text>

          <FormInput
            leftIcon="mail-outline"
            placeholder="Email or Phone Number"
            value={form.email}
            onChangeText={(v) => setField('email', v)}
            keyboardType="email-address"
          />

          <Button loading={loading} onPress={handleForgot}>
            Send Reset Link
          </Button>

          <TouchableOpacity onPress={() => setMode('login')}>
            <Text style={styles.link}>Back to Login</Text>
          </TouchableOpacity>
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
                />
                <FormInput
                  leftIcon="call-outline"
                  placeholder="Phone Number"
                  value={form.phone}
                  onChangeText={(v) => setField('phone', v)}
                  keyboardType="phone-pad"
                />
              </>
            ) : null}

            <FormInput
              leftIcon="mail-outline"
              placeholder="Email or Phone Number"
              value={form.email}
              onChangeText={(v) => setField('email', v)}
              keyboardType="email-address"
            />

            <FormInput
              leftIcon="lock-closed-outline"
              placeholder="Password"
              value={form.password}
              onChangeText={(v) => setField('password', v)}
              secureTextEntry={!showPassword}
              rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
              onRightPress={() => setShowPassword((v) => !v)}
            />

            <Button
              loading={loading}
              onPress={mode === 'login' ? handleLogin : handleRegister}
            >
              {mode === 'login' ? 'Login' : 'Register'}
            </Button>

            {mode === 'login' ? (
              <TouchableOpacity onPress={() => setMode('forgot')}>
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
                onPress={() =>
                  setMode((m) => (m === 'login' ? 'register' : 'login'))
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
