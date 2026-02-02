import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { authenticatedFetch } from '../utils/api';

const { width } = Dimensions.get('window');

interface Stats {
  users: {
    total: number;
    patients: number;
    professionals: number;
    admins: number;
    active: number;
    profiles_completed: number;
  };
  engagement: {
    total_habits: number;
    total_emotional_logs: number;
    total_relapses: number;
    linked_patients: number;
    avg_mood: number;
  };
  timestamp: string;
}

interface User {
  user_id: string;
  name: string;
  email: string;
  picture?: string;
  role: string;
  profile_completed: boolean;
  clean_since?: string;
  addiction_type?: string;
  professional_type?: string;
  stats: {
    emotional_logs: number;
    habits: number;
  };
}

interface Activity {
  type: string;
  user_id: string;
  user_name: string;
  description: string;
  date: string;
  icon: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'activity'>('overview');
  const [userFilter, setUserFilter] = useState<'all' | 'patient' | 'professional'>('all');
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, usersRes, activityRes] = await Promise.all([
        authenticatedFetch('/api/admin/stats'),
        authenticatedFetch(`/api/admin/users?limit=50${userFilter !== 'all' ? `&role=${userFilter}` : ''}`),
        authenticatedFetch('/api/admin/activity')
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      } else if (statsRes.status === 403) {
        setError('No tienes permisos de administrador');
      }

      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data.users);
      }

      if (activityRes.ok) {
        const data = await activityRes.json();
        setActivity(data);
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [userFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'patient': return 'Paciente';
      case 'professional': return 'Profesional';
      case 'admin': return 'Admin';
      default: return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'patient': return '#10B981';
      case 'professional': return '#3B82F6';
      case 'admin': return '#8B5CF6';
      default: return '#6B7280';
    }
  };

  const getActivityIcon = (icon: string) => {
    switch (icon) {
      case 'heart': return 'heart';
      case 'warning': return 'warning';
      case 'checkmark': return 'checkmark-circle';
      default: return 'ellipse';
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Cargando dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="lock-closed" size={64} color="#EF4444" />
          <Text style={styles.errorTitle}>Acceso Denegado</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#8B5CF6', '#7C3AED', '#6D28D9']}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBackButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Panel de Administración</Text>
          <Text style={styles.headerSubtitle}>Sin Adicciones</Text>
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.headerRefreshButton}>
          <Ionicons name="refresh" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {(['overview', 'users', 'activity'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Ionicons
              name={tab === 'overview' ? 'stats-chart' : tab === 'users' ? 'people' : 'time'}
              size={20}
              color={activeTab === tab ? '#8B5CF6' : '#6B7280'}
            />
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'overview' ? 'Resumen' : tab === 'users' ? 'Usuarios' : 'Actividad'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <>
            {/* Main Stats */}
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, styles.statCardLarge]}>
                <LinearGradient
                  colors={['#8B5CF6', '#7C3AED']}
                  style={styles.statCardGradient}
                >
                  <Ionicons name="people" size={32} color="#FFFFFF" />
                  <Text style={styles.statCardNumber}>{stats.users.total}</Text>
                  <Text style={styles.statCardLabel}>Total Usuarios</Text>
                </LinearGradient>
              </View>
              <View style={styles.statCardSmallContainer}>
                <View style={[styles.statCard, styles.statCardSmall, { backgroundColor: '#D1FAE5' }]}>
                  <Text style={[styles.statSmallNumber, { color: '#065F46' }]}>{stats.users.patients}</Text>
                  <Text style={styles.statSmallLabel}>Pacientes</Text>
                </View>
                <View style={[styles.statCard, styles.statCardSmall, { backgroundColor: '#DBEAFE' }]}>
                  <Text style={[styles.statSmallNumber, { color: '#1E40AF' }]}>{stats.users.professionals}</Text>
                  <Text style={styles.statSmallLabel}>Profesionales</Text>
                </View>
              </View>
            </View>

            {/* Engagement Stats */}
            <Text style={styles.sectionTitle}>Engagement</Text>
            <View style={styles.engagementGrid}>
              <View style={styles.engagementCard}>
                <Ionicons name="happy" size={24} color="#F59E0B" />
                <Text style={styles.engagementNumber}>{stats.engagement.avg_mood}</Text>
                <Text style={styles.engagementLabel}>Ánimo Promedio</Text>
              </View>
              <View style={styles.engagementCard}>
                <Ionicons name="list" size={24} color="#10B981" />
                <Text style={styles.engagementNumber}>{stats.engagement.total_habits}</Text>
                <Text style={styles.engagementLabel}>Hábitos</Text>
              </View>
              <View style={styles.engagementCard}>
                <Ionicons name="heart" size={24} color="#EC4899" />
                <Text style={styles.engagementNumber}>{stats.engagement.total_emotional_logs}</Text>
                <Text style={styles.engagementLabel}>Registros</Text>
              </View>
              <View style={styles.engagementCard}>
                <Ionicons name="link" size={24} color="#3B82F6" />
                <Text style={styles.engagementNumber}>{stats.engagement.linked_patients}</Text>
                <Text style={styles.engagementLabel}>Vinculados</Text>
              </View>
            </View>

            {/* Alert Card */}
            <View style={styles.alertCard}>
              <View style={styles.alertIconContainer}>
                <Ionicons name="warning" size={24} color="#DC2626" />
              </View>
              <View style={styles.alertContent}>
                <Text style={styles.alertTitle}>Recaídas Reportadas</Text>
                <Text style={styles.alertNumber}>{stats.engagement.total_relapses}</Text>
              </View>
            </View>

            {/* Quick Stats */}
            <View style={styles.quickStatsRow}>
              <View style={styles.quickStat}>
                <Text style={styles.quickStatNumber}>{stats.users.active}</Text>
                <Text style={styles.quickStatLabel}>Usuarios Activos</Text>
              </View>
              <View style={styles.quickStatDivider} />
              <View style={styles.quickStat}>
                <Text style={styles.quickStatNumber}>{stats.users.profiles_completed}</Text>
                <Text style={styles.quickStatLabel}>Perfiles Completos</Text>
              </View>
            </View>
          </>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <>
            {/* Filter */}
            <View style={styles.filterRow}>
              {(['all', 'patient', 'professional'] as const).map((filter) => (
                <TouchableOpacity
                  key={filter}
                  style={[styles.filterChip, userFilter === filter && styles.filterChipActive]}
                  onPress={() => setUserFilter(filter)}
                >
                  <Text style={[styles.filterChipText, userFilter === filter && styles.filterChipTextActive]}>
                    {filter === 'all' ? 'Todos' : filter === 'patient' ? 'Pacientes' : 'Profesionales'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* User List */}
            {users.map((user) => (
              <View key={user.user_id} style={styles.userCard}>
                <View style={styles.userHeader}>
                  <View style={styles.userAvatar}>
                    {user.picture ? (
                      <Image source={{ uri: user.picture }} style={styles.userAvatarImage} />
                    ) : (
                      <Ionicons name="person" size={24} color="#9CA3AF" />
                    )}
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{user.name || 'Sin nombre'}</Text>
                    <Text style={styles.userEmail}>{user.email}</Text>
                  </View>
                  <View style={[styles.roleBadge, { backgroundColor: getRoleColor(user.role) + '20' }]}>
                    <Text style={[styles.roleBadgeText, { color: getRoleColor(user.role) }]}>
                      {getRoleLabel(user.role)}
                    </Text>
                  </View>
                </View>
                <View style={styles.userStats}>
                  <View style={styles.userStatItem}>
                    <Ionicons name="heart" size={14} color="#6B7280" />
                    <Text style={styles.userStatText}>{user.stats.emotional_logs} registros</Text>
                  </View>
                  <View style={styles.userStatItem}>
                    <Ionicons name="list" size={14} color="#6B7280" />
                    <Text style={styles.userStatText}>{user.stats.habits} hábitos</Text>
                  </View>
                  {user.profile_completed && (
                    <View style={styles.userStatItem}>
                      <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                      <Text style={[styles.userStatText, { color: '#10B981' }]}>Perfil completo</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <>
            <Text style={styles.sectionTitle}>Actividad Reciente</Text>
            {activity.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="time-outline" size={48} color="#9CA3AF" />
                <Text style={styles.emptyText}>Sin actividad reciente</Text>
              </View>
            ) : (
              activity.map((item, index) => (
                <View key={index} style={styles.activityCard}>
                  <View style={[
                    styles.activityIcon,
                    { backgroundColor: item.type === 'relapse' ? '#FEE2E2' : '#D1FAE5' }
                  ]}>
                    <Ionicons
                      name={getActivityIcon(item.icon) as any}
                      size={20}
                      color={item.type === 'relapse' ? '#DC2626' : '#10B981'}
                    />
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityUser}>{item.user_name}</Text>
                    <Text style={styles.activityDescription}>{item.description}</Text>
                  </View>
                  <Text style={styles.activityDate}>{item.date}</Text>
                </View>
              ))
            )}
          </>
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
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  backButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 10,
  },
  headerBackButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  headerRefreshButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#8B5CF6',
  },
  tabText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#8B5CF6',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  statCardLarge: {
    flex: 1,
  },
  statCardGradient: {
    padding: 20,
    alignItems: 'center',
  },
  statCardNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 8,
  },
  statCardLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
  },
  statCardSmallContainer: {
    flex: 1,
    gap: 12,
  },
  statCardSmall: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  statSmallNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statSmallLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  engagementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  engagementCard: {
    width: (width - 56) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  engagementNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 8,
  },
  engagementLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  alertCard: {
    flexDirection: 'row',
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  alertIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    color: '#991B1B',
  },
  alertNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#DC2626',
  },
  quickStatsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
  },
  quickStat: {
    flex: 1,
    alignItems: 'center',
  },
  quickStatNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  quickStatLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  quickStatDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  filterChipText: {
    fontSize: 14,
    color: '#6B7280',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  userAvatarImage: {
    width: '100%',
    height: '100%',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  userEmail: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  userStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  userStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  userStatText: {
    fontSize: 13,
    color: '#6B7280',
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 12,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityUser: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  activityDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  activityDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});
