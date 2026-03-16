// GhostPay Agent — Settings Screen (reworked)
import React from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Dimensions, Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useWallet } from '../context/WalletContext';
import GlassCard from '../components/GlassCard';
import {
  Settings, Wallet, Info, Globe, Shield,
  ChevronRight, ExternalLink, Bot, Zap, LogOut,
  Wind, Code, Activity
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function SettingsScreen() {
  const { colors } = useTheme();
  const { isConnected, displayAddress, chainName, balance, disconnect } = useWallet();

  const handleDisconnect = () => disconnect();

  const SettingRow = ({ icon: Icon, iconColor, label, value, onPress, valueColor, rightEl }) => (
    <TouchableOpacity
      style={[styles.settingRow, { borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.6}
      disabled={!onPress && !rightEl}
    >
      <Icon size={18} color={iconColor || colors.primary} />
      <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>{label}</Text>
      <View style={styles.settingRight}>
        {value ? (
          <Text style={[styles.settingValue, { color: valueColor || colors.textSecondary }]} numberOfLines={1}>
            {value}
          </Text>
        ) : null}
        {rightEl || (onPress ? <ChevronRight size={16} color={colors.textMuted} /> : null)}
      </View>
    </TouchableOpacity>
  );

  const SectionHeader = ({ label }) => (
    <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{label}</Text>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      {/* Blobs */}
      <View style={[styles.blob, styles.blobTR, { backgroundColor: colors.primary + '14' }]} pointerEvents="none" />
      <View style={[styles.blob, styles.blobBL, { backgroundColor: '#a855f7' + '10' }]} pointerEvents="none" />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={[styles.logoBox, { backgroundColor: colors.primary + '20' }]}>
          <Settings size={17} color={colors.primary} />
        </View>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Wallet Card */}
        <GlassCard style={styles.walletCard}>
          <View style={styles.walletCardTop}>
            <View style={[styles.walletAvatarBox, { backgroundColor: colors.primary + '20', borderColor: colors.primary + '40' }]}>
              <Wallet size={26} color={colors.primary} />
            </View>
            <View style={styles.walletCardInfo}>
              <View style={styles.walletStatusRow}>
                <View style={[styles.connDot, { backgroundColor: isConnected ? colors.accentGreen : colors.textMuted }]} />
                <Text style={[styles.walletStatusLabel, { color: isConnected ? colors.accentGreen : colors.textMuted }]}>
                  {isConnected ? 'Connected' : 'Not Connected'}
                </Text>
              </View>
              <Text style={[styles.walletAddr, { color: colors.textPrimary }]}>
                {isConnected ? displayAddress : '—'}
              </Text>
              {isConnected && (
                <Text style={[styles.walletMeta, { color: colors.textSecondary }]}>
                  {parseFloat(balance || 0).toFixed(4)} ETH · {chainName}
                </Text>
              )}
            </View>
          </View>

          {isConnected && (
            <TouchableOpacity
              style={[styles.disconnectBtn, { borderColor: '#ef4444' + '40' }]}
              onPress={handleDisconnect}
              activeOpacity={0.75}
            >
              <LogOut size={15} color="#ef4444" />
              <Text style={[styles.disconnectText, { color: '#ef4444' }]}>Disconnect</Text>
            </TouchableOpacity>
          )}
        </GlassCard>

        {/* Network Section */}
        <SectionHeader label="NETWORK" />
        <GlassCard style={styles.card}>
          <SettingRow
            icon={Zap}
            iconColor={colors.primary}
            label="Protocol"
            value="Status Gasless"
            valueColor={colors.primary}
          />
          <SettingRow
            icon={Globe}
            iconColor="#a855f7"
            label="Network"
            value="Status Sepolia"
            valueColor={colors.textPrimary}
          />
          <SettingRow
            icon={ExternalLink}
            iconColor={colors.accentGreen}
            label="Block Explorer"
            value="Open"
            onPress={() => Linking.openURL('https://sepolia.status.network')}
            valueColor={colors.accentGreen}
          />
        </GlassCard>

        {/* Agent Section */}
        <SectionHeader label="AI AGENT" />
        <GlassCard style={styles.card}>
          <SettingRow
            icon={Bot}
            iconColor="#a855f7"
            label="Agent Version"
            value="v1.0 Active"
            valueColor={colors.accentGreen}
          />
          <SettingRow
            icon={Shield}
            iconColor={colors.accentGreen}
            label="Security Mode"
            value="AI Governed"
            valueColor={colors.accentGreen}
          />
          <SettingRow
            icon={Activity}
            iconColor={colors.primary}
            label="Decision Engine"
            value="rule-based + NLP"
            valueColor={colors.textSecondary}
          />
        </GlassCard>

        {/* About Section */}
        <SectionHeader label="ABOUT" />
        <GlassCard style={styles.card}>
          <SettingRow
            icon={Wind}
            iconColor={colors.primary}
            label="App"
            value="GhostPay Agent"
            valueColor={colors.textPrimary}
          />
          <SettingRow
            icon={Code}
            iconColor={colors.textSecondary}
            label="Version"
            value="1.0.0"
            valueColor={colors.textSecondary}
          />
          <SettingRow
            icon={Info}
            iconColor={colors.textMuted}
            label="Built for"
            value="Synthesis 2026"
            valueColor={colors.textMuted}
          />
        </GlassCard>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={[styles.footerBadge, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '25' }]}>
            <Zap size={12} color={colors.primary} />
            <Text style={[styles.footerText, { color: colors.textMuted }]}>
              Status Network · Gasless · AI-Powered
            </Text>
            <Shield size={12} color={colors.accentGreen} />
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  blob: { position: 'absolute', borderRadius: 9999 },
  blobTR: { top: -100, right: -80, width: width * 0.65, height: width * 0.65 },
  blobBL: { bottom: 60, left: -80, width: width * 0.6, height: width * 0.6 },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1,
  },
  logoBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  scrollContent: { padding: 20, paddingBottom: 80 },

  // Wallet card
  walletCard: { padding: 20, marginBottom: 28 },
  walletCardTop: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  walletAvatarBox: {
    width: 56, height: 56, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1.5,
  },
  walletCardInfo: { flex: 1 },
  walletStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 6 },
  connDot: { width: 7, height: 7, borderRadius: 4 },
  walletStatusLabel: { fontSize: 12, fontWeight: '700' },
  walletAddr: { fontSize: 15, fontWeight: '600', fontFamily: 'monospace' },
  walletMeta: { fontSize: 12, marginTop: 4 },
  disconnectBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12, borderRadius: 24, borderWidth: 1,
  },
  disconnectText: { fontSize: 14, fontWeight: '700' },

  // Section label
  sectionLabel: {
    fontSize: 11, fontWeight: '700', letterSpacing: 1.5,
    marginBottom: 12, marginTop: 4,
  },

  // Card
  card: { padding: 0, marginBottom: 20, overflow: 'hidden' },

  // Setting row
  settingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 15, paddingHorizontal: 18, borderBottomWidth: 1,
  },
  settingLabel: { flex: 1, fontSize: 14, fontWeight: '600' },
  settingRight: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '45%' },
  settingValue: { fontSize: 13, fontWeight: '500', textAlign: 'right' },

  // Footer
  footer: { alignItems: 'center', marginTop: 16 },
  footerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20, borderWidth: 1,
  },
  footerText: { fontSize: 12, fontWeight: '500' },
});
