import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { PaymentMethod } from '../../services/ticketService';

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  'transit-balance': 'Transit Smart Balance', card: 'Card', 'mobile-wallet': 'Mobile wallet',
};
const methods: Array<{ id: PaymentMethod; icon: React.ComponentProps<typeof Ionicons>['name']; description: string }> = [
  { id: 'transit-balance', icon: 'wallet-outline', description: 'Demo balance payment · No funds deducted' },
  { id: 'card', icon: 'card-outline', description: 'Demo card payment · No card details required' },
  { id: 'mobile-wallet', icon: 'phone-portrait-outline', description: 'Demo wallet payment · No wallet connected' },
];
export default function PaymentMethodSelector({ value, onChange, disabled = false }: {
  value: PaymentMethod; onChange: (value: PaymentMethod) => void; disabled?: boolean;
}) {
  const [info, setInfo] = useState(false);
  return <View style={styles.container}>
    <View style={styles.heading}><Text style={styles.title}>Payment method</Text><View style={styles.badge}><Ionicons name="flash-outline" size={12} color="#0069A8" /><Text style={styles.badgeText}>Demo checkout</Text></View></View>
    {methods.map(method => {
      const selected = value === method.id;
      return <TouchableOpacity key={method.id} style={[styles.option, selected && styles.selected]} disabled={disabled}
        accessibilityRole="radio" accessibilityLabel={`Pay with ${paymentMethodLabels[method.id]}`}
        accessibilityState={{ checked: selected, disabled }} onPress={() => onChange(method.id)}>
        <View style={[styles.icon, selected && styles.iconSelected]}><Ionicons name={method.icon} size={20} color="#FFFFFF" /></View>
        <View style={styles.flex}><Text style={styles.name}>{paymentMethodLabels[method.id]}</Text>
          {method.id === 'transit-balance' && <View style={styles.recommended}><Text style={styles.recommendedText}>Quick checkout</Text></View>}
          <Text style={styles.description}>{method.description}</Text>
        </View>
        <Ionicons name={selected ? 'checkmark-circle' : 'ellipse'} size={21} color={selected ? '#0055C8' : '#E1E6FF'} />
      </TouchableOpacity>;
    })}
    <TouchableOpacity style={styles.infoButton} onPress={() => setInfo(previous => !previous)} accessibilityRole="button" accessibilityLabel="Payment information" accessibilityState={{ expanded: info }}>
      <View style={styles.infoIcon}><Ionicons name="information-circle-outline" size={20} color="#0055C8" /></View>
      <View style={styles.flex}><Text style={styles.infoTitle}>Payment information</Text><Text style={styles.description}>Cards, wallets and future payment options</Text></View>
      <Ionicons name={info ? 'chevron-up' : 'chevron-down'} size={18} color="#0055C8" />
    </TouchableOpacity>
    {info && <Text style={styles.infoText}>These methods simulate checkout only. Saved cards, balance top-ups, wallet authorisation and promo codes will require a payment-provider integration. No payment details are collected here.</Text>}
  </View>;
}
const styles = StyleSheet.create({
  container: { marginBottom: 18 }, heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 17, fontWeight: '700', color: '#172238' }, badge: { flexDirection: 'row', alignItems: 'center', gap: 3 }, badgeText: { fontSize: 10, color: '#0069A8' },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, marginBottom: 7, borderRadius: 13, backgroundColor: '#F1F0FF', borderWidth: 1, borderColor: '#F1F0FF' },
  selected: { backgroundColor: '#EEF5FF', borderColor: '#BDD4FF' }, icon: { width: 35, height: 35, borderRadius: 10, backgroundColor: '#283345', alignItems: 'center', justifyContent: 'center' }, iconSelected: { backgroundColor: '#0055C8' },
  flex: { flex: 1 }, name: { fontSize: 14, fontWeight: '700', color: '#172238', marginBottom: 4 }, description: { fontSize: 11, lineHeight: 16, color: '#586477' },
  recommended: { alignSelf: 'flex-start', backgroundColor: '#8DE6BD', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2, marginBottom: 3 }, recommendedText: { fontSize: 9, fontWeight: '700', color: '#075B3B' },
  infoButton: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 13, backgroundColor: '#F1F0FF' }, infoIcon: { width: 35, height: 35, borderRadius: 10, backgroundColor: '#E3E7FF', alignItems: 'center', justifyContent: 'center' }, infoTitle: { color: '#0055C8', fontSize: 13, fontWeight: '600', marginBottom: 3 },
  infoText: { fontSize: 12, lineHeight: 19, color: '#586477', padding: 12 },
});
