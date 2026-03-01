import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authenticatedFetch, getBackendURL } from '../../utils/api';
import BottomNavigation from '../../components/BottomNavigation';

const BACKEND_URL = getBackendURL();

const AREAS_LIST = [
  { key: 'health', label: 'Salud Física', icon: 'fitness', color: '#10B981' },
  { key: 'relationships', label: 'Relaciones', icon: 'people', color: '#3B82F6' },
  { key: 'work', label: 'Trabajo/Carrera', icon: 'briefcase', color: '#8B5CF6' },
  { key: 'personal', label: 'Desarrollo Personal', icon: 'school', color: '#EC4899' },
  { key: 'spiritual', label: 'Espiritualidad', icon: 'sparkles', color: '#F59E0B' },
  { key: 'finances', label: 'Finanzas', icon: 'cash', color: '#EF4444' },
];

const AREAS: { [key: string]: { label: string; icon: string; color: string } } = {
  health: { label: 'Salud Física', icon: 'fitness', color: '#10B981' },
  relationships: { label: 'Relaciones', icon: 'people', color: '#3B82F6' },
  work: { label: 'Trabajo/Carrera', icon: 'briefcase', color: '#8B5CF6' },
  personal: { label: 'Desarrollo Personal', icon: 'school', color: '#EC4899' },
  spiritual: { label: 'Espiritualidad', icon: 'sparkles', color: '#F59E0B' },
  finances: { label: 'Finanzas', icon: 'cash', color: '#EF4444' },
};

export default function AllGoals() {
  const router = useRouter();
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showMonthlyModal, setShowMonthlyModal] = useState(false);
  const [monthlyAnalysis, setMonthlyAnalysis] = useState<any>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [newGoal, setNewGoal] = useState<{ title: string; description: string; target_days?: number }>({ title: '', description: '', target_days: 5 });

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    try {
      const response = await authenticatedFetch(`${BACKEND_URL}/api/purpose/goals`);
      if (response.ok) {
        const data = await response.json();
        setGoals(data);
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

  const loadMonthlyAnalysis = async () => {
    setLoadingAnalysis(true);
    try {
      const response = await authenticatedFetch(`${BACKEND_URL}/api/purpose/goals/monthly-analysis`);
      if (response.ok) {
        const data = await response.json();
        setMonthlyAnalysis(data);
        setShowMonthlyModal(true);
      }
    } catch (error) {
      console.error('Failed to load monthly analysis:', error);
      Alert.alert('Error', 'No se pudo cargar el análisis mensual');
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const handleCreateGoal = async () => {
    if (!selectedArea) {
      Alert.alert('Error', 'Por favor selecciona un área de vida');
      return;
    }
    if (!newGoal.title.trim()) {
      Alert.alert('Error', 'Por favor ingresa un título para tu objetivo');
      return;
    }

    try {
      const response = await authenticatedFetch(`${BACKEND_URL}/api/purpose/goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          area: selectedArea,
          title: newGoal.title,
          description: newGoal.description,
          target_days: newGoal.target_days || 5,
        }),
      });

      if (response.ok) {
        setNewGoal({ title: '', description: '', target_days: 5 });
        setSelectedArea(null);
        setShowAddModal(false);
        loadGoals();
        Alert.alert('¡Éxito!', 'Tu objetivo SMART ha sido creado');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo crear el objetivo');
    }
  };

  const filteredGoals = goals.filter((g) => {
    if (filter === 'active') return g.status === 'active';
    if (filter === 'completed') return g.status === 'completed';
    return true;
  });

  const goalsByArea = filteredGoals.reduce((acc: any, goal) => {
    const area = goal.area;
    if (!acc[area]) acc[area] = [];
    acc[area].push(goal);
    return acc;
  }, {});

  const totalGoals = goals.length;
  const completedCount = goals.filter((g) => g.status === 'completed').length;
  const progressPercent = totalGoals > 0 ? Math.round((completedCount / totalGoals) * 100) : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={['#F59E0B', '#EF4444']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.monthlyButton} 
              onPress={loadMonthlyAnalysis}
              disabled={loadingAnalysis}
              data-testid="monthly-analysis-btn"
            >
              {loadingAnalysis ? (
                <ActivityIndicator size="small" color="#F59E0B" />
              ) : (
                <Ionicons name="calendar" size={18} color="#F59E0B" />
              )}
              <Text style={styles.monthlyButtonText}>Mensual</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.infoButton} onPress={() => setShowInfoModal(true)}>
              <Ionicons name="information-circle-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerTitle}>Mis Objetivos SMART</Text>
          <View style={styles.smartBadge}>
            <Ionicons name="bulb" size={14} color="#F59E0B" />
            <Text style={styles.smartBadgeText}>SMART</Text>
          </View>
        </View>
        <Text style={styles.headerSubtitle}>
          {completedCount} de {totalGoals} completados ({progressPercent}%)
        </Text>
      </LinearGradient>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {(['all', 'active', 'completed'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'all' ? 'Todos' : f === 'active' ? 'Activos' : 'Completados'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Add Goal Button */}
        <TouchableOpacity
          style={styles.addGoalCard}
          onPress={() => setShowAddModal(true)}
        >
          <View style={styles.addGoalIcon}>
            <Ionicons name="add" size={28} color="#F59E0B" />
          </View>
          <View style={styles.addGoalContent}>
            <Text style={styles.addGoalTitle}>Crear nuevo objetivo</Text>
            <Text style={styles.addGoalSubtitle}>Añade un objetivo SMART a cualquier área</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        {Object.keys(goalsByArea).length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="flag-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>Sin objetivos</Text>
            <Text style={styles.emptyText}>
              Usa el botón de arriba para crear tu primer objetivo SMART
            </Text>
          </View>
        ) : (
          Object.entries(goalsByArea).map(([areaKey, areaGoals]: [string, any]) => {
            const areaInfo = AREAS[areaKey] || { label: areaKey, icon: 'ellipse', color: '#A1A1AA' };
            return (
              <View key={areaKey} style={styles.areaSection}>
                <TouchableOpacity
                  style={styles.areaHeader}
                  onPress={() => router.push(`/purpose/${areaKey}`)}
                >
                  <View style={[styles.areaIcon, { backgroundColor: areaInfo.color + '20' }]}>
                    <Ionicons name={areaInfo.icon as any} size={20} color={areaInfo.color} />
                  </View>
                  <Text style={styles.areaTitle}>{areaInfo.label}</Text>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>

                {(areaGoals as any[]).map((goal: any) => (
                  <View key={goal.goal_id} style={styles.goalCard}>
                    {/* Title row */}
                    <View style={styles.goalHeader}>
                      <View style={styles.goalStatus}>
                        <Ionicons
                          name={goal.progress >= 100 ? 'checkmark-circle' : 'flag'}
                          size={20}
                          color={goal.progress >= 100 ? '#10B981' : areaInfo.color}
                        />
                      </View>
                      <View style={styles.goalContent}>
                        <Text
                          style={[
                            styles.goalTitle,
                            goal.progress >= 100 && styles.goalTitleCompleted,
                          ]}
                        >
                          {goal.title}
                        </Text>
                        {goal.description && (
                          <Text style={styles.goalDescription} numberOfLines={1}>
                            {goal.description}
                          </Text>
                        )}
                      </View>
                    </View>
                    
                    {/* Weekly Day Circles - Below title */}
                    <Text style={styles.weekLabel}>Esta semana ({goal.target_days || 5} días meta):</Text>
                    <View style={styles.weekDaysRow}>
                      {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((day, index) => {
                        const dayLabels = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
                        const isCompleted = goal.weekly_progress?.[day] || false;
                        return (
                          <TouchableOpacity
                            key={day}
                            style={[
                              styles.dayCircle,
                              isCompleted && { backgroundColor: areaInfo.color, borderColor: areaInfo.color }
                            ]}
                            onPress={async () => {
                              try {
                                const response = await authenticatedFetch(
                                  `${BACKEND_URL}/api/purpose/goals/${goal.goal_id}/toggle-day`,
                                  {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ day })
                                  }
                                );
                                if (response.ok) {
                                  loadGoals();
                                }
                              } catch (error) {
                                console.error('Error toggling day:', error);
                              }
                            }}
                          >
                            <Text style={[
                              styles.dayLabel,
                              isCompleted && styles.dayLabelCompleted
                            ]}>
                              {dayLabels[index]}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    
                    {/* Progress Bar */}
                    <View style={styles.goalMeta}>
                      <View style={styles.progressBar}>
                        <View
                          style={[
                            styles.progressFill,
                            { width: `${goal.progress || 0}%`, backgroundColor: areaInfo.color },
                          ]}
                        />
                      </View>
                      <Text style={styles.progressText}>
                        {Object.values(goal.weekly_progress || {}).filter(Boolean).length}/{goal.target_days || 5} días
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            );
          })
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* SMART Info Modal */}
      <Modal visible={showInfoModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>¿Qué es un objetivo SMART?</Text>
              <TouchableOpacity onPress={() => setShowInfoModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalIntro}>
                SMART es una metodología para crear objetivos efectivos que te ayudan a alcanzar lo que deseas.
              </Text>

              <View style={styles.smartItem}>
                <View style={[styles.smartLetter, { backgroundColor: '#10B981' }]}>
                  <Text style={styles.smartLetterText}>S</Text>
                </View>
                <View style={styles.smartItemContent}>
                  <Text style={styles.smartItemTitle}>Específico (Specific)</Text>
                  <Text style={styles.smartItemDesc}>Define claramente QUÉ quieres lograr</Text>
                  <Text style={styles.smartItemExample}>❌ "Quiero estar mejor"</Text>
                  <Text style={styles.smartItemExample}>✅ "Quiero hacer ejercicio 3 veces por semana"</Text>
                </View>
              </View>

              <View style={styles.smartItem}>
                <View style={[styles.smartLetter, { backgroundColor: '#3B82F6' }]}>
                  <Text style={styles.smartLetterText}>M</Text>
                </View>
                <View style={styles.smartItemContent}>
                  <Text style={styles.smartItemTitle}>Medible (Measurable)</Text>
                  <Text style={styles.smartItemDesc}>¿Cómo sabrás que lo lograste?</Text>
                  <Text style={styles.smartItemExample}>❌ "Ahorrar dinero"</Text>
                  <Text style={styles.smartItemExample}>✅ "Ahorrar $50.000 al mes"</Text>
                </View>
              </View>

              <View style={styles.smartItem}>
                <View style={[styles.smartLetter, { backgroundColor: '#8B5CF6' }]}>
                  <Text style={styles.smartLetterText}>A</Text>
                </View>
                <View style={styles.smartItemContent}>
                  <Text style={styles.smartItemTitle}>Alcanzable (Achievable)</Text>
                  <Text style={styles.smartItemDesc}>Debe ser realista dado tu contexto actual</Text>
                  <Text style={styles.smartItemExample}>❌ "Correr un maratón mañana"</Text>
                  <Text style={styles.smartItemExample}>✅ "Caminar 30 minutos diarios este mes"</Text>
                </View>
              </View>

              <View style={styles.smartItem}>
                <View style={[styles.smartLetter, { backgroundColor: '#EC4899' }]}>
                  <Text style={styles.smartLetterText}>R</Text>
                </View>
                <View style={styles.smartItemContent}>
                  <Text style={styles.smartItemTitle}>Relevante (Relevant)</Text>
                  <Text style={styles.smartItemDesc}>¿Contribuye a tu propósito y recuperación?</Text>
                  <Text style={styles.smartItemExample}>Pregúntate: ¿Por qué es importante para mí?</Text>
                </View>
              </View>

              <View style={styles.smartItem}>
                <View style={[styles.smartLetter, { backgroundColor: '#F59E0B' }]}>
                  <Text style={styles.smartLetterText}>T</Text>
                </View>
                <View style={styles.smartItemContent}>
                  <Text style={styles.smartItemTitle}>Temporal (Time-bound)</Text>
                  <Text style={styles.smartItemDesc}>Define CUÁNDO lo lograrás</Text>
                  <Text style={styles.smartItemExample}>❌ "Algún día aprenderé inglés"</Text>
                  <Text style={styles.smartItemExample}>✅ "Tomaré 2 clases de inglés por semana durante 3 meses"</Text>
                </View>
              </View>

              <View style={styles.tipBox}>
                <Ionicons name="bulb" size={24} color="#F59E0B" />
                <Text style={styles.tipText}>
                  En tu recuperación, los objetivos SMART te ayudan a construir una vida con propósito, paso a paso.
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowInfoModal(false)}
            >
              <Text style={styles.modalButtonText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add Goal Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nuevo objetivo SMART</Text>
              <TouchableOpacity onPress={() => {
                setShowAddModal(false);
                setSelectedArea(null);
                setNewGoal({ title: '', description: '' });
              }}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>1. Selecciona el área de vida</Text>
              <View style={styles.areasGrid}>
                {AREAS_LIST.map((area) => (
                  <TouchableOpacity
                    key={area.key}
                    style={[
                      styles.areaOption,
                      selectedArea === area.key && { borderColor: area.color, backgroundColor: area.color + '10' },
                    ]}
                    onPress={() => setSelectedArea(area.key)}
                  >
                    <View style={[styles.areaOptionIcon, { backgroundColor: area.color + '20' }]}>
                      <Ionicons name={area.icon as any} size={20} color={area.color} />
                    </View>
                    <Text style={styles.areaOptionLabel}>{area.label}</Text>
                    {selectedArea === area.key && (
                      <Ionicons name="checkmark-circle" size={20} color={area.color} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.inputLabelRow}>
                <Text style={styles.inputLabel}>2. Define tu objetivo</Text>
                <TouchableOpacity 
                  style={styles.guideButton}
                  onPress={() => setShowGuideModal(true)}
                >
                  <Ionicons name="help-circle" size={22} color="#F59E0B" />
                  <Text style={styles.guideButtonText}>Guía</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={[styles.input, { color: '#FFFFFF' }]}
                placeholder="Ej: Meditar 10 minutos cada mañana durante 30 días"
              placeholderTextColor="#9CA3AF"
                value={newGoal.title}
                onChangeText={(text) => setNewGoal({ ...newGoal, title: text })}
              />

              <Text style={styles.inputLabel}>3. Descripción (opcional)</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline, { color: '#FFFFFF' }]}
                placeholder="Añade detalles sobre cómo lo lograrás..."
              placeholderTextColor="#9CA3AF"
                value={newGoal.description}
                onChangeText={(text) => setNewGoal({ ...newGoal, description: text })}
                multiline
                numberOfLines={3}
              />

              <Text style={styles.inputLabel}>3. ¿Cuántos días por semana?</Text>
              <View style={styles.daysSelector}>
                {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                  <TouchableOpacity
                    key={num}
                    style={[
                      styles.dayOption,
                      (newGoal.target_days || 5) === num && styles.dayOptionSelected
                    ]}
                    onPress={() => setNewGoal({ ...newGoal, target_days: num })}
                  >
                    <Text style={[
                      styles.dayOptionText,
                      (newGoal.target_days || 5) === num && styles.dayOptionTextSelected
                    ]}>{num}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.daysHint}>días por semana</Text>

              <View style={styles.smartReminder}>
                <Ionicons name="information-circle" size={20} color="#3B82F6" />
                <Text style={styles.smartReminderText}>
                  Recuerda: Un buen objetivo es Específico, Medible, Alcanzable, Relevante y con Tiempo definido.
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalButton, (!selectedArea || !newGoal.title.trim()) && styles.modalButtonDisabled]}
              onPress={handleCreateGoal}
              disabled={!selectedArea || !newGoal.title.trim()}
            >
              <Text style={styles.modalButtonText}>Crear objetivo</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Guide Modal - How to write SMART goals */}
      <Modal visible={showGuideModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📝 Guía para escribir objetivos</Text>
              <TouchableOpacity onPress={() => setShowGuideModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.guideIntro}>
                Un buen objetivo SMART debe ser claro y medible. Aquí tienes la fórmula y ejemplos para cada área:
              </Text>

              <View style={styles.formulaBox}>
                <Text style={styles.formulaTitle}>📐 Fórmula básica:</Text>
                <Text style={styles.formulaText}>
                  [ACCIÓN] + [CANTIDAD/FRECUENCIA] + [PERÍODO DE TIEMPO]
                </Text>
              </View>

              {/* Examples by Area */}
              <Text style={styles.examplesTitle}>Ejemplos por área:</Text>

              <View style={styles.exampleCard}>
                <View style={[styles.exampleIcon, { backgroundColor: '#10B98120' }]}>
                  <Ionicons name="fitness" size={20} color="#10B981" />
                </View>
                <View style={styles.exampleContent}>
                  <Text style={styles.exampleArea}>Salud Física</Text>
                  <Text style={styles.exampleBad}>❌ "Hacer ejercicio"</Text>
                  <Text style={styles.exampleGood}>✅ "Caminar 30 minutos al día, 5 días a la semana, por 4 semanas"</Text>
                  <Text style={styles.exampleGood}>✅ "Dormir 7 horas mínimo cada noche durante este mes"</Text>
                </View>
              </View>

              <View style={styles.exampleCard}>
                <View style={[styles.exampleIcon, { backgroundColor: '#3B82F620' }]}>
                  <Ionicons name="people" size={20} color="#3B82F6" />
                </View>
                <View style={styles.exampleContent}>
                  <Text style={styles.exampleArea}>Relaciones</Text>
                  <Text style={styles.exampleBad}>❌ "Mejorar relación con mi familia"</Text>
                  <Text style={styles.exampleGood}>✅ "Llamar a mis padres 2 veces por semana durante 2 meses"</Text>
                  <Text style={styles.exampleGood}>✅ "Asistir a 4 reuniones de grupo de apoyo este mes"</Text>
                </View>
              </View>

              <View style={styles.exampleCard}>
                <View style={[styles.exampleIcon, { backgroundColor: '#8B5CF620' }]}>
                  <Ionicons name="briefcase" size={20} color="#8B5CF6" />
                </View>
                <View style={styles.exampleContent}>
                  <Text style={styles.exampleArea}>Trabajo/Carrera</Text>
                  <Text style={styles.exampleBad}>❌ "Conseguir un mejor trabajo"</Text>
                  <Text style={styles.exampleGood}>✅ "Enviar 3 currículums por semana durante 1 mes"</Text>
                  <Text style={styles.exampleGood}>✅ "Completar 1 curso online de mi área en 8 semanas"</Text>
                </View>
              </View>

              <View style={styles.exampleCard}>
                <View style={[styles.exampleIcon, { backgroundColor: '#EC489920' }]}>
                  <Ionicons name="school" size={20} color="#EC4899" />
                </View>
                <View style={styles.exampleContent}>
                  <Text style={styles.exampleArea}>Desarrollo Personal</Text>
                  <Text style={styles.exampleBad}>❌ "Leer más"</Text>
                  <Text style={styles.exampleGood}>✅ "Leer 20 páginas diarias durante 30 días"</Text>
                  <Text style={styles.exampleGood}>✅ "Escribir en mi diario 10 minutos cada noche por 2 semanas"</Text>
                </View>
              </View>

              <View style={styles.exampleCard}>
                <View style={[styles.exampleIcon, { backgroundColor: '#F59E0B20' }]}>
                  <Ionicons name="sparkles" size={20} color="#F59E0B" />
                </View>
                <View style={styles.exampleContent}>
                  <Text style={styles.exampleArea}>Espiritualidad</Text>
                  <Text style={styles.exampleBad}>❌ "Ser más espiritual"</Text>
                  <Text style={styles.exampleGood}>✅ "Meditar 10 minutos cada mañana durante 21 días"</Text>
                  <Text style={styles.exampleGood}>✅ "Practicar gratitud escribiendo 3 cosas cada noche por 1 mes"</Text>
                </View>
              </View>

              <View style={styles.exampleCard}>
                <View style={[styles.exampleIcon, { backgroundColor: '#EF444420' }]}>
                  <Ionicons name="cash" size={20} color="#EF4444" />
                </View>
                <View style={styles.exampleContent}>
                  <Text style={styles.exampleArea}>Finanzas</Text>
                  <Text style={styles.exampleBad}>❌ "Ahorrar dinero"</Text>
                  <Text style={styles.exampleGood}>✅ "Ahorrar $30.000 semanales durante 3 meses"</Text>
                  <Text style={styles.exampleGood}>✅ "No gastar en compras impulsivas por 30 días"</Text>
                </View>
              </View>

              <View style={styles.tipBoxGuide}>
                <Ionicons name="bulb" size={24} color="#F59E0B" />
                <View style={styles.tipBoxContent}>
                  <Text style={styles.tipBoxTitle}>💡 Consejo clave:</Text>
                  <Text style={styles.tipBoxText}>
                    Si puedes responder "¿Cuánto?" y "¿Cuándo?", tu objetivo está bien definido.
                  </Text>
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowGuideModal(false)}
            >
              <Text style={styles.modalButtonText}>¡Entendido!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Monthly Analysis Modal */}
      <Modal visible={showMonthlyModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                📊 Análisis de {monthlyAnalysis?.month_name || 'Mes'}
              </Text>
              <TouchableOpacity onPress={() => setShowMonthlyModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {monthlyAnalysis ? (
                <>
                  {/* Summary Card */}
                  <View style={[
                    styles.summaryCard,
                    monthlyAnalysis.summary.performance_level === 'excelente' && styles.summaryExcelente,
                    monthlyAnalysis.summary.performance_level === 'bueno' && styles.summaryBueno,
                    monthlyAnalysis.summary.performance_level === 'regular' && styles.summaryRegular,
                    monthlyAnalysis.summary.performance_level === 'necesita_atencion' && styles.summaryAtencion,
                  ]}>
                    <View style={styles.summaryHeader}>
                      <Ionicons 
                        name={
                          monthlyAnalysis.summary.performance_level === 'excelente' ? 'trophy' :
                          monthlyAnalysis.summary.performance_level === 'bueno' ? 'thumbs-up' :
                          monthlyAnalysis.summary.performance_level === 'regular' ? 'time' : 'alert-circle'
                        } 
                        size={32} 
                        color={
                          monthlyAnalysis.summary.performance_level === 'excelente' ? '#F59E0B' :
                          monthlyAnalysis.summary.performance_level === 'bueno' ? '#10B981' :
                          monthlyAnalysis.summary.performance_level === 'regular' ? '#3B82F6' : '#EF4444'
                        }
                      />
                      <Text style={styles.summaryPercentage}>
                        {monthlyAnalysis.summary.week_achievement_rate}%
                      </Text>
                    </View>
                    <Text style={styles.summaryMessage}>
                      {monthlyAnalysis.summary.performance_message}
                    </Text>
                    <View style={styles.summaryStats}>
                      <View style={styles.summaryStat}>
                        <Text style={styles.summaryStatValue}>{monthlyAnalysis.summary.weeks_achieved}</Text>
                        <Text style={styles.summaryStatLabel}>semanas logradas</Text>
                      </View>
                      <View style={styles.summaryStatDivider} />
                      <View style={styles.summaryStat}>
                        <Text style={styles.summaryStatValue}>{monthlyAnalysis.summary.total_days_completed}</Text>
                        <Text style={styles.summaryStatLabel}>días completados</Text>
                      </View>
                      <View style={styles.summaryStatDivider} />
                      <View style={styles.summaryStat}>
                        <Text style={styles.summaryStatValue}>{monthlyAnalysis.summary.total_goals}</Text>
                        <Text style={styles.summaryStatLabel}>objetivos</Text>
                      </View>
                    </View>
                  </View>

                  {/* Goals Breakdown */}
                  <Text style={styles.monthlyGoalsTitle}>Detalle por objetivo:</Text>
                  
                  {monthlyAnalysis.goals.map((goal: any) => {
                    const areaInfo = AREAS[goal.area] || { label: goal.area, icon: 'ellipse', color: '#A1A1AA' };
                    const isAchieved = goal.achievement_rate >= 80;
                    const isPartial = goal.achievement_rate >= 50 && goal.achievement_rate < 80;
                    
                    return (
                      <View key={goal.goal_id} style={styles.monthlyGoalCard}>
                        <View style={styles.monthlyGoalHeader}>
                          <View style={[styles.monthlyGoalIcon, { backgroundColor: areaInfo.color + '20' }]}>
                            <Ionicons name={areaInfo.icon as any} size={18} color={areaInfo.color} />
                          </View>
                          <View style={styles.monthlyGoalInfo}>
                            <Text style={styles.monthlyGoalTitle} numberOfLines={1}>{goal.title}</Text>
                            <Text style={styles.monthlyGoalArea}>{areaInfo.label}</Text>
                          </View>
                          <View style={[
                            styles.monthlyGoalBadge,
                            isAchieved && styles.monthlyGoalBadgeSuccess,
                            isPartial && styles.monthlyGoalBadgePartial,
                            !isAchieved && !isPartial && styles.monthlyGoalBadgeLow,
                          ]}>
                            <Text style={[
                              styles.monthlyGoalBadgeText,
                              isAchieved && styles.monthlyGoalBadgeTextSuccess,
                              isPartial && styles.monthlyGoalBadgeTextPartial,
                            ]}>
                              {Math.round(goal.achievement_rate)}%
                            </Text>
                          </View>
                        </View>
                        
                        <View style={styles.monthlyGoalStats}>
                          <View style={styles.monthlyGoalStat}>
                            <Ionicons name="calendar-outline" size={14} color="#9CA3AF" />
                            <Text style={styles.monthlyGoalStatText}>
                              {goal.weeks_achieved}/{goal.weeks_in_month} semanas
                            </Text>
                          </View>
                          <View style={styles.monthlyGoalStat}>
                            <Ionicons name="checkmark-circle-outline" size={14} color="#9CA3AF" />
                            <Text style={styles.monthlyGoalStatText}>
                              {goal.total_days_completed}/{goal.total_days_target} días
                            </Text>
                          </View>
                        </View>

                        {/* Week details mini-view */}
                        {goal.week_details && goal.week_details.length > 0 && (
                          <View style={styles.weekDetailsRow}>
                            {goal.week_details.slice(-4).map((week: any, idx: number) => (
                              <View 
                                key={idx} 
                                style={[
                                  styles.weekMini,
                                  week.achieved && styles.weekMiniAchieved,
                                  week.is_current && styles.weekMiniCurrent,
                                ]}
                              >
                                <Text style={[
                                  styles.weekMiniText,
                                  week.achieved && styles.weekMiniTextAchieved,
                                ]}>
                                  {week.completed_days}/{week.target_days}
                                </Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    );
                  })}

                  {monthlyAnalysis.goals.length === 0 && (
                    <View style={styles.emptyAnalysis}>
                      <Ionicons name="calendar-outline" size={48} color="#6B7280" />
                      <Text style={styles.emptyAnalysisText}>
                        No hay datos suficientes para este mes. Crea objetivos y registra tu progreso semanal.
                      </Text>
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.loadingAnalysis}>
                  <Text style={styles.loadingAnalysisText}>Cargando análisis...</Text>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowMonthlyModal(false)}
            >
              <Text style={styles.modalButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <BottomNavigation />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  header: {
    paddingTop: 10,
    paddingBottom: 14,
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  backButton: {
    padding: 4,
  },
  infoButton: {
    padding: 4,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  smartBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 3,
  },
  smartBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#F59E0B',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#FEF3C7',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: '#F59E0B',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#A1A1AA',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  addGoalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#F59E0B',
    borderStyle: 'dashed',
    gap: 12,
  },
  addGoalIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addGoalContent: {
    flex: 1,
  },
  addGoalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  addGoalSubtitle: {
    fontSize: 13,
    color: '#A1A1AA',
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    padding: 48,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#A1A1AA',
    textAlign: 'center',
    marginBottom: 24,
  },
  areaSection: {
    marginBottom: 16,
  },
  areaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  areaIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  areaTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  goalCard: {
    flexDirection: 'column',
    backgroundColor: '#1A1A1A',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  goalStatus: {
    marginRight: 12,
    paddingTop: 2,
  },
  goalContent: {
    flex: 1,
  },
  goalTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  goalTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  goalDescription: {
    fontSize: 13,
    color: '#A1A1AA',
    marginBottom: 8,
  },
  goalMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#0D0D0D',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#A1A1AA',
    fontWeight: '600',
    width: 35,
    textAlign: 'right',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  modalIntro: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 22,
    marginBottom: 20,
  },
  smartItem: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 12,
  },
  smartLetter: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  smartLetterText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  smartItemContent: {
    flex: 1,
  },
  smartItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  smartItemDesc: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 6,
  },
  smartItemExample: {
    fontSize: 13,
    color: '#A1A1AA',
    fontStyle: 'italic',
  },
  tipBox: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
  modalButton: {
    backgroundColor: '#F59E0B',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  modalButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  // Add goal modal styles
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E5E5E5',
    marginBottom: 10,
    marginTop: 8,
  },
  areasGrid: {
    gap: 8,
    marginBottom: 16,
  },
  areaOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2D2D2D',
    gap: 12,
  },
  areaOptionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  areaOptionLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  input: {
    backgroundColor: '#0D0D0D',
    borderWidth: 1,
    borderColor: '#2D2D2D',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 12,
  },
  inputMultiline: {
    height: 80,
    textAlignVertical: 'top',
  },
  smartReminder: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    padding: 12,
    borderRadius: 12,
    gap: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#2D2D2D',
  },
  smartReminderText: {
    flex: 1,
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
  },
  // Guide button and modal styles
  inputLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 8,
  },
  guideButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  guideButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F59E0B',
  },
  guideIntro: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 22,
    marginBottom: 16,
  },
  formulaBox: {
    backgroundColor: '#F0FDF4',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
    marginBottom: 20,
  },
  formulaTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#166534',
    marginBottom: 8,
  },
  formulaText: {
    fontSize: 15,
    color: '#166534',
    fontWeight: '500',
    fontStyle: 'italic',
  },
  examplesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  exampleCard: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2D2D2D',
    gap: 10,
  },
  exampleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exampleContent: {
    flex: 1,
  },
  exampleArea: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  exampleBad: {
    fontSize: 13,
    color: '#EF4444',
    marginBottom: 4,
  },
  exampleGood: {
    fontSize: 13,
    color: '#10B981',
    marginBottom: 2,
    lineHeight: 18,
  },
  tipBoxGuide: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginTop: 12,
    marginBottom: 8,
  },
  tipBoxContent: {
    flex: 1,
  },
  tipBoxTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#92400E',
    marginBottom: 4,
  },
  tipBoxText: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
  // Weekly day circles styles
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  goalTarget: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  weekSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2D2D2D',
  },
  weekLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 8,
    marginTop: 12,
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  weekDaysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#374151',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  dayLabelCompleted: {
    color: '#FFFFFF',
  },
  // Days selector styles
  daysSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 8,
  },
  dayOption: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayOptionSelected: {
    borderColor: '#10B981',
    backgroundColor: '#10B98115',
  },
  dayOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  dayOptionTextSelected: {
    color: '#10B981',
  },
  daysHint: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 12,
  },
  // Header actions styles
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  monthlyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  monthlyButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F59E0B',
  },
  // Monthly Analysis Modal styles
  summaryCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#2D2D2D',
  },
  summaryExcelente: {
    borderColor: '#F59E0B',
    backgroundColor: '#F59E0B10',
  },
  summaryBueno: {
    borderColor: '#10B981',
    backgroundColor: '#10B98110',
  },
  summaryRegular: {
    borderColor: '#3B82F6',
    backgroundColor: '#3B82F610',
  },
  summaryAtencion: {
    borderColor: '#EF4444',
    backgroundColor: '#EF444410',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 12,
  },
  summaryPercentage: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  summaryMessage: {
    fontSize: 15,
    color: '#E5E5E5',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#2D2D2D',
  },
  summaryStat: {
    alignItems: 'center',
    flex: 1,
  },
  summaryStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  summaryStatLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  summaryStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#2D2D2D',
  },
  monthlyGoalsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  monthlyGoalCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2D2D2D',
  },
  monthlyGoalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  monthlyGoalIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthlyGoalInfo: {
    flex: 1,
  },
  monthlyGoalTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  monthlyGoalArea: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  monthlyGoalBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#2D2D2D',
  },
  monthlyGoalBadgeSuccess: {
    backgroundColor: '#10B98120',
  },
  monthlyGoalBadgePartial: {
    backgroundColor: '#F59E0B20',
  },
  monthlyGoalBadgeLow: {
    backgroundColor: '#EF444420',
  },
  monthlyGoalBadgeText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#EF4444',
  },
  monthlyGoalBadgeTextSuccess: {
    color: '#10B981',
  },
  monthlyGoalBadgeTextPartial: {
    color: '#F59E0B',
  },
  monthlyGoalStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 10,
  },
  monthlyGoalStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  monthlyGoalStatText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  weekDetailsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  weekMini: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#2D2D2D',
    alignItems: 'center',
  },
  weekMiniAchieved: {
    backgroundColor: '#10B98130',
  },
  weekMiniCurrent: {
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  weekMiniText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  weekMiniTextAchieved: {
    color: '#10B981',
  },
  emptyAnalysis: {
    alignItems: 'center',
    padding: 32,
  },
  emptyAnalysisText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 12,
  },
  loadingAnalysis: {
    padding: 32,
    alignItems: 'center',
  },
  loadingAnalysisText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
});
