import React from 'react';
import { Text } from 'react-native';
import { act, create } from 'react-test-renderer';
import AdminRouteBoundary from '../auth/AdminRouteBoundary';
let mockPath = '/admin';
let mockRole = 'admin';
jest.mock('../auth/AuthProvider', () => ({ useAuth: () => ({ session: { user: { role: mockRole } }, loading: false }) }));
jest.mock('expo-router', () => ({ usePathname: () => mockPath, Redirect: ({ href }: { href: string }) => require('react').createElement(require('react-native').Text, {}, href) }));
test.each(['/home', '/routes', '/tickets', '/ticketing/purchase', '/ticketing/old-ticket', '/route-search', '/fare-information', '/bus-map', '/bus-status', '/bus-eta', '/notifications', '/help-support', '/(tabs)/tickets'])('Admin direct link %s redirects to its workspace', path => {
  mockPath = path; mockRole = 'admin'; let screen: any;
  act(() => { screen = create(<AdminRouteBoundary><Text>Content</Text></AdminRouteBoundary>); });
  expect(screen.root.findByType(Text).props.children).toBe('/(tabs)/admin'); act(() => screen.unmount());
});
test.each(['/admin', '/profile', '/officer-dashboard/verify-ticket', '/login', '/ticketing/login'])('Admin keeps access to %s', path => {
  mockPath = path; mockRole = 'admin'; let screen: any;
  act(() => { screen = create(<AdminRouteBoundary><Text>Content</Text></AdminRouteBoundary>); });
  expect(screen.root.findByType(Text).props.children).toBe('Content'); act(() => screen.unmount());
});
test.each(['passenger', 'officer'])('%s passenger navigation is unchanged', role => {
  mockPath = '/tickets'; mockRole = role; let screen: any;
  act(() => { screen = create(<AdminRouteBoundary><Text>Content</Text></AdminRouteBoundary>); });
  expect(screen.root.findByType(Text).props.children).toBe('Content'); act(() => screen.unmount());
});
