import type { ComponentProps, ComponentType } from 'react';
import type { ColorValue, TouchableOpacityProps } from 'react-native';
import type { Ionicons } from '@expo/vector-icons';

export interface NavbarProps {
  title?: string;
  onBack?: TouchableOpacityProps['onPress'];
  showBack?: boolean;
  rightIcon?: ComponentProps<typeof Ionicons>['name'];
  onRightPress?: TouchableOpacityProps['onPress'];
  rightIconColor?: ColorValue;
  titleColor?: ColorValue;
}

declare const Navbar: ComponentType<NavbarProps>;
export default Navbar;
