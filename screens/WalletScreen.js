// GhostPay Agent — Connect Wallet Screen
import {
    ArrowLeft,
    ChevronRight,
    Circle,
    Layers,
    LogOut,
    ShieldCheck,
    Wallet
} from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import GlassCard from '../components/GlassCard';
import { useTheme } from '../context/ThemeContext';
import { useWallet } from '../context/WalletContext';

const { width } = Dimensions.get('window');

export default function WalletScreen({ navigation }) {
  const { colors } = useTheme();
  const {
    connect, disconnect, isConnected, isConnecting,
    walletAddress, displayAddress, balance, sttBalance, chainName, connectedWallet, syncWalletAddress
  } = useWallet();
  const [manualAddress, setManualAddress] = useState('');

  useEffect(() => {
    if (walletAddress) {
      setManualAddress(walletAddress);
    }
  }, [walletAddress]);

  const pulseAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 2500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 2500, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const ring1Scale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1.25] });
  const ring1Opacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });
  const ring2Scale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.5] });
  const ring2Opacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0] });

  // Real wallet options — all use deep links, no native SDK needed
  const walletOptions = [
    { id: 'metamask',  title: 'MetaMask',        subtitle: 'Open MetaMask app & approve',  icon: Layers,      primary: true },
    { id: 'trust',     title: 'Trust Wallet',    subtitle: 'Open Trust Wallet & approve',  icon: ShieldCheck, primary: false },
    { id: 'coinbase',  title: 'Coinbase Wallet', subtitle: 'Open Coinbase & approve',      icon: Circle,      primary: false },
  ];

  const handleConnect = (id) => connect(id);

  const handleDisconnect = () => {
    Alert.alert('Disconnect Wallet', 'Are you sure you want to disconnect?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Disconnect', style: 'destructive', onPress: disconnect },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      {/* Blobs */}
      <View style={[styles.blob, styles.blobTop, { backgroundColor: colors.primary + '18' }]} pointerEvents="none" />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Connect Wallet</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Hero Graphic */}
        <View style={styles.hero}>
          <View style={[styles.graphicOuter, { borderColor: colors.primary + '20' }]}>
            <Animated.View style={[styles.pulseRing, {
              backgroundColor: colors.primary + '30',
              transform: [{ scale: ring2Scale }],
              opacity: ring2Opacity,
            }]} />
            <Animated.View style={[styles.pulseRing, {
              backgroundColor: colors.primary + '20',
              transform: [{ scale: ring1Scale }],
              opacity: ring1Opacity,
            }]} />
            <View style={[styles.graphicInner, {
              backgroundColor: colors.primary + '20',
              borderColor: colors.primary + '40',
            }]}>
              <Wallet size={40} color={colors.primary} />
            </View>
          </View>
          <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>
            {isConnected ? 'Wallet Connected' : 'Connect Your Wallet'}
          </Text>
          <Text style={[styles.heroSub, { color: colors.textSecondary }]}>
            {isConnected
              ? 'Your AI agent is ready to execute payments'
              : 'Link your wallet to activate the AI payment agent'}
          </Text>
        </View>

        {/* Connected State */}
        {isConnected ? (
          <>
            <GlassCard style={styles.connectedCard}>
              <View style={styles.connectedRow}>
                <View style={[styles.connectedDot, { backgroundColor: colors.accentGreen }]} />
                <Text style={[styles.connectedLabel, { color: colors.accentGreen }]}>
                  {connectedWallet?.name || 'Wallet Connected'}
                </Text>
              </View>
              <Text style={[styles.connectedAddr, { color: colors.textPrimary }]}>{displayAddress}</Text>
              <View style={styles.syncAddressWrap}>
                <Text style={[styles.syncAddressLabel, { color: colors.textSecondary }]}>Sync or update wallet address to fetch testnet balance</Text>
                <TextInput
                  style={[styles.syncAddressInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.bgSecondary }]}
                  placeholder="0x..."
                  placeholderTextColor={colors.textMuted}
                  value={manualAddress}
                  onChangeText={setManualAddress}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={[styles.syncAddressBtn, { backgroundColor: colors.primary }]}
                  onPress={async () => {
                    const result = await syncWalletAddress(manualAddress);
                    if (!result?.success) {
                      Alert.alert('Invalid Address', result?.error || 'Please try again.');
                    } else if (result?.network) {
                      Alert.alert('Balance Synced', `Fetched from ${result.network}`);
                    }
                  }}
                >
                  <Text style={styles.syncAddressBtnText}>Sync Address</Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.connectedDivider, { backgroundColor: colors.border }]} />
              <View style={styles.connectedDetails}>
                <View style={styles.detailItem}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>STT Balance</Text>
                  <Text style={[styles.detailValue, { color: colors.primary }]}>{parseFloat(sttBalance || 0).toLocaleString()} STT</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>ETH Balance</Text>
                  <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{parseFloat(balance || 0).toFixed(4)} ETH</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Network</Text>
                  <Text style={[styles.detailValue, { color: colors.primary }]}>{chainName}</Text>
                </View>
              </View>
            </GlassCard>

            <TouchableOpacity
              style={[styles.disconnectBtn, { borderColor: '#ef4444' + '40' }]}
              onPress={handleDisconnect}
              activeOpacity={0.75}
            >
              <LogOut size={18} color="#ef4444" />
              <Text style={[styles.disconnectText, { color: '#ef4444' }]}>Disconnect Wallet</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {isConnecting ? (
              <GlassCard style={styles.connectingCard}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.connectingText, { color: colors.textPrimary }]}>Connecting...</Text>
                <Text style={[styles.connectingSub, { color: colors.textSecondary }]}>
                  Check your wallet app for a connection request
                </Text>
              </GlassCard>
            ) : (
              <>
                <Text style={[styles.optionsLabel, { color: colors.textSecondary }]}>SELECT WALLET</Text>
                {walletOptions.map(({ id, title, subtitle, icon: Icon, primary }) => (
                  <TouchableOpacity
                    key={id}
                    style={[
                      styles.walletOption,
                      {
                        backgroundColor: primary ? colors.primary + '12' : 'rgba(255,255,255,0.04)',
                        borderColor: primary ? colors.primary + '50' : colors.border,
                      }
                    ]}
                    onPress={() => handleConnect(id)}
                    activeOpacity={0.65}
                  >
                    <Icon size={22} color={primary ? colors.primary : colors.textSecondary} />
                    <View style={styles.walletInfo}>
                      <Text style={[styles.walletTitle, { color: colors.textPrimary }]}>{title}</Text>
                      <Text style={[styles.walletSub, { color: colors.textSecondary }]}>{subtitle}</Text>
                    </View>
                    <ChevronRight size={18} color={primary ? colors.primary : colors.textMuted} />
                  </TouchableOpacity>
                ))}
              </>
            )}
          </>
        )}

        {/* Security Note */}
        <View style={[styles.securityBox, { backgroundColor: colors.accentGreen + '10', borderColor: colors.accentGreen + '20' }]}>
          <ShieldCheck size={16} color={colors.accentGreen} />
          <Text style={[styles.securityText, { color: colors.accentGreen }]}>
            Your private key never leaves your wallet
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  blob: { position: 'absolute', borderRadius: 9999 },
  blobTop: { top: -100, right: -80, width: width * 0.7, height: width * 0.7 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  backBtn: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 20, paddingBottom: 60 },

  // Hero
  hero: { alignItems: 'center', marginVertical: 30 },
  graphicOuter: {
    width: 130, height: 130, borderRadius: 65, borderWidth: 1,
    justifyContent: 'center', alignItems: 'center', marginBottom: 24,
  },
  graphicInner: {
    width: 84, height: 84, borderRadius: 42,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1.5,
  },
  pulseRing: { position: 'absolute', width: 130, height: 130, borderRadius: 65 },
  heroTitle: { fontSize: 24, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  heroSub: { fontSize: 14, textAlign: 'center', lineHeight: 22, paddingHorizontal: 16 },

  // Connected
  connectedCard: { padding: 22, marginBottom: 16 },
  connectedRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  connectedDot: { width: 8, height: 8, borderRadius: 4 },
  connectedLabel: { fontSize: 13, fontWeight: '700' },
  connectedAddr: { fontSize: 16, fontWeight: '600', fontFamily: 'monospace', marginBottom: 16 },
  syncAddressWrap: { marginBottom: 12 },
  syncAddressLabel: { fontSize: 12, marginBottom: 8 },
  syncAddressInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: 'monospace',
  },
  syncAddressBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  syncAddressBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  connectedDivider: { height: 1, marginBottom: 16 },
  connectedDetails: { flexDirection: 'row', justifyContent: 'space-between' },
  detailItem: {},
  detailLabel: { fontSize: 11, marginBottom: 4 },
  detailValue: { fontSize: 15, fontWeight: '700' },
  disconnectBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 16, borderRadius: 30, borderWidth: 1, marginBottom: 20,
  },
  disconnectText: { fontSize: 15, fontWeight: '700' },

  // Connecting
  connectingCard: { padding: 36, alignItems: 'center', gap: 14, marginBottom: 20 },
  connectingText: { fontSize: 17, fontWeight: '700' },
  connectingSub: { fontSize: 13, textAlign: 'center', lineHeight: 20 },

  // Options
  optionsLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 14 },
  walletOption: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 16, paddingVertical: 16, borderRadius: 24,
    borderWidth: 1, marginBottom: 12,
  },
  walletIconBox: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center' },
  walletInfo: { flex: 1 },
  walletTitle: { fontSize: 15, fontWeight: '700' },
  walletSub: { fontSize: 12, marginTop: 3 },

  // Security
  securityBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, borderWidth: 1, marginTop: 8,
  },
  securityText: { fontSize: 13, fontWeight: '600', flex: 1 },
});
