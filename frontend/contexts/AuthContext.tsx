import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';

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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkExistingSession();
    
    if (Platform.OS === 'web') {
      // Check for session_id in URL hash on web
      const hash = window.location.hash;
      if (hash.includes('session_id=')) {
        const sessionId = hash.split('session_id=')[1]?.split('&')[0];
        if (sessionId) {
          handleDeepLink(window.location.href);
          // Clean the URL
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    } else {
      setupDeepLinkListener();
    }
  }, []);

  const setupDeepLinkListener = () => {
    // Handle cold start (app opened from killed state)
    Linking.getInitialURL().then(url => {
      if (url) {
        handleDeepLink(url);
      }
    });

    // Handle hot links (app already running)
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    return () => subscription.remove();
  };

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
      const token = await AsyncStorage.getItem('session_token');
      if (token) {
        await refreshUser();
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
      const redirectUrl = Platform.OS === 'web'
        ? window.location.origin + window.location.pathname
        : Linking.createURL('/');

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
      const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok) {
        // Store token for mobile
        if (Platform.OS !== 'web' && data.session_token) {
          await AsyncStorage.setItem('session_token', data.session_token);
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
        // Store token for mobile
        if (Platform.OS !== 'web' && data.session_token) {
          await AsyncStorage.setItem('session_token', data.session_token);
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
      const token = await AsyncStorage.getItem('session_token');
      
      const headers: any = {};
      
      // On mobile, use Authorization header. On web, rely on cookies
      if (Platform.OS !== 'web' && token) {
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
        if (Platform.OS !== 'web') {
          await AsyncStorage.removeItem('session_token');
        }
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
      setUser(null);
    }
  };

  const logout = async () => {
    try {
      const token = await AsyncStorage.getItem('session_token');
      if (token) {
        await fetch(`${BACKEND_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      }
      
      await AsyncStorage.removeItem('session_token');
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, loginWithEmail, registerWithEmail, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};