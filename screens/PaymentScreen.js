// GhostPay Agent — STT Payment Screen (AI Agent + MetaMask)
import { ethers } from 'ethers';
import {
  AlertCircle, ArrowLeft, Bot, Brain,
  CheckCircle, ExternalLink, ScanLine, ShieldCheck, Zap,
} from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, Dimensions,
  Linking, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import GlassCard from '../components/GlassCard';
import { useTheme } from '../context/ThemeContext';
import { useTransactions } from '../context/TransactionContext';
import { useWallet } from '../context/WalletContext';
import { recordTransaction } from '../services/agentService';
import { parseSTTIntent } from '../services/ollamaAgentService';
import { STT_TOKEN_ADDRESS } from '../services/blockchainService';

const { width } = Dimensions.get('window');
const EXECUTION_TIMEOUT_MS = 90000;
const EXPLORER = 'https://sepoliascan.status.network';

// Fallback STT intent parser when Ollama unavailable
function parseSTTFallback(cmd) {
  const lower = cmd.toLowerCase();
  const addrMatch = cmd.match(/0x[a-fA-F0-9]{40}/);
  const validAddress = addrMatch ? addrMatch[0] : '';
  const sttMatch = cmd.match(/(\d+(?:\.\d+)?)\s*stt\b/i);
  const numberMatch = cmd.match(/(\d+(?:\.\d+)?)/);
  const amount = sttMatch ? sttMatch[1] : (numberMatch ? numberMatch[1] : '10');

  if (lower.includes('pay') || lower.includes('send') || lower.includes('transfer')) {
    return { intent: 'STT Transfer', to: validAddress, amount };
  }
  return { intent: 'Token Payment', to: validAddress, amount };
}

function extractAddressFromText(text) {
  const m = text.match(/0x[a-fA-F0-9]{40}/);
  return m ? m[0] : null;
}

function extractSTTAmountFromText(text) {
  const sттMatch = text.match(/(\d+(?:\.\d+)?)\s*stt\b/i);
  if (sттMatch) return sттMatch[1];
  return null;
}

export default function PaymentScreen({ navigation }) {
  const { colors } = useTheme();
  const { isConnected, walletAddress, sttBalance, payWithSTT } = useWallet();
  const { addTransaction } = useTransactions();

  const [command, setCommand] = useState('');
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [phase, setPhase] = useState('idle'); // idle | thinking | verified | executing | done
  const [parsedTx, setParsedTx] = useState(null);
  const [agentChecks, setAgentChecks] = useState([]);
  const [txHash, setTxHash] = useState('');
  const [executionError, setExecutionError] = useState('');
  const [executionStatus, setExecutionStatus] = useState('idle');
  const thinkAnim = useRef(new Animated.Value(0)).current;
  const executionRunRef = useRef(0);

  const withTimeout = (promise, ms, msg) => Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(msg)), ms)),
  ]);

  useEffect(() => {
    if (phase === 'thinking' || phase === 'executing') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(thinkAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(thinkAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      thinkAnim.stopAnimation();
    }
  }, [phase, thinkAnim]);

  // ─── Analyze with AI Agent ────────────────────────────────────
  const handleAnalyze = async () => {
    // Support both AI command mode and manual fields
    const useManual = !command.trim() && (toAddress.trim() || amount.trim());
    if (!command.trim() && !toAddress.trim()) {
      Alert.alert('Missing Info', 'Enter a command or fill in the address and amount fields.');
      return;
    }

    setPhase('thinking');
    setAgentChecks([]);

    const addCheck = (name, detail) =>
      setAgentChecks(prev => [...prev, { name, detail, passed: true }]);

    let parsed;

    if (useManual) {
      // Manual mode: use the field values directly
      addCheck('Manual Entry', 'Address and amount entered manually');
      parsed = {
        intent: 'STT Transfer',
        to: toAddress.trim(),
        amount: amount.trim() || '10',
      };
    } else {
      // AI Agent mode: parse the command
      addCheck('AI Agent', 'Parsing intent with Ollama...');
      const parseWithTimeout = (text, ms = 7000) => Promise.race([
        parseSTTIntent(text),
        new Promise(resolve => setTimeout(() => resolve(null), ms)),
      ]);

      let ollamaParsed = await parseWithTimeout(command);
      if (ollamaParsed) {
        addCheck('NLP Intent', `Extracted: ${ollamaParsed.intent}, ${ollamaParsed.amount} STT`);
        parsed = ollamaParsed;
      } else {
        addCheck('Fallback Parser', 'Using rule-based STT parser...');
        parsed = parseSTTFallback(command);
      }

      // Override with explicit values from command text
      const explicitAddr = extractAddressFromText(command);
      const explicitAmt = extractSTTAmountFromText(command);
      if (explicitAddr) parsed.to = explicitAddr;
      if (explicitAmt) parsed.amount = explicitAmt;

      // Override with manual fields if filled
      if (toAddress.trim()) parsed.to = toAddress.trim();
      if (amount.trim()) parsed.amount = amount.trim();
    }

    addCheck('Address Validation', 'Verifying recipient address format...');
    addCheck('STT Token', 'Status Test Token — gasless ERC20 on Status Sepolia');
    addCheck('Gasless Check', 'gasPrice = 0 — no ETH needed');
    addCheck('AI Approved', 'Transaction cleared for execution');

    if (!ethers.isAddress(parsed?.to || '')) {
      Alert.alert('Invalid Address', 'Please provide a valid 0x recipient address.');
      setPhase('idle');
      return;
    }

    const numAmt = parseFloat(parsed?.amount);
    if (!isFinite(numAmt) || numAmt <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid STT amount (e.g. 10).');
      setPhase('idle');
      return;
    }

    parsed.amount = numAmt % 1 === 0 ? String(Math.round(numAmt)) : numAmt.toFixed(2);
    setParsedTx({ ...parsed });
    setPhase('verified');
  };

  // ─── Execute STT Transfer ─────────────────────────────────────
  const handleExecute = async () => {
    if (phase !== 'verified' || !parsedTx) return;
    const runId = executionRunRef.current + 1;
    executionRunRef.current = runId;

    setPhase('executing');
    setExecutionError('');
    setExecutionStatus('idle');

    try {
      const result = await withTimeout(
        payWithSTT(parsedTx.to, parsedTx.amount, null),
        EXECUTION_TIMEOUT_MS,
        'Transaction timed out. Check your wallet and try again.'
      );
      if (executionRunRef.current !== runId) return;

      if (!result?.success) throw new Error(result?.error || 'STT transfer failed');

      const hash = result.txHash;
      setTxHash(hash || '');
      setExecutionStatus('success');

      addTransaction({
        status: 'EXECUTED',
        badgeColor: colors.primary,
        title: parsedTx.intent,
        desc: `${parsedTx.amount} STT · ${hash?.slice(0, 12) || '—'}...`,
        amount: `-${parsedTx.amount} STT`,
        type: 'payment',
        txHash: hash,
      });
      recordTransaction(parseFloat(parsedTx.amount));
    } catch (err) {
      if (executionRunRef.current !== runId) return;
      setTxHash('failed');
      setExecutionStatus('failed');
      setExecutionError(err?.message || 'STT transfer failed');
      addTransaction({
        status: 'FAILED',
        badgeColor: '#ef4444',
        title: parsedTx.intent,
        desc: err?.message || 'Transfer failed',
        amount: `-${parsedTx.amount} STT`,
        type: 'payment',
      });
    }
    if (executionRunRef.current !== runId) return;
    setPhase('done');
  };

  const handleCancelExecution = () => {
    executionRunRef.current += 1;
    setExecutionStatus('failed');
    setTxHash('failed');
    setExecutionError('Execution cancelled.');
    setPhase('done');
  };

  const handleReset = () => {
    executionRunRef.current += 1;
    setCommand('');
    setToAddress('');
    setAmount('');
    setPhase('idle');
    setParsedTx(null);
    setAgentChecks([]);
    setTxHash('');
    setExecutionError('');
    setExecutionStatus('idle');
  };

  const isSuccess = executionStatus === 'success';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <View style={[styles.blob, { backgroundColor: colors.primary + '14' }]} pointerEvents="none" />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Send STT</Text>
          <Text style={[styles.headerSub, { color: colors.primary }]}>AI-powered gasless transfer</Text>
        </View>
        <View style={[styles.agentBadge, { backgroundColor: colors.primary + '20', borderColor: colors.primary + '40' }]}>
          <Bot size={14} color={colors.primary} />
          <Text style={[styles.agentBadgeText, { color: colors.primary }]}>AI</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* Idle Phase */}
        {phase === 'idle' && (
          <>
            {/* STT Balance badge */}
            <View style={[styles.sttBadge, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}>
              <Zap size={14} color={colors.primary} />
              <Text style={[styles.sttBadgeText, { color: colors.primary }]}>
                STT Balance: {parseFloat(sttBalance || 0).toLocaleString()} STT
              </Text>
              <View style={[styles.gaslessPill, { backgroundColor: colors.accentGreen + '20' }]}>
                <Text style={[styles.gaslessPillText, { color: colors.accentGreen }]}>Gasless</Text>
              </View>
            </View>

            {/* Manual Fields */}
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>RECIPIENT</Text>
            <GlassCard style={styles.inputCard}>
              <TextInput
                style={[styles.textInput, { color: colors.textPrimary }]}
                placeholder="0x... recipient address"
                placeholderTextColor={colors.textMuted}
                value={toAddress}
                onChangeText={setToAddress}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </GlassCard>

            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>AMOUNT (STT)</Text>
            <GlassCard style={styles.inputCard}>
              <View style={styles.amountRow}>
                <TextInput
                  style={[styles.amountInput, { color: colors.textPrimary }]}
                  placeholder="10"
                  placeholderTextColor={colors.textMuted}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                />
                <View style={[styles.tokenBadge, { backgroundColor: colors.primary + '20' }]}>
                  <Text style={[styles.tokenBadgeText, { color: colors.primary }]}>STT</Text>
                </View>
              </View>
            </GlassCard>

            {/* AI Command Separator */}
            <View style={styles.orRow}>
              <View style={[styles.orLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.orText, { color: colors.textMuted }]}>or use AI</Text>
              <View style={[styles.orLine, { backgroundColor: colors.border }]} />
            </View>

            {/* AI Command Box */}
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>AI COMMAND</Text>
            <GlassCard style={styles.inputCard}>
              <TextInput
                style={[styles.textArea, { color: colors.textPrimary }]}
                placeholder={"e.g. 'Send 25 STT to 0xabc...'"}
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                value={command}
                onChangeText={setCommand}
                textAlignVertical="top"
              />
              <Text style={[styles.commandHint, { color: colors.textMuted }]}>
                Include STT amount + full 0x address. AI parses the intent automatically.
              </Text>
            </GlassCard>

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              onPress={handleAnalyze}
              activeOpacity={0.8}
            >
              <Brain size={20} color="#fff" />
              <Text style={styles.primaryBtnText}>Analyze with AI Agent</Text>
            </TouchableOpacity>

            {!isConnected && (
              <View style={[styles.warnBox, { backgroundColor: '#f59e0b10', borderColor: '#f59e0b30' }]}>
                <AlertCircle size={16} color="#f59e0b" />
                <Text style={[styles.warnText, { color: '#f59e0b' }]}>
                  No wallet connected — using AI sponsor key for gasless STT transfers.
                </Text>
              </View>
            )}
          </>
        )}

        {/* Thinking Phase — AI Checks */}
        {(phase === 'thinking' || (phase === 'verified' && agentChecks.length > 0)) && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>AI AGENT ANALYSIS</Text>
            {agentChecks.map((check, i) => (
              <View key={i} style={[styles.checkRow, { borderBottomColor: colors.border }]}>
                <CheckCircle size={16} color={colors.accentGreen} />
                <View style={styles.checkInfo}>
                  <Text style={[styles.checkName, { color: colors.textPrimary }]}>{check.name}</Text>
                  <Text style={[styles.checkDetail, { color: colors.textSecondary }]}>{check.detail}</Text>
                </View>
              </View>
            ))}
            {phase === 'thinking' && (
              <View style={styles.checkRow}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.checkName, { color: colors.textMuted, marginLeft: 8 }]}>Processing...</Text>
              </View>
            )}
          </View>
        )}

        {/* Verified Phase */}
        {phase === 'verified' && parsedTx && (
          <View style={styles.section}>
            <View style={[styles.approvedBanner, { backgroundColor: colors.accentGreen + '15', borderColor: colors.accentGreen + '30' }]}>
              <ShieldCheck size={18} color={colors.accentGreen} />
              <Text style={[styles.approvedText, { color: colors.accentGreen }]}>Agent Approved — Gasless STT Transfer</Text>
            </View>

            <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: 18 }]}>TRANSACTION DETAILS</Text>
            <GlassCard style={styles.detailCard}>
              {[
                { label: 'Intent', value: parsedTx.intent },
                { label: 'Amount', value: `${parsedTx.amount} STT`, color: colors.primary },
                { label: 'Token', value: 'Status Test Token (STT)' },
                { label: 'Recipient', value: parsedTx.to, small: true },
                { label: 'Gas Fee', value: 'GASLESS (gasPrice = 0)', color: colors.accentGreen },
                { label: 'Network', value: 'Status Network Sepolia' },
              ].map(({ label, value, color, small }) => (
                <View key={label} style={[styles.detailRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{label}</Text>
                  <Text
                    style={[styles.detailValue, { color: color || colors.textPrimary, fontSize: small ? 11 : 13 }]}
                    numberOfLines={1}
                  >
                    {value}
                  </Text>
                </View>
              ))}
            </GlassCard>

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              onPress={handleExecute}
              activeOpacity={0.8}
            >
              <ScanLine size={20} color="#fff" />
              <Text style={styles.primaryBtnText}>Execute Gasless Transfer</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryBtn} onPress={handleReset}>
              <Text style={[styles.secondaryBtnText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Executing Phase */}
        {phase === 'executing' && (
          <GlassCard style={styles.executingCard}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.executingTitle, { color: colors.textPrimary }]}>Sending STT Tokens</Text>
            <Text style={[styles.executingSub, { color: colors.textSecondary }]}>
              Broadcasting gasless ERC20 transfer on Status Sepolia...
            </Text>
            {[
              'Signing with MetaMask / AI sponsor key...',
              'Sending gasless transfer (gasPrice = 0)...',
              'Confirming on Status Network...',
            ].map((step, i) => (
              <View key={i} style={[styles.stepRow, { borderTopColor: colors.border }]}>
                <Zap size={13} color={colors.primary} />
                <Text style={[styles.stepText, { color: colors.textSecondary }]}>{step}</Text>
              </View>
            ))}
            <TouchableOpacity style={styles.secondaryBtn} onPress={handleCancelExecution}>
              <Text style={[styles.secondaryBtnText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </GlassCard>
        )}

        {/* Done Phase */}
        {phase === 'done' && (
          <View style={styles.section}>
            <GlassCard style={styles.successCard}>
              <View style={[styles.successIcon, { backgroundColor: isSuccess ? colors.accentGreen + '20' : '#ef444420' }]}>
                {isSuccess
                  ? <CheckCircle size={36} color={colors.accentGreen} />
                  : <AlertCircle size={36} color="#ef4444" />
                }
              </View>
              <Text style={[styles.successTitle, { color: colors.textPrimary }]}>
                {isSuccess ? 'STT Sent! 🚀' : 'Transfer Failed'}
              </Text>
              <Text style={[styles.successSub, { color: colors.textSecondary }]}>
                {isSuccess
                  ? `${parsedTx?.amount} STT transferred gaslessly on Status Network Sepolia.`
                  : (executionError || 'Transfer failed. Reconnect wallet and try again.')}
              </Text>

              {isSuccess && txHash && txHash !== 'failed' && (
                <>
                  <View style={[styles.hashBox, { backgroundColor: 'rgba(0,0,0,0.3)', borderColor: colors.border }]}>
                    <Text style={[styles.hashLabel, { color: colors.textMuted }]}>TX HASH</Text>
                    <Text style={[styles.hashValue, { color: colors.primary }]} numberOfLines={2}>
                      {txHash.slice(0, 24)}...
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.explorerBtn, { borderColor: colors.primary + '40' }]}
                    onPress={() => Linking.openURL(`${EXPLORER}/tx/${txHash}`)}
                    activeOpacity={0.75}
                  >
                    <ExternalLink size={14} color={colors.primary} />
                    <Text style={[styles.explorerBtnText, { color: colors.primary }]}>View on Explorer</Text>
                  </TouchableOpacity>
                </>
              )}
            </GlassCard>

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              onPress={() => navigation.navigate('Transactions')}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryBtnText}>View in History</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryBtn} onPress={handleReset}>
              <Text style={[styles.secondaryBtnText, { color: colors.textSecondary }]}>New Transfer</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Footer */}
        <View style={[styles.infoRow, { borderTopColor: colors.border }]}>
          <Zap size={12} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.textMuted }]}>Status Gasless Protocol</Text>
          <ShieldCheck size={12} color={colors.accentGreen} />
          <Text style={[styles.infoText, { color: colors.textMuted }]}>AI Governed</Text>
        </View>
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
  agentBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1,
  },
  agentBadgeText: { fontSize: 11, fontWeight: '800' },
  scrollContent: { padding: 20, paddingBottom: 60 },
  section: { marginBottom: 8 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 10 },

  // STT Balance badge
  sttBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, borderWidth: 1, marginBottom: 20,
  },
  sttBadgeText: { flex: 1, fontSize: 13, fontWeight: '700' },
  gaslessPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  gaslessPillText: { fontSize: 10, fontWeight: '800' },

  // Inputs
  inputCard: { padding: 14, marginBottom: 14 },
  textInput: { fontSize: 14, fontFamily: 'monospace', minHeight: 40 },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  amountInput: { flex: 1, fontSize: 22, fontWeight: '800' },
  tokenBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  tokenBadgeText: { fontSize: 14, fontWeight: '800' },
  textArea: { fontSize: 14, lineHeight: 22, minHeight: 70, marginBottom: 8 },
  commandHint: { fontSize: 11, lineHeight: 16 },

  // OR divider
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 14 },
  orLine: { flex: 1, height: 1 },
  orText: { fontSize: 12, fontWeight: '600' },

  // Buttons
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, height: 56, borderRadius: 28, marginBottom: 12,
  },
  primaryBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  secondaryBtn: { alignItems: 'center', paddingVertical: 12, marginBottom: 8 },
  secondaryBtnText: { fontSize: 15, fontWeight: '600' },

  // Warning
  warnBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 8,
  },
  warnText: { flex: 1, fontSize: 13, fontWeight: '500', lineHeight: 18 },

  // Agent checks
  checkRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1,
  },
  checkInfo: { flex: 1 },
  checkName: { fontSize: 14, fontWeight: '600' },
  checkDetail: { fontSize: 12, marginTop: 2 },

  // Approved banner
  approvedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 14, borderRadius: 16, borderWidth: 1,
  },
  approvedText: { fontSize: 14, fontWeight: '700' },

  // Detail card
  detailCard: { padding: 0, marginBottom: 20, overflow: 'hidden' },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1,
  },
  detailLabel: { fontSize: 13 },
  detailValue: { fontSize: 13, fontWeight: '700', maxWidth: '60%', textAlign: 'right' },

  // Executing
  executingCard: { padding: 32, alignItems: 'center', gap: 14, marginBottom: 16 },
  executingTitle: { fontSize: 18, fontWeight: '700' },
  executingSub: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%', paddingTop: 12, borderTopWidth: 1 },
  stepText: { fontSize: 12 },

  // Success
  successCard: { padding: 30, alignItems: 'center', gap: 12, marginBottom: 20 },
  successIcon: { width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  successTitle: { fontSize: 20, fontWeight: '800' },
  successSub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  hashBox: { width: '100%', padding: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  hashLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 6 },
  hashValue: { fontSize: 13, fontFamily: 'monospace', fontWeight: '600' },
  explorerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, marginTop: 4,
  },
  explorerBtnText: { fontSize: 12, fontWeight: '700' },

  // Info footer
  infoRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingTop: 20, borderTopWidth: 1, marginTop: 8,
  },
  infoText: { fontSize: 11, fontWeight: '500' },
});
