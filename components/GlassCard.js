// GhostCard — clean glass card without BlurView (black box fix on Android)
import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { moderateScale } from '../utils/responsive';

export default function GlassCard({ children, style }) {
  const { colors, isDark } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark
            ? 'rgba(255, 255, 255, 0.05)'
            : 'rgba(255, 255, 255, 0.85)',
          borderColor: isDark
            ? 'rgba(255, 255, 255, 0.10)'
            : 'rgba(0, 0, 0, 0.06)',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: moderateScale(20),
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#25aff4',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: {
        elevation: 4,
      },
    }),
  },
});
