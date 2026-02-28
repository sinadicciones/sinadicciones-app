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
  Dimensions,
  Modal,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { authenticatedFetch, getBackendURL } from '../../utils/api';
import Svg, { Circle, G, Text as SvgText } from 'react-native-svg';
import WellnessInsights from '../../components/WellnessInsights';
import NotificationCenter from '../../components/NotificationCenter';

const BACKEND_URL = getBackendURL();
const { width } = Dimensions.get('window');

// Componente de Rueda de Bienestar
const WellnessWheel = ({ scores }: { scores: any }) => {
  const size = 160;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const center = size / 2;

  const categories = [
    { key: 'habits', label: 'Hábitos', color: '#10B981', score: scores?.habits || 0 },
    { key: 'emotional', label: 'Emocional', color: '#EF4444', score: scores?.emotional || 0 },
    { key: 'purpose', label: 'Propósito', color: '#8B5CF6', score: scores?.purpose || 0 },
  ];

  return (
    <View style={styles.wheelContainer}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${center}, ${center}`}>
          {/* Background circles */}
          {categories.map((cat, index) => {
            const catRadius = radius - (index * (strokeWidth + 4));
            return (
              <Circle
                key={`bg-${cat.key}`}
                cx={center}
                cy={center}
                r={catRadius}
                stroke="#E5E7EB"
                strokeWidth={strokeWidth}
                fill="none"
              />
            );
          })}
          {/* Progress circles */}
          {categories.map((cat, index) => {
            const catRadius = radius - (index * (strokeWidth + 4));
            const catCircumference = catRadius * 2 * Math.PI;
            const progress = (cat.score / 100) * catCircumference;
            return (
              <Circle
                key={`progress-${cat.key}`}
                cx={center}
                cy={center}
                r={catRadius}
                stroke={cat.color}
                strokeWidth={strokeWidth}
                fill="none"
                strokeDasharray={`${progress} ${catCircumference}`}
                strokeLinecap="round"
              />
            );
          })}
        </G>
        {/* Center score */}
        <SvgText
          x={center}
          y={center - 5}
          textAnchor="middle"
          fontSize="28"
          fontWeight="bold"
          fill="#1F2937"
        >
          {scores?.overall || 0}
        </SvgText>
        <SvgText
          x={center}
          y={center + 18}
          textAnchor="middle"
          fontSize="12"
          fill="#6B7280"
        >
          Bienestar
        </SvgText>
      </Svg>
      <View style={styles.wheelLegend}>
        {categories.map((cat) => (
          <View key={cat.key} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: cat.color }]} />
            <Text style={styles.legendText}>{cat.label}</Text>
            <Text style={styles.legendScore}>{cat.score}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

// Componente de Mini Gráfico de Ánimo
const MoodChart = ({ data }: { data: any[] }) => {
  const chartWidth = width - 80;
  const chartHeight = 60;
  
  if (!data || data.length === 0) {
    return (
      <View style={styles.moodChartEmpty}>
        <Text style={styles.moodChartEmptyText}>Sin datos de ánimo</Text>
      </View>
    );
  }

  const maxMood = 10;
  const minMood = 0;
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1 || 1)) * chartWidth;
    const y = chartHeight - ((d.mood - minMood) / (maxMood - minMood)) * chartHeight;
    return { x, y, mood: d.mood };
  });

  return (
    <View style={styles.moodChart}>
      <Svg width={chartWidth} height={chartHeight + 20}>
        {/* Line connecting points */}
        {points.map((point, i) => {
          if (i === 0) return null;
          const prevPoint = points[i - 1];
          return (
            <G key={i}>
              <Circle cx={point.x} cy={point.y} r={4} fill="#EF4444" />
            </G>
          );
        })}
        {/* Points */}
        {points.map((point, i) => (
          <Circle key={`point-${i}`} cx={point.x} cy={point.y} r={6} fill="#EF4444" />
        ))}
      </Svg>
      <View style={styles.moodLabels}>
        <Text style={styles.moodLabel}>😢</Text>
        <Text style={styles.moodLabel}>😐</Text>
        <Text style={styles.moodLabel}>😊</Text>
      </View>
    </View>
  );
};

// Componente de Alerta
const AlertCard = ({ alert, onPress }: { alert: any; onPress: () => void }) => {
  const bgColor = alert.severity === 'warning' ? '#FEF3C7' : '#EFF6FF';
  const borderColor = alert.severity === 'warning' ? '#F59E0B' : '#3B82F6';
  const iconColor = alert.severity === 'warning' ? '#F59E0B' : '#3B82F6';

  return (
    <TouchableOpacity 
      style={[styles.alertCard, { backgroundColor: bgColor, borderLeftColor: borderColor }]}
      onPress={onPress}
    >
      <Ionicons name={alert.icon as any} size={24} color={iconColor} />
      <View style={styles.alertContent}>
        <Text style={styles.alertTitle}>{alert.title}</Text>
        <Text style={styles.alertMessage}>{alert.message}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
    </TouchableOpacity>
  );
};

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const router = useRouter();
  const [dashboard, setDashboard] = useState<any>(null);
  const [habits, setHabits] = useState<any[]>([]);
  const [therapistTasks, setTherapistTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [showInsights, setShowInsights] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [expandedEducation, setExpandedEducation] = useState<string | null>(null);
  const [education, setEducation] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load profile first
      const profileResponse = await authenticatedFetch(`${BACKEND_URL}/api/profile`);
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        setProfile(profileData);
        
        // Redirect based on role
        if (profileData.role === 'active_user') {
          router.replace('/(tabs)/challenge-dashboard');
          return;
        }
        
        if (profileData.role === 'professional') {
          router.replace('/professional-dashboard');
          return;
        }

        if (profileData.role === 'family') {
          router.replace('/family-dashboard');
          return;
        }
        
        if (!profileData.profile_completed) {
          if (profileData.role === 'professional') {
            router.replace('/onboarding-professional');
          } else if (profileData.role === 'active_user') {
            router.replace('/onboarding-active');
          } else if (profileData.role === 'family') {
            router.replace('/onboarding-family');
          } else {
            router.replace('/onboarding');
          }
          return;
        }
      }

      // Load integrated dashboard
      const dashboardResponse = await authenticatedFetch(`${BACKEND_URL}/api/dashboard/integrated`);
      if (dashboardResponse.ok) {
        setDashboard(await dashboardResponse.json());
      }

      // Load habits
      const habitsResponse = await authenticatedFetch(`${BACKEND_URL}/api/habits`);
      if (habitsResponse.ok) {
        setHabits(await habitsResponse.json());
      }

      // Load therapist tasks (if patient has a linked therapist)
      try {
        const tasksResponse = await authenticatedFetch(`${BACKEND_URL}/api/patient/tasks`);
        if (tasksResponse.ok) {
          setTherapistTasks(await tasksResponse.json());
        }
      } catch (err) {
        console.log('No therapist tasks available');
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

  const handleAlertPress = (action: string) => {
    switch (action) {
      case 'habits':
        router.push('/(tabs)/habits');
        break;
      case 'emotional':
        router.push('/(tabs)/emotional');
        break;
      case 'purpose':
        router.push('/(tabs)/purpose');
        break;
      case 'profile':
        router.push('/(tabs)/profile');
        break;
    }
  };

  const handleSOS = async () => {
    try {
      let currentProfile = profile;
      if (!currentProfile) {
        const profileResponse = await authenticatedFetch(`${BACKEND_URL}/api/profile`);
        if (profileResponse.ok) {
          currentProfile = await profileResponse.json();
          setProfile(currentProfile);
        }
      }

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

      const firstContact = currentProfile.emergency_contacts[0];
      if (!firstContact.phone) {
        Alert.alert('Error', 'El contacto no tiene número de teléfono configurado');
        return;
      }

      const message = 'Paso por un mal momento, ¿podemos hablar?';
      const phoneNumber = firstContact.phone.replace(/[^0-9]/g, '');
      const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

      try {
        await Linking.openURL(whatsappUrl);
      } catch (linkError) {
        Alert.alert(
          'No se pudo abrir WhatsApp',
          `¿Deseas llamar a ${firstContact.name}?`,
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Llamar', onPress: () => Linking.openURL(`tel:${phoneNumber}`) },
          ]
        );
      }
    } catch (error) {
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

  const updateTaskStatus = async (taskId: string, newStatus: string, notes?: string) => {
    try {
      await authenticatedFetch(`${BACKEND_URL}/api/patient/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus, patient_notes: notes }),
      });
      Alert.alert('¡Bien!', newStatus === 'completed' ? 'Tarea completada' : 'Estado actualizado');
      loadData();
    } catch (error) {
      console.error('Failed to update task:', error);
      Alert.alert('Error', 'No se pudo actualizar la tarea');
    }
  };

  const handleTaskAction = (task: any) => {
    const options = [
      { text: 'Cancelar', style: 'cancel' as const },
    ];
    
    if (task.status !== 'in_progress') {
      options.push({ 
        text: 'En progreso', 
        style: 'default' as const,
        onPress: () => updateTaskStatus(task.task_id, 'in_progress') 
      } as any);
    }
    if (task.status !== 'completed') {
      options.push({ 
        text: '✓ Completar', 
        style: 'default' as const,
        onPress: () => updateTaskStatus(task.task_id, 'completed') 
      } as any);
    }
    
    Alert.alert(
      task.title,
      task.description || 'Actualiza el estado de esta tarea',
      options
    );
  };

  const formatMilestone = (days: number) => {
    if (days === 7) return '1 semana';
    if (days === 14) return '2 semanas';
    if (days === 30) return '1 mes';
    if (days === 60) return '2 meses';
    if (days === 90) return '3 meses';
    if (days === 180) return '6 meses';
    if (days === 365) return '1 año';
    return `${days} días`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Cargando tu dashboard...</Text>
      </View>
    );
  }

  const sobriety = dashboard?.sobriety || {};
  const habitsData = dashboard?.habits || {};
  const emotional = dashboard?.emotional || {};
  const wellness = dashboard?.wellness_scores || {};
  const alerts = dashboard?.alerts || [];
  const insights = dashboard?.insights || [];
  const quote = dashboard?.daily_quote || {};

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header con Sobriedad - Ahora dentro del ScrollView */}
        <LinearGradient
          colors={['#10B981', '#059669']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <View style={styles.greetingContainer}>
              <Text style={styles.greeting}>Hola, {user?.name?.split(' ')[0]} 👋</Text>
              <Text style={styles.subtitle}>Tu progreso de hoy</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={() => setShowNotifications(true)} style={styles.notificationButton}>
                <Ionicons name="notifications" size={20} color="#FFFFFF" />
                {unreadCount > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationBadgeText}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSOS} style={styles.sosButton}>
                <Ionicons name="heart" size={18} color="#FFFFFF" />
                <Text style={styles.sosButtonText}>SOS</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Contador de Sobriedad - Más compacto */}
          <View style={styles.sobrietyRow}>
            <View style={styles.sobrietyMain}>
              <Text style={styles.sobrietyNumber}>{sobriety.days_clean || 0}</Text>
              <Text style={styles.sobrietyLabel}>días</Text>
            </View>
            <View style={styles.sobrietyInfo}>
              {sobriety.next_milestone && (
                <View style={styles.milestoneBadge}>
                  <Ionicons name="flag" size={12} color="#10B981" />
                  <Text style={styles.milestoneText}>
                    {sobriety.days_to_milestone}d → {formatMilestone(sobriety.next_milestone)}
                  </Text>
                </View>
              )}
              {habitsData.longest_streak > 0 && (
                <View style={styles.streakBadge}>
                  <Text style={styles.streakFire}>🔥</Text>
                  <Text style={styles.streakText}>{habitsData.longest_streak} días racha</Text>
                </View>
              )}
            </View>
          </View>
        </LinearGradient>

        <View style={styles.content}>
        {/* Frase Motivacional */}
        {quote.quote && (
          <View style={styles.quoteCard}>
            <Ionicons name="chatbubble-ellipses" size={20} color="#8B5CF6" />
            <View style={styles.quoteContent}>
              <Text style={styles.quoteText}>"{quote.quote}"</Text>
              <Text style={styles.quoteAuthor}>— {quote.author}</Text>
            </View>
          </View>
        )}

        {/* Botón de Insights IA */}
        <TouchableOpacity 
          style={styles.insightsButton}
          onPress={() => setShowInsights(true)}
        >
          <LinearGradient
            colors={['#8B5CF6', '#6366F1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.insightsButtonGradient}
          >
            <Ionicons name="sparkles" size={20} color="#FFFFFF" />
            <View style={styles.insightsButtonContent}>
              <Text style={styles.insightsButtonTitle}>📊 Mi Análisis Semanal</Text>
              <Text style={styles.insightsButtonSubtitle}>IA analiza tus patrones y progreso</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>

        {/* Alertas */}
        {alerts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚠️ Atención</Text>
            {alerts.map((alert: any, index: number) => (
              <AlertCard 
                key={index} 
                alert={alert} 
                onPress={() => handleAlertPress(alert.action)} 
              />
            ))}
          </View>
        )}

        {/* Tareas de mi Terapeuta */}
        {therapistTasks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📋 Tareas de mi Terapeuta</Text>
            {therapistTasks.filter(t => t.status !== 'completed').slice(0, 3).map((task: any) => (
              <TouchableOpacity 
                key={task.task_id} 
                style={styles.therapistTaskCard}
                onPress={() => handleTaskAction(task)}
              >
                <View style={[
                  styles.taskStatusDot, 
                  { backgroundColor: task.status === 'in_progress' ? '#F59E0B' : '#3B82F6' }
                ]} />
                <View style={styles.taskContent}>
                  <Text style={styles.taskTitle}>{task.title}</Text>
                  {task.description && (
                    <Text style={styles.taskDescription} numberOfLines={2}>
                      {task.description}
                    </Text>
                  )}
                  <View style={styles.taskMeta}>
                    <Text style={styles.taskFrom}>De: {task.therapist_name || 'Tu terapeuta'}</Text>
                    <View style={[
                      styles.taskStatusBadge,
                      { backgroundColor: task.status === 'in_progress' ? '#FEF3C7' : '#EFF6FF' }
                    ]}>
                      <Text style={[
                        styles.taskStatusText,
                        { color: task.status === 'in_progress' ? '#D97706' : '#2563EB' }
                      ]}>
                        {task.status === 'in_progress' ? 'En progreso' : 'Pendiente'}
                      </Text>
                    </View>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            ))}
            {therapistTasks.filter(t => t.status === 'completed').length > 0 && (
              <View style={styles.completedTasksCount}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={styles.completedTasksText}>
                  {therapistTasks.filter(t => t.status === 'completed').length} tarea(s) completada(s)
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Rueda de Bienestar */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Tu Bienestar</Text>
          <View style={styles.wellnessCard}>
            <WellnessWheel scores={wellness} />
          </View>
        </View>

        {/* Estadísticas Rápidas */}
        <View style={styles.statsRow}>
          <TouchableOpacity 
            style={[styles.statMini, { backgroundColor: '#ECFDF5' }]}
            onPress={() => router.push('/(tabs)/habits')}
          >
            <Ionicons name="checkmark-circle" size={24} color="#10B981" />
            <Text style={styles.statMiniNumber}>{habitsData.completed_today || 0}/{habitsData.total || 0}</Text>
            <Text style={styles.statMiniLabel}>Hábitos hoy</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.statMini, { backgroundColor: '#FEF2F2' }]}
            onPress={() => router.push('/(tabs)/emotional')}
          >
            <Ionicons name="heart" size={24} color="#EF4444" />
            <Text style={styles.statMiniNumber}>
              {emotional.last_mood ? `${emotional.last_mood}/10` : '—'}
            </Text>
            <Text style={styles.statMiniLabel}>Último ánimo</Text>
            {emotional.mood_trend === 'up' && <Text style={styles.trendUp}>↑</Text>}
            {emotional.mood_trend === 'down' && <Text style={styles.trendDown}>↓</Text>}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.statMini, { backgroundColor: '#F5F3FF' }]}
            onPress={() => router.push('/(tabs)/purpose')}
          >
            <Ionicons name="compass" size={24} color="#8B5CF6" />
            <Text style={styles.statMiniNumber}>{dashboard?.purpose?.total_goals || 0}</Text>
            <Text style={styles.statMiniLabel}>Metas</Text>
          </TouchableOpacity>
        </View>

        {/* Gráfico de Ánimo Semanal */}
        {emotional.mood_data && emotional.mood_data.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📊 Ánimo esta semana</Text>
            <View style={styles.moodChartCard}>
              <MoodChart data={emotional.mood_data} />
              <View style={styles.moodSummary}>
                <Text style={styles.moodSummaryText}>
                  Promedio: <Text style={styles.moodSummaryValue}>{emotional.avg_mood}/10</Text>
                </Text>
                <Text style={styles.moodSummaryText}>
                  Tendencia: <Text style={[
                    styles.moodSummaryValue,
                    emotional.mood_trend === 'up' && { color: '#10B981' },
                    emotional.mood_trend === 'down' && { color: '#EF4444' },
                  ]}>
                    {emotional.mood_trend === 'up' ? '↑ Mejorando' : 
                     emotional.mood_trend === 'down' ? '↓ Bajando' : '→ Estable'}
                  </Text>
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Insights */}
        {insights.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💡 Insights</Text>
            {insights.map((insight: any, index: number) => (
              <View key={index} style={[
                styles.insightCard,
                insight.type === 'positive' && styles.insightPositive,
                insight.type === 'achievement' && styles.insightAchievement,
                insight.type === 'milestone' && styles.insightMilestone,
              ]}>
                <Ionicons 
                  name={
                    insight.type === 'positive' ? 'thumbs-up' :
                    insight.type === 'achievement' ? 'trophy' :
                    insight.type === 'milestone' ? 'flag' : 'bulb'
                  } 
                  size={20} 
                  color={
                    insight.type === 'positive' ? '#10B981' :
                    insight.type === 'achievement' ? '#F59E0B' :
                    insight.type === 'milestone' ? '#8B5CF6' : '#3B82F6'
                  } 
                />
                <Text style={styles.insightText}>{insight.message}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Hábitos de Hoy */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>✅ Hábitos de hoy</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/habits')}>
              <Text style={styles.seeAllText}>Ver todos</Text>
            </TouchableOpacity>
          </View>
          {habits.length === 0 ? (
            <TouchableOpacity 
              style={styles.emptyHabits}
              onPress={() => router.push('/(tabs)/habits')}
            >
              <Ionicons name="add-circle-outline" size={40} color="#10B981" />
              <Text style={styles.emptyHabitsText}>Agrega tu primer hábito</Text>
            </TouchableOpacity>
          ) : (
            habits.slice(0, 4).map((habit) => (
              <TouchableOpacity
                key={habit.habit_id}
                style={styles.habitCard}
                onPress={() => toggleHabit(habit.habit_id, habit.completed_today)}
              >
                <View style={[
                  styles.habitCheck,
                  habit.completed_today && { backgroundColor: habit.color || '#10B981' }
                ]}>
                  {habit.completed_today && (
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  )}
                </View>
                <View style={styles.habitInfo}>
                  <Text style={[
                    styles.habitName,
                    habit.completed_today && styles.habitNameCompleted
                  ]}>{habit.name}</Text>
                  {habit.streak > 0 && (
                    <Text style={styles.habitStreak}>🔥 {habit.streak} días</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Acciones Rápidas */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚀 Acciones rápidas</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity 
              style={styles.quickAction}
              onPress={() => router.push('/(tabs)/emotional')}
            >
              <LinearGradient
                colors={['#EF4444', '#DC2626']}
                style={styles.quickActionIcon}
              >
                <Ionicons name="heart" size={24} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.quickActionText}>Registrar emoción</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickAction}
              onPress={() => router.push('/(tabs)/profile')}
            >
              <LinearGradient
                colors={['#F59E0B', '#D97706']}
                style={styles.quickActionIcon}
              >
                <Ionicons name="person" size={24} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.quickActionText}>Mi Perfil</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickAction}
              onPress={() => router.push('/(tabs)/purpose')}
            >
              <LinearGradient
                colors={['#8B5CF6', '#7C3AED']}
                style={styles.quickActionIcon}
              >
                <Ionicons name="compass" size={24} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.quickActionText}>Mi propósito</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickAction}
              onPress={() => router.push('/(tabs)/centers')}
            >
              <LinearGradient
                colors={['#3B82F6', '#2563EB']}
                style={styles.quickActionIcon}
              >
                <Ionicons name="location" size={24} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.quickActionText}>Centros</Text>
            </TouchableOpacity>
          </View>
        </View>

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Modal de Insights IA */}
      <Modal
        visible={showInsights}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowInsights(false)}
      >
        <View style={styles.insightsModal}>
          <View style={styles.insightsModalHeader}>
            <Text style={styles.insightsModalTitle}>📊 Mi Análisis</Text>
            <TouchableOpacity onPress={() => setShowInsights(false)}>
              <Ionicons name="close" size={28} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <WellnessInsights onClose={() => setShowInsights(false)} />
        </View>
      </Modal>

      {/* Centro de Notificaciones */}
      <NotificationCenter 
        visible={showNotifications} 
        onClose={() => setShowNotifications(false)} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  greetingContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 13,
    color: '#D1FAE5',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notificationButton: {
    padding: 8,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#10B981',
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  sosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  sosButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  sobrietyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 12,
  },
  sobrietyMain: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginRight: 16,
  },
  sobrietyNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  sobrietyLabel: {
    fontSize: 14,
    color: '#D1FAE5',
    marginLeft: 4,
  },
  sobrietyInfo: {
    flex: 1,
    gap: 6,
  },
  milestoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    alignSelf: 'flex-start',
  },
  milestoneText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '600',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  streakFire: {
    fontSize: 14,
  },
  streakText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingTop: 8,
  },
  quoteCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  quoteContent: {
    flex: 1,
  },
  quoteText: {
    fontSize: 14,
    color: '#374151',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  quoteAuthor: {
    fontSize: 12,
    color: '#8B5CF6',
    marginTop: 8,
    fontWeight: '500',
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  seeAllText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    gap: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  alertMessage: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  wellnessCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  wheelContainer: {
    alignItems: 'center',
  },
  wheelLegend: {
    marginTop: 16,
    width: '100%',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  legendText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  legendScore: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
  },
  statMini: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  statMiniNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 6,
  },
  statMiniLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
    textAlign: 'center',
  },
  trendUp: {
    fontSize: 16,
    color: '#10B981',
    fontWeight: 'bold',
  },
  trendDown: {
    fontSize: 16,
    color: '#EF4444',
    fontWeight: 'bold',
  },
  moodChartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  moodChart: {
    alignItems: 'center',
  },
  moodChartEmpty: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moodChartEmptyText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  moodLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 10,
    marginTop: 8,
  },
  moodLabel: {
    fontSize: 16,
  },
  moodSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  moodSummaryText: {
    fontSize: 13,
    color: '#6B7280',
  },
  moodSummaryValue: {
    fontWeight: '600',
    color: '#1F2937',
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    gap: 12,
  },
  insightPositive: {
    backgroundColor: '#ECFDF5',
  },
  insightAchievement: {
    backgroundColor: '#FFFBEB',
  },
  insightMilestone: {
    backgroundColor: '#F5F3FF',
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  emptyHabits: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  emptyHabitsText: {
    marginTop: 8,
    fontSize: 14,
    color: '#10B981',
    fontWeight: '500',
  },
  habitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  habitCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  habitInfo: {
    flex: 1,
  },
  habitName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
  },
  habitNameCompleted: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  habitStreak: {
    fontSize: 12,
    color: '#F59E0B',
    marginTop: 2,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickAction: {
    width: (width - 52) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
  },
  // Therapist Tasks styles
  therapistTaskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  taskStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  taskDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 10,
  },
  taskFrom: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  taskStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  taskStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  completedTasksCount: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 6,
  },
  completedTasksText: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '500',
  },
  // Insights Button Styles
  insightsButton: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  insightsButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  insightsButtonContent: {
    flex: 1,
  },
  insightsButtonTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  insightsButtonSubtitle: {
    fontSize: 12,
    color: '#E9D5FF',
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
