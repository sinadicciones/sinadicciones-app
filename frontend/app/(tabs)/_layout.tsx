import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { authenticatedFetch, getBackendURL } from '../../utils/api';

const BACKEND_URL = getBackendURL();

export default function TabsLayout() {
  const [userRole, setUserRole] = useState<string | null>(null);

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

  // For active_user, show different tab configuration
  const isActiveUser = userRole === 'active_user';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: isActiveUser ? '#F59E0B' : '#10B981',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: isActiveUser ? '#1A1A1A' : '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: isActiveUser ? '#333333' : '#E5E7EB',
          height: 70,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
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
          // Hide for active users - they use challenge-dashboard
          href: isActiveUser ? null : '/(tabs)/home',
        }}
      />
      <Tabs.Screen
        name="challenge-dashboard"
        options={{
          title: 'Mi Reto',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="flame" size={size} color={color} />
          ),
          // Visible for active users, hidden for others
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
          // Hide for active users - simplified experience
          href: isActiveUser ? null : '/(tabs)/habits',
        }}
      />
      <Tabs.Screen
        name="emotional"
        options={{
          title: 'Emocional',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="heart" size={size} color={color} />
          ),
          // Hide for active users - simplified experience
          href: isActiveUser ? null : '/(tabs)/emotional',
        }}
      />
      <Tabs.Screen
        name="purpose"
        options={{
          title: 'Propósito',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="star" size={size} color={color} />
          ),
          // Hide for active users
          href: isActiveUser ? null : '/(tabs)/purpose',
        }}
      />
      <Tabs.Screen
        name="centers"
        options={{
          title: 'Centros',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}