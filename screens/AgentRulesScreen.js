// GhostPay Agent — Agent Rules Screen
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, TextInput, Dimensions, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useTransactions } from '../context/TransactionContext';
import GlassCard from '../components/GlassCard';
import {
  ArrowLeft, Shield, Wallet, LayoutGrid,
  ClipboardList, Save, CheckCircle, Plus, Bot
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function AgentRulesScreen({ navigation }) {
  const { colors } = useTheme();
  const { addTransaction } = useTransactions();

  const [dailyLimit, setDailyLimit] = useState('500.00');
  const [approvalThreshold, setApprovalThreshold] = useState('100.00');
  const [categories, setCategories] = useState([
    { name: 'SaaS & Tools', selected: true },
    { name: 'Food & Dining', selected: true },
    { name: 'Travel', selected: false },
    { name: 'Shopping', selected: false },
    { name: 'Entertainment', selected: false },
    { name: 'Health', selected: false },
  ]);
  const [requireManual, setRequireManual] = useState(true);
  const [international, setInternational] = useState(false);
  const [autoRenew, setAutoRenew] = useState(true);
  const [gasless, setGasless] = useState(true);

  const toggleCategory = (i) => {
    const next = [...categories];
    next[i].selected = !next[i].selected;
    setCategories(next);
  };

  const handleSave = () => {
    addTransaction({
      status: 'SYSTEM',
      badgeColor: '#a855f7',
      title: 'Agent Rules Updated',
      desc: `Daily limit $${dailyLimit} · ${categories.filter(c => c.selected).length} categories enabled`,
      type: 'approval',
    });
    Alert.alert('✅ Saved', 'Agent rules have been updated. The AI will enforce them immediately.', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  const ToggleRow = ({ title, desc, value, onValueChange }) => (
    <View style={[styles.toggleRow, { borderBottomColor: colors.border }]}>
      <View style={styles.toggleInfo}>
        <Text style={[styles.toggleTitle, { color: colors.textPrimary }]}>{title}</Text>
        {desc ? <Text style={[styles.toggleDesc, { color: colors.textSecondary }]}>{desc}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: 'rgba(255,255,255,0.1)', true: colors.primary + '80' }}
        thumbColor={value ? colors.primary : '#94a3b8'}
      />
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <View style={[styles.blob, { backgroundColor: '#a855f7' + '14' }]} pointerEvents="none" />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Agent Rules</Text>
          <Text style={[styles.headerSub, { color: '#a855f7' }]}>AI spending policy</Text>
        </View>
        <View style={[styles.botBadge, { backgroundColor: '#a855f7' + '20', borderColor: '#a855f7' + '40' }]}>
          <Bot size={14} color="#a855f7" />
          <Text style={[styles.botBadgeText, { color: '#a855f7' }]}>AI</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Section: Spending Limit */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Wallet size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Daily Spending Limit</Text>
          </View>
          <GlassCard style={styles.sectionCard}>
            <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
              Maximum amount the AI agent can spend within 24 hours without your manual approval.
            </Text>
            <View style={[styles.inputRow, { backgroundColor: 'rgba(0,0,0,0.3)', borderColor: colors.border }]}>
              <Text style={[styles.currencySign, { color: colors.primary }]}>$</Text>
              <TextInput
                style={[styles.numInput, { color: colors.textPrimary }]}
                value={dailyLimit}
                onChangeText={setDailyLimit}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </GlassCard>
        </View>

        {/* Section: Categories */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <LayoutGrid size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Allowed Categories</Text>
          </View>
          <GlassCard style={styles.sectionCard}>
            <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
              The agent will only process payments in selected merchant categories.
            </Text>
            <View style={styles.chipGrid}>
              {categories.map((cat, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: cat.selected ? colors.primary + '20' : 'rgba(255,255,255,0.05)',
                      borderColor: cat.selected ? colors.primary + '60' : colors.border,
                    }
                  ]}
                  onPress={() => toggleCategory(i)}
                  activeOpacity={0.75}
                >
                  {cat.selected && <CheckCircle size={13} color={colors.primary} />}
                  <Text style={[styles.chipText, { color: cat.selected ? colors.primary : colors.textSecondary }]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[styles.chip, { borderColor: colors.border, borderStyle: 'dashed' }]}
              >
                <Plus size={13} color={colors.textMuted} />
                <Text style={[styles.chipText, { color: colors.textMuted }]}>Add</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        </View>

        {/* Section: Permissions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ClipboardList size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Agent Permissions</Text>
          </View>
          <GlassCard style={styles.sectionCard}>
            <ToggleRow
              title="Manual Approval"
              desc="Require approval for large transactions"
              value={requireManual}
              onValueChange={setRequireManual}
            />
            {requireManual && (
              <View style={styles.thresholdBox}>
                <Text style={[styles.thresholdLabel, { color: colors.textSecondary }]}>Approval Threshold ($)</Text>
                <View style={[styles.inputRow, { backgroundColor: 'rgba(0,0,0,0.3)', borderColor: colors.border }]}>
                  <Text style={[styles.currencySign, { color: colors.primary }]}>$</Text>
                  <TextInput
                    style={[styles.numInput, { color: colors.textPrimary }]}
                    value={approvalThreshold}
                    onChangeText={setApprovalThreshold}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
            )}
            <ToggleRow
              title="International Payments"
              desc="Allow payments to foreign merchants"
              value={international}
              onValueChange={setInternational}
            />
            <ToggleRow
              title="Auto-renew Subscriptions"
              desc="Allow recurring billing automatically"
              value={autoRenew}
              onValueChange={setAutoRenew}
            />
            <ToggleRow
              title="Gasless Protocol"
              desc="Use Status Network gasless relay"
              value={gasless}
              onValueChange={setGasless}
            />
          </GlassCard>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
          onPress={handleSave}
          activeOpacity={0.85}
        >
          <Save size={20} color="#fff" strokeWidth={2.5} />
          <Text style={styles.saveBtnText}>Save Agent Rules</Text>
        </TouchableOpacity>

        <Text style={[styles.footerNote, { color: colors.textMuted }]}>
          Rules are enforced immediately by the AI agent on every payment request.
        </Text>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  blob: { position: 'absolute', top: -100, right: -80, width: width * 0.7, height: width * 0.7, borderRadius: 9999 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1,
  },
  backBtn: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  headerSub: { fontSize: 11, fontWeight: '600' },
  botBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1,
  },
  botBadgeText: { fontSize: 11, fontWeight: '800' },
  scrollContent: { padding: 20, paddingBottom: 60 },

  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  sectionCard: { padding: 18 },
  sectionDesc: { fontSize: 13, lineHeight: 20, marginBottom: 16 },

  // Input
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 28, borderWidth: 1, paddingHorizontal: 18, height: 54,
  },
  currencySign: { fontSize: 18, fontWeight: '700', marginRight: 8 },
  numInput: { flex: 1, fontSize: 18, fontWeight: '600' },

  // Chips
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 24, borderWidth: 1,
  },
  chipText: { fontSize: 13, fontWeight: '600' },

  // Toggle
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, borderBottomWidth: 1,
  },
  toggleInfo: { flex: 1, marginRight: 16 },
  toggleTitle: { fontSize: 14, fontWeight: '600' },
  toggleDesc: { fontSize: 12, marginTop: 2 },

  // Threshold
  thresholdBox: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'transparent' },
  thresholdLabel: { fontSize: 12, fontWeight: '600', marginBottom: 10 },

  // Save
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 12, height: 58, borderRadius: 29, marginTop: 8, marginBottom: 16,
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
  saveBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  footerNote: { fontSize: 12, textAlign: 'center', fontStyle: 'italic', marginBottom: 10 },
});
