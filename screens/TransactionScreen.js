// GhostPay Agent — Transaction History / AI Activity Log Screen
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useTransactions } from '../context/TransactionContext';
import GlassCard from '../components/GlassCard';
import {
  ArrowLeft, Zap, Shield, CheckCircle, Clock,
  Info, Send, Activity, ShieldCheck
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function TransactionScreen({ navigation }) {
  const { colors } = useTheme();
  const { transactions } = useTransactions();

  const getIcon = (type) => {
    if (type === 'payment') return <Send size={16} color="#fff" />;
    if (type === 'approval') return <CheckCircle size={16} color="#fff" />;
    return <Info size={16} color="#fff" />;
  };

  const getBadgeColor = (item) => item.badgeColor || colors.primary;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      {/* Blobs */}
      <View style={[styles.blob, { backgroundColor: colors.primary + '14' }]} pointerEvents="none" />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>AI Activity Log</Text>
          <Text style={[styles.headerSub, { color: colors.primary }]}>Real-time agent decisions</Text>
        </View>
        <View style={[styles.liveBadge, { backgroundColor: colors.accentGreen + '15', borderColor: colors.accentGreen + '30' }]}>
          <View style={[styles.liveDot, { backgroundColor: colors.accentGreen }]} />
          <Text style={[styles.liveText, { color: colors.accentGreen }]}>LIVE</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Stats */}
        <View style={styles.statsRow}>
          <GlassCard style={styles.statCard}>
            <Zap size={16} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{transactions.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Actions</Text>
          </GlassCard>
          <GlassCard style={styles.statCard}>
            <ShieldCheck size={16} color={colors.accentGreen} />
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>99.9%</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Trust Score</Text>
          </GlassCard>
          <GlassCard style={styles.statCard}>
            <Shield size={16} color="#a855f7" />
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>GASLESS</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Protocol</Text>
          </GlassCard>
        </View>

        {/* Timeline */}
        <Text style={[styles.timelineTitle, { color: colors.textPrimary }]}>Decision Stream</Text>

        {transactions.length === 0 ? (
          <GlassCard style={styles.emptyCard}>
            <Activity size={32} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.textMuted }]}>No activity yet</Text>
            <Text style={[styles.emptySub, { color: colors.textMuted }]}>
              Execute a payment to see the AI agent log here
            </Text>
            <TouchableOpacity
              style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
              onPress={() => navigation.navigate('Payment')}
            >
              <Text style={styles.emptyBtnText}>New Payment</Text>
            </TouchableOpacity>
          </GlassCard>
        ) : (
          <View style={styles.timeline}>
            {transactions.map((item, index) => (
              <View key={item.id} style={styles.timelineItem}>
                {/* Left column: dot + line */}
                <View style={styles.timelineLeft}>
                  <LinearGradient
                    colors={[getBadgeColor(item), getBadgeColor(item) + '90']}
                    style={styles.timelineDot}
                  >
                    {getIcon(item.type)}
                  </LinearGradient>
                  {index < transactions.length - 1 && (
                    <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />
                  )}
                </View>

                {/* Right: card */}
                <GlassCard style={styles.timelineCard}>
                  <View style={styles.timelineCardTop}>
                    <Text style={[styles.timelineItemTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <View style={[styles.statusBadge, {
                      backgroundColor: getBadgeColor(item) + '20',
                      borderColor: getBadgeColor(item) + '40',
                    }]}>
                      <Text style={[styles.statusBadgeText, { color: getBadgeColor(item) }]}>{item.status}</Text>
                    </View>
                  </View>
                  <Text style={[styles.timelineItemDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                    {item.desc}
                  </Text>
                  <View style={styles.timelineCardBottom}>
                    <View style={styles.timeRow}>
                      <Clock size={12} color={colors.textMuted} />
                      <Text style={[styles.timeText, { color: colors.textMuted }]}>{item.time}</Text>
                    </View>
                    {item.amount && (
                      <Text style={[styles.amountText, { color: item.type === 'payment' ? '#ef4444' : colors.accentGreen }]}>
                        {item.amount}
                      </Text>
                    )}
                  </View>
                </GlassCard>
              </View>
            ))}
          </View>
        )}

        {/* Terminal */}
        <View style={[styles.terminal, { backgroundColor: 'rgba(0,0,0,0.5)', borderColor: colors.primary + '30' }]}>
          <View style={styles.terminalHeader}>
            <View style={styles.terminalDots}>
              <View style={[styles.termDot, { backgroundColor: '#ef4444' }]} />
              <View style={[styles.termDot, { backgroundColor: '#f59e0b' }]} />
              <View style={[styles.termDot, { backgroundColor: '#22c55e' }]} />
            </View>
            <Text style={[styles.terminalLabel, { color: colors.textMuted }]}>AI-ENGINE-V4.2</Text>
          </View>
          <View style={styles.terminalBody}>
            <Text style={[styles.termLine, { color: colors.textMuted }]}>
              <Text style={{ color: colors.textMuted }}>[SYS]  </Text>
              <Text style={{ color: colors.primary }}>AGENT_INIT: </Text>
              Behavioral profile loaded
            </Text>
            <Text style={[styles.termLine, { color: colors.textMuted }]}>
              <Text style={{ color: colors.textMuted }}>[SYS]  </Text>
              <Text style={{ color: colors.accentGreen }}>SEC_CHECK: </Text>
              0 threats detected
            </Text>
            <Text style={[styles.termLine, { color: colors.textMuted }]}>
              <Text style={{ color: colors.textMuted }}>[SYS]  </Text>
              <Text style={{ color: colors.primary }}>GASLESS: </Text>
              Status Network relay active
            </Text>
            <Text style={[styles.termLine, { color: colors.primary }]}>_ Listening for next intent...</Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  blob: { position: 'absolute', top: -100, left: -80, width: width * 0.7, height: width * 0.7, borderRadius: 9999 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1,
  },
  backBtn: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  headerSub: { fontSize: 11, fontWeight: '600' },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveText: { fontSize: 10, fontWeight: '800' },
  scrollContent: { padding: 20, paddingBottom: 60 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  statCard: { flex: 1, padding: 16, alignItems: 'center', gap: 8 },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 11, textAlign: 'center' },

  // Timeline
  timelineTitle: { fontSize: 20, fontWeight: '700', marginBottom: 20 },
  timeline: { gap: 0 },
  timelineItem: { flexDirection: 'row', gap: 14, marginBottom: 16 },
  timelineLeft: { alignItems: 'center', width: 36 },
  timelineDot: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center', zIndex: 2,
  },
  timelineLine: { width: 2, flex: 1, marginTop: 4, borderRadius: 1 },
  timelineCard: { flex: 1, padding: 14 },
  timelineCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  timelineItemTitle: { fontSize: 14, fontWeight: '700', flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  statusBadgeText: { fontSize: 9, fontWeight: '800' },
  timelineItemDesc: { fontSize: 12, lineHeight: 18, marginBottom: 10 },
  timelineCardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  timeText: { fontSize: 11 },
  amountText: { fontSize: 13, fontWeight: '700' },

  // Empty
  emptyCard: { padding: 36, alignItems: 'center', gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '600' },
  emptySub: { fontSize: 13, textAlign: 'center' },
  emptyBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24, marginTop: 8 },
  emptyBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Terminal
  terminal: { borderRadius: 20, borderWidth: 1, overflow: 'hidden', marginTop: 20 },
  terminalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  terminalDots: { flexDirection: 'row', gap: 6 },
  termDot: { width: 8, height: 8, borderRadius: 4 },
  terminalLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  terminalBody: { padding: 16, gap: 8 },
  termLine: { fontSize: 11, fontFamily: 'monospace', lineHeight: 18 },
});
