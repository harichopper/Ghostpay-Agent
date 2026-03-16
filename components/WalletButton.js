// GhostPay Agent — Wallet Button (Theme-aware + Responsive)
import React, { useRef } from 'react';
import { TouchableOpacity, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { moderateScale, fontSize } from '../utils/responsive';

export default function WalletButton({ title, onPress, variant = 'primary', icon = null, disabled = false, size = 'medium' }) {
  const { colors, shadows } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 3, useNativeDriver: true }).start();
  };

  const getGradient = () => {
    switch (variant) {
      case 'success': return colors.gradientSuccess;
      case 'danger': return colors.gradientDanger;
      case 'accent': return colors.gradientAccent;
      default: return colors.gradientPrimary;
    }
  };

  const sizeStyles = {
    small: { paddingVertical: moderateScale(10), paddingHorizontal: moderateScale(20), fs: fontSize(13) },
    medium: { paddingVertical: moderateScale(14), paddingHorizontal: moderateScale(28), fs: fontSize(15) },
    large: { paddingVertical: moderateScale(18), paddingHorizontal: moderateScale(36), fs: fontSize(17) },
  };
  const s = sizeStyles[size];

  if (variant === 'outline') {
    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}
          disabled={disabled} activeOpacity={0.7}
          style={[styles.outlineButton, {
            paddingVertical: s.paddingVertical, paddingHorizontal: s.paddingHorizontal,
            borderColor: colors.primary, opacity: disabled ? 0.5 : 1,
          }]}
        >
          {icon && <Text style={styles.icon}>{icon}</Text>}
          <Text style={[styles.outlineText, { fontSize: s.fs, color: colors.primaryLight }]}>{title}</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, shadows.button]}>
      <TouchableOpacity onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut} disabled={disabled} activeOpacity={0.8}>
        <LinearGradient
          colors={disabled ? [colors.textMuted || '#64748b', colors.textMuted || '#64748b'] : getGradient() || ['#25aff4', '#a855f7']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[styles.gradientButton, { paddingVertical: s.paddingVertical, paddingHorizontal: s.paddingHorizontal }]}
        >
          {icon && <Text style={styles.icon}>{icon}</Text>}
          <Text style={[styles.buttonText, { fontSize: s.fs, color: '#FFFFFF' }]}>{title}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  gradientButton: { borderRadius: moderateScale(14), flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontWeight: '700', letterSpacing: 0.5 },
  outlineButton: {
    borderRadius: moderateScale(14), borderWidth: 1.5, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent',
  },
  outlineText: { fontWeight: '600', letterSpacing: 0.5 },
  icon: { marginRight: 8, fontSize: 18 },
});
