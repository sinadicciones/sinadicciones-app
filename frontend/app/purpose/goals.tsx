import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authenticatedFetch, getBackendURL } from '../../utils/api';

const BACKEND_URL = getBackendURL();

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
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis Objetivos</Text>
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
        {Object.keys(goalsByArea).length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="flag-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>Sin objetivos</Text>
            <Text style={styles.emptyText}>
              Navega a las áreas de vida para crear tus primeros objetivos
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push('/purpose/dashboard')}
            >
              <Text style={styles.emptyButtonText}>Ir al dashboard</Text>
            </TouchableOpacity>
          </View>
        ) : (
          Object.entries(goalsByArea).map(([areaKey, areaGoals]: [string, any]) => {
            const areaInfo = AREAS[areaKey] || { label: areaKey, icon: 'ellipse', color: '#6B7280' };
            return (
              <View key={areaKey} style={styles.areaSection}>
                <TouchableOpacity
                  style={styles.areaHeader}
                  onPress={() => router.push(`/purpose/area?area=${areaKey}`)}
                >
                  <View style={[styles.areaIcon, { backgroundColor: areaInfo.color + '20' }]}>
                    <Ionicons name={areaInfo.icon as any} size={20} color={areaInfo.color} />
                  </View>
                  <Text style={styles.areaTitle}>{areaInfo.label}</Text>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>

                {(areaGoals as any[]).map((goal: any) => (
                  <View key={goal.goal_id} style={styles.goalCard}>
                    <View style={styles.goalStatus}>
                      <Ionicons
                        name={goal.status === 'completed' ? 'checkmark-circle' : 'ellipse-outline'}
                        size={20}
                        color={goal.status === 'completed' ? '#10B981' : areaInfo.color}
                      />
                    </View>
                    <View style={styles.goalContent}>
                      <Text
                        style={[
                          styles.goalTitle,
                          goal.status === 'completed' && styles.goalTitleCompleted,
                        ]}
                      >
                        {goal.title}
                      </Text>
                      {goal.description && (
                        <Text style={styles.goalDescription} numberOfLines={2}>
                          {goal.description}
                        </Text>
                      )}
                      <View style={styles.goalMeta}>
                        <View style={styles.progressBar}>
                          <View
                            style={[
                              styles.progressFill,
                              { width: `${goal.progress || 0}%`, backgroundColor: areaInfo.color },
                            ]}
                          />
                        </View>
                        <Text style={styles.progressText}>{goal.progress || 0}%</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            );
          })
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
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
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  backButton: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
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
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: '#F59E0B',
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
  emptyState: {
    alignItems: 'center',
    padding: 48,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#F59E0B',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
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
    color: '#1F2937',
  },
  goalCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
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
    color: '#1F2937',
    marginBottom: 4,
  },
  goalTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  goalDescription: {
    fontSize: 13,
    color: '#6B7280',
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
    backgroundColor: '#F3F4F6',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    width: 35,
    textAlign: 'right',
  },
});
