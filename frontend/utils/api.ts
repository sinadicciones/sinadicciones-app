import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';

interface FetchOptions extends RequestInit {
  headers?: Record<string, string>;
}

/**
 * Helper function to make authenticated API requests
 * On web, uses cookies automatically
 * On mobile, uses Authorization header with token from AsyncStorage
 */
export async function authenticatedFetch(url: string, options: FetchOptions = {}): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // On mobile, add Authorization header with token from AsyncStorage
  if (Platform.OS !== 'web') {
    const token = await AsyncStorage.getItem('session_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  // Make the request
  // On web, credentials: 'include' ensures cookies are sent
  return fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });
}

/**
 * Get the backend URL
 */
export function getBackendURL(): string {
  return BACKEND_URL;
}
