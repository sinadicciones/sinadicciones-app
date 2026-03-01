import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { authenticatedFetch, getBackendURL } from '../../utils/api';
import HabitsInsights from '../../components/HabitsInsights';

const BACKEND_URL = getBackendURL();

const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899'];

export default function HabitsScreen() {
  const [habits, setHabits] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [habitName, setHabitName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [refreshing, setRefreshing] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Hábitos sugeridos por tipo de adicción
  const SUGGESTED_HABITS: Record<string, { name: string; icon: string; color: string }[]> = {
    'alcohol': [
      { name: 'Reunión AA/Grupo de apoyo', icon: 'people', color: '#8B5CF6' },
      { name: 'Llamar a padrino/madrina', icon: 'call', color: '#10B981' },
      { name: 'Leer literatura de recuperación', icon: 'book', color: '#3B82F6' },
      { name: 'Meditación 10 min', icon: 'leaf', color: '#10B981' },
      { name: 'Ejercicio físico', icon: 'fitness', color: '#EF4444' },
      { name: 'Escribir diario de gratitud', icon: 'journal', color: '#F59E0B' },
    ],
    'drogas': [
      { name: 'Reunión NA/Grupo de apoyo', icon: 'people', color: '#8B5CF6' },
      { name: 'Terapia individual', icon: 'medical', color: '#EC4899' },
      { name: 'Ejercicio físico', icon: 'fitness', color: '#EF4444' },
      { name: 'Meditación/Mindfulness', icon: 'leaf', color: '#10B981' },
      { name: 'Contactar red de apoyo', icon: 'call', color: '#3B82F6' },
      { name: 'Practicar hobby saludable', icon: 'color-palette', color: '#F59E0B' },
    ],
    'tabaco': [
      { name: 'Ejercicio de respiración', icon: 'water', color: '#06B6D4' },
      { name: 'Caminar 20 minutos', icon: 'walk', color: '#10B981' },
      { name: 'Beber agua (8 vasos)', icon: 'water', color: '#3B82F6' },
      { name: 'Registrar antojos', icon: 'document-text', color: '#F59E0B' },
      { name: 'Mascar chicle sin azúcar', icon: 'checkmark-circle', color: '#8B5CF6' },
    ],
    'juego': [
      { name: 'Reunión Jugadores Anónimos', icon: 'people', color: '#8B5CF6' },
      { name: 'Revisar finanzas del día', icon: 'wallet', color: '#10B981' },
      { name: 'Actividad alternativa (hobby)', icon: 'game-controller', color: '#3B82F6' },
      { name: 'Hablar con sponsor', icon: 'call', color: '#F59E0B' },
    ],
    'default': [
      { name: 'Meditación 10 min', icon: 'leaf', color: '#10B981' },
      { name: 'Ejercicio físico', icon: 'fitness', color: '#EF4444' },
      { name: 'Leer 15 minutos', icon: 'book', color: '#3B82F6' },
      { name: 'Escribir diario', icon: 'journal', color: '#F59E0B' },
      { name: 'Contactar ser querido', icon: 'call', color: '#8B5CF6' },
      { name: 'Dormir 8 horas', icon: 'moon', color: '#6366F1' },
    ],
    'reto': [
      { name: 'Levantarse temprano', icon: 'sunny', color: '#F59E0B' },
      { name: 'Ejercicio 30 min', icon: 'fitness', color: '#EF4444' },
      { name: 'Sin redes sociales 2h', icon: 'phone-portrait', color: '#8B5CF6' },
      { name: 'Leer 20 páginas', icon: 'book', color: '#3B82F6' },
      { name: 'Meditar 10 min', icon: 'leaf', color: '#10B981' },
      { name: 'Planificar el día', icon: 'calendar', color: '#EC4899' },
    ],
  };

  useEffect(() => {
    loadHabits();
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await authenticatedFetch(`${BACKEND_URL}/api/profile`);
      if (response.ok) {
        const data = await response.json();
        setUserProfile(data);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  };

  const getSuggestedHabits = () => {
    if (!userProfile) return SUGGESTED_HABITS['default'];
    
    // Si es usuario de reto (active_user)
    if (userProfile.role === 'active_user') {
      return SUGGESTED_HABITS['reto'];
    }
    
    // Si tiene tipo de adicción específico
    const addictionType = userProfile.addiction_type?.toLowerCase() || '';
    if (addictionType.includes('alcohol')) return SUGGESTED_HABITS['alcohol'];
    if (addictionType.includes('droga') || addictionType.includes('sustancia')) return SUGGESTED_HABITS['drogas'];
    if (addictionType.includes('tabaco') || addictionType.includes('cigarr') || addictionType.includes('fumar')) return SUGGESTED_HABITS['tabaco'];
    if (addictionType.includes('juego') || addictionType.includes('apuesta')) return SUGGESTED_HABITS['juego'];
    
    return SUGGESTED_HABITS['default'];
  };

  const selectSuggestedHabit = (habit: { name: string; color: string }) => {
    setHabitName(habit.name);
    setSelectedColor(habit.color);
  };

  const loadHabits = async () => {
    try {
      const response = await authenticatedFetch(`${BACKEND_URL}/api/habits`);

      if (response.ok) {
        const data = await response.json();
        setHabits(data);
      }
    } catch (error) {
      console.error('Failed to load habits:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const createHabit = async () => {
    if (!habitName.trim()) {
      Alert.alert('Error', 'Por favor ingresa un nombre para el hábito');
      return;
    }

    try {
      const response = await authenticatedFetch(`${BACKEND_URL}/api/habits`, {
        method: 'POST',
        body: JSON.stringify({
          name: habitName,
          color: selectedColor,
          frequency: 'daily',
        }),
      });

      if (response.ok) {
        setHabitName('');
        setSelectedColor(COLORS[0]);
        setModalVisible(false);
        loadHabits();
      }
    } catch (error) {
      console.error('Failed to create habit:', error);
      Alert.alert('Error', 'No se pudo crear el hábito');
    }
  };

  const toggleHabit = async (habitId: string, currentStatus: boolean) => {
    try {
      await authenticatedFetch(`${BACKEND_URL}/api/habits/${habitId}/log`, {
        method: 'POST',
        body: JSON.stringify({ completed: !currentStatus }),
      });

      loadHabits();
    } catch (error) {
      console.error('Failed to toggle habit:', error);
    }
  };

  const deleteHabit = async (habitId: string, habitName: string) => {
    Alert.alert(
      'Eliminar hábito',
      `¿Estás seguro de eliminar "${habitName}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await authenticatedFetch(`${BACKEND_URL}/api/habits/${habitId}`, {
                method: 'DELETE',
              });

              loadHabits();
            } catch (error) {
              console.error('Failed to delete habit:', error);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#10B981', '#3B82F6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Mis Hábitos</Text>
            <Text style={styles.headerSubtitle}>Construye tu rutina diaria</Text>
          </View>
          <TouchableOpacity 
            style={styles.insightsBtn}
            onPress={() => setShowInsights(true)}
          >
            <Ionicons name="stats-chart" size={20} color="#10B981" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Insights Button Card */}
      <TouchableOpacity 
        style={styles.insightsCard}
        onPress={() => setShowInsights(true)}
      >
        <Ionicons name="sparkles" size={20} color="#10B981" />
        <View style={styles.insightsCardContent}>
          <Text style={styles.insightsCardTitle}>📊 Análisis de Hábitos</Text>
          <Text style={styles.insightsCardSubtitle}>Patrones y estadísticas con IA</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#10B981" />
      </TouchableOpacity>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadHabits} />}
      >
        {habits.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No tienes hábitos aún</Text>
            <Text style={styles.emptyText}>
              Comienza agregando tu primer hábito positivo
            </Text>
          </View>
        ) : (
          habits.map((habit) => (
            <TouchableOpacity
              key={habit.habit_id}
              style={styles.habitCard}
              onPress={() => toggleHabit(habit.habit_id, habit.completed_today)}
              onLongPress={() => deleteHabit(habit.habit_id, habit.name)}
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
                    name="checkmark"
                    size={24}
                    color={habit.completed_today ? '#FFFFFF' : '#D1D5DB'}
                  />
                </View>
                <View style={styles.habitInfo}>
                  <Text style={styles.habitName}>{habit.name}</Text>
                  <View style={styles.habitMeta}>
                    <Text style={styles.habitStreak}>
                      {habit.streak} días 🔥
                    </Text>
                    <Text style={styles.habitFrequency}>
                      • {habit.frequency === 'daily' ? 'Diario' : habit.frequency}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={styles.habitRight}>
                {habit.completed_today && (
                  <View style={[styles.completedBadge, { backgroundColor: habit.color }]}>
                    <Text style={styles.completedText}>✓</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Floating Add Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Add Habit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nuevo Hábito</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Sugerencias de hábitos */}
            <Text style={styles.suggestionsLabel}>Sugeridos para ti</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestionsContainer}>
              {getSuggestedHabits().map((habit, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.suggestionChip, { borderColor: habit.color }]}
                  onPress={() => selectSuggestedHabit(habit)}
                >
                  <Ionicons name={habit.icon as any} size={16} color={habit.color} />
                  <Text style={[styles.suggestionText, { color: habit.color }]}>{habit.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.orText}>o escribe el tuyo</Text>

            <TextInput
              style={styles.input}
              placeholder="Nombre del hábito (ej. Meditación 5 min)"
              placeholderTextColor="#9CA3AF"
              value={habitName}
              onChangeText={setHabitName}
            />

            <Text style={styles.colorLabel}>Color</Text>
            <View style={styles.colorPicker}>
              {COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    selectedColor === color && styles.colorSelected,
                  ]}
                  onPress={() => setSelectedColor(color)}
                >
                  {selectedColor === color && (
                    <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.createButton} onPress={createHabit}>
              <Text style={styles.createButtonText}>Crear Hábito</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal de Insights */}
      <Modal
        visible={showInsights}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowInsights(false)}
      >
        <View style={styles.insightsModal}>
          <View style={styles.insightsModalHeader}>
            <Text style={styles.insightsModalTitle}>📊 Análisis de Hábitos</Text>
            <TouchableOpacity onPress={() => setShowInsights(false)}>
              <Ionicons name="close" size={28} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <HabitsInsights onClose={() => setShowInsights(false)} />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  insightsBtn: {
    backgroundColor: '#1A1A1A',
    padding: 8,
    borderRadius: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#F0FDFA',
    marginTop: 2,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#A1A1AA',
    marginTop: 8,
    textAlign: 'center',
  },
  habitCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    padding: 16,
    borderRadius: 16,
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
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  habitInfo: {
    flex: 1,
  },
  habitName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  habitMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  habitStreak: {
    fontSize: 14,
    color: '#F59E0B',
    fontWeight: '600',
  },
  habitFrequency: {
    fontSize: 14,
    color: '#A1A1AA',
    marginLeft: 4,
  },
  habitRight: {
    marginLeft: 12,
  },
  completedBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completedText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'android' ? 40 : 24,
    minHeight: 300,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  input: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    marginBottom: 24,
  },
  colorLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  colorPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  colorOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorSelected: {
    borderWidth: 3,
    borderColor: '#1F2937',
  },
  createButton: {
    backgroundColor: '#10B981',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Insights Card Styles
  insightsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 12,
  },
  insightsCardContent: {
    flex: 1,
  },
  insightsCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
  },
  insightsCardSubtitle: {
    fontSize: 12,
    color: '#10B981',
    marginTop: 2,
  },
  // Modal Styles
  insightsModal: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  insightsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#1A1A1A',
    borderBottomWidth: 1,
    borderBottomColor: '#2D2D2D',
  },
  insightsModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  // Sugerencias de hábitos
  suggestionsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#A1A1AA',
    marginBottom: 10,
  },
  suggestionsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    gap: 6,
  },
  suggestionText: {
    fontSize: 13,
    fontWeight: '500',
  },
  orText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 12,
  },
});