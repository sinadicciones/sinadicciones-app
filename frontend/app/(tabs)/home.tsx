import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { authenticatedFetch, getBackendURL } from '../../utils/api';

const BACKEND_URL = getBackendURL();

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [habits, setHabits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try:
      // Load profile first to check if onboarding is complete
      const profileResponse = await authenticatedFetch(`${BACKEND_URL}/api/profile`);
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        setProfile(profileData);
        // If profile not completed, redirect to onboarding
        if (!profileData.profile_completed) {
          router.replace('/onboarding');
          return;
        }
      }

      // Load dashboard stats
      const statsResponse = await authenticatedFetch(`${BACKEND_URL}/api/dashboard/stats`);
      if (statsResponse.ok) {
        setStats(await statsResponse.json());
      }

      // Load habits
      const habitsResponse = await authenticatedFetch(`${BACKEND_URL}/api/habits`);
      if (habitsResponse.ok) {
        setHabits(await habitsResponse.json());
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleSOS = async () => {
    try {
      // Cargar perfil si no está cargado
      let currentProfile = profile;
      if (!currentProfile) {
        const profileResponse = await authenticatedFetch(`${BACKEND_URL}/api/profile`);
        if (profileResponse.ok) {
          currentProfile = await profileResponse.json();
          setProfile(currentProfile);
        }
      }

      // Verificar si hay contactos de emergencia
      if (!currentProfile || !currentProfile.emergency_contacts || currentProfile.emergency_contacts.length === 0) {
        Alert.alert(
          'Sin contactos de emergencia',
          'Primero debes agregar contactos de emergencia en tu perfil.',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Ir al perfil', onPress: () => router.push('/(tabs)/profile') },
          ]
        );
        return;
      }

      // Obtener primer contacto
      const firstContact = currentProfile.emergency_contacts[0];
      
      if (!firstContact.phone) {
        Alert.alert('Error', 'El contacto no tiene número de teléfono configurado');
        return;
      }

      // Preparar mensaje de WhatsApp
      const message = 'Paso por un mal momento, ¿podemos hablar?';
      const phoneNumber = firstContact.phone.replace(/[^0-9]/g, ''); // Limpiar número
      const whatsappUrl = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;

      // Intentar abrir WhatsApp
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
      } else {
        Alert.alert(
          'WhatsApp no disponible',
          `¿Deseas llamar a ${firstContact.name} (${firstContact.relationship})?`,
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Llamar', onPress: () => Linking.openURL(`tel:${phoneNumber}`) },
          ]
        );
      }
    } catch (error) {
      console.error('Error en SOS:', error);
      Alert.alert('Error', 'No se pudo enviar el mensaje de emergencia');
    }
  };

  const toggleHabit = async (habitId: string, currentStatus: boolean) => {
    try {
      await authenticatedFetch(`${BACKEND_URL}/api/habits/${habitId}/log`, {
        method: 'POST',
        body: JSON.stringify({ completed: !currentStatus }),
      });

      loadData();
    } catch (error) {
      console.error('Failed to toggle habit:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#10B981', '#3B82F6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Hola, {user?.name?.split(' ')[0]}</Text>
            <Text style={styles.subtitle}>¿Cómo te sientes hoy?</Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: '#10B981' }]}>
            <Text style={styles.statNumber}>{stats?.total_habits || 0}</Text>
            <Text style={styles.statLabel}>Hábitos</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#3B82F6' }]}>
            <Text style={styles.statNumber}>{stats?.completion_rate || 0}%</Text>
            <Text style={styles.statLabel}>Completado</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#8B5CF6' }]}>
            <Text style={styles.statNumber}>{stats?.longest_streak || 0}</Text>
            <Text style={styles.statLabel}>Racha</Text>
          </View>
        </View>

        {/* Today's Habits */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hábitos de hoy</Text>
          {habits.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>Aún no tienes hábitos</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => router.push('/(tabs)/habits')}
              >
                <Text style={styles.addButtonText}>Agregar hábito</Text>
              </TouchableOpacity>
            </View>
          ) : (
            habits.slice(0, 5).map((habit) => (
              <TouchableOpacity
                key={habit.habit_id}
                style={styles.habitCard}
                onPress={() => toggleHabit(habit.habit_id, habit.completed_today)}
              >
                <View style={styles.habitLeft}>
                  <View
                    style={[
                      styles.habitIcon,
                      {
                        backgroundColor: habit.completed_today
                          ? habit.color
                          : '#F3F4F6',
                      },
                    ]}
                  >
                    <Ionicons
                      name={habit.completed_today ? 'checkmark' : 'checkmark'}
                      size={20}
                      color={habit.completed_today ? '#FFFFFF' : '#D1D5DB'}
                    />
                  </View>
                  <View>
                    <Text style={styles.habitName}>{habit.name}</Text>
                    <Text style={styles.habitStreak}>
                      {habit.streak} días de racha 🔥
                    </Text>
                  </View>
                </View>
                <View style={styles.habitRight}>
                  {habit.completed_today && (
                    <View style={styles.completedBadge}>
                      <Text style={styles.completedText}>✓</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acciones rápidas</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/(tabs)/emotional')}
            >
              <Ionicons name="heart" size={32} color="#EF4444" />
              <Text style={styles.actionText}>Registrar emoción</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/(tabs)/profile')}
            >
              <Ionicons name="build" size={32} color="#F59E0B" />
              <Text style={styles.actionText}>Caja de herramientas</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/stats')}
            >
              <Ionicons name="stats-chart" size={32} color="#3B82F6" />
              <Text style={styles.actionText}>Ver estadísticas</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionCard, styles.sosCard]}
              onPress={handleSOS}
            >
              <Ionicons name="warning" size={32} color="#FFFFFF" />
              <Text style={[styles.actionText, styles.sosText]}>SOS Ayuda</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 16,
    color: '#F0FDFA',
    marginTop: 4,
  },
  logoutButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#F0FDFA',
    marginTop: 4,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
    marginBottom: 16,
  },
  addButton: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  habitCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  habitLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  habitIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  habitName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  habitStreak: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  habitRight: {
    marginLeft: 12,
  },
  completedBadge: {
    backgroundColor: '#10B981',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completedText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 8,
    textAlign: 'center',
  },
});