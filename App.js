// GhostPay Agent — Entry Point
import 'react-native-get-random-values';
import 'fast-text-encoding';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { WalletProvider } from './context/WalletContext';
import { TransactionProvider } from './context/TransactionContext';
import AppNavigator from './navigation/AppNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';

function AppContent() {
  const { isDark } = useTheme();
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AppNavigator />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <WalletProvider>
          <TransactionProvider>
            <AppContent />
          </TransactionProvider>
        </WalletProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
