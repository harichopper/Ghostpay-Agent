// GhostPay Agent — AI Agent Decision Engine
// This module simulates an AI-powered payment verification agent.
// It enforces user-defined spending rules before approving transactions.

import { AGENT_RULES_DEFAULTS } from '../config/constants';

/**
 * Agent State — tracks spending history and cooldowns
 */
let agentState = {
  totalSpentToday: 0,
  lastTransactionTime: null,
  transactionCount: 0,
  decisionsLog: [],
};

/**
 * Reset daily agent state (called at midnight or manually)
 */
export function resetDailyState() {
  agentState.totalSpentToday = 0;
  agentState.transactionCount = 0;
  agentState.decisionsLog = [];
}

/**
 * Get the current agent state for UI display
 */
export function getAgentState() {
  return { ...agentState };
}

/**
 * Core AI Agent Verification Logic
 * 
 * Checks multiple rule layers before approving a payment:
 * 1. Address validation (whitelist/blacklist)
 * 2. Single transaction limit
 * 3. Daily cumulative limit
 * 4. Cooldown period
 * 5. Auto-approve threshold
 * 
 * @param {number} amount - Amount in ETH
 * @param {string} receiver - Recipient address 
 * @param {object} rules - User-defined rules (merged with defaults)
 * @returns {object} Decision { approved, reason, confidence, checks }
 */
export function verifyPayment(amount, receiver, rules = {}) {
  const mergedRules = { ...AGENT_RULES_DEFAULTS, ...rules };
  const checks = [];
  let approved = true;
  let reason = 'All checks passed';
  let confidence = 100;
  let requiresManualApproval = false;

  // Check 1: Blacklisted address
  if (mergedRules.blacklistedAddresses.includes(receiver)) {
    checks.push({ name: 'Address Blacklist', passed: false, detail: 'Receiver is blacklisted' });
    return createDecision(false, 'Receiver address is blacklisted', 100, checks, false);
  }
  checks.push({ name: 'Address Blacklist', passed: true, detail: 'Address not blacklisted' });

  // Check 2: Whitelist (if configured, only allow whitelisted addresses)
  if (mergedRules.whitelistedAddresses.length > 0) {
    if (!mergedRules.whitelistedAddresses.includes(receiver)) {
      checks.push({ name: 'Address Whitelist', passed: false, detail: 'Address not in whitelist' });
      confidence -= 30;
      requiresManualApproval = true;
    } else {
      checks.push({ name: 'Address Whitelist', passed: true, detail: 'Address is whitelisted' });
    }
  }

  // Check 3: Single transaction limit
  if (amount > mergedRules.maxSingle) {
    checks.push({ 
      name: 'Single Tx Limit', 
      passed: false, 
      detail: `${amount} ETH exceeds max ${mergedRules.maxSingle} ETH` 
    });
    return createDecision(false, `Amount ${amount} ETH exceeds single transaction limit of ${mergedRules.maxSingle} ETH`, 95, checks, false);
  }
  checks.push({ name: 'Single Tx Limit', passed: true, detail: `${amount} ETH within limit` });

  // Check 4: Daily cumulative limit
  const projectedTotal = agentState.totalSpentToday + amount;
  if (projectedTotal > mergedRules.dailyLimit) {
    checks.push({ 
      name: 'Daily Limit', 
      passed: false, 
      detail: `Daily total would be ${projectedTotal.toFixed(6)} ETH (limit: ${mergedRules.dailyLimit} ETH)` 
    });
    return createDecision(false, `Daily spending limit of ${mergedRules.dailyLimit} ETH would be exceeded`, 90, checks, false);
  }
  checks.push({ name: 'Daily Limit', passed: true, detail: `Daily total: ${projectedTotal.toFixed(6)} ETH` });

  // Check 5: Cooldown period
  if (agentState.lastTransactionTime) {
    const minutesSinceLast = (Date.now() - agentState.lastTransactionTime) / 60000;
    if (minutesSinceLast < mergedRules.cooldownMinutes) {
      const remaining = Math.ceil(mergedRules.cooldownMinutes - minutesSinceLast);
      checks.push({ 
        name: 'Cooldown', 
        passed: false, 
        detail: `${remaining} min remaining in cooldown` 
      });
      return createDecision(false, `Cooldown active. Please wait ${remaining} more minute(s)`, 85, checks, false);
    }
  }
  checks.push({ name: 'Cooldown', passed: true, detail: 'No cooldown active' });

  // Check 6: Auto-approve threshold
  if (amount <= mergedRules.autoApproveBelow) {
    checks.push({ name: 'Auto-Approve', passed: true, detail: 'Amount below auto-approve threshold' });
    requiresManualApproval = false;
  } else if (mergedRules.requireConfirmation) {
    requiresManualApproval = true;
    checks.push({ name: 'Manual Confirm', passed: true, detail: 'Requires user confirmation' });
  }

  // Risk scoring
  if (amount > mergedRules.maxSingle * 0.8) confidence -= 15;
  if (projectedTotal > mergedRules.dailyLimit * 0.8) confidence -= 10;
  if (agentState.transactionCount > 5) confidence -= 5;

  return createDecision(approved, reason, Math.max(confidence, 50), checks, requiresManualApproval);
}

/**
 * Record a successful transaction in agent state
 */
export function recordTransaction(amount) {
  agentState.totalSpentToday += amount;
  agentState.lastTransactionTime = Date.now();
  agentState.transactionCount += 1;
}

/**
 * Create a structured decision object
 */
function createDecision(approved, reason, confidence, checks, requiresManualApproval) {
  const decision = {
    approved,
    reason,
    confidence,
    checks,
    requiresManualApproval,
    timestamp: new Date().toISOString(),
    agentVersion: '1.0.0',
  };

  agentState.decisionsLog.push(decision);
  return decision;
}

/**
 * Get risk level label based on amount and rules
 */
export function getRiskLevel(amount, rules = {}) {
  const mergedRules = { ...AGENT_RULES_DEFAULTS, ...rules };
  const ratio = amount / mergedRules.maxSingle;
  
  if (ratio <= 0.25) return { level: 'LOW', color: '#00E676', icon: '🟢' };
  if (ratio <= 0.5) return { level: 'MEDIUM', color: '#FFD600', icon: '🟡' };
  if (ratio <= 0.8) return { level: 'HIGH', color: '#FF9100', icon: '🟠' };
  return { level: 'CRITICAL', color: '#FF5252', icon: '🔴' };
}
