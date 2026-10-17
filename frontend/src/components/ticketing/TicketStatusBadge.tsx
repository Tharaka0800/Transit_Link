import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme';
import type { TicketStatus } from '../../services/ticketService';
const palette = {
  Active: { foreground: colors.green, background: colors.greenSoft },
  Upcoming: { foreground: colors.brandDark, background: colors.brandLight },
  Used: { foreground: colors.gray700, background: colors.gray100 },
  Expired: { foreground: '#B91C1C', background: colors.redSoft },
};
export default function TicketStatusBadge({
  status,
}: {
  status: TicketStatus;
}) {
  const tone = palette[status];
  return (
    <View style={[styles.badge, { backgroundColor: tone.background }]}>
      <View style={[styles.dot, { backgroundColor: tone.foreground }]} />
      <Text style={[styles.text, { color: tone.foreground }]}>{status}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  text: { fontSize: 12, fontWeight: '700' },
});
