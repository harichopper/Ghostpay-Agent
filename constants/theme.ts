/**
 * GhostPay Agent - Design System
 * Futuristic Web3 aesthetic with neon accents and dark mode focus.
 */

import { Platform } from 'react-native';

export const Colors = {
  dark: {
    background: '#050505',
    surface: '#121212',
    surfaceSecondary: '#1E1E1E',
    text: '#FFFFFF',
    textSecondary: '#A0A0A0',
    primary: '#6C48FF', // Purple
    secondary: '#00D1FF', // Cyan
    accent: '#00FFA3', // Spring Green
    error: '#FF4D4D',
    success: '#00FFA3',
    warning: '#FFD700',
    border: 'rgba(255, 255, 255, 0.1)',
    glass: 'rgba(255, 255, 255, 0.05)',
    glassBorder: 'rgba(255, 255, 255, 0.1)',
    neonPurple: '#BC13FE',
    neonCyan: '#00D1FF',
    neonBlue: '#2D31FA',
  },
  // We prioritize dark mode for Web3, but keeping light for completeness if needed
  light: {
    background: '#F8F9FA',
    surface: '#FFFFFF',
    surfaceSecondary: '#F1F3F5',
    text: '#121212',
    textSecondary: '#6C757D',
    primary: '#6C48FF',
    secondary: '#00D1FF',
    accent: '#00FFA3',
    error: '#DC3545',
    success: '#28A745',
    warning: '#FFC107',
    border: 'rgba(0, 0, 0, 0.1)',
    glass: 'rgba(0, 0, 0, 0.05)',
    glassBorder: 'rgba(0, 0, 0, 0.1)',
  }
};

export const Gaps = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 20,
  xl: 30,
  full: 9999,
};

export const Fonts = Platform.select({
  ios: {
    sans: 'System',
    mono: 'Courier New',
  },
  android: {
    sans: 'sans-serif',
    mono: 'monospace',
  },
  default: {
    sans: 'System',
    mono: 'monospace',
  },
});
