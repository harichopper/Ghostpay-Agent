// GhostPay Agent — Connect Wallet Button (Theme-aware + Responsive)
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, TouchableOpacity as RNTouchableOpacity, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BLOCKCHAIN } from '../config/constants';
import { useTheme } from '../context/ThemeContext';
import { useWallet } from '../context/WalletContext';
import { fontSize, moderateScale } from '../utils/responsive';

export default function ConnectWalletButton({ compact = false, onPress }) {
  const { colors, shadows } = useTheme();
  const { isConnected, isConnecting, displayAddress, chainName, connect, disconnect, balance, setPreferredRpc, refreshBalance } = useWallet();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isConnected) {
      Animated.loop(Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])).start();
    }
  }, [isConnected, pulseAnim]);

  const handlePress = () => {
    if (onPress) { onPress(); return; }
    if (isConnected) disconnect(); else connect();
  };

  if (isConnecting) {
    return (
      <View style={[styles.connectingContainer, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={[styles.connectingText, { color: colors.textSecondary }]}>Connecting...</Text>
      </View>
    );
  }

  if (isConnected && compact) {
    return (
      <TouchableOpacity
        style={[styles.compactContainer, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
        onPress={handlePress} activeOpacity={0.7}
      >
        <Animated.View style={[styles.statusDot, { transform: [{ scale: pulseAnim }] }]} />
        <Text style={[styles.compactAddress, { color: colors.textPrimary }]}>{displayAddress}</Text>
      </TouchableOpacity>
    );
  }

  if (isConnected) {
    return (
      <TouchableOpacity
        style={[styles.connectedContainer, { backgroundColor: colors.bgCard, borderColor: colors.accentGreen + '40' }]}
        onPress={handlePress} activeOpacity={0.7}
      >
        <View style={styles.connectedLeft}>
          <Animated.View style={[styles.statusDot, { transform: [{ scale: pulseAnim }] }]} />
          <View>
            <Text style={[styles.connectedLabel, { color: colors.accentGreen }]}>Wallet Connected</Text>
              <Text style={[styles.connectedAddress, { color: colors.textPrimary }]}>{displayAddress}</Text>
              {balance !== null && (
                <Text style={[styles.balanceText, { color: colors.textSecondary }]}>{balance} {BLOCKCHAIN.currencySymbol}</Text>
              )}
              <RNTouchableOpacity
                onPress={async () => {
                  // Force the app to use the testnet RPC and refresh balance
                  setPreferredRpc(BLOCKCHAIN.rpcUrl);
                  await refreshBalance();
                }}
                style={[styles.testnetButton, { borderColor: colors.border }]}
              >
                <Text style={[styles.testnetText, { color: colors.textSecondary }]}>View Sepolia Balance</Text>
              </RNTouchableOpacity>
          </View>
        </View>
        <View style={[styles.chainBadge, { backgroundColor: colors.bgSecondary }]}>
          <Text style={[styles.chainText, { color: colors.textSecondary }]}>
            ⛓️ {chainName}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  // Define disabled and getGradient for the LinearGradient colors prop
  const disabled = false; // Assuming not disabled for the default connect button
  const getGradient = () => colors.gradientAccent; // Use the theme's gradientAccent

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.8}>
      <LinearGradient
        colors={disabled ? [colors.textMuted || '#64748b', colors.textMuted || '#64748b'] : getGradient() || ['#25aff4', '#a855f7']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.connectButton, shadows.button]}
      >
        <Text style={styles.connectIcon}>🔗</Text>
        <Text style={styles.connectText}>Connect Wallet</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  connectingContainer: {
    flexDirection: 'row', alignItems: 'center', borderRadius: moderateScale(12),
    padding: moderateScale(14), borderWidth: 1, justifyContent: 'center',
  },
  connectingText: { fontSize: fontSize(13), marginLeft: 10 },
  compactContainer: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: moderateScale(12),
    paddingVertical: moderateScale(8), borderRadius: 20, borderWidth: 1,
  },
  compactAddress: { fontSize: fontSize(12), fontFamily: 'monospace', marginLeft: 8 },
  connectedContainer: {
    borderRadius: moderateScale(14), padding: moderateScale(14), flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center', borderWidth: 1,
  },
  connectedLeft: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#00E676', marginRight: moderateScale(12) },
  connectedLabel: { fontSize: fontSize(11), fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  connectedAddress: { fontSize: fontSize(14), fontFamily: 'monospace', marginTop: 2 },
  balanceText: { fontSize: fontSize(12), fontFamily: 'monospace', marginTop: 4 },
  chainBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  chainText: { fontSize: fontSize(11), fontWeight: '500' },
  connectButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: moderateScale(16), paddingHorizontal: moderateScale(28), borderRadius: moderateScale(14),
  },
  connectIcon: { fontSize: 20, marginRight: 10 },
  connectText: { color: '#FFFFFF', fontSize: fontSize(16), fontWeight: '700', letterSpacing: 0.5 },
  testnetButton: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  testnetText: { fontSize: fontSize(11), fontWeight: '600' },
});
