// GhostPay Agent — Theme Context
// Provides dark/light theme toggle with AsyncStorage persistence.

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DARK_THEME, LIGHT_THEME, SHARED } from '../config/themes';

const ThemeContext = createContext(null);
const THEME_STORAGE_KEY = '@ghostpay_theme_preference';

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState('dark'); // 'dark' | 'light' | 'system'
  const [isLoading, setIsLoading] = useState(true);

  // Load saved theme preference on mount
  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (saved) {
        setThemeMode(saved);
      }
    } catch (e) {
      // Fallback to dark
    }
    setIsLoading(false);
  };

  // Determine active theme
  const getActiveTheme = useCallback(() => {
    if (themeMode === 'system') {
      return systemScheme === 'light' ? LIGHT_THEME : DARK_THEME;
    }
    return themeMode === 'light' ? LIGHT_THEME : DARK_THEME;
  }, [themeMode, systemScheme]);

  const colors = getActiveTheme();
  const isDark = colors.id === 'dark';

  /**
   * Set theme mode and persist to storage
   */
  const setTheme = useCallback(async (mode) => {
    setThemeMode(mode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (e) {
      // Fail silently
    }
  }, []);

  /**
   * Toggle between dark and light
   */
  const toggleTheme = useCallback(() => {
    const next = isDark ? 'light' : 'dark';
    setTheme(next);
  }, [isDark, setTheme]);

  /**
   * Shadow styles that adapt to theme
   */
  const shadows = {
    card: {
      shadowColor: colors.shadowColor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.15 : 0.08,
      shadowRadius: 12,
      elevation: isDark ? 8 : 4,
    },
    button: {
      shadowColor: colors.shadowColor,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: isDark ? 0.35 : 0.18,
      shadowRadius: 10,
      elevation: isDark ? 12 : 6,
    },
  };

  const value = {
    colors,
    shadows,
    shared: SHARED,
    isDark,
    themeMode,
    setTheme,
    toggleTheme,
    isLoading,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to access theme context
 */
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export default ThemeContext;
