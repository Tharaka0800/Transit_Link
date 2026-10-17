import React from 'react';
import { TextInput, TouchableOpacity } from 'react-native';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { router } from 'expo-router';
import TicketLoginScreen from '../screens/TicketLoginScreen';
import { loginTicketAccount, registerTicketAccount } from '../services/ticketApi';

jest.mock('../services/ticketApi', () => ({ loginTicketAccount: jest.fn(), registerTicketAccount: jest.fn() }));
jest.mock('expo-router', () => ({router: {replace: jest.fn()}, useLocalSearchParams: () => ({next: 'verify'})}));
jest.mock('@expo/vector-icons', () => ({Ionicons: () => null}));
jest.mock('react-native-safe-area-context', () => ({SafeAreaView: require('react-native').View}));
let screen: ReactTestRenderer;
const button = (label: string) => screen.root.findAllByType(TouchableOpacity).find(node => node.props.accessibilityLabel === label)!;
beforeEach(() => { act(() => { screen = create(<TicketLoginScreen />); }); });
afterEach(() => act(() => screen.unmount()));
test('online sign-in requires credentials and returns verification users to the scanner', async () => {
  await act(async () => button('Sign in to tickets').props.onPress());
  expect(loginTicketAccount).not.toHaveBeenCalled();
  act(() => {
    screen.root.findAllByType(TextInput).find(node => node.props.accessibilityLabel === 'Online ticket email')!.props.onChangeText('admin@example.test');
    screen.root.findAllByType(TextInput).find(node => node.props.accessibilityLabel === 'Online ticket password')!.props.onChangeText('password');
  });
  jest.mocked(loginTicketAccount).mockResolvedValue({_id: 'admin', email: 'admin@example.test', fullName: 'Admin', role: 'admin', token: 'jwt'});
  await act(async () => button('Sign in to tickets').props.onPress());
  expect(loginTicketAccount).toHaveBeenCalledWith('admin@example.test', 'password');
  expect(router.replace).toHaveBeenCalledWith('/officer-dashboard/verify-ticket');
  expect(registerTicketAccount).not.toHaveBeenCalled();
});
