import React from 'react';
import { Redirect } from 'expo-router';
import Login from '../screens/Login';
import { getLandingRoute, useAuth } from '../auth/AuthProvider';
import AuthLoading from '../auth/AuthLoading';

export default function LoginRoute() {
  const { session, loading, error, retry } = useAuth();
  if (loading || error) return <AuthLoading error={error} onRetry={retry} />;
  if (session) return <Redirect href={getLandingRoute(session.user)} />;
  return <Login />;
}
