import type { ComponentProps, ComponentType } from 'react';
import type { StyleProp, TextInputProps, ViewStyle } from 'react-native';
import type { Ionicons } from '@expo/vector-icons';

export interface FormInputProps {
  label?: string;
  value?: TextInputProps['value'];
  onChangeText?: TextInputProps['onChangeText'];
  placeholder?: string;
  leftIcon?: ComponentProps<typeof Ionicons>['name'];
  rightIcon?: ComponentProps<typeof Ionicons>['name'];
  onRightPress?: () => void;
  secureTextEntry?: boolean;
  keyboardType?: TextInputProps['keyboardType'];
  autoCapitalize?: TextInputProps['autoCapitalize'];
  error?: string;
  style?: StyleProp<ViewStyle>;
  editable?: boolean;
  accessibilityLabel?: string;
}

declare const FormInput: ComponentType<FormInputProps>;
export default FormInput;
