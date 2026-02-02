import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { authenticatedFetch } from '../utils/api';

const { width } = Dimensions.get('window');

interface PatientDetail {
  user_id: string;
  name: string;
  email: string;
  picture?: string;
  clean_since?: string;
  addiction_type?: string;
  profile: {
    triggers?: string[];
    protective_factors?: string[];
    life_areas?: { [key: string]: number };
    diagnoses?: string[];
    my_why?: string;
    secondary_addictions?: string[];
    emergency_contacts?: { name: string; phone: string; relationship: string }[];
  };
}

interface EmotionalLog {
  date: string;
  mood: number;
  energy: number;
  anxiety: number;
  notes?: string;
}

interface HabitLog {
  habit_id: string;
  name: string;
  completed_today: boolean;
  streak: number;
}

export default function PatientDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [emotionalLogs, setEmotionalLogs] = useState<EmotionalLog[]>([]);
  const [habits, setHabits] = useState<HabitLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'emotions' | 'habits' | 'journal'>('overview');

  useEffect(() => {
    fetchPatientData();
  }, [id]);

  const fetchPatientData = async () => {
    try {
      // Fetch patient details
      const response = await authenticatedFetch(`/api/professional/patient/${id}`);
      if (response.ok) {
        const data = await response.json();
        setPatient(data.patient);
        setEmotionalLogs(data.emotional_logs || []);
        setHabits(data.habits || []);
      }
    } catch (err) {
      console.error('Error fetching patient:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateDaysClean = (cleanSince?: string): number => {
    if (!cleanSince) return 0;
    const startDate = new Date(cleanSince);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - startDate.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  const getMoodEmoji = (mood: number) => {
    if (mood >= 4) return '😊';
    if (mood >= 3) return '😐';
    if (mood >= 2) return '😔';
    return '😢';
  };

  const getLifeAreaLabel = (key: string) => {
    const labels: { [key: string]: string } = {
      family: 'Familia',
      work: 'Trabajo',
      health: 'Salud',
      social: 'Social',
      spiritual: 'Espiritual',
      financial: 'Finanzas',
      personal: 'Personal',
      recreation: 'Recreación',
    };
    return labels[key] || key;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Cargando información...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!patient) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#EF4444" />
          <Text style={styles.errorText}>No se pudo cargar la información del paciente</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const daysClean = calculateDaysClean(patient.clean_since);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBackButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalle del Paciente</Text>
        <TouchableOpacity style={styles.headerActionButton}>
          <Ionicons name="ellipsis-vertical" size={24} color="#1F2937" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Patient Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.profileAvatar}>
              {patient.picture ? (
                <Image source={{ uri: patient.picture }} style={styles.avatarImage} />
              ) : (
                <Ionicons name="person" size={40} color="#9CA3AF" />
              )}
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{patient.name}</Text>
              <Text style={styles.profileEmail}>{patient.email}</Text>
              {patient.addiction_type && (
                <View style={styles.addictionBadge}>
                  <Ionicons name="medical" size={14} color="#6B7280" />
                  <Text style={styles.addictionText}>{patient.addiction_type}</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{daysClean}</Text>
              <Text style={styles.statLabel}>Días Limpio</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{emotionalLogs.length}</Text>
              <Text style={styles.statLabel}>Registros</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{habits.filter(h => h.completed_today).length}/{habits.length}</Text>
              <Text style={styles.statLabel}>Hábitos Hoy</Text>
            </View>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPrimary]}>
              <Ionicons name="chatbubble" size={18} color="#FFFFFF" />
              <Text style={styles.actionBtnTextPrimary}>Enviar Mensaje</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnSecondary]}>
              <Ionicons name="document-text" size={18} color="#3B82F6" />
              <Text style={styles.actionBtnTextSecondary}>Agregar Nota</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          {(['overview', 'emotions', 'habits', 'journal'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'overview' && 'Resumen'}
                {tab === 'emotions' && 'Emociones'}
                {tab === 'habits' && 'Hábitos'}
                {tab === 'journal' && 'Diario'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <View style={styles.tabContent}>
            {/* Mi Por Qué */}
            {patient.profile?.my_why && (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Ionicons name="heart" size={20} color="#EF4444" />
                  <Text style={styles.cardTitle}>Mi Por Qué</Text>
                </View>
                <Text style={styles.cardText}>{patient.profile.my_why}</Text>
              </View>
            )}

            {/* Triggers */}
            {patient.profile?.triggers && patient.profile.triggers.length > 0 && (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Ionicons name="warning" size={20} color="#F59E0B" />
                  <Text style={styles.cardTitle}>Triggers</Text>
                </View>
                <View style={styles.tagsContainer}>
                  {patient.profile.triggers.map((trigger, index) => (
                    <View key={index} style={[styles.tag, styles.tagWarning]}>
                      <Text style={styles.tagTextWarning}>{trigger}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Factores Protectores */}
            {patient.profile?.protective_factors && patient.profile.protective_factors.length > 0 && (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Ionicons name="shield-checkmark" size={20} color="#10B981" />
                  <Text style={styles.cardTitle}>Factores Protectores</Text>
                </View>
                <View style={styles.tagsContainer}>
                  {patient.profile.protective_factors.map((factor, index) => (
                    <View key={index} style={[styles.tag, styles.tagSuccess]}>
                      <Text style={styles.tagTextSuccess}>{factor}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Rueda de la Vida */}
            {patient.profile?.life_areas && Object.keys(patient.profile.life_areas).length > 0 && (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Ionicons name="pie-chart" size={20} color="#3B82F6" />
                  <Text style={styles.cardTitle}>Rueda del Bienestar</Text>
                </View>
                <View style={styles.lifeAreasGrid}>
                  {Object.entries(patient.profile.life_areas).map(([key, value]) => (
                    <View key={key} style={styles.lifeAreaItem}>
                      <Text style={styles.lifeAreaLabel}>{getLifeAreaLabel(key)}</Text>
                      <View style={styles.lifeAreaBar}>
                        <View 
                          style={[
                            styles.lifeAreaFill, 
                            { 
                              width: `${(value / 10) * 100}%`,
                              backgroundColor: value >= 7 ? '#10B981' : value >= 4 ? '#F59E0B' : '#EF4444'
                            }
                          ]} 
                        />
                      </View>
                      <Text style={styles.lifeAreaValue}>{value}/10</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Diagnósticos */}
            {patient.profile?.diagnoses && patient.profile.diagnoses.length > 0 && (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Ionicons name="document-text" size={20} color="#8B5CF6" />
                  <Text style={styles.cardTitle}>Diagnósticos</Text>
                </View>
                <View style={styles.tagsContainer}>
                  {patient.profile.diagnoses.map((diagnosis, index) => (
                    <View key={index} style={[styles.tag, styles.tagPurple]}>
                      <Text style={styles.tagTextPurple}>{diagnosis}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Contactos de Emergencia */}
            {patient.profile?.emergency_contacts && patient.profile.emergency_contacts.length > 0 && (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Ionicons name="call" size={20} color="#EF4444" />
                  <Text style={styles.cardTitle}>Contactos de Emergencia</Text>
                </View>
                {patient.profile.emergency_contacts.map((contact, index) => (
                  <View key={index} style={styles.contactItem}>
                    <View>
                      <Text style={styles.contactName}>{contact.name}</Text>
                      <Text style={styles.contactRelation}>{contact.relationship}</Text>
                    </View>
                    <Text style={styles.contactPhone}>{contact.phone}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {activeTab === 'emotions' && (
          <View style={styles.tabContent}>
            {emotionalLogs.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="analytics-outline" size={48} color="#9CA3AF" />
                <Text style={styles.emptyText}>Sin registros emocionales aún</Text>
              </View>
            ) : (
              emotionalLogs.slice(0, 10).map((log, index) => (
                <View key={index} style={styles.emotionCard}>
                  <View style={styles.emotionHeader}>
                    <Text style={styles.emotionDate}>{log.date}</Text>
                    <Text style={styles.emotionMood}>{getMoodEmoji(log.mood)}</Text>
                  </View>
                  <View style={styles.emotionStats}>
                    <View style={styles.emotionStat}>
                      <Text style={styles.emotionStatLabel}>Ánimo</Text>
                      <Text style={styles.emotionStatValue}>{log.mood}/5</Text>
                    </View>
                    <View style={styles.emotionStat}>
                      <Text style={styles.emotionStatLabel}>Energía</Text>
                      <Text style={styles.emotionStatValue}>{log.energy}/5</Text>
                    </View>
                    <View style={styles.emotionStat}>
                      <Text style={styles.emotionStatLabel}>Ansiedad</Text>
                      <Text style={styles.emotionStatValue}>{log.anxiety}/5</Text>
                    </View>
                  </View>
                  {log.notes && (
                    <Text style={styles.emotionNotes}>{log.notes}</Text>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'habits' && (
          <View style={styles.tabContent}>
            {habits.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="list-outline" size={48} color="#9CA3AF" />
                <Text style={styles.emptyText}>Sin hábitos registrados</Text>
              </View>
            ) : (
              habits.map((habit, index) => (
                <View key={index} style={styles.habitCard}>
                  <View style={styles.habitInfo}>
                    <View style={[
                      styles.habitCheckbox,
                      habit.completed_today && styles.habitCheckboxCompleted
                    ]}>
                      {habit.completed_today && (
                        <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                      )}
                    </View>
                    <Text style={styles.habitName}>{habit.name}</Text>
                  </View>
                  <View style={styles.habitStreak}>
                    <Ionicons name="flame" size={16} color="#F59E0B" />
                    <Text style={styles.habitStreakText}>{habit.streak} días</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'journal' && (
          <View style={styles.tabContent}>
            <View style={styles.emptyState}>
              <Ionicons name="book-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyText}>Diario compartido próximamente</Text>
              <Text style={styles.emptySubtext}>
                Esta función permitirá al paciente compartir entradas específicas de su diario contigo.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 16,
  },
  backButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerBackButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  headerActionButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  profileAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  profileEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  addictionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    alignSelf: 'flex-start',
    gap: 4,
  },
  addictionText: {
    fontSize: 12,
    color: '#6B7280',
  },
  statsGrid: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  actionBtnPrimary: {
    backgroundColor: '#3B82F6',
  },
  actionBtnSecondary: {
    backgroundColor: '#EBF5FF',
  },
  actionBtnTextPrimary: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  actionBtnTextSecondary: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#3B82F6',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  tabContent: {
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  cardText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagWarning: {
    backgroundColor: '#FEF3C7',
  },
  tagTextWarning: {
    color: '#92400E',
    fontSize: 13,
  },
  tagSuccess: {
    backgroundColor: '#D1FAE5',
  },
  tagTextSuccess: {
    color: '#065F46',
    fontSize: 13,
  },
  tagPurple: {
    backgroundColor: '#EDE9FE',
  },
  tagTextPurple: {
    color: '#5B21B6',
    fontSize: 13,
  },
  lifeAreasGrid: {
    gap: 12,
  },
  lifeAreaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  lifeAreaLabel: {
    width: 80,
    fontSize: 13,
    color: '#4B5563',
  },
  lifeAreaBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  lifeAreaFill: {
    height: '100%',
    borderRadius: 4,
  },
  lifeAreaValue: {
    width: 40,
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'right',
  },
  contactItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  contactName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  contactRelation: {
    fontSize: 12,
    color: '#6B7280',
  },
  contactPhone: {
    fontSize: 14,
    color: '#3B82F6',
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  emotionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  emotionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  emotionDate: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  emotionMood: {
    fontSize: 24,
  },
  emotionStats: {
    flexDirection: 'row',
    gap: 16,
  },
  emotionStat: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingVertical: 8,
    borderRadius: 8,
  },
  emotionStatLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  emotionStatValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 2,
  },
  emotionNotes: {
    fontSize: 14,
    color: '#4B5563',
    marginTop: 12,
    fontStyle: 'italic',
  },
  habitCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  habitInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  habitCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  habitCheckboxCompleted: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  habitName: {
    fontSize: 15,
    color: '#1F2937',
  },
  habitStreak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  habitStreakText: {
    fontSize: 13,
    color: '#6B7280',
  },
});
