import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import type { Ticket } from '../../services/ticketService';
import {
  currentTicketStatus,
  formatFare,
  formatTicketDate,
  formatTicketTime,
} from '../../utils/ticketUtils';
import TicketStatusBadge from './TicketStatusBadge';
export default function TicketCard({
  ticket,
  onPress,
  onShowQR,
}: {
  ticket: Ticket;
  onPress: () => void;
  onShowQR?: () => void;
}) {
  return (
    <View style={styles.card}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`View ${ticket.journey.from} to ${ticket.journey.to} ticket`}
      >
        <View style={styles.row}>
          <View style={styles.mode}>
            <Ionicons
              name={
                ticket.journey.mode === 'Bus' ? 'bus-outline' : 'train-outline'
              }
              size={18}
              color={colors.brand}
            />
            <Text style={styles.modeText}>
              {ticket.journey.mode} · {ticket.journey.code}
            </Text>
          </View>
          <TicketStatusBadge status={currentTicketStatus(ticket)} />
        </View>
        <View style={styles.journey}>
          <Text style={styles.place}>{ticket.journey.from}</Text>
          <Ionicons name="arrow-forward" size={20} color={colors.brand} />
          <Text style={styles.place}>{ticket.journey.to}</Text>
        </View>
        <Text style={styles.meta}>
          {formatTicketDate(ticket.validFrom)} ·{' '}
          {formatTicketTime(ticket.validFrom)}
        </Text>
      </TouchableOpacity>
      <View style={styles.footer}>
        <View>
          <Text style={styles.type}>{ticket.ticketTypeLabel}</Text>
          <Text style={styles.fare}>{formatFare(ticket.fareMinor)}</Text>
        </View>
        <TouchableOpacity
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={`View details for ${ticket.reference}`}
          style={styles.open}
        >
          <Ionicons name="qr-code-outline" size={20} color={colors.brand} />
          <Text style={styles.openText}>View ticket</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.brand} />
        </TouchableOpacity>
      </View>
      {currentTicketStatus(ticket) === 'Active' && onShowQR && (
        <TouchableOpacity
          style={styles.quickQR}
          onPress={onShowQR}
          accessibilityRole="button"
          accessibilityLabel={`Show QR for ${ticket.reference}`}
        >
          <Ionicons name="qr-code-outline" size={20} color={colors.white} />
          <Text style={styles.quickQRText}>Show QR</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mode: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  modeText: { fontSize: 12, color: colors.brand, fontWeight: '700' },
  journey: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 22,
  },
  place: { flex: 1, color: colors.gray900, fontSize: 18, fontWeight: '700' },
  meta: { color: colors.gray500, fontSize: 13, marginTop: 10 },
  footer: {
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.gray300,
    marginTop: 18,
    paddingTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  type: { color: colors.gray500, fontSize: 12 },
  fare: {
    color: colors.gray900,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 3,
  },
  open: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  openText: { color: colors.brand, fontSize: 12, fontWeight: '700' },
  quickQR: {
    marginTop: 16,
    borderRadius: 12,
    paddingVertical: 13,
    backgroundColor: colors.brand,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  quickQRText: { color: colors.white, fontSize: 14, fontWeight: '700' },
});
