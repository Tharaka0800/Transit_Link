import React, { useEffect, useState } from 'react';
import { Alert, Modal, Platform, StyleSheet, Text, View } from 'react-native';
import type { AlertButton, AlertOptions } from 'react-native';
import Button from './Button';
import { colors } from '../theme';

interface Dialog {
  title: string;
  message?: string;
  buttons: AlertButton[];
  options?: AlertOptions;
}

let present: ((dialog: Dialog) => void) | undefined;

// React Native Web does not implement Alert.alert. Keep native dialogs on phones
// and show the same choices in a themed modal on web.
export function showAlert(...args: Parameters<typeof Alert.alert>): void {
  const [title, message, buttons, options] = args;
  if (Platform.OS !== 'web') {
    Alert.alert(...args);
    return;
  }
  present?.({ title, message, buttons: buttons?.length ? buttons : [{ text: 'OK' }], options });
}

export function AppAlertProvider({ children }: { children: React.ReactNode }) {
  const [dialogs, setDialogs] = useState<Dialog[]>([]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handler = (dialog: Dialog) => setDialogs((current) => [...current, dialog]);
    present = handler;
    return () => { if (present === handler) present = undefined; };
  }, []);

  const dialog = dialogs[0];
  const dismiss = () => setDialogs((current) => current.slice(1));
  const choose = (button: AlertButton) => {
    dismiss();
    try {
      Promise.resolve(button.onPress?.()).catch((error: unknown) => {
        showAlert('Error', error instanceof Error ? error.message : 'Please try again.');
      });
    } catch (error) {
      showAlert('Error', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  return (
    <>
      {children}
      {Platform.OS === 'web' && dialog && (
        <Modal transparent animationType="fade" visible onRequestClose={() => {
          if (dialog.options?.cancelable === false) return;
          dismiss();
          dialog.options?.onDismiss?.();
        }}>
          <View style={styles.overlay}>
            <View pointerEvents="none" style={styles.backdrop} />
            <View style={styles.card} accessibilityViewIsModal>
              <Text style={styles.title} accessibilityRole="header">{dialog.title}</Text>
              {dialog.message ? <Text style={styles.message}>{dialog.message}</Text> : null}
              <View style={styles.actions}>
                {dialog.buttons.map((button, index) => (
                  <Button
                    key={index}
                    variant={button.style === 'destructive' ? 'danger' : button.style === 'cancel' ? 'secondary' : 'primary'}
                    onPress={() => choose(button)}
                  >
                    {button.text || 'OK'}
                  </Button>
                ))}
              </View>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.gray900, opacity: 0.4 },
  card: { width: '100%', maxWidth: 360, borderRadius: 16, padding: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  title: { fontSize: 20, fontWeight: '700', color: colors.gray900, marginBottom: 12 },
  message: { fontSize: 14, lineHeight: 20, color: colors.gray500, marginBottom: 16 },
  actions: { gap: 8 },
});
