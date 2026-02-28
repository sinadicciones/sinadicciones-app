import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { authenticatedFetch, getBackendURL } from '../utils/api';
import CalendarView from './CalendarView';
import Svg, { Circle, G, Text as SvgText } from 'react-native-svg';

const BACKEND_URL = getBackendURL();

interface HabitsAnalysis {
  period: string;
  period_name: string;
  stats: {
    total_habits: number;
    completion_rate: number;
    completed_entries: number;
    total_entries: number;
    current_streak: number;
    max_streak: number;
    best_day: string;
    worst_day: string;
    daily_completion: Record<string, { completed: number; total: number; rate: number }>;
  };
  habit_stats: Array<{
    habit_id: string;
    name: string;
    icon: string;
    color: string;
    completed: number;
    total: number;
    rate: number;
  }>;
  analysis: {
    resumen: string;
    logros: string[];
    patrones: { patron: string; tipo: string }[];
    habito_estrella: { nombre: string; razon: string };
    habito_a_mejorar: { nombre: string; estrategia: string };
    tips: { tip: string; prioridad: string }[];
    frase_motivacional: string;
    meta_proxima_semana: string;
  };
}

// Mini bar chart component
const MiniBarChart = ({ data, color }: { data: number[]; color: string }) => {
  const maxValue = Math.max(...data, 1);
  return (
    <View style={styles.miniBarChart}>
      {data.map((value, index) => (
        <View key={index} style={styles.miniBarContainer}>
          <View
            style={[
              styles.miniBar,
              {
                height: `${(value / 100) * 100}%`,
                backgroundColor: value > 50 ? color : value > 25 ? '#F59E0B' : '#EF4444',
              },
            ]}
          />
          <Text style={styles.miniBarLabel}>
            {['L', 'M', 'X', 'J', 'V', 'S', 'D'][index]}
          </Text>
        </View>
      ))}
    </View>
  );
};

// Progress ring component
const ProgressRing = ({ percentage, size = 80, strokeWidth = 8, color = '#10B981' }: any) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ transform: [{ rotate: '-90deg' }] }}>
        <View style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: '#E5E7EB',
          position: 'absolute'
        }} />
        <View style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: color,
          borderTopColor: 'transparent',
          borderRightColor: percentage > 25 ? color : 'transparent',
          borderBottomColor: percentage > 50 ? color : 'transparent',
          borderLeftColor: percentage > 75 ? color : 'transparent',
        }} />
      </View>
      <Text style={styles.ringText}>{percentage}%</Text>
    </View>
  );
};

interface Props {
  onClose?: () => void;
}

export default function HabitsInsights({ onClose }: Props) {
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<HabitsAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalysis();
  }, [period]);

  const fetchAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await authenticatedFetch(`${BACKEND_URL}/api/habits/analysis/${period}`);
      if (response.ok) {
        const data = await response.json();
        setAnalysis(data);
      } else {
        throw new Error('Error fetching analysis');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('No se pudo generar el análisis');
    } finally {
      setLoading(false);
    }
  };

  const getDayCompletionData = () => {
    if (!analysis?.stats?.daily_completion) return [0, 0, 0, 0, 0, 0, 0];
    const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    return days.map(day => analysis.stats.daily_completion[day]?.rate || 0);
  };

  const getPatternIcon = (tipo: string) => {
    switch (tipo) {
      case 'positivo': return { icon: 'checkmark-circle', color: '#10B981' };
      case 'negativo': return { icon: 'alert-circle', color: '#EF4444' };
      default: return { icon: 'information-circle', color: '#3B82F6' };
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'alta': return '#EF4444';
      case 'media': return '#F59E0B';
      default: return '#10B981';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>🎯 Analizando tus hábitos...</Text>
        <Text style={styles.loadingSubtext}>La IA está revisando tu progreso</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="sad-outline" size={48} color="#EF4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchAnalysis}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const stats = analysis?.stats;
  const aiAnalysis = analysis?.analysis;
  const habitStats = analysis?.habit_stats || [];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Period Selector */}
      <View style={styles.periodSelector}>
        <TouchableOpacity
          style={[styles.periodButton, period === 'week' && styles.periodButtonActive]}
          onPress={() => setPeriod('week')}
        >
          <Text style={[styles.periodButtonText, period === 'week' && styles.periodButtonTextActive]}>
            Esta Semana
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.periodButton, period === 'month' && styles.periodButtonActive]}
          onPress={() => setPeriod('month')}
        >
          <Text style={[styles.periodButtonText, period === 'month' && styles.periodButtonTextActive]}>
            Este Mes
          </Text>
        </TouchableOpacity>
      </View>

      {/* AI Summary Card */}
      <LinearGradient
        colors={['#10B981', '#059669']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.summaryCard}
      >
        <View style={styles.aiHeader}>
          <View style={styles.aiBadge}>
            <Ionicons name="sparkles" size={14} color="#10B981" />
            <Text style={styles.aiBadgeText}>Análisis IA</Text>
          </View>
        </View>
        <Text style={styles.summaryText}>{aiAnalysis?.resumen}</Text>
        <View style={styles.motivationalQuote}>
          <Text style={styles.motivationalText}>"{aiAnalysis?.frase_motivacional}"</Text>
        </View>
      </LinearGradient>

      {/* Main Stats */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats?.completion_rate || 0}%</Text>
          <Text style={styles.statLabel}>Completitud</Text>
        </View>
        <View style={styles.statCard}>
          <View style={styles.streakContainer}>
            <Ionicons name="flame" size={24} color="#F59E0B" />
            <Text style={styles.statValue}>{stats?.current_streak || 0}</Text>
          </View>
          <Text style={styles.statLabel}>Racha actual</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats?.max_streak || 0}</Text>
          <Text style={styles.statLabel}>Racha máx</Text>
        </View>
      </View>

      {/* Chart */}
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>📊 Rendimiento por Día</Text>
          <Text style={styles.chartSubtitle}>% de hábitos completados</Text>
        </View>
        <MiniBarChart data={getDayCompletionData()} color="#10B981" />
        <View style={styles.chartFooter}>
          <View style={styles.dayBadge}>
            <Ionicons name="trophy" size={14} color="#F59E0B" />
            <Text style={styles.dayBadgeText}>{stats?.best_day}</Text>
          </View>
          <View style={[styles.dayBadge, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="fitness" size={14} color="#EF4444" />
            <Text style={[styles.dayBadgeText, { color: '#EF4444' }]}>{stats?.worst_day}</Text>
          </View>
        </View>
      </View>

      {/* Habit Rankings */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>📈 Rendimiento por Hábito</Text>
        {habitStats.slice(0, 6).map((habit, index) => (
          <View key={habit.habit_id} style={styles.habitRankItem}>
            <View style={styles.habitRankLeft}>
              <View style={[styles.habitRankIcon, { backgroundColor: `${habit.color}20` }]}>
                <Text style={styles.habitRankNumber}>{index + 1}</Text>
              </View>
              <Text style={styles.habitRankName}>{habit.name}</Text>
            </View>
            <View style={styles.habitRankRight}>
              <View style={styles.habitProgressBar}>
                <View style={[styles.habitProgressFill, { 
                  width: `${habit.rate}%`,
                  backgroundColor: habit.rate >= 80 ? '#10B981' : habit.rate >= 50 ? '#F59E0B' : '#EF4444'
                }]} />
              </View>
              <Text style={[styles.habitRankRate, {
                color: habit.rate >= 80 ? '#10B981' : habit.rate >= 50 ? '#F59E0B' : '#EF4444'
              }]}>{habit.rate}%</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Habit Star & Improve */}
      <View style={styles.highlightRow}>
        {aiAnalysis?.habito_estrella && (
          <View style={[styles.highlightCard, { backgroundColor: '#ECFDF5' }]}>
            <Ionicons name="star" size={24} color="#10B981" />
            <Text style={styles.highlightTitle}>⭐ Hábito Estrella</Text>
            <Text style={styles.highlightName}>{aiAnalysis.habito_estrella.nombre}</Text>
            <Text style={styles.highlightReason}>{aiAnalysis.habito_estrella.razon}</Text>
          </View>
        )}
        {aiAnalysis?.habito_a_mejorar && (
          <View style={[styles.highlightCard, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="trending-up" size={24} color="#F59E0B" />
            <Text style={styles.highlightTitle}>💪 A Mejorar</Text>
            <Text style={styles.highlightName}>{aiAnalysis.habito_a_mejorar.nombre}</Text>
            <Text style={styles.highlightReason}>{aiAnalysis.habito_a_mejorar.estrategia}</Text>
          </View>
        )}
      </View>

      {/* Achievements */}
      {aiAnalysis?.logros && aiAnalysis.logros.length > 0 && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>🎉 Logros</Text>
          {aiAnalysis.logros.map((logro, index) => (
            <View key={index} style={styles.achievementItem}>
              <View style={styles.achievementIcon}>
                <Ionicons name="trophy" size={16} color="#F59E0B" />
              </View>
              <Text style={styles.achievementText}>{logro}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Patterns */}
      {aiAnalysis?.patrones && aiAnalysis.patrones.length > 0 && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>🔍 Patrones Detectados</Text>
          {aiAnalysis.patrones.map((pattern, index) => {
            const patternIcon = getPatternIcon(pattern.tipo);
            return (
              <View key={index} style={styles.patternItem}>
                <Ionicons name={patternIcon.icon as any} size={20} color={patternIcon.color} />
                <Text style={styles.patternText}>{pattern.patron}</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Tips */}
      {aiAnalysis?.tips && aiAnalysis.tips.length > 0 && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>💡 Tips Personalizados</Text>
          {aiAnalysis.tips.map((tip, index) => (
            <View key={index} style={styles.tipItem}>
              <View style={[styles.tipPriority, { backgroundColor: getPriorityColor(tip.prioridad) }]}>
                <Text style={styles.tipPriorityText}>
                  {tip.prioridad === 'alta' ? '!' : tip.prioridad === 'media' ? '•' : '○'}
                </Text>
              </View>
              <Text style={styles.tipText}>{tip.tip}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Next Week Goal */}
      {aiAnalysis?.meta_proxima_semana && (
        <LinearGradient
          colors={['#ECFDF5', '#D1FAE5']}
          style={styles.goalCard}
        >
          <View style={styles.goalHeader}>
            <Ionicons name="flag" size={24} color="#10B981" />
            <Text style={styles.goalTitle}>Meta para la próxima semana</Text>
          </View>
          <Text style={styles.goalText}>{aiAnalysis.meta_proxima_semana}</Text>
        </LinearGradient>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
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
    padding: 40,
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  periodSelector: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  periodButtonActive: {
    backgroundColor: '#10B981',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  periodButtonTextActive: {
    color: '#FFFFFF',
  },
  summaryCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
  },
  aiHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  aiBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  summaryText: {
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 24,
  },
  motivationalQuote: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  motivationalText: {
    fontSize: 14,
    color: '#D1FAE5',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ringText: {
    position: 'absolute',
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
  },
  chartHeader: {
    marginBottom: 12,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  chartSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  miniBarChart: {
    flexDirection: 'row',
    height: 100,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  miniBarContainer: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  miniBar: {
    width: 28,
    borderRadius: 4,
    minHeight: 4,
  },
  miniBarLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 6,
  },
  chartFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
    gap: 16,
  },
  dayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  dayBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D97706',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  habitRankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  habitRankLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  habitRankIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  habitRankNumber: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#6B7280',
  },
  habitRankName: {
    fontSize: 14,
    color: '#4B5563',
    flex: 1,
  },
  habitRankRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  habitProgressBar: {
    width: 60,
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  habitProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  habitRankRate: {
    fontSize: 13,
    fontWeight: '600',
    width: 40,
    textAlign: 'right',
  },
  highlightRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  highlightCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
  },
  highlightTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 8,
    marginBottom: 4,
  },
  highlightName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
  },
  highlightReason: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  achievementIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  achievementText: {
    flex: 1,
    fontSize: 14,
    color: '#4B5563',
  },
  patternItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    gap: 12,
  },
  patternText: {
    flex: 1,
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    gap: 12,
  },
  tipPriority: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipPriorityText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  goalCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  goalTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
  },
  goalText: {
    fontSize: 15,
    color: '#065F46',
    lineHeight: 22,
  },
});
