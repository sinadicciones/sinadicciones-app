import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const TABS = [
  { name: 'home', label: 'Inicio', icon: 'home', route: '/(tabs)/home' },
  { name: 'habits', label: 'Hábitos', icon: 'checkbox', route: '/(tabs)/habits' },
  { name: 'emotional', label: 'Emocional', icon: 'heart', route: '/(tabs)/emotional' },
  { name: 'purpose', label: 'Propósito', icon: 'star', route: '/(tabs)/purpose' },
  { name: 'centers', label: 'Centros', icon: 'search', route: '/(tabs)/centers' },
  { name: 'profile', label: 'Perfil', icon: 'person', route: '/(tabs)/profile' },
];

export default function BottomNavigation() {
  const router = useRouter();
  const pathname = usePathname();

  const isActive = (tabName: string) => {
    if (tabName === 'purpose') {
      return pathname.includes('purpose');
    }
    return pathname.includes(tabName);
  };

  return (
    <View style={styles.container}>
      {TABS.map((tab) => {
        const active = isActive(tab.name);
        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tab}
            onPress={() => router.push(tab.route as any)}
          >
            <Ionicons
              name={active ? tab.icon as any : `${tab.icon}-outline` as any}
              size={24}
              color={active ? '#F59E0B' : '#A1A1AA'}
            />
            <Text style={[styles.label, active && styles.labelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    borderTopWidth: 1,
    borderTopColor: '#2D2D2D',
    paddingBottom: 20,
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  label: {
    fontSize: 10,
    color: '#A1A1AA',
    marginTop: 2,
  },
  labelActive: {
    color: '#F59E0B',
    fontWeight: '600',
  },
});
