// GhostPay Agent — Navigation (Bottom Tabs + Stack)
import React from 'react';
import { View } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from '../context/ThemeContext';
import {
  Home,
  Wallet,
  Settings as SettingsIcon,
  Send,
} from 'lucide-react-native';

import HomeScreen from '../screens/HomeScreen';
import WalletScreen from '../screens/WalletScreen';
import PaymentScreen from '../screens/PaymentScreen';
import TransactionScreen from '../screens/TransactionScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Ghost logo tab icon
function GhostTabIcon({ color, size }) {
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{
        width: size * 0.75, height: size * 0.75,
        borderRadius: size * 0.375, backgroundColor: color,
        position: 'absolute', top: 0,
      }} />
      <View style={{
        width: size * 0.75, height: size * 0.38,
        backgroundColor: color, position: 'absolute', top: size * 0.37,
        borderBottomLeftRadius: size * 0.18, borderBottomRightRadius: size * 0.18,
      }} />
      <View style={{ position: 'absolute', top: size * 0.22, flexDirection: 'row', gap: size * 0.16 }}>
        <View style={{ width: size * 0.11, height: size * 0.11, borderRadius: size * 0.06, backgroundColor: color === '#6C5CE7' ? '#fff' : 'rgba(255,255,255,0.9)' }} />
        <View style={{ width: size * 0.11, height: size * 0.11, borderRadius: size * 0.06, backgroundColor: color === '#6C5CE7' ? '#fff' : 'rgba(255,255,255,0.9)' }} />
      </View>
    </View>
  );
}

function TabNavigator() {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bgPrimary,
          borderTopColor: 'rgba(255,255,255,0.07)',
          borderTopWidth: 1,
          height: 70,
          paddingBottom: 12,
          paddingTop: 8,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          marginTop: 2,
        },
        tabBarIconStyle: { marginBottom: 0 },
        tabBarItemStyle: { backgroundColor: 'transparent' },
        tabBarShowLabel: true,
        tabBarIcon: ({ color, size }) => {
          if (route.name === 'HomeTab') return <GhostTabIcon color={color} size={size} />;
          if (route.name === 'SendTab') return <Send size={size} color={color} />;
          if (route.name === 'AssetsTab') return <Wallet size={size} color={color} />;
          if (route.name === 'SettingsTab') return <SettingsIcon size={size} color={color} />;
          return null;
        },
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen} options={{ title: 'Home' }} />
      <Tab.Screen
        name="SendTab"
        component={PaymentScreen}
        options={{ title: 'Send STT' }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            // Navigate to Payment stack screen instead of tab screen for proper back navigation
            e.preventDefault();
            navigation.navigate('Payment');
          },
        })}
      />
      <Tab.Screen name="AssetsTab" component={WalletScreen} options={{ title: 'Wallet' }} />
      <Tab.Screen name="SettingsTab" component={SettingsScreen} options={{ title: 'Settings' }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { colors, isDark } = useTheme();

  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.bgPrimary,
      card: colors.headerBg,
      text: colors.headerTint,
      border: colors.border,
      primary: colors.primary,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={TabNavigator} />
        <Stack.Screen name="Payment" component={PaymentScreen} />
        <Stack.Screen name="Transactions" component={TransactionScreen} />
        <Stack.Screen name="AgentRules" component={PaymentScreen} />
        <Stack.Screen name="Wallet" component={WalletScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
