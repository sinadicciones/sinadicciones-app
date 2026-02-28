import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authenticatedFetch, getBackendURL } from '../../utils/api';

const BACKEND_URL = getBackendURL();

export default function TabsLayout() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    // Load user profile to determine role
    const loadProfile = async () => {
      try {
        const response = await authenticatedFetch(`${BACKEND_URL}/api/profile`);
        if (response.ok) {
          const data = await response.json();
          setUserRole(data.role);
        }
      } catch (error) {
        console.error('Failed to load profile for tabs:', error);
      }
    };
    loadProfile();
  }, []);

  // Role-based configurations
  const isActiveUser = userRole === 'active_user';
  const isFamily = userRole === 'family';
  const isProfessional = userRole === 'professional';

  // Get theme colors based on role - Yellow accent for all
  const getThemeColor = () => {
    return '#F59E0B'; // Yellow for all profiles
  };

  const getBgColor = () => {
    return '#0D0D0D'; // Dark for all profiles
  };

  const getBorderColor = () => {
    return '#2D2D2D'; // Dark border for all
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: getThemeColor(),
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: getBgColor(),
          borderTopWidth: 1,
          borderTopColor: getBorderColor(),
          height: 60 + (Platform.OS === 'android' ? insets.bottom : 0),
          paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, 10) : 6,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
        tabBarIconStyle: {
          marginBottom: -2,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
          // Hide for active users (use challenge-dashboard), family and professional (use their dashboards)
          href: (isActiveUser || isFamily || isProfessional) ? null : '/(tabs)/home',
        }}
      />
      <Tabs.Screen
        name="challenge-dashboard"
        options={{
          title: 'Mi Reto',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="flame" size={size} color={color} />
          ),
          // Visible only for active users
          href: isActiveUser ? '/(tabs)/challenge-dashboard' : null,
        }}
      />
      <Tabs.Screen
        name="habits"
        options={{
          title: 'Hábitos',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="checkmark-circle" size={size} color={color} />
          ),
          // Hide for family and professional - they don't track habits
          href: (isFamily || isProfessional) ? null : '/(tabs)/habits',
        }}
      />
      <Tabs.Screen
        name="emotional"
        options={{
          title: 'Emocional',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="heart" size={size} color={color} />
          ),
          // Hide for family and professional
          href: (isFamily || isProfessional) ? null : '/(tabs)/emotional',
        }}
      />
      <Tabs.Screen
        name="purpose"
        options={{
          title: 'Propósito',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="star" size={size} color={color} />
          ),
          // Hide for family and professional
          href: (isFamily || isProfessional) ? null : '/(tabs)/purpose',
        }}
      />
      <Tabs.Screen
        name="centers"
        options={{
          title: 'Centros',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search" size={size} color={color} />
          ),
          // Visible for all roles
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
          // Visible for all roles
        }}
      />
    </Tabs>
  );
}