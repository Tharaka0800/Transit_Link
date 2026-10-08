import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from './AuthProvider';
import AuthLoading from './AuthLoading';

export default function OfficerGuard({ children }: { children: React.ReactNode }) {
  const { session, loading, error, retry } = useAuth();
  if (loading || error) return <AuthLoading error={error} onRetry={retry} />;
  if (!session) return <Redirect href="/login" />;
  if (session.user.role !== 'officer') return <Redirect href="/(tabs)/home" />;
  return <>{children}</>;
}
