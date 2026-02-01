import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authenticatedFetch, getBackendURL } from '../../utils/api';

const BACKEND_URL = getBackendURL();

const AREAS: { [key: string]: { label: string; icon: string; color: string; description: string } } = {
  health: { label: 'Salud Física', icon: 'fitness', color: '#10B981', description: 'Tu bienestar físico es la base de una vida plena. Incluye ejercicio, alimentación y descanso.' },
  relationships: { label: 'Relaciones', icon: 'people', color: '#3B82F6', description: 'Conexiones significativas con familia, amigos y comunidad que nutren tu recuperación.' },
  work: { label: 'Trabajo/Carrera', icon: 'briefcase', color: '#8B5CF6', description: 'Tu desarrollo profesional y contribución al mundo a través de tu trabajo.' },
  personal: { label: 'Desarrollo Personal', icon: 'school', color: '#EC4899', description: 'Crecimiento continuo, aprendizaje y desarrollo de nuevas habilidades.' },
  spiritual: { label: 'Espiritualidad', icon: 'sparkles', color: '#F59E0B', description: 'Tu conexión con algo más grande que tú, sea religión, naturaleza o propósito.' },
  finances: { label: 'Finanzas', icon: 'cash', color: '#EF4444', description: 'Estabilidad económica y una relación sana con el dinero.' },
};

export default function AreaDetail() {
  const router = useRouter();
  const { area } = useLocalSearchParams<{ area: string }>();
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: '', description: '' });
  const [rating, setRating] = useState(5);

  const areaInfo = AREAS[area as string] || AREAS.health;

  useEffect(() => {
    loadGoals();
  }, [area]);

  const loadGoals = async () => {
    try {
      const response = await authenticatedFetch(`${BACKEND_URL}/api/purpose/goals`);
      if (response.ok) {
        const data = await response.json();
        const areaGoals = data.filter((g: any) => g.area === area);
        setGoals(areaGoals);
      }
    } catch (error) {
      console.error('Failed to load goals:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadGoals();
  };

  const handleAddGoal = async () => {
    if (!newGoal.title.trim()) {
      Alert.alert('Error', 'Por favor ingresa un título para tu objetivo');
      return;
    }

    try {
      const response = await authenticatedFetch(`${BACKEND_URL}/api/purpose/goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          area: area,
          title: newGoal.title,
          description: newGoal.description,
        }),
      });

      if (response.ok) {
        setNewGoal({ title: '', description: '' });
        setShowAddModal(false);
        loadGoals();
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo crear el objetivo');
    }
  };

  const handleToggleComplete = async (goal: any) => {
    try {
      const newStatus = goal.status === 'completed' ? 'active' : 'completed';
      const newProgress = newStatus === 'completed' ? 100 : goal.progress;

      await authenticatedFetch(`${BACKEND_URL}/api/purpose/goals/${goal.goal_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, progress: newProgress }),
      });

      loadGoals();
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar el objetivo');
    }
  };

  const handleDeleteGoal = (goal: any) => {
    Alert.alert(
      'Eliminar objetivo',
      `¿Estás seguro de que quieres eliminar "${goal.title}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await authenticatedFetch(`${BACKEND_URL}/api/purpose/goals/${goal.goal_id}`, {
                method: 'DELETE',
              });
              loadGoals();
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar el objetivo');
            }
          },
        },
      ]
    );
  };

  const activeGoals = goals.filter((g) => g.status === 'active');
  const completedGoals = goals.filter((g) => g.status === 'completed');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[areaInfo.color, areaInfo.color + 'CC']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.headerIcon}>
            <Ionicons name={areaInfo.icon as any} size={40} color="#FFFFFF" />
          </View>
          <Text style={styles.headerTitle}>{areaInfo.label}</Text>
          <Text style={styles.headerSubtitle}>{areaInfo.description}</Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Rating Section */}
        <View style={styles.ratingCard}>
          <Text style={styles.ratingTitle}>Tu nivel actual</Text>
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
              <TouchableOpacity
                key={num}
                style={[
                  styles.ratingNumber,
                  rating >= num && { backgroundColor: areaInfo.color },
                ]}
                onPress={() => setRating(num)}
              >
                <Text style={[styles.ratingText, rating >= num && styles.ratingTextActive]}>
                  {num}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.ratingHelper}>
            {rating <= 3 ? '📈 Mucho espacio para crecer' : rating <= 6 ? '💪 Vas por buen camino' : '🌟 ¡Excelente!'}
          </Text>
        </View>

        {/* Active Goals */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Objetivos activos</Text>
            <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
              <Ionicons name="add" size={20} color={areaInfo.color} />
              <Text style={[styles.addButtonText, { color: areaInfo.color }]}>Nuevo</Text>
            </TouchableOpacity>
          </View>

          {activeGoals.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="flag-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>No tienes objetivos activos</Text>
              <Text style={styles.emptySubtext}>Crea tu primer objetivo para esta área</Text>
            </View>
          ) : (
            activeGoals.map((goal) => (
              <View key={goal.goal_id} style={styles.goalCard}>
                <TouchableOpacity
                  style={styles.goalCheckbox}
                  onPress={() => handleToggleComplete(goal)}
                >
                  <Ionicons
                    name="ellipse-outline"
                    size={24}
                    color={areaInfo.color}
                  />
                </TouchableOpacity>
                <View style={styles.goalContent}>
                  <Text style={styles.goalTitle}>{goal.title}</Text>
                  {goal.description && (
                    <Text style={styles.goalDescription}>{goal.description}</Text>
                  )}
                  <View style={styles.goalProgress}>
                    <View
                      style={[
                        styles.goalProgressBar,
                        { width: `${goal.progress}%`, backgroundColor: areaInfo.color },
                      ]}
                    />
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.goalDelete}
                  onPress={() => handleDeleteGoal(goal)}
                >
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* Completed Goals */}
        {completedGoals.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Completados</Text>
            {completedGoals.map((goal) => (
              <View key={goal.goal_id} style={[styles.goalCard, styles.goalCardCompleted]}>
                <TouchableOpacity
                  style={styles.goalCheckbox}
                  onPress={() => handleToggleComplete(goal)}
                >
                  <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                </TouchableOpacity>
                <View style={styles.goalContent}>
                  <Text style={[styles.goalTitle, styles.goalTitleCompleted]}>{goal.title}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Add Goal Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nuevo objetivo</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Título *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Hacer ejercicio 3 veces por semana"
              value={newGoal.title}
              onChangeText={(text) => setNewGoal({ ...newGoal, title: text })}
            />

            <Text style={styles.inputLabel}>Descripción (opcional)</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="Describe tu objetivo con más detalle..."
              value={newGoal.description}
              onChangeText={(text) => setNewGoal({ ...newGoal, description: text })}
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: areaInfo.color }]}
              onPress={handleAddGoal}
            >
              <Text style={styles.saveButtonText}>Crear objetivo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingTop: 20,
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  backButton: {
    marginBottom: 16,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 20,
  },
  content: {
    flex: 1,
  },
  ratingCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  ratingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  ratingNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  ratingTextActive: {
    color: '#FFFFFF',
  },
  ratingHelper: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  goalCard: {
    flexDirection: 'row',
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
  goalCardCompleted: {
    opacity: 0.7,
  },
  goalCheckbox: {
    marginRight: 12,
  },
  goalContent: {
    flex: 1,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  goalTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#6B7280',
  },
  goalDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  goalProgress: {
    height: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 2,
    overflow: 'hidden',
  },
  goalProgressBar: {
    height: '100%',
    borderRadius: 2,
  },
  goalDelete: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
  },
  inputMultiline: {
    height: 100,
    textAlignVertical: 'top',
  },
  saveButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
