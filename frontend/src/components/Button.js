import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../theme';

const Button = ({
  children,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  textStyle,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'button',
  accessibilityState,
}) => {
  const isPrimary = variant === 'primary';
  const isDanger = variant === 'danger';
  const isSecondary = variant === 'secondary';

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={
        accessibilityLabel || (typeof children === 'string' ? children : undefined)
      }
      accessibilityHint={accessibilityHint}
      accessibilityState={{
        ...accessibilityState,
        disabled: disabled || loading,
        busy: loading,
      }}
      style={[
        styles.base,
        isPrimary && styles.primary,
        isSecondary && styles.secondary,
        isDanger && styles.danger,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isSecondary ? colors.brand : colors.white} />
      ) : (
        <Text
          style={[
            styles.text,
            isSecondary && styles.secondaryText,
            textStyle,
          ]}
        >
          {children}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    width: '100%',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: colors.brand,
  },
  secondary: {
    backgroundColor: colors.gray100,
  },
  danger: {
    backgroundColor: colors.red,
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryText: {
    color: colors.gray700,
  },
});

export default Button;
