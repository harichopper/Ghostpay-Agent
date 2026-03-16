// GhostPay Agent — Configuration Constants

export const COLORS = {
  // Primary palette
  primary: '#6C5CE7',
  primaryLight: '#A29BFE',
  primaryDark: '#5A4BD1',
  
  // Accent
  accent: '#00D2FF',
  accentGreen: '#00E676',
  accentOrange: '#FF9100',
  accentRed: '#FF5252',
  
  // Background layers
  bgPrimary: '#0A0E1A',
  bgSecondary: '#111827',
  bgCard: '#1A1F35',
  bgCardLight: '#242A45',
  bgInput: '#1E2440',
  
  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#8892B0',
  textMuted: '#5A6178',
  
  // Borders
  border: '#2A3050',
  borderLight: '#3D4466',
  
  // Status
  success: '#00E676',
  warning: '#FFD600',
  error: '#FF5252',
  info: '#00D2FF',
  
  // Gradients
  gradientPrimary: ['#6C5CE7', '#A29BFE'],
  gradientAccent: ['#00D2FF', '#6C5CE7'],
  gradientDark: ['#0A0E1A', '#111827'],
  gradientSuccess: ['#00E676', '#00B0FF'],
  gradientDanger: ['#FF5252', '#FF6E40'],
};

export const FONTS = {
  regular: 'System',
  bold: 'System',
};

export const SHADOWS = {
  card: {
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  button: {
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 12,
  },
};

export const AGENT_RULES_DEFAULTS = {
  dailyLimit: 0.05,     // ETH
  maxSingle: 0.02,      // ETH
  requireConfirmation: true,
  autoApproveBelow: 0.005,
  cooldownMinutes: 5,
  whitelistedAddresses: [],
  blacklistedAddresses: [],
};

// Status Network Sepolia — Gasless L2 (Chain ID: 1660990954)
export const BLOCKCHAIN = {
  rpcUrl: 'https://public.sepolia.rpc.status.network',
  chainId: 1660990954,
  chainName: 'Status Network Sepolia',
  currencySymbol: 'ETH',
  blockExplorer: 'https://sepoliascan.status.network',
  faucet: 'https://faucet.status.network',
  // Optional sponsor key for contract-only payments when connected wallet has 0 ETH on Status Sepolia.
  // Testnet only. Prefer EXPO_PUBLIC_PAYER_PRIVATE_KEY env var; this is a fallback for Expo runtime setups.
  sponsorPrivateKey: '0xe73e43f2fb5505e7981dfa6ed7bf41f516708f37b4fb1ade3371d344208f6b29',
};
