// GhostPay Agent — Transaction Card (Theme-aware + Responsive)
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { truncateAddress, formatETH, timeAgo } from '../utils/helper';
import { moderateScale, fontSize } from '../utils/responsive';

export default function TransactionCard({ transaction, onPress }) {
  const { colors } = useTheme();
  const statusColors = { confirmed: colors.accentGreen, pending: colors.warning, failed: colors.error };

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
      onPress={() => onPress && onPress(transaction)} activeOpacity={0.7}
    >
      <View style={styles.leftSection}>
        <View style={[styles.iconCircle, { borderColor: statusColors[transaction.status] || colors.textMuted, backgroundColor: colors.bgSecondary }]}>
          <Text style={[styles.txIcon, { color: colors.textPrimary }]}>↗</Text>
        </View>
        <View style={styles.details}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>Sent</Text>
          <Text style={[styles.address, { color: colors.textSecondary }]}>To: {truncateAddress(transaction.to)}</Text>
          <Text style={[styles.time, { color: colors.textMuted }]}>{timeAgo(transaction.timestamp)}</Text>
        </View>
      </View>
      <View style={styles.rightSection}>
        <Text style={[styles.amount, { color: colors.error }]}>-{formatETH(transaction.amount, 4)} ETH</Text>
        <View style={[styles.statusBadge, { backgroundColor: (statusColors[transaction.status] || colors.textMuted) + '20' }]}>
          <Text style={[styles.statusText, { color: statusColors[transaction.status] }]}>
            {transaction.status === 'confirmed' ? '✓' : '⏳'} {transaction.status}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: moderateScale(14), padding: moderateScale(16), flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center', marginBottom: moderateScale(10), borderWidth: 1,
  },
  leftSection: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconCircle: {
    width: moderateScale(42), height: moderateScale(42), borderRadius: moderateScale(21),
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5,
  },
  txIcon: { fontSize: fontSize(18) },
  details: { marginLeft: moderateScale(12), flex: 1 },
  label: { fontSize: fontSize(15), fontWeight: '600' },
  address: { fontSize: fontSize(12), marginTop: 2, fontFamily: 'monospace' },
  time: { fontSize: fontSize(11), marginTop: 2 },
  rightSection: { alignItems: 'flex-end' },
  amount: { fontSize: fontSize(15), fontWeight: '700' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginTop: 4 },
  statusText: { fontSize: fontSize(10), fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
});
