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

interface EmotionalAnalysis {
  period: string;
  period_name: string;
  stats: {
    entries: number;
    avg_mood: number;
    min_mood: number;
    max_mood: number;
    mood_trend: string;
    emotional_balance: string;
    best_day: string;
    worst_day: string;
    positive_count: number;
    negative_count: number;
    top_emotions: { tag: string; count: number }[];
    daily_avg: Record<string, number>;
  };
  analysis: {
    resumen: string;
    fortalezas_emocionales: string[];
    areas_atencion: string[];
    patrones: { patron: string; tipo: string }[];
    correlaciones: string[];
    estrategias: { estrategia: string; cuando_usar: string }[];
    tips: { tip: string; prioridad: string }[];
    mensaje_apoyo: string;
    enfoque_proxima_semana: string;
  };
}

const MOOD_EMOJIS: Record<number, string> = {
  1: '😭', 2: '😟', 3: '😔', 4: '😕', 5: '😐',
  6: '🙂', 7: '😊', 8: '😄', 9: '😁', 10: '🤩'
};

// Mini line chart component
const MoodLineChart = ({ data }: { data: Record<string, number> }) => {
  const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const values = days.map(day => data[day] || 0);
  const maxValue = 10;
  
  return (
    <View style={styles.lineChart}>
      <View style={styles.lineChartGrid}>
        {[10, 7, 5, 3, 1].map((level) => (
          <View key={level} style={styles.gridLine}>
            <Text style={styles.gridLabel}>{level}</Text>
            <View style={styles.gridLineInner} />
          </View>
        ))}
      </View>
      <View style={styles.lineChartBars}>
        {values.map((value, index) => (
          <View key={index} style={styles.lineBarContainer}>
            <View style={[
              styles.lineBar,
              { 
                height: `${(value / maxValue) * 100}%`,
                backgroundColor: value >= 7 ? '#10B981' : value >= 5 ? '#F59E0B' : value > 0 ? '#EF4444' : '#E5E7EB'
              }
            ]}>
              {value > 0 && (
                <Text style={styles.barEmoji}>{MOOD_EMOJIS[Math.round(value)] || '😐'}</Text>
              )}
            </View>
            <Text style={styles.dayLabel}>{days[index].substring(0, 2)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

interface Props {
  onClose?: () => void;
}

export default function EmotionalInsights({ onClose }: Props) {
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<EmotionalAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalysis();
  }, [period]);

  const fetchAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await authenticatedFetch(`${BACKEND_URL}/api/emotional/analysis/${period}`);
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

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'mejorando': return { icon: 'trending-up', color: '#10B981' };
      case 'bajando': return { icon: 'trending-down', color: '#EF4444' };
      default: return { icon: 'remove', color: '#6B7280' };
    }
  };

  const getBalanceColor = (balance: string) => {
    switch (balance) {
      case 'positivo': return '#10B981';
      case 'desafiante': return '#EF4444';
      default: return '#F59E0B';
    }
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
        <ActivityIndicator size="large" color="#EC4899" />
        <Text style={styles.loadingText}>💭 Analizando tus emociones...</Text>
        <Text style={styles.loadingSubtext}>La IA está revisando tu bienestar</Text>
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
        colors={['#EC4899', '#DB2777']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.summaryCard}
      >
        <View style={styles.aiHeader}>
          <View style={styles.aiBadge}>
            <Ionicons name="sparkles" size={14} color="#EC4899" />
            <Text style={styles.aiBadgeText}>Análisis IA</Text>
          </View>
        </View>
        <Text style={styles.summaryText}>{aiAnalysis?.resumen}</Text>
        <View style={styles.supportMessage}>
          <Ionicons name="heart" size={16} color="#FFFFFF" />
          <Text style={styles.supportText}>{aiAnalysis?.mensaje_apoyo}</Text>
        </View>
      </LinearGradient>

      {/* Main Stats */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.moodEmoji}>{MOOD_EMOJIS[Math.round(stats?.avg_mood || 5)]}</Text>
          <Text style={styles.statValue}>{stats?.avg_mood || 0}/10</Text>
          <Text style={styles.statLabel}>Ánimo promedio</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name={trendInfo.icon as any} size={28} color={trendInfo.color} />
          <Text style={[styles.statValue, { color: trendInfo.color, textTransform: 'capitalize' }]}>
            {stats?.mood_trend || 'Estable'}
          </Text>
          <Text style={styles.statLabel}>Tendencia</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.balanceBadge, { backgroundColor: `${getBalanceColor(stats?.emotional_balance || '')}20` }]}>
            <Ionicons name="pulse" size={20} color={getBalanceColor(stats?.emotional_balance || '')} />
          </View>
          <Text style={[styles.statValue, { fontSize: 14, color: getBalanceColor(stats?.emotional_balance || '') }]}>
            {stats?.emotional_balance === 'positivo' ? 'Positivo' : 
             stats?.emotional_balance === 'desafiante' ? 'Desafiante' : 'Equilibrado'}
          </Text>
          <Text style={styles.statLabel}>Balance</Text>
        </View>
      </View>

      {/* Mood Range */}
      <View style={styles.moodRangeCard}>
        <Text style={styles.moodRangeTitle}>Rango de Ánimo</Text>
        <View style={styles.moodRangeBar}>
          <View style={styles.moodRangeTrack}>
            <View style={[styles.moodRangeFill, {
              left: `${((stats?.min_mood || 1) - 1) / 9 * 100}%`,
              width: `${((stats?.max_mood || 10) - (stats?.min_mood || 1)) / 9 * 100}%`
            }]} />
          </View>
          <View style={styles.moodRangeLabels}>
            <Text style={styles.moodRangeMin}>{MOOD_EMOJIS[stats?.min_mood || 1]} {stats?.min_mood}</Text>
            <Text style={styles.moodRangeMax}>{MOOD_EMOJIS[stats?.max_mood || 10]} {stats?.max_mood}</Text>
          </View>
        </View>
      </View>

      {/* Mood by Day Chart */}
      {stats?.daily_avg && (
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>📈 Ánimo por Día</Text>
            <Text style={styles.chartSubtitle}>Promedio diario</Text>
          </View>
          <MoodLineChart data={stats.daily_avg} />
          <View style={styles.chartFooter}>
            <View style={styles.dayBadge}>
              <Text style={styles.dayBadgeEmoji}>😊</Text>
              <Text style={styles.dayBadgeText}>{stats?.best_day}</Text>
            </View>
            <View style={[styles.dayBadge, { backgroundColor: '#FEE2E2' }]}>
              <Text style={styles.dayBadgeEmoji}>💪</Text>
              <Text style={[styles.dayBadgeText, { color: '#EF4444' }]}>{stats?.worst_day}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Emotion Balance */}
      {(stats?.positive_count !== undefined || stats?.negative_count !== undefined) && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>⚖️ Balance Emocional</Text>
          <View style={styles.balanceBarContainer}>
            <View style={styles.balanceBar}>
              <View style={[styles.balancePositive, { 
                flex: stats?.positive_count || 1 
              }]}>
                <Text style={styles.balanceText}>✨ {stats?.positive_count || 0}</Text>
              </View>
              <View style={[styles.balanceNegative, { 
                flex: stats?.negative_count || 1 
              }]}>
                <Text style={styles.balanceText}>💭 {stats?.negative_count || 0}</Text>
              </View>
            </View>
            <View style={styles.balanceLabels}>
              <Text style={styles.balanceLabelPositive}>Positivas</Text>
              <Text style={styles.balanceLabelNegative}>Desafiantes</Text>
            </View>
          </View>
        </View>
      )}

      {/* Top Emotions */}
      {stats?.top_emotions && stats.top_emotions.length > 0 && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>💭 Emociones Frecuentes</Text>
          <View style={styles.emotionTags}>
            {stats.top_emotions.slice(0, 8).map((emotion, index) => (
              <View key={index} style={[styles.emotionTag, {
                backgroundColor: ['paz', 'motivación', 'orgullo', 'gratitud', 'esperanza', 'alegría'].includes(emotion.tag) 
                  ? '#D1FAE5' : ['ansiedad', 'ira', 'vacío', 'tristeza', 'miedo', 'craving'].includes(emotion.tag)
                  ? '#FEE2E2' : '#F3F4F6'
              }]}>
                <Text style={[styles.emotionTagText, {
                  color: ['paz', 'motivación', 'orgullo', 'gratitud', 'esperanza', 'alegría'].includes(emotion.tag) 
                    ? '#059669' : ['ansiedad', 'ira', 'vacío', 'tristeza', 'miedo', 'craving'].includes(emotion.tag)
                    ? '#DC2626' : '#4B5563'
                }]}>{emotion.tag}</Text>
                <View style={styles.emotionCount}>
                  <Text style={styles.emotionCountText}>{emotion.count}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Strengths */}
      {aiAnalysis?.fortalezas_emocionales && aiAnalysis.fortalezas_emocionales.length > 0 && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>💪 Fortalezas Emocionales</Text>
          {aiAnalysis.fortalezas_emocionales.map((strength, index) => (
            <View key={index} style={styles.strengthItem}>
              <Ionicons name="star" size={18} color="#10B981" />
              <Text style={styles.strengthText}>{strength}</Text>
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

      {/* Strategies */}
      {aiAnalysis?.estrategias && aiAnalysis.estrategias.length > 0 && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>🧘 Estrategias de Regulación</Text>
          {aiAnalysis.estrategias.map((strategy, index) => (
            <View key={index} style={styles.strategyItem}>
              <View style={styles.strategyIcon}>
                <Ionicons name="bulb" size={18} color="#8B5CF6" />
              </View>
              <View style={styles.strategyContent}>
                <Text style={styles.strategyTitle}>{strategy.estrategia}</Text>
                <Text style={styles.strategyWhen}>🎯 {strategy.cuando_usar}</Text>
              </View>
            </View>
          ))}
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

      {/* Focus for next week */}
      {aiAnalysis?.enfoque_proxima_semana && (
        <LinearGradient
          colors={['#FCE7F3', '#FBCFE8']}
          style={styles.focusCard}
        >
          <View style={styles.focusHeader}>
            <Ionicons name="compass" size={24} color="#DB2777" />
            <Text style={styles.focusTitle}>Enfoque para la próxima semana</Text>
          </View>
          <Text style={styles.focusText}>{aiAnalysis.enfoque_proxima_semana}</Text>
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
    backgroundColor: '#EC4899',
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
    backgroundColor: '#EC4899',
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
    color: '#EC4899',
  },
  summaryText: {
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 24,
  },
  supportMessage: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    gap: 8,
  },
  supportText: {
    flex: 1,
    fontSize: 14,
    color: '#FCE7F3',
    fontStyle: 'italic',
    lineHeight: 20,
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
  moodEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  balanceBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  moodRangeCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
  },
  moodRangeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  moodRangeBar: {
    marginTop: 8,
  },
  moodRangeTrack: {
    height: 12,
    backgroundColor: '#E5E7EB',
    borderRadius: 6,
    overflow: 'hidden',
  },
  moodRangeFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: '#EC4899',
    borderRadius: 6,
  },
  moodRangeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  moodRangeMin: {
    fontSize: 12,
    color: '#EF4444',
  },
  moodRangeMax: {
    fontSize: 12,
    color: '#10B981',
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
  lineChart: {
    height: 140,
    flexDirection: 'row',
  },
  lineChartGrid: {
    width: 25,
    justifyContent: 'space-between',
  },
  gridLine: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gridLabel: {
    fontSize: 9,
    color: '#9CA3AF',
    width: 15,
  },
  gridLineInner: {
    flex: 1,
    height: 1,
    backgroundColor: '#F3F4F6',
  },
  lineChartBars: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingLeft: 8,
  },
  lineBarContainer: {
    alignItems: 'center',
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },
  lineBar: {
    width: 28,
    borderRadius: 4,
    minHeight: 4,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  barEmoji: {
    fontSize: 12,
    marginTop: 2,
  },
  dayLabel: {
    fontSize: 10,
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
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  dayBadgeEmoji: {
    fontSize: 14,
  },
  dayBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
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
  balanceBarContainer: {
    marginTop: 8,
  },
  balanceBar: {
    flexDirection: 'row',
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  balancePositive: {
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceNegative: {
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  balanceLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  balanceLabelPositive: {
    fontSize: 11,
    color: '#10B981',
  },
  balanceLabelNegative: {
    fontSize: 11,
    color: '#F59E0B',
  },
  emotionTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emotionTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingRight: 4,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  emotionTagText: {
    fontSize: 13,
  },
  emotionCount: {
    backgroundColor: 'rgba(0,0,0,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  emotionCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  strengthItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  strengthText: {
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
  strategyItem: {
    flexDirection: 'row',
    paddingVertical: 10,
    gap: 12,
  },
  strategyIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  strategyContent: {
    flex: 1,
  },
  strategyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  strategyWhen: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
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
    color: '#DB2777',
  },
  focusText: {
    fontSize: 15,
    color: '#9D174D',
    lineHeight: 22,
  },
});
