import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { authenticatedFetch, getBackendURL } from '../../utils/api';

const BACKEND_URL = getBackendURL();
const { width } = Dimensions.get('window');

interface WellnessAnalysis {
  period: string;
  period_name: string;
  stats: {
    habit_completion_rate: number;
    total_habits: number;
    completed_entries: number;
    total_entries: number;
    avg_mood: number;
    mood_trend: string;
    emotional_entries: number;
    active_goals: number;
    best_day: string;
    worst_day: string;
    top_emotions: { tag: string; count: number }[];
    daily_completion: Record<string, { completed: number; total: number; rate: number }>;
  };
  analysis: {
    resumen: string;
    logros: string[];
    patrones: { patron: string; tipo: string }[];
    correlaciones: string[];
    tips: { tip: string; prioridad: string }[];
    frase_motivacional: string;
    enfoque_semana: string;
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
                height: `${(value / maxValue) * 100}%`,
                backgroundColor: value > 0 ? color : '#E5E7EB',
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

// Mood trend line
const MoodTrendLine = ({ data }: { data: (number | null)[] }) => {
  const validData = data.filter(d => d !== null) as number[];
  if (validData.length < 2) return null;
  
  const maxMood = 10;
  const minMood = 1;
  const range = maxMood - minMood;
  
  return (
    <View style={styles.moodTrendContainer}>
      <View style={styles.moodTrendLine}>
        {validData.slice(-7).map((mood, index) => {
          const normalizedY = ((mood - minMood) / range) * 100;
          return (
            <View key={index} style={styles.moodPointContainer}>
              <View style={[styles.moodDot, { bottom: `${normalizedY}%` }]}>
                <View style={[
                  styles.moodDotInner,
                  { backgroundColor: mood >= 7 ? '#10B981' : mood >= 5 ? '#F59E0B' : '#EF4444' }
                ]} />
              </View>
              {index < validData.slice(-7).length - 1 && (
                <View style={[styles.moodLineSegment, { bottom: `${normalizedY}%` }]} />
              )}
            </View>
          );
        })}
      </View>
      <View style={styles.moodLabels}>
        <Text style={styles.moodLabelHigh}>😊</Text>
        <Text style={styles.moodLabelLow}>😔</Text>
      </View>
    </View>
  );
};

interface Props {
  onClose?: () => void;
}

export default function WellnessInsights({ onClose }: Props) {
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<WellnessAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalysis();
  }, [period]);

  const fetchAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await authenticatedFetch(`${BACKEND_URL}/api/wellness/analysis/${period}`);
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

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'mejorando': return { icon: 'trending-up', color: '#10B981' };
      case 'bajando': return { icon: 'trending-down', color: '#EF4444' };
      default: return { icon: 'remove', color: '#6B7280' };
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'alta': return '#EF4444';
      case 'media': return '#F59E0B';
      default: return '#10B981';
    }
  };

  const getPatternIcon = (tipo: string) => {
    switch (tipo) {
      case 'positivo': return { icon: 'checkmark-circle', color: '#10B981' };
      case 'negativo': return { icon: 'alert-circle', color: '#EF4444' };
      default: return { icon: 'information-circle', color: '#3B82F6' };
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>🤖 Analizando tu bienestar...</Text>
        <Text style={styles.loadingSubtext}>La IA está revisando tus datos</Text>
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
  const trendInfo = getTrendIcon(stats?.mood_trend || 'estable');

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
        colors={['#8B5CF6', '#6366F1']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.summaryCard}
      >
        <View style={styles.aiHeader}>
          <View style={styles.aiBadge}>
            <Ionicons name="sparkles" size={14} color="#8B5CF6" />
            <Text style={styles.aiBadgeText}>Análisis IA</Text>
          </View>
        </View>
        <Text style={styles.summaryText}>{aiAnalysis?.resumen}</Text>
        <View style={styles.motivationalQuote}>
          <Text style={styles.motivationalText}>"{aiAnalysis?.frase_motivacional}"</Text>
        </View>
      </LinearGradient>

      {/* Stats Overview */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#D1FAE5' }]}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          </View>
          <Text style={styles.statValue}>{stats?.habit_completion_rate || 0}%</Text>
          <Text style={styles.statLabel}>Hábitos</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="heart" size={20} color="#EF4444" />
          </View>
          <Text style={styles.statValue}>{stats?.avg_mood || 0}/10</Text>
          <Text style={styles.statLabel}>Ánimo</Text>
          <Ionicons name={trendInfo.icon as any} size={14} color={trendInfo.color} />
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#EDE9FE' }]}>
            <Ionicons name="flag" size={20} color="#8B5CF6" />
          </View>
          <Text style={styles.statValue}>{stats?.active_goals || 0}</Text>
          <Text style={styles.statLabel}>Metas</Text>
        </View>
      </View>

      {/* Habits by Day Chart */}
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>📊 Hábitos por Día</Text>
          <Text style={styles.chartSubtitle}>% de completitud</Text>
        </View>
        <MiniBarChart data={getDayCompletionData()} color="#10B981" />
        <View style={styles.chartFooter}>
          <Text style={styles.bestDayText}>
            🏆 Mejor día: <Text style={styles.bestDayHighlight}>{stats?.best_day}</Text>
          </Text>
          <Text style={styles.worstDayText}>
            💪 A mejorar: <Text style={styles.worstDayHighlight}>{stats?.worst_day}</Text>
          </Text>
        </View>
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

      {/* Correlations */}
      {aiAnalysis?.correlaciones && aiAnalysis.correlaciones.length > 0 && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>🔗 Correlaciones</Text>
          {aiAnalysis.correlaciones.map((correlation, index) => (
            <View key={index} style={styles.correlationItem}>
              <Ionicons name="git-branch" size={18} color="#6366F1" />
              <Text style={styles.correlationText}>{correlation}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Top Emotions */}
      {stats?.top_emotions && stats.top_emotions.length > 0 && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>💭 Emociones Frecuentes</Text>
          <View style={styles.emotionTags}>
            {stats.top_emotions.map((emotion, index) => (
              <View key={index} style={styles.emotionTag}>
                <Text style={styles.emotionTagText}>{emotion.tag}</Text>
                <View style={styles.emotionCount}>
                  <Text style={styles.emotionCountText}>{emotion.count}</Text>
                </View>
              </View>
            ))}
          </View>
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

      {/* Focus for next period */}
      {aiAnalysis?.enfoque_semana && (
        <LinearGradient
          colors={['#ECFDF5', '#D1FAE5']}
          style={styles.focusCard}
        >
          <View style={styles.focusHeader}>
            <Ionicons name="compass" size={24} color="#10B981" />
            <Text style={styles.focusTitle}>Enfoque para la próxima semana</Text>
          </View>
          <Text style={styles.focusText}>{aiAnalysis.enfoque_semana}</Text>
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
    color: '#8B5CF6',
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
    color: '#E9D5FF',
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
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
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
    height: 80,
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
    width: 24,
    borderRadius: 4,
    minHeight: 4,
  },
  miniBarLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 4,
  },
  chartFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  bestDayText: {
    fontSize: 12,
    color: '#6B7280',
  },
  bestDayHighlight: {
    color: '#10B981',
    fontWeight: '600',
  },
  worstDayText: {
    fontSize: 12,
    color: '#6B7280',
  },
  worstDayHighlight: {
    color: '#F59E0B',
    fontWeight: '600',
  },
  moodTrendContainer: {
    flexDirection: 'row',
    height: 60,
    marginTop: 8,
  },
  moodTrendLine: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  moodPointContainer: {
    flex: 1,
    height: '100%',
    position: 'relative',
  },
  moodDot: {
    position: 'absolute',
    left: '50%',
    marginLeft: -6,
  },
  moodDotInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  moodLineSegment: {
    position: 'absolute',
    left: '50%',
    width: '100%',
    height: 2,
    backgroundColor: '#E5E7EB',
  },
  moodLabels: {
    justifyContent: 'space-between',
    paddingLeft: 8,
  },
  moodLabelHigh: {
    fontSize: 14,
  },
  moodLabelLow: {
    fontSize: 14,
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
  correlationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    gap: 12,
  },
  correlationText: {
    flex: 1,
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  emotionTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emotionTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingLeft: 12,
    paddingRight: 4,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  emotionTagText: {
    fontSize: 13,
    color: '#4B5563',
  },
  emotionCount: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  emotionCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
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
  focusCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
  },
  focusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  focusTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
  },
  focusText: {
    fontSize: 15,
    color: '#065F46',
    lineHeight: 22,
  },
});
