// GhostPay Agent — Utility Helpers

/**
 * Truncate an Ethereum address for display
 * e.g. 0x1234...ABCD
 */
export function truncateAddress(address, startLen = 6, endLen = 4) {
  if (!address) return '';
  if (address.length <= startLen + endLen) return address;
  return `${address.slice(0, startLen)}...${address.slice(-endLen)}`;
}

/**
 * Format ETH amount for display
 */
export function formatETH(amount, decimals = 6) {
  if (amount === null || amount === undefined) return '0.000000';
  const num = parseFloat(amount);
  if (isNaN(num)) return '0.000000';
  return num.toFixed(decimals);
}

/**
 * Format USD amount
 */
export function formatUSD(amount) {
  if (amount === null || amount === undefined) return '$0.00';
  return `$${parseFloat(amount).toFixed(2)}`;
}

/**
 * Get a relative time string
 */
export function timeAgo(date) {
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return then.toLocaleDateString();
}

/**
 * Generate a random transaction ID for demo purposes
 */
export function generateTxId() {
  const chars = '0123456789abcdef';
  let hash = '0x';
  for (let i = 0; i < 64; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return hash;
}

/**
 * Validate Ethereum address format
 */
export function isValidAddress(address) {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Sleep helper for animations / delays
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate a unique ID 
 */
export function uniqueId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}
