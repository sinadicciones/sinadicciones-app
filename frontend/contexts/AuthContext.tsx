import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

// Get backend URL - use environment variable or fallback
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://sinadicciones-app.preview.emergentagent.com';

// Helper for storing token (works on both web and mobile)
const storeToken = async (token: string) => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    localStorage.setItem('session_token', token);
  }
  await AsyncStorage.setItem('session_token', token);
};

const getToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return localStorage.getItem('session_token');
  }
  return await AsyncStorage.getItem('session_token');
};

const removeToken = async () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    localStorage.removeItem('session_token');
    sessionStorage.removeItem('session_token');
    // Clear cookies
    document.cookie = 'session_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  }
  await AsyncStorage.removeItem('session_token');
};

interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  registerWithEmail: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

// Default auth values for SSR and initial render
const defaultAuthValue: AuthContextType = {
  user: null,
  isLoading: true,
  login: async () => {},
  loginWithEmail: async () => ({ success: false, error: 'Not initialized' }),
  registerWithEmail: async () => ({ success: false, error: 'Not initialized' }),
  logout: async () => {},
  refreshUser: async () => {},
};

const AuthContext = createContext<AuthContextType>(defaultAuthValue);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkExistingSession();
    
    if (Platform.OS === 'web') {
      // Check for session_id in URL hash on web
      if (typeof window !== 'undefined') {
        const hash = window.location.hash;
        if (hash.includes('session_id=')) {
          const sessionId = hash.split('session_id=')[1]?.split('&')[0];
          if (sessionId) {
            handleDeepLink(window.location.href);
            // Clean the URL
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        }
      }
    } else {
      // Only setup deep link listener on native platforms
      const setupLinks = async () => {
        try {
          // Handle cold start (app opened from killed state)
          const url = await Linking.getInitialURL();
          if (url) {
            handleDeepLink(url);
          }

          // Handle hot links (app already running)
          const subscription = Linking.addEventListener('url', ({ url }) => {
            handleDeepLink(url);
          });

          return () => subscription.remove();
        } catch (error) {
          console.log('Deep linking setup error:', error);
        }
      };
      setupLinks();
    }
  }, []);

  const handleDeepLink = async (url: string) => {
    // Extract session_id from URL (support both hash and query)
    let sessionId = null;
    
    if (url.includes('#session_id=')) {
      sessionId = url.split('#session_id=')[1]?.split('&')[0];
    } else if (url.includes('?session_id=')) {
      sessionId = url.split('?session_id=')[1]?.split('&')[0];
    }

    if (sessionId) {
      await exchangeSessionId(sessionId);
    }
  };

  const exchangeSessionId = async (sessionId: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/session`, {
        method: 'POST',
        headers: {
          'X-Session-ID': sessionId,
        },
        credentials: 'include', // Important for cookies
      });

      if (response.ok) {
        const data = await response.json();
        
        // For web, check if cookie was set by backend
        // For mobile, extract and store token from response
        if (Platform.OS !== 'web') {
          const cookies = response.headers.get('set-cookie');
          if (cookies) {
            const tokenMatch = cookies.match(/session_token=([^;]+)/);
            if (tokenMatch) {
              await AsyncStorage.setItem('session_token', tokenMatch[1]);
            }
          }
        }
        
        await refreshUser();
      }
    } catch (error) {
      console.error('Failed to exchange session:', error);
    }
  };

  const checkExistingSession = async () => {
    try {
      // Check for stored token first
      const token = await getToken();
      console.log('Checking session, token found:', !!token);
      
      const headers: any = {};
      
      // Always use Authorization header if we have a token
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${BACKEND_URL}/api/auth/me`, {
        headers,
        credentials: 'include',
      });

      if (response.ok) {
        const userData = await response.json();
        console.log('Session valid, user:', userData.name);
        setUser(userData);
      } else {
        // Token invalid or no session, clear storage
        console.log('Session invalid, clearing token');
        await removeToken();
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to check session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async () => {
    try {
      // Create redirect URL based on platform
      // Always use the public preview URL for web to avoid localhost issues
      let redirectUrl: string;
      
      if (Platform.OS === 'web') {
        // Check if we're on localhost or the actual preview URL
        const currentOrigin = window.location.origin;
        if (currentOrigin.includes('localhost') || currentOrigin.includes('127.0.0.1')) {
          // Use the public preview URL instead of localhost
          redirectUrl = 'https://sinadicciones-app.preview.emergentagent.com/';
        } else {
          redirectUrl = currentOrigin + window.location.pathname;
        }
      } else {
        redirectUrl = Linking.createURL('/');
      }

      const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;

      if (Platform.OS === 'web') {
        window.location.href = authUrl;
      } else {
        const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
        
        if (result.type === 'success' && result.url) {
          await handleDeepLink(result.url);
        }
      }
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const loginWithEmail = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('Attempting login with email:', email);
      console.log('Backend URL:', BACKEND_URL);
      
      const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      console.log('Login response status:', response.status);
      const data = await response.json();
      console.log('Login response data:', data);

      if (response.ok) {
        // Store token using helper
        if (data.session_token) {
          console.log('Storing session token');
          await storeToken(data.session_token);
        }
        await refreshUser();
        return { success: true };
      } else {
        return { success: false, error: data.detail || 'Error al iniciar sesión' };
      }
    } catch (error) {
      console.error('Email login failed:', error);
      return { success: false, error: 'Error de conexión' };
    }
  };

  const registerWithEmail = async (email: string, password: string, name: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name }),
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok) {
        // Store token using helper
        if (data.session_token) {
          await storeToken(data.session_token);
        }
        await refreshUser();
        return { success: true };
      } else {
        return { success: false, error: data.detail || 'Error al registrarse' };
      }
    } catch (error) {
      console.error('Email registration failed:', error);
      return { success: false, error: 'Error de conexión' };
    }
  };

  const refreshUser = async () => {
    try {
      const token = await getToken();
      
      const headers: any = {};
      
      // Always use Authorization header if we have a token
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${BACKEND_URL}/api/auth/me`, {
        headers,
        credentials: 'include', // Important for cookies on web
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        setUser(null);
        await removeToken();
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
      setUser(null);
    }
  };

  const logout = async () => {
    try {
      const token = await getToken();
      if (token) {
        await fetch(`${BACKEND_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          credentials: 'include',
        });
      }
      
      await removeToken();
      setUser(null);
      
      // Force page reload on web to clear all state
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Logout failed:', error);
      // Even if API fails, clear local state
      await removeToken();
      setUser(null);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.location.href = '/';
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, loginWithEmail, registerWithEmail, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};