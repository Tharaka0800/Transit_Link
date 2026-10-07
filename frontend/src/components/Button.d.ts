import type { ComponentType, ReactNode } from 'react';
import type {
  StyleProp,
  TextStyle,
  TouchableOpacityProps,
  ViewStyle,
} from 'react-native';

export interface ButtonProps {
  children?: ReactNode;
  onPress?: TouchableOpacityProps['onPress'];
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: TouchableOpacityProps['accessibilityRole'];
  accessibilityState?: TouchableOpacityProps['accessibilityState'];
}

declare const Button: ComponentType<ButtonProps>;
export default Button;
