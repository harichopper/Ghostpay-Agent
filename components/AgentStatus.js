// GhostPay Agent — Agent Status Component (Theme-aware + Responsive)
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { moderateScale, fontSize } from '../utils/responsive';

export default function AgentStatus({ isActive = true, decisionsCount = 0, confidence = 100 }) {
  const { colors } = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (isActive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      ).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 0.8, duration: 1500, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.3, duration: 1500, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [isActive]);

  return (
    <View style={[styles.container, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
      <View style={styles.statusRow}>
        <Animated.View style={[styles.statusDot, {
          backgroundColor: isActive ? colors.accentGreen : colors.textMuted,
          transform: [{ scale: pulseAnim }],
        }]} />
        <Animated.View style={[styles.statusGlow, {
          backgroundColor: isActive ? colors.accentGreen : 'transparent',
          opacity: glowAnim,
        }]} />
        <Text style={[styles.statusText, { color: colors.textPrimary }]}>
          {isActive ? 'Agent Active' : 'Agent Offline'}
        </Text>
      </View>
      <View style={[styles.statsRow, { backgroundColor: colors.bgSecondary }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>{decisionsCount}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Decisions</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: confidence >= 80 ? colors.accentGreen : colors.accentOrange }]}>
            {confidence}%
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Confidence</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>v1.0</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Version</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: moderateScale(16),
    padding: moderateScale(20),
    borderWidth: 1,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: moderateScale(16) },
  statusDot: { width: 10, height: 10, borderRadius: 5, zIndex: 2 },
  statusGlow: { position: 'absolute', left: -5, width: 20, height: 20, borderRadius: 10, zIndex: 1 },
  statusText: { fontSize: fontSize(16), fontWeight: '600', marginLeft: moderateScale(16) },
  statsRow: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
    borderRadius: moderateScale(12), paddingVertical: moderateScale(12), paddingHorizontal: 8,
  },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: fontSize(18), fontWeight: '700' },
  statLabel: { fontSize: fontSize(11), marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  divider: { width: 1, height: 30 },
});
