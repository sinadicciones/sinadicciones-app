import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { LineChart, BarChart } from 'react-native-gifted-charts';
import { authenticatedFetch, getBackendURL } from '../utils/api';
import { format, subDays, startOfWeek, startOfMonth, startOfYear } from 'date-fns';
import { es } from 'date-fns/locale';

const BACKEND_URL = getBackendURL();
const { width } = Dimensions.get('window');

type Period = 'week' | 'month' | 'year';

export default function StatsScreen() {
  const router = useRouter();
  const [period, setPeriod] = useState<Period>('week');
  const [loading, setLoading] = useState(true);
  const [habits, setHabits] = useState<any[]>([]);
  const [emotionalLogs, setEmotionalLogs] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [insights, setInsights] = useState<any>({});

  useEffect(() => {
    loadData();
  }, [period]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load habits
      const habitsResponse = await authenticatedFetch(`${BACKEND_URL}/api/habits`);
      if (habitsResponse.ok) {
        setHabits(await habitsResponse.json());
      }

      // Load emotional logs
      const emotionalResponse = await authenticatedFetch(`${BACKEND_URL}/api/emotional-logs`);
      if (emotionalResponse.ok) {
        setEmotionalLogs(await emotionalResponse.json());
      }

      // Load profile
      const profileResponse = await authenticatedFetch(`${BACKEND_URL}/api/profile`);
      if (profileResponse.ok) {
        setProfile(await profileResponse.json());
      }

      calculateInsights();
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateInsights = () => {
    // Aquí calcularemos insights automáticos
    const newInsights: any = {};

    // Calcular días limpios
    if (profile?.clean_since) {
      const cleanDate = new Date(profile.clean_since);
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - cleanDate.getTime());
      newInsights.cleanDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    // Mejor día de la semana (más hábitos completados)
    // Tendencia emocional
    // etc.

    setInsights(newInsights);
  };

  const getEmotionalChartData = () => {
    const days = period === 'week' ? 7 : period === 'month' ? 30 : 365;
    const filteredLogs = emotionalLogs.slice(0, days);

    return filteredLogs.reverse().map((log, index) => ({
      value: log.mood_scale,
      label: period === 'week' ? format(new Date(log.date), 'EEE', { locale: es }) : '',
      frontColor: getMoodColor(log.mood_scale),
    }));
  };

  const getHabitsCompletionData = () => {
    const data = habits.map(habit => ({
      value: habit.streak || 0,
      label: habit.name.substring(0, 10),
      frontColor: habit.color,
    }));
    return data;
  };

  const getMoodColor = (mood: number) => {
    if (mood <= 3) return '#EF4444';
    if (mood <= 5) return '#F59E0B';
    if (mood <= 7) return '#3B82F6';
    return '#10B981';
  };

  const getAverageMood = () => {
    if (emotionalLogs.length === 0) return 0;
    const sum = emotionalLogs.reduce((acc, log) => acc + log.mood_scale, 0);
    return (sum / emotionalLogs.length).toFixed(1);
  };

  const getTotalCompletedHabits = () => {
    return habits.filter(h => h.completed_today).length;
  };

  const getLongestStreak = () => {
    if (habits.length === 0) return 0;
    return Math.max(...habits.map(h => h.streak || 0));
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
        colors={['#3B82F6', '#8B5CF6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Estadísticas</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      {/* Period Filter */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, period === 'week' && styles.filterButtonActive]}
          onPress={() => setPeriod('week')}
        >
          <Text style={[styles.filterText, period === 'week' && styles.filterTextActive]}>
            Semana
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, period === 'month' && styles.filterButtonActive]}
          onPress={() => setPeriod('month')}
        >
          <Text style={[styles.filterText, period === 'month' && styles.filterTextActive]}>
            Mes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, period === 'year' && styles.filterButtonActive]}
          onPress={() => setPeriod('year')}
        >
          <Text style={[styles.filterText, period === 'year' && styles.filterTextActive]}>
            Año
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Días Limpios - Destacado */}
        {insights.cleanDays && (
          <View style={styles.cleanDaysCard}>
            <LinearGradient
              colors={['#10B981', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cleanDaysGradient}
            >
              <Ionicons name="trophy" size={48} color="#FFFFFF" />
              <Text style={styles.cleanDaysNumber}>{insights.cleanDays}</Text>
              <Text style={styles.cleanDaysLabel}>Días Limpio</Text>
              <Text style={styles.cleanDaysMessage}>
                ¡Sigue adelante, cada día cuenta! 🎉
              </Text>
            </LinearGradient>
          </View>
        )}

        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="heart" size={32} color="#EC4899" />
            <Text style={styles.statNumber}>{getAverageMood()}</Text>
            <Text style={styles.statLabel}>Ánimo promedio</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="checkmark-circle" size={32} color="#10B981" />
            <Text style={styles.statNumber}>{getTotalCompletedHabits()}</Text>
            <Text style={styles.statLabel}>Hábitos hoy</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="flame" size={32} color="#F59E0B" />
            <Text style={styles.statNumber}>{getLongestStreak()}</Text>
            <Text style={styles.statLabel}>Racha más larga</Text>
          </View>
        </View>

        {/* Emotional Chart */}
        {emotionalLogs.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>📊 Evolución Emocional</Text>
            <Text style={styles.chartSubtitle}>
              {period === 'week' ? 'Últimos 7 días' : period === 'month' ? 'Últimos 30 días' : 'Último año'}
            </Text>
            <View style={styles.chartContainer}>
              <LineChart
                data={getEmotionalChartData()}
                width={width - 80}
                height={200}
                spacing={period === 'week' ? 40 : 20}
                thickness={3}
                color="#EC4899"
                hideRules
                hideYAxisText
                yAxisThickness={0}
                xAxisThickness={0}
                initialSpacing={10}
                curved
                areaChart
                startFillColor="rgba(236, 72, 153, 0.3)"
                endFillColor="rgba(236, 72, 153, 0.05)"
                startOpacity={0.9}
                endOpacity={0.2}
                maxValue={10}
                noOfSections={5}
              />
            </View>
            <View style={styles.moodScale}>
              <Text style={styles.moodLabel}>😢 Bajo</Text>
              <Text style={styles.moodLabel}>😐 Medio</Text>
              <Text style={styles.moodLabel}>😊 Alto</Text>
            </View>
          </View>
        )}

        {/* Habits Completion Chart */}
        {habits.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>🔥 Rachas de Hábitos</Text>
            <Text style={styles.chartSubtitle}>Días consecutivos completados</Text>
            <View style={styles.chartContainer}>
              <BarChart
                data={getHabitsCompletionData()}
                width={width - 100}
                height={200}
                barWidth={30}
                spacing={15}
                roundedTop
                hideRules
                xAxisThickness={0}
                yAxisThickness={0}
                yAxisTextStyle={{ color: '#6B7280' }}
                noOfSections={5}
              />
            </View>
          </View>
        )}

        {/* Insights */}
        <View style={styles.insightsCard}>
          <Text style={styles.insightsTitle}>💡 Insights Personalizados</Text>
          
          {insights.cleanDays >= 30 && (
            <View style={styles.insightItem}>
              <Ionicons name="star" size={24} color="#F59E0B" />
              <Text style={styles.insightText}>
                ¡Increíble! Has completado {Math.floor(insights.cleanDays / 30)} mes(es) limpio
              </Text>
            </View>
          )}

          {getLongestStreak() >= 7 && (
            <View style={styles.insightItem}>
              <Ionicons name="trophy" size={24} color="#10B981" />
              <Text style={styles.insightText}>
                Tu racha más larga es de {getLongestStreak()} días. ¡Sigue así!
              </Text>
            </View>
          )}

          {getAverageMood() >= 7 && (
            <View style={styles.insightItem}>
              <Ionicons name="happy" size={24} color="#EC4899" />
              <Text style={styles.insightText}>
                Tu ánimo promedio es excelente ({getAverageMood()}/10)
              </Text>
            </View>
          )}

          {habits.filter(h => h.completed_today).length === habits.length && habits.length > 0 && (
            <View style={styles.insightItem}>
              <Ionicons name="checkmark-done-circle" size={24} color="#8B5CF6" />
              <Text style={styles.insightText}>
                ¡Completaste todos tus hábitos hoy! 🎉
              </Text>
            </View>
          )}
        </View>

        {/* Comparison */}
        <View style={styles.comparisonCard}>
          <Text style={styles.comparisonTitle}>📈 Comparativa</Text>
          <View style={styles.comparisonRow}>
            <View style={styles.comparisonItem}>
              <Text style={styles.comparisonLabel}>Esta semana</Text>
              <Text style={styles.comparisonValue}>{getTotalCompletedHabits()}</Text>
            </View>
            <Ionicons name="arrow-forward" size={24} color="#6B7280" />
            <View style={styles.comparisonItem}>
              <Text style={styles.comparisonLabel}>Objetivo</Text>
              <Text style={styles.comparisonValue}>{habits.length * 7}</Text>
            </View>
          </View>
          <Text style={styles.comparisonNote}>
            Sigue registrando tus hábitos diarios para ver tendencias
          </Text>
        </View>

        <View style={{ height: 40 }} />
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
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#FFFFFF',
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#3B82F6',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  cleanDaysCard: {
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  cleanDaysGradient: {
    padding: 32,
    alignItems: 'center',
  },
  cleanDaysNumber: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
  },
  cleanDaysLabel: {
    fontSize: 20,
    fontWeight: '600',
    color: '#F0FDF4',
    marginTop: 8,
  },
  cleanDaysMessage: {
    fontSize: 16,
    color: '#F0FDF4',
    marginTop: 8,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  chartCard: {
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
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  chartSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  chartContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  moodScale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  moodLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  insightsCard: {
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
  insightsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 12,
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  comparisonCard: {
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
  comparisonTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 12,
  },
  comparisonItem: {
    alignItems: 'center',
  },
  comparisonLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  comparisonValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  comparisonNote: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
});
