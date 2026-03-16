// GhostPay Agent — Theme Definitions
// Comprehensive dark + light themes for the entire app.

export const DARK_THEME = {
  id: 'dark',
  // Primary (Tailwind primary)
  primary: '#25aff4',
  primaryLight: '#57c1f7',
  
  // Custom Accents
  accentBlue: '#25aff4', 
  accentPurple: '#a855f7', // Tailwind secondary
  accentGreen: '#22c55e', // emerald-500
  accentRed: '#ef4444',

  // Background layers (Tailwind background-dark)
  bgPrimary: '#101c22',
  bgSecondary: '#182b34',
  bgCard: 'rgba(255, 255, 255, 0.03)',
  bgInput: '#0c151a',

  // Text
  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',

  // Borders
  border: 'rgba(255, 255, 255, 0.1)',
  
  // Status
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#25aff4',

  // Gradients
  gradientPrimary: ['#25aff4', '#a855f7'],
  gradientAccent: ['#25aff4', '#a855f7'],
  gradientSuccess: ['#22c55e', '#10b981'],
  gradientDanger: ['#ef4444', '#f43f5e'],
  gradientCard: ['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.02)'],

  // Navigation
  headerBg: '#101c22',
  headerTint: '#f8fafc',
  statusBarStyle: 'light-content',
};

export const LIGHT_THEME = {
  id: 'light',
  // Primary palette
  primary: '#6C5CE7',
  primaryLight: '#8B7CF7',
  primaryDark: '#5A4BD1',

  // Accent
  accent: '#0099CC',
  accentGreen: '#00B060',
  accentOrange: '#E08200',
  accentRed: '#E03030',

  // Background layers
  bgPrimary: '#F5F7FA',
  bgSecondary: '#FFFFFF',
  bgCard: '#FFFFFF',
  bgCardLight: '#F0F2F5',
  bgInput: '#F0F2F8',

  // Text
  textPrimary: '#1A1D2E',
  textSecondary: '#5A6178',
  textMuted: '#9AA0B0',

  // Borders
  border: '#E2E5ED',
  borderLight: '#D0D5DE',

  // Status
  success: '#00B060',
  warning: '#E08200',
  error: '#E03030',
  info: '#0099CC',

  // Gradients
  gradientPrimary: ['#6C5CE7', '#8B7CF7'],
  gradientAccent: ['#0099CC', '#6C5CE7'],
  gradientDark: ['#F5F7FA', '#FFFFFF'],
  gradientSuccess: ['#00B060', '#0099CC'],
  gradientDanger: ['#E03030', '#FF6E40'],
  gradientCard: ['#FFFFFF', '#F5F7FF'],

  // Shadows
  shadowColor: '#6C5CE7',

  // StatusBar
  statusBarStyle: 'dark-content',
  statusBarBg: '#F5F7FA',

  // Navigation header
  headerBg: '#F5F7FA',
  headerTint: '#1A1D2E',

  // Card overlay
  overlayBg: 'rgba(0,0,0,0.5)',
  cardOverlay: 'rgba(255,255,255,0.7)',
};

// Shared constants (theme-independent)
export const SHARED = {
  fontRegular: 'System',
  fontBold: 'System',

  agentRulesDefaults: {
    dailyLimit: 0.05,
    maxSingle: 0.02,
    requireConfirmation: true,
    autoApproveBelow: 0.005,
    cooldownMinutes: 5,
    whitelistedAddresses: [],
    blacklistedAddresses: [],
  },

  blockchain: {
    rpcUrl: 'https://sepolia.status.network',
    chainId: 1660990954,
    chainName: 'Status Sepolia',
    currencySymbol: 'ETH',
    blockExplorer: 'https://sepolia.status.network/explorer',
  },
};
