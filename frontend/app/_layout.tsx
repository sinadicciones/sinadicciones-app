import { Stack } from 'expo-router';
import { AuthProvider } from '../contexts/AuthContext';
import { NotificationProvider } from '../contexts/NotificationContext';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';

// Global CSS fix for React Native Web TextInput
const injectWebStyles = () => {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = `
      /* Fix TextInput styles for dark mode */
      input, textarea {
        background-color: transparent !important;
        color: inherit !important;
        border: none !important;
        outline: none !important;
      }
      input::placeholder, textarea::placeholder {
        color: #9CA3AF !important;
      }
      /* Ensure inputs inherit color from parent */
      [data-testid*="input"] input,
      input[type="text"],
      input[type="email"],
      input[type="password"] {
        color: inherit !important;
        background: transparent !important;
      }
    `;
    document.head.appendChild(style);
  }
};

export default function RootLayout() {
  useEffect(() => {
    injectWebStyles();
  }, []);

  return (
    <AuthProvider>
      <NotificationProvider>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </NotificationProvider>
    </AuthProvider>
  );
}