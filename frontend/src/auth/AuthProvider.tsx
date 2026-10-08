import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { getAuthSession, subscribeAuth } from '../services/api';

type AuthSession = NonNullable<Awaited<ReturnType<typeof getAuthSession>>>;

interface AuthContextValue {
  session: AuthSession | null;
  loading: boolean;
  isRestoring: boolean;
  error: string | null;
  retry: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function getLandingRoute(user: { role?: string } | null | undefined) {
  return user?.role === 'officer' ? '/(tabs)/officer-dashboard' : '/(tabs)/home';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const generation = useRef(0);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    const currentGeneration = ++generation.current;
    setLoading(true);
    setError(null);

    // Listen before reading so an old restoration cannot replace a newer login
    // or logout that completes while AsyncStorage is being read.
    const unsubscribe = subscribeAuth((nextSession: AuthSession | null) => {
      if (!active) return;
      generation.current += 1;
      setSession(nextSession);
      setError(null);
      setLoading(false);
    });

    const restore = async () => {
      try {
        const restored = await getAuthSession();
        if (active && generation.current === currentGeneration) setSession(restored);
      } catch (cause) {
        if (active && generation.current === currentGeneration) {
          setSession(null);
          setError(cause instanceof Error ? cause.message : 'Unable to read your saved account. Please try again.');
        }
      } finally {
        if (active && generation.current === currentGeneration) setLoading(false);
      }
    };

    void restore();
    return () => {
      active = false;
      generation.current += 1;
      unsubscribe();
    };
  }, [attempt]);

  return <AuthContext.Provider value={{ session, loading, isRestoring: loading, error, retry }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('useAuth must be used within AuthProvider.');
  return auth;
}
