// GhostPay Agent — Home Screen (STT-first, fixed notifications & profile)
import { useFocusEffect } from '@react-navigation/native';
import {
  Activity,
  Bell,
  Bot,
  CheckCircle,
  ChevronRight,
  Copy,
  History,
  Info,
  Send,
  TrendingUp,
  User,
  Zap,
  Shield,
} from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import GlassCard from '../components/GlassCard';
import { useTheme } from '../context/ThemeContext';
import { useTransactions } from '../context/TransactionContext';
import { useWallet } from '../context/WalletContext';

const { width } = Dimensions.get('window');

// ─── Ghost Logo Component ───────────────────────────────────────
function GhostLogo({ size = 28, color = '#6C5CE7' }) {
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      {/* Ghost body */}
      <View style={{
        width: size * 0.75, height: size * 0.75,
        borderRadius: size * 0.375,
        backgroundColor: color,
        position: 'absolute', top: 0,
      }} />
      {/* Ghost skirt */}
      <View style={{
        width: size * 0.75, height: size * 0.38,
        backgroundColor: color,
        position: 'absolute', top: size * 0.37,
        borderBottomLeftRadius: size * 0.18,
        borderBottomRightRadius: size * 0.18,
      }} />
      {/* Ghost eyes */}
      <View style={{
        position: 'absolute', top: size * 0.22,
        flexDirection: 'row', gap: size * 0.16,
      }}>
        <View style={{ width: size * 0.11, height: size * 0.11, borderRadius: size * 0.06, backgroundColor: '#fff' }} />
        <View style={{ width: size * 0.11, height: size * 0.11, borderRadius: size * 0.06, backgroundColor: '#fff' }} />
      </View>
    </View>
  );
}

// ─── Notification Panel ─────────────────────────────────────────
const SAMPLE_NOTIFICATIONS = [
  { id: '1', title: 'Gasless Transfer Ready', body: 'Your STT balance is available for gasless sends.', time: 'Now', read: false },
  { id: '2', title: 'AI Agent Active', body: 'Monitoring your STT transactions on Status Sepolia.', time: '5m', read: false },
  { id: '3', title: 'Status Network', body: 'Status Network Sepolia is fully operational.', time: '1h', read: true },
];

export default function HomeScreen({ navigation }) {
  const { colors } = useTheme();
  const { balance, sttBalance, displayAddress, isConnected, walletAddress, refreshBalance, chainName } = useWallet();
  const { transactions } = useTransactions();
  const [isAgentActive, setIsAgentActive] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [notifications, setNotifications] = useState(SAMPLE_NOTIFICATIONS);

  const pulseAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const ringScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.7] });
  const ringOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] });

  useFocusEffect(
    React.useCallback(() => {
      if (isConnected && walletAddress) {
        refreshBalance();
      }
    }, [isConnected, walletAddress, refreshBalance])
  );

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));

  const quickActions = [
    { label: 'Send STT', icon: Send, color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.1)', screen: 'Payment' },
    { label: 'History', icon: History, color: '#f8fafc', bg: 'rgba(248, 250, 252, 0.08)', screen: 'Transactions' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bgPrimary} />

      {/* Decorative blobs */}
      <View style={[styles.blob, styles.blobTop, { backgroundColor: colors.primary + '18' }]} pointerEvents="none" />
      <View style={[styles.blob, styles.blobBottom, { backgroundColor: '#a855f7' + '14' }]} pointerEvents="none" />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <View style={[styles.logoBox, { backgroundColor: colors.primary + '15' }]}>
            <GhostLogo size={22} color={colors.primary} />
          </View>
          <View>
            <Text style={[styles.appTitle, { color: colors.textPrimary }]}>GhostPay</Text>
            <Text style={[styles.appSubtitle, { color: colors.textMuted }]}>Gasless STT Agent</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          {/* Notification Bell */}
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setShowNotifications(true)}
            activeOpacity={0.7}
          >
            <Bell size={22} color={colors.textPrimary} />
            {unreadCount > 0 && (
              <View style={[styles.notifBadge, { backgroundColor: '#ef4444' }]}>
                <Text style={styles.notifBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          {/* Profile Avatar */}
          <TouchableOpacity
            style={[styles.avatarContainer, { borderColor: colors.primary }]}
            onPress={() => setShowProfile(true)}
            activeOpacity={0.7}
          >
            <View style={[styles.avatarInner, { backgroundColor: colors.primary }]}>
              <User size={14} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Balance + STT Card */}
        <GlassCard style={styles.balanceCard}>
          <View style={styles.balanceRow}>
            <View>
              <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>STT BALANCE</Text>
              <Text style={[styles.balanceAmount, { color: colors.textPrimary }]}>
                {isConnected
                  ? `${parseFloat(sttBalance || 0).toLocaleString()} STT`
                  : '— STT'}
              </Text>
              <Text style={[styles.balanceSubLine, { color: colors.primary }]}>
                Status Test Token
              </Text>
              {isConnected && (
                <Text style={[styles.networkHint, { color: colors.textMuted }]}>{chainName}</Text>
              )}
            </View>
            <View style={[styles.balanceIcon, { backgroundColor: colors.primary + '20', borderColor: colors.primary + '30' }]}>
              <GhostLogo size={30} color={colors.primary} />
            </View>
          </View>

          <View style={[styles.balanceDivider, { backgroundColor: colors.border }]} />

          <View style={styles.balanceFooter}>
            <TouchableOpacity
              style={styles.addressRow}
              onPress={() => !isConnected && navigation.navigate('AssetsTab')}
            >
              <View style={[styles.connDot, { backgroundColor: isConnected ? colors.accentGreen : colors.textMuted }]} />
              <Text style={[styles.addressText, { color: colors.textSecondary }]}>
                {isConnected ? displayAddress : 'Tap to connect wallet'}
              </Text>
              {isConnected && <Copy size={13} color={colors.primary} style={{ marginLeft: 6 }} />}
            </TouchableOpacity>
            <View style={[styles.gaslessTag, { backgroundColor: colors.accentGreen + '15', borderColor: colors.accentGreen + '30' }]}>
              <Zap size={10} color={colors.accentGreen} />
              <Text style={[styles.gaslessTagText, { color: colors.accentGreen }]}>Gasless</Text>
            </View>
          </View>
        </GlassCard>

        {/* Agent Status */}
        <View style={[styles.statusCard, {
          backgroundColor: isAgentActive ? colors.primary + '12' : 'rgba(255,255,255,0.04)',
          borderColor: isAgentActive ? colors.primary + '40' : colors.border,
        }]}>
          <View style={styles.statusLeft}>
            <View style={styles.pulseWrap}>
              <Animated.View style={[styles.pulseRing, {
                backgroundColor: isAgentActive ? colors.primary : colors.textMuted,
                transform: [{ scale: ringScale }],
                opacity: ringOpacity,
              }]} />
              <View style={[styles.pulseDot, {
                backgroundColor: isAgentActive ? colors.primary : colors.textMuted,
              }]} />
            </View>
            <View>
              <Text style={[styles.statusTitle, { color: colors.textPrimary }]}>AI Agent Status</Text>
              <Text style={[styles.statusSub, { color: colors.textMuted }]}>
                Securing STT transfers on Status Sepolia
              </Text>
            </View>
          </View>
          <View style={styles.statusRight}>
            {isAgentActive && (
              <Text style={[styles.activeText, { color: colors.primary }]}>ACTIVE</Text>
            )}
            <Switch
              value={isAgentActive}
              onValueChange={setIsAgentActive}
              trackColor={{ false: 'rgba(255,255,255,0.1)', true: colors.primary }}
              thumbColor={isAgentActive ? '#ffffff' : '#94a3b8'}
            />
          </View>
        </View>

        {/* Quick Actions */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>QUICK ACTIONS</Text>
        <View style={styles.actionsRow}>
          {quickActions.map(({ label, icon: Icon, color, bg, screen }) => (
            <TouchableOpacity
              key={label}
              style={styles.actionItem}
              onPress={() => navigation.navigate(screen)}
              activeOpacity={0.65}
            >
              <GlassCard style={styles.actionCard}>
                <View style={[styles.actionIconCircle, { backgroundColor: bg }]}>
                  <Icon size={24} color={color} />
                </View>
                <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>{label}</Text>
              </GlassCard>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => navigation.navigate('AssetsTab')}
            activeOpacity={0.65}
          >
            <GlassCard style={styles.actionCard}>
              <View style={[styles.actionIconCircle, { backgroundColor: 'rgba(168, 85, 247, 0.1)' }]}>
                <Bot size={24} color="#a855f7" />
              </View>
              <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>Wallet</Text>
            </GlassCard>
          </TouchableOpacity>
        </View>

        {/* Activity */}
        <View style={styles.activityHeader}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>AGENT ACTIVITY</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Transactions')}>
            <Text style={[styles.viewAll, { color: colors.primary }]}>View All</Text>
          </TouchableOpacity>
        </View>

        {transactions.length === 0 ? (
          <GlassCard style={styles.emptyCard}>
            <Activity size={28} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No activity yet</Text>
            <Text style={[styles.emptySub, { color: colors.textMuted }]}>Send STT to see transactions here</Text>
          </GlassCard>
        ) : (
          transactions.slice(0, 3).map((item) => (
            <GlassCard key={item.id} style={styles.activityCard}>
              <View style={[styles.activityIcon, {
                backgroundColor: (item.type === 'payment' ? colors.accentGreen : (item.badgeColor || colors.primary)) + '15'
              }]}>
                {item.type === 'payment'
                  ? <CheckCircle size={20} color={colors.accentGreen} />
                  : <Info size={20} color={item.badgeColor || colors.primary} />
                }
              </View>
              <View style={styles.activityInfo}>
                <Text style={[styles.activityTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={[styles.activitySub, { color: colors.textSecondary }]} numberOfLines={1}>
                  {item.status} · {item.time}
                </Text>
              </View>
              {item.amount ? (
                <Text style={[styles.activityAmount, { color: item.type === 'payment' ? '#ef4444' : colors.textPrimary }]}>
                  {item.amount}
                </Text>
              ) : (
                <ChevronRight size={16} color={colors.textMuted} />
              )}
            </GlassCard>
          ))
        )}

        {/* Chain Info */}
        <View style={[styles.chainBadge, { borderColor: colors.border, backgroundColor: 'rgba(255,255,255,0.03)' }]}>
          <Zap size={13} color={colors.primary} />
          <Text style={[styles.chainText, { color: colors.textMuted }]}>Status Sepolia · Gasless</Text>
          <Shield size={13} color={colors.accentGreen} />
          <Text style={[styles.chainText, { color: colors.accentGreen }]}>AI Secured</Text>
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
        onPress={() => navigation.navigate('Payment')}
        activeOpacity={0.9}
      >
        <Send size={26} color="#fff" strokeWidth={2.5} />
      </TouchableOpacity>

      {/* ─── Notification Modal ─────────────────────────── */}
      <Modal
        visible={showNotifications}
        animationType="slide"
        transparent
        onRequestClose={() => setShowNotifications(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.bgSecondary }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Notifications</Text>
              {unreadCount > 0 && (
                <TouchableOpacity onPress={markAllRead}>
                  <Text style={[styles.markReadText, { color: colors.primary }]}>Mark all read</Text>
                </TouchableOpacity>
              )}
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {notifications.map(notif => (
                <View key={notif.id} style={[styles.notifItem, {
                  backgroundColor: notif.read ? 'transparent' : colors.primary + '10',
                  borderBottomColor: colors.border,
                }]}>
                  <View style={[styles.notifDot, { backgroundColor: notif.read ? colors.border : colors.primary }]} />
                  <View style={styles.notifBody}>
                    <Text style={[styles.notifTitle, { color: colors.textPrimary }]}>{notif.title}</Text>
                    <Text style={[styles.notifBodyText, { color: colors.textSecondary }]}>{notif.body}</Text>
                    <Text style={[styles.notifTime, { color: colors.textMuted }]}>{notif.time}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={[styles.modalClose, { borderColor: colors.border }]}
              onPress={() => setShowNotifications(false)}
            >
              <Text style={[styles.modalCloseText, { color: colors.textPrimary }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── Profile Modal ──────────────────────────────── */}
      <Modal
        visible={showProfile}
        animationType="slide"
        transparent
        onRequestClose={() => setShowProfile(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.bgSecondary }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Profile</Text>
            </View>

            {/* Avatar */}
            <View style={styles.profileHero}>
              <View style={[styles.profileAvatar, { backgroundColor: colors.primary + '20', borderColor: colors.primary + '40' }]}>
                <GhostLogo size={40} color={colors.primary} />
              </View>
              <Text style={[styles.profileName, { color: colors.textPrimary }]}>GhostPay User</Text>
              <Text style={[styles.profileAddr, { color: colors.textMuted }]}>
                {isConnected ? displayAddress : 'No wallet connected'}
              </Text>
            </View>

            {/* Profile Info */}
            {[
              { label: 'STT Balance', value: `${parseFloat(sttBalance || 0).toLocaleString()} STT` },
              { label: 'Network', value: chainName || 'Status Sepolia' },
              { label: 'Status', value: isConnected ? 'Connected ✅' : 'Not Connected' },
              { label: 'AI Agent', value: 'Active 🤖' },
            ].map(({ label, value }) => (
              <View key={label} style={[styles.profileRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.profileLabel, { color: colors.textSecondary }]}>{label}</Text>
                <Text style={[styles.profileValue, { color: colors.textPrimary }]}>{value}</Text>
              </View>
            ))}

            <TouchableOpacity
              style={[styles.modalClose, { borderColor: colors.border }]}
              onPress={() => setShowProfile(false)}
            >
              <Text style={[styles.modalCloseText, { color: colors.textPrimary }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  blob: { position: 'absolute', borderRadius: 9999 },
  blobTop: { top: -120, right: -80, width: width * 0.75, height: width * 0.75 },
  blobBottom: { bottom: 60, left: -100, width: width * 0.8, height: width * 0.8 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  logoBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  appTitle: { fontSize: 18, fontWeight: '800', letterSpacing: 0.3 },
  appSubtitle: { fontSize: 10, fontWeight: '600', letterSpacing: 0.5 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  notifBadge: {
    position: 'absolute', top: -2, right: -2,
    width: 16, height: 16, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
  },
  notifBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  avatarContainer: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  avatarInner: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 20, paddingBottom: 120 },

  // Balance
  balanceCard: { padding: 22, marginBottom: 14 },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  balanceLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 6 },
  balanceAmount: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  balanceSubLine: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  networkHint: { fontSize: 11, marginTop: 4 },
  balanceIcon: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  balanceDivider: { height: 1, marginBottom: 14 },
  balanceFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  connDot: { width: 7, height: 7, borderRadius: 4 },
  addressText: { fontSize: 13, fontFamily: 'monospace' },
  gaslessTag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  gaslessTagText: { fontSize: 10, fontWeight: '800' },

  // Agent Status
  statusCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 16, borderRadius: 24, borderWidth: 1, marginBottom: 26,
  },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  pulseWrap: { width: 20, height: 20, justifyContent: 'center', alignItems: 'center' },
  pulseDot: { width: 10, height: 10, borderRadius: 5, zIndex: 2 },
  pulseRing: { position: 'absolute', width: 20, height: 20, borderRadius: 10 },
  statusTitle: { fontSize: 15, fontWeight: '700' },
  statusSub: { fontSize: 12, marginTop: 2, fontWeight: '500' },
  statusRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  activeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },

  // Quick Actions
  sectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 1.5, marginBottom: 14 },
  actionsRow: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  actionItem: { flex: 1 },
  actionCard: { padding: 18, alignItems: 'center', gap: 12 },
  actionIconCircle: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  actionLabel: { fontSize: 13, fontWeight: '600' },

  // Activity
  activityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  viewAll: { fontSize: 12, fontWeight: '700' },
  emptyCard: { padding: 30, alignItems: 'center', gap: 10, marginBottom: 12 },
  emptyText: { fontSize: 15, fontWeight: '600', marginTop: 4 },
  emptySub: { fontSize: 12 },
  activityCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 16, paddingVertical: 16, marginBottom: 10,
  },
  activityIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  activityInfo: { flex: 1 },
  activityTitle: { fontSize: 14, fontWeight: '600' },
  activitySub: { fontSize: 12, marginTop: 2 },
  activityAmount: { fontSize: 14, fontWeight: '700' },

  // Chain badge
  chainBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center',
    paddingVertical: 12, borderRadius: 16, borderWidth: 1, marginTop: 8,
  },
  chainText: { fontSize: 11, fontWeight: '600' },

  // FAB
  fab: {
    position: 'absolute', bottom: 32, right: 24, width: 64, height: 64,
    borderRadius: 32, justifyContent: 'center', alignItems: 'center',
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.45, shadowRadius: 16, elevation: 12,
  },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingBottom: 40, maxHeight: '80%' },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginVertical: 12 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  markReadText: { fontSize: 13, fontWeight: '700' },
  modalClose: { borderRadius: 28, borderWidth: 1, height: 52, justifyContent: 'center', alignItems: 'center', marginTop: 16 },
  modalCloseText: { fontSize: 16, fontWeight: '700' },

  // Notifications
  notifItem: { flexDirection: 'row', gap: 14, paddingVertical: 16, borderBottomWidth: 1 },
  notifDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  notifBody: { flex: 1 },
  notifTitle: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  notifBodyText: { fontSize: 13, lineHeight: 18 },
  notifTime: { fontSize: 11, marginTop: 4 },

  // Profile
  profileHero: { alignItems: 'center', paddingVertical: 20 },
  profileAvatar: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', borderWidth: 2, marginBottom: 12 },
  profileName: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  profileAddr: { fontSize: 13, fontFamily: 'monospace' },
  profileRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1,
  },
  profileLabel: { fontSize: 13 },
  profileValue: { fontSize: 14, fontWeight: '700' },
});
