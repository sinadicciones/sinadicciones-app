import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://version-code-fix.preview.emergentagent.com';

interface FetchOptions extends RequestInit {
  headers?: Record<string, string>;
}

// Helper to get token from storage (works on both web and mobile)
const getToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return localStorage.getItem('session_token');
  }
  return await AsyncStorage.getItem('session_token');
};

/**
 * Helper function to make authenticated API requests
 * Uses Authorization header with token from storage
 */
export async function authenticatedFetch(url: string, options: FetchOptions = {}): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add Authorization header with token from storage
  const token = await getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Make the request
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
