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

  useEffect(() => {
    loadHabits();
  }, []);

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
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nuevo Hábito</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Nombre del hábito (ej. Meditación 5 min)"
              value={habitName}
              onChangeText={setHabitName}
              autoFocus
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
        </View>
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
    backgroundColor: '#F9FAFB',
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
    backgroundColor: '#FFFFFF',
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
    color: '#1F2937',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  habitCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
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
    color: '#1F2937',
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
    color: '#6B7280',
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
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    minHeight: 400,
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
    color: '#1F2937',
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
    color: '#1F2937',
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
    backgroundColor: '#F9FAFB',
  },
  insightsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  insightsModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
});