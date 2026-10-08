import React from 'react';
import { Redirect } from 'expo-router';
import { getLandingRoute, useAuth } from '../auth/AuthProvider';
import AuthLoading from '../auth/AuthLoading';

export default function Index() {
  const { session, loading, error, retry } = useAuth();
  if (loading || error) return <AuthLoading error={error} onRetry={retry} />;
  return <Redirect href={session ? getLandingRoute(session.user) : '/login'} />;
}
