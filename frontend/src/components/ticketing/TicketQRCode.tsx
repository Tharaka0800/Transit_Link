import React, { useState } from 'react';
import { Text, View, StyleSheet, useWindowDimensions } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { colors } from '../../theme';
export default function TicketQRCode({ payload }: { payload: string }) {
  const { width } = useWindowDimensions();
  const [failed, setFailed] = useState(false);
  return (
    <View style={styles.frame} accessibilityLabel="Digital ticket QR code">
      {failed ? (
        <Text style={styles.error}>
          Unable to display your QR. Close and reopen this ticket.
        </Text>
      ) : (
        <QRCode
          value={payload}
          size={Math.max(128, Math.min(260, width - 128))}
          quietZone={12}
          ecl="M"
          color="#111827"
          backgroundColor="#FFFFFF"
          onError={() => setFailed(true)}
        />
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  frame: {
    alignSelf: 'center',
    backgroundColor: colors.white,
    padding: 8,
    borderRadius: 16,
  },
  error: { maxWidth: 240, textAlign: 'center', color: colors.red },
});
