import React from 'react';
import { Redirect, usePathname } from 'expo-router';
import { useAuth } from './AuthProvider';
import AuthLoading from './AuthLoading';

export default function AdminRouteBoundary({ children }: { children: React.ReactNode }) {
  const { session, loading, error, retry } = useAuth();
  const pathname = usePathname().replace(/\/\([^/]+\)/g, '').replace(/\/$/, '') || '/';
  if (loading || error) return <AuthLoading error={error} onRetry={retry} />;
  // An allowlist also covers deep links and previously mounted passenger pages.
  const allowed = ['/', '/admin', '/profile', '/login', '/ticketing/login', '/officer-dashboard/verify-ticket'];
  if (session?.user.role === 'admin' && !allowed.includes(pathname)) return <Redirect href="/(tabs)/admin" />;
  return <>{children}</>;
}
