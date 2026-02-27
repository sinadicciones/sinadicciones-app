import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Dimensions,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { authenticatedFetch, getBackendURL } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

const BACKEND_URL = getBackendURL();
const { width } = Dimensions.get('window');

// Componente del progreso circular
const ProgressRing = ({ day, totalDays }: { day: number; totalDays: number }) => {
  const progress = (day / totalDays) * 100;
  
  return (
    <View style={styles.progressRingContainer}>
      <View style={styles.progressRing}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>
      <View style={styles.dayDisplay}>
        <Text style={styles.dayNumber}>{day}</Text>
        <Text style={styles.dayLabel}>/ {totalDays}</Text>
      </View>
    </View>
  );
};

export default function ChallengeDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [challenge, setChallenge] = useState<any>(null);
  const [education, setEducation] = useState<any>(null);
  const [todayLogged, setTodayLogged] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>('actions');

  const loadData = useCallback(async () => {
    try {
      // Load challenge data
      const challengeRes = await authenticatedFetch(`${BACKEND_URL}/api/challenge/current`);
      if (challengeRes.ok) {
        const data = await challengeRes.json();
        setChallenge(data.challenge);
        
        // Check if today is already logged
        if (data.challenge?.daily_logs) {
          const today = new Date().toISOString().split('T')[0];
          const todayLog = data.challenge.daily_logs.find((log: any) => log.date === today);
          setTodayLogged(!!todayLog);
        }
      }

      // Load educational content (no auth needed)
      const eduRes = await fetch(`${BACKEND_URL}/api/education/content`);
      if (eduRes.ok) {
        const eduData = await eduRes.json();
        setEducation(eduData);
      } else {
        console.error('Education content failed:', eduRes.status);
      }
    } catch (error) {
      console.error('Failed to load challenge data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getTimelinePhase = (day: number) => {
    if (day <= 3) return { phase: 'Desintoxicación', color: '#EF4444', description: 'Los días más difíciles. Tu cuerpo elimina toxinas.' };
    if (day <= 7) return { phase: 'Adaptación', color: '#F59E0B', description: 'Los síntomas físicos disminuyen.' };
    if (day <= 14) return { phase: 'Estabilización', color: '#10B981', description: 'Más energía y claridad mental.' };
    return { phase: 'Consolidación', color: '#3B82F6', description: 'Tu cerebro crea nuevas conexiones.' };
  };

  const handleLogDay = async (stayedClean: boolean) => {
    try {
      const response = await authenticatedFetch(`${BACKEND_URL}/api/challenge/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stayed_clean: stayedClean,
          actions_completed: [],
          habits_completed: [],
          mood: 5,
          cravings_level: 5,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.restart_needed) {
          Alert.alert(
            'No te rindas',
            'Una recaída no es el final. Puedes reiniciar tu reto mañana. Lo importante es volver a intentarlo.',
            [
              { text: 'Entendido', onPress: loadData }
            ]
          );
        } else {
          Alert.alert('¡Excelente!', '¡Un día más de victoria! Sigue así.');
          loadData();
        }
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo registrar el día');
    }
  };

  const handleRestartChallenge = async () => {
    Alert.alert(
      'Reiniciar Reto',
      '¿Estás listo para comenzar de nuevo? Cada intento te hace más fuerte.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Reiniciar',
          onPress: async () => {
            try {
              const response = await authenticatedFetch(`${BACKEND_URL}/api/challenge/restart`, {
                method: 'POST',
              });
              if (response.ok) {
                Alert.alert('¡Nuevo comienzo!', 'Tu reto de 21 días ha sido reiniciado.');
                loadData();
              }
            } catch (error) {
              Alert.alert('Error', 'No se pudo reiniciar el reto');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F59E0B" />
      </View>
    );
  }

  const currentPhase = challenge ? getTimelinePhase(challenge.current_day || 1) : null;

  return (
    <LinearGradient
      colors={['#1A1A1A', '#2D2D2D', '#1A1A1A']}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F59E0B" />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Hola, {user?.name?.split(' ')[0] || 'Guerrero'}</Text>
          <Text style={styles.subtitle}>Tu viaje de 21 días</Text>
        </View>

        {/* Challenge Progress Card */}
        <View style={styles.challengeCard}>
          <View style={styles.challengeHeader}>
            <Ionicons name="flame" size={28} color="#F59E0B" />
            <Text style={styles.challengeTitle}>RETO 21 DÍAS</Text>
          </View>

          {challenge?.status === 'restart_needed' ? (
            <View style={styles.restartSection}>
              <Ionicons name="refresh-circle" size={50} color="#F59E0B" />
              <Text style={styles.restartTitle}>Es hora de volver a empezar</Text>
              <Text style={styles.restartText}>
                Una caída no define tu camino. Lo que importa es levantarte.
              </Text>
              <TouchableOpacity style={styles.restartButton} onPress={handleRestartChallenge}>
                <Ionicons name="rocket" size={20} color="#1A1A1A" />
                <Text style={styles.restartButtonText}>Reiniciar mi Reto</Text>
              </TouchableOpacity>
            </View>
          ) : challenge?.status === 'completed' ? (
            <View style={styles.completedSection}>
              <Ionicons name="trophy" size={60} color="#10B981" />
              <Text style={styles.completedTitle}>¡LO LOGRASTE!</Text>
              <Text style={styles.completedText}>
                Has completado los 21 días. Ahora eres oficialmente un usuario en recuperación.
              </Text>
              <TouchableOpacity 
                style={styles.graduateButton}
                onPress={async () => {
                  const response = await authenticatedFetch(`${BACKEND_URL}/api/challenge/complete`, {
                    method: 'POST',
                  });
                  if (response.ok) {
                    Alert.alert('¡Felicidades!', 'Tu perfil ha sido actualizado a usuario en recuperación.');
                    router.replace('/(tabs)/home');
                  }
                }}
              >
                <Text style={styles.graduateButtonText}>Continuar mi Recuperación</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Day Counter */}
              <View style={styles.dayCounter}>
                <View style={styles.dayCircle}>
                  <Text style={styles.dayCounterNumber}>{challenge?.current_day || 1}</Text>
                  <Text style={styles.dayCounterLabel}>DÍA</Text>
                </View>
                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressBarFill, 
                        { width: `${((challenge?.current_day || 1) / 21) * 100}%` }
                      ]} 
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {21 - (challenge?.current_day || 1)} días restantes
                  </Text>
                </View>
              </View>

              {/* Current Phase */}
              {currentPhase && (
                <View style={[styles.phaseCard, { borderColor: currentPhase.color }]}>
                  <View style={[styles.phaseBadge, { backgroundColor: currentPhase.color }]}>
                    <Text style={styles.phaseBadgeText}>{currentPhase.phase}</Text>
                  </View>
                  <Text style={styles.phaseDescription}>{currentPhase.description}</Text>
                </View>
              )}

              {/* Daily Check-in */}
              {!todayLogged ? (
                <View style={styles.checkinCard}>
                  <Text style={styles.checkinTitle}>¿Cómo fue tu día?</Text>
                  <View style={styles.checkinButtons}>
                    <TouchableOpacity 
                      style={styles.checkinButtonSuccess}
                      onPress={() => handleLogDay(true)}
                    >
                      <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                      <Text style={styles.checkinButtonText}>Me mantuve limpio</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.checkinButtonFail}
                      onPress={() => {
                        Alert.alert(
                          'Sé honesto contigo',
                          '¿Tuviste una recaída hoy?',
                          [
                            { text: 'Cancelar', style: 'cancel' },
                            { text: 'Sí, reportar', onPress: () => handleLogDay(false) }
                          ]
                        );
                      }}
                    >
                      <Ionicons name="alert-circle" size={24} color="#FFFFFF" />
                      <Text style={styles.checkinButtonText}>Tuve una recaída</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.loggedCard}>
                  <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                  <Text style={styles.loggedText}>¡Ya registraste tu día!</Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* Primary Actions */}
        {education?.primary_actions && (
          <View style={styles.section}>
            <TouchableOpacity 
              style={styles.sectionHeader}
              onPress={() => setExpandedSection(expandedSection === 'actions' ? null : 'actions')}
            >
              <View style={styles.sectionTitleRow}>
                <Ionicons name="shield-checkmark" size={22} color="#EF4444" />
                <Text style={styles.sectionTitle}>Acciones de Protección</Text>
              </View>
              <Ionicons 
                name={expandedSection === 'actions' ? 'chevron-up' : 'chevron-down'} 
                size={20} 
                color="#9CA3AF" 
              />
            </TouchableOpacity>
            
            {expandedSection === 'actions' && (
              <View style={styles.actionsList}>
                {education.primary_actions.actions.map((action: any) => (
                  <View key={action.id} style={styles.actionItem}>
                    <View style={styles.actionIcon}>
                      <Ionicons name={action.icon as any} size={20} color="#EF4444" />
                    </View>
                    <View style={styles.actionContent}>
                      <Text style={styles.actionTitle}>{action.title}</Text>
                      <Text style={styles.actionDescription}>{action.description}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Positive Habits */}
        {education?.positive_habits && (
          <View style={styles.section}>
            <TouchableOpacity 
              style={styles.sectionHeader}
              onPress={() => setExpandedSection(expandedSection === 'habits' ? null : 'habits')}
            >
              <View style={styles.sectionTitleRow}>
                <Ionicons name="heart" size={22} color="#10B981" />
                <Text style={styles.sectionTitle}>Hábitos Positivos</Text>
              </View>
              <Ionicons 
                name={expandedSection === 'habits' ? 'chevron-up' : 'chevron-down'} 
                size={20} 
                color="#9CA3AF" 
              />
            </TouchableOpacity>
            
            {expandedSection === 'habits' && (
              <View style={styles.habitsList}>
                {education.positive_habits.habits.map((habit: any) => (
                  <View key={habit.id} style={styles.habitItem}>
                    <View style={styles.habitIcon}>
                      <Ionicons name={habit.icon as any} size={18} color="#10B981" />
                    </View>
                    <View style={styles.habitContent}>
                      <Text style={styles.habitTitle}>{habit.title}</Text>
                      {habit.recommended_time && (
                        <Text style={styles.habitTime}>{habit.recommended_time}</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Education */}
        {education?.understanding_addiction && (
          <View style={styles.section}>
            <TouchableOpacity 
              style={styles.sectionHeader}
              onPress={() => setExpandedSection(expandedSection === 'education' ? null : 'education')}
            >
              <View style={styles.sectionTitleRow}>
                <Ionicons name="book" size={22} color="#3B82F6" />
                <Text style={styles.sectionTitle}>Entender la Adicción</Text>
              </View>
              <Ionicons 
                name={expandedSection === 'education' ? 'chevron-up' : 'chevron-down'} 
                size={20} 
                color="#9CA3AF" 
              />
            </TouchableOpacity>
            
            {expandedSection === 'education' && (
              <View style={styles.educationList}>
                {education.understanding_addiction.sections.map((section: any, index: number) => (
                  <TouchableOpacity 
                    key={index} 
                    style={styles.educationItem}
                    onPress={() => router.push({ pathname: '/education-detail', params: { section: JSON.stringify(section) } })}
                  >
                    <Ionicons name={section.icon as any} size={24} color="#3B82F6" />
                    <Text style={styles.educationTitle}>{section.title}</Text>
                    <Ionicons name="chevron-forward" size={18} color="#6B7280" />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Timeline */}
        {education?.first_days && (
          <View style={styles.section}>
            <TouchableOpacity 
              style={styles.sectionHeader}
              onPress={() => setExpandedSection(expandedSection === 'timeline' ? null : 'timeline')}
            >
              <View style={styles.sectionTitleRow}>
                <Ionicons name="time" size={22} color="#8B5CF6" />
                <Text style={styles.sectionTitle}>Qué Esperar</Text>
              </View>
              <Ionicons 
                name={expandedSection === 'timeline' ? 'chevron-up' : 'chevron-down'} 
                size={20} 
                color="#9CA3AF" 
              />
            </TouchableOpacity>
            
            {expandedSection === 'timeline' && (
              <View style={styles.timelineList}>
                {education.first_days.timeline.map((phase: any, index: number) => (
                  <View key={index} style={styles.timelineItem}>
                    <View style={[styles.timelineDot, { backgroundColor: phase.color }]} />
                    <View style={styles.timelineContent}>
                      <View style={styles.timelineHeader}>
                        <Text style={[styles.timelineDay, { color: phase.color }]}>{phase.day_range}</Text>
                        <Text style={styles.timelinePhase}>{phase.title}</Text>
                      </View>
                      <Text style={styles.timelineDescription}>{phase.description}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Craving Management Section */}
        {education?.craving_management && (
          <View style={styles.section}>
            <TouchableOpacity 
              style={styles.sectionHeader}
              onPress={() => setExpandedSection(expandedSection === 'craving' ? null : 'craving')}
            >
              <View style={styles.sectionTitleRow}>
                <Ionicons name="flame" size={22} color="#EF4444" />
                <Text style={styles.sectionTitle}>Manejo del Craving</Text>
              </View>
              <Ionicons 
                name={expandedSection === 'craving' ? 'chevron-up' : 'chevron-down'} 
                size={20} 
                color="#9CA3AF" 
              />
            </TouchableOpacity>
            
            {expandedSection === 'craving' && (
              <View style={styles.educationList}>
                {education.craving_management.sections.map((section: any, index: number) => (
                  <TouchableOpacity 
                    key={index} 
                    style={styles.educationItem}
                    onPress={() => router.push({ pathname: '/education-detail', params: { section: JSON.stringify(section) } })}
                  >
                    <Ionicons name={section.icon as any} size={24} color="#EF4444" />
                    <Text style={styles.educationTitle}>{section.title}</Text>
                    <Ionicons name="chevron-forward" size={18} color="#6B7280" />
                  </TouchableOpacity>
                ))}
                
                {/* Video Link */}
                {education.craving_management.video_url && (
                  <TouchableOpacity 
                    style={[styles.educationItem, styles.videoItem]}
                    onPress={() => Linking.openURL(education.craving_management.video_url)}
                  >
                    <Ionicons name="logo-youtube" size={24} color="#FF0000" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.educationTitle}>Ver Video</Text>
                      <Text style={styles.videoSubtitle}>{education.craving_management.video_title}</Text>
                    </View>
                    <Ionicons name="open-outline" size={18} color="#6B7280" />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}

        {/* Emergency Tips */}
        <TouchableOpacity 
          style={styles.emergencyCard}
          onPress={() => {
            if (education?.craving_management?.emergency_actions) {
              const actions = education.craving_management.emergency_actions
                .map((a: any) => `${a.priority}. ${a.action}`)
                .join('\n');
              Alert.alert(
                '🆘 Acciones de Emergencia',
                `Cuando el craving sea muy intenso:\n\n${actions}`,
                [{ text: 'Entendido' }]
              );
            } else if (education?.emergency_tips) {
              Alert.alert(
                '🆘 Si sientes un craving intenso',
                education.emergency_tips.tips.join('\n\n'),
                [{ text: 'Entendido' }]
              );
            }
          }}
        >
          <Ionicons name="warning" size={24} color="#F59E0B" />
          <View style={styles.emergencyContent}>
            <Text style={styles.emergencyTitle}>¿Craving intenso?</Text>
            <Text style={styles.emergencySubtitle}>Toca aquí para ver qué hacer</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#F59E0B" />
        </TouchableOpacity>

        {/* Find Help */}
        <TouchableOpacity 
          style={styles.helpCard}
          onPress={() => router.push('/centers')}
        >
          <Ionicons name="medical" size={24} color="#3B82F6" />
          <View style={styles.helpContent}>
            <Text style={styles.helpTitle}>Buscar ayuda profesional</Text>
            <Text style={styles.helpSubtitle}>Ver directorio de centros</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#3B82F6" />
        </TouchableOpacity>

      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 16,
  },
  greeting: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },
  challengeCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  challengeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  challengeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F59E0B',
  },
  dayCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dayCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  dayCounterNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  dayCounterLabel: {
    fontSize: 12,
    color: '#1A1A1A',
    fontWeight: '600',
  },
  progressBarContainer: {
    flex: 1,
  },
  progressBar: {
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 6,
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#F59E0B',
    borderRadius: 6,
  },
  progressText: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  phaseCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderLeftWidth: 4,
  },
  phaseBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  phaseBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  phaseDescription: {
    color: '#D1D5DB',
    fontSize: 14,
  },
  checkinCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
  },
  checkinTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  checkinButtons: {
    gap: 10,
  },
  checkinButtonSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  checkinButtonFail: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6B7280',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  checkinButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  loggedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    padding: 14,
    borderRadius: 10,
    gap: 8,
  },
  loggedText: {
    color: '#10B981',
    fontSize: 15,
    fontWeight: '600',
  },
  restartSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  restartTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  restartText: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  restartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  restartButtonText: {
    color: '#1A1A1A',
    fontSize: 16,
    fontWeight: 'bold',
  },
  completedSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  completedTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#10B981',
    marginTop: 16,
    marginBottom: 8,
  },
  completedText: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  graduateButton: {
    backgroundColor: '#10B981',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  graduateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  progressRingContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  progressRing: {
    width: '100%',
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 5,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#F59E0B',
    borderRadius: 5,
  },
  dayDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 10,
  },
  dayNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#F59E0B',
  },
  dayLabel: {
    fontSize: 20,
    color: '#9CA3AF',
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
    borderRadius: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actionsList: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    marginTop: 8,
    padding: 12,
    gap: 12,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  actionDescription: {
    color: '#9CA3AF',
    fontSize: 12,
    lineHeight: 16,
  },
  habitsList: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    marginTop: 8,
    padding: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  habitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  habitIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(16, 185, 129, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  habitContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  habitTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
  },
  habitTime: {
    color: '#10B981',
    fontSize: 11,
  },
  educationList: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    marginTop: 8,
    overflow: 'hidden',
  },
  educationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    gap: 12,
  },
  educationTitle: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
  },
  videoItem: {
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
  },
  videoSubtitle: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 2,
  },
  timelineList: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    marginTop: 8,
    padding: 16,
    gap: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: 12,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  timelineDay: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  timelinePhase: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  timelineDescription: {
    color: '#9CA3AF',
    fontSize: 12,
    lineHeight: 16,
  },
  emergencyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  emergencyContent: {
    flex: 1,
  },
  emergencyTitle: {
    color: '#F59E0B',
    fontSize: 15,
    fontWeight: '600',
  },
  emergencySubtitle: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  helpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  helpContent: {
    flex: 1,
  },
  helpTitle: {
    color: '#3B82F6',
    fontSize: 15,
    fontWeight: '600',
  },
  helpSubtitle: {
    color: '#9CA3AF',
    fontSize: 12,
  },
});
