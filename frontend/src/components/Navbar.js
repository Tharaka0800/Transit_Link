import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

const Navbar = ({
  title,
  onBack,
  showBack = true,
  rightIcon,
  onRightPress,
  titleColor = colors.brand,
}) => {
  return (
    <View style={styles.bar}>
      <View style={styles.side}>
        {showBack ? (
          <TouchableOpacity onPress={onBack} hitSlop={12} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.gray900} />
          </TouchableOpacity>
        ) : null}
      </View>

      {title ? (
        <Text style={[styles.title, { color: titleColor }]} numberOfLines={1}>
          {title}
        </Text>
      ) : (
        <View style={styles.titleSpacer} />
      )}

      <View style={[styles.side, styles.sideRight]}>
        {rightIcon ? (
          <TouchableOpacity onPress={onRightPress} hitSlop={12} style={styles.iconBtn}>
            <Ionicons name={rightIcon} size={22} color={colors.gray700} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.white,
  },
  side: {
    width: 40,
    alignItems: 'flex-start',
  },
  sideRight: {
    alignItems: 'flex-end',
  },
  iconBtn: {
    padding: 4,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
  },
  titleSpacer: {
    flex: 1,
  },
});

export default Navbar;
