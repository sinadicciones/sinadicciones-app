import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { authenticatedFetch } from '../utils/api';

interface Alert {
  alert_id: string;
  professional_id: string;
  patient_id: string;
  patient_name: string;
  alert_type: 'relapse' | 'inactivity' | 'negative_emotion';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  created_at: string;
  is_read: boolean;
  is_resolved: boolean;
  data?: any;
}

interface AlertSummary {
  total: number;
  critical: number;
  high: number;
  medium: number;
  by_type: {
    relapse: number;
    inactivity: number;
    negative_emotion: number;
  };
}

export default function AlertsScreen() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [summary, setSummary] = useState<AlertSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'relapse' | 'inactivity' | 'negative_emotion'>('all');

  const fetchAlerts = useCallback(async () => {
    try {
      const [alertsRes, summaryRes] = await Promise.all([
        authenticatedFetch('/api/professional/alerts'),
        authenticatedFetch('/api/professional/alerts/summary')
      ]);

      if (alertsRes.ok) {
        const data = await alertsRes.json();
        setAlerts(data);
      }

      if (summaryRes.ok) {
        const data = await summaryRes.json();
        setSummary(data);
      }
    } catch (err) {
      console.error('Error fetching alerts:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchAlerts();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#DC2626';
      case 'high': return '#EA580C';
      case 'medium': return '#D97706';
      case 'low': return '#65A30D';
      default: return '#6B7280';
    }
  };

  const getSeverityBgColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#FEE2E2';
      case 'high': return '#FFEDD5';
      case 'medium': return '#FEF3C7';
      case 'low': return '#ECFCCB';
      default: return '#F3F4F6';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'relapse': return 'warning';
      case 'inactivity': return 'time';
      case 'negative_emotion': return 'sad';
      default: return 'alert-circle';
    }
  };

  const getFilterLabel = (type: string) => {
    switch (type) {
      case 'all': return 'Todas';
      case 'relapse': return 'Recaídas';
      case 'inactivity': return 'Inactividad';
      case 'negative_emotion': return 'Emociones';
      default: return type;
    }
  };

  const filteredAlerts = filter === 'all' 
    ? alerts 
    : alerts.filter(a => a.alert_type === filter);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Cargando alertas...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Centro de Alertas</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
          <Ionicons name="refresh" size={24} color="#1F2937" />
        </TouchableOpacity>
      </View>

      {/* Summary Cards */}
      {summary && (
        <View style={styles.summaryContainer}>
          <View style={[styles.summaryCard, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="warning" size={24} color="#DC2626" />
            <Text style={[styles.summaryNumber, { color: '#DC2626' }]}>{summary.critical}</Text>
            <Text style={styles.summaryLabel}>Críticas</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: '#FFEDD5' }]}>
            <Ionicons name="alert-circle" size={24} color="#EA580C" />
            <Text style={[styles.summaryNumber, { color: '#EA580C' }]}>{summary.high}</Text>
            <Text style={styles.summaryLabel}>Altas</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="information-circle" size={24} color="#D97706" />
            <Text style={[styles.summaryNumber, { color: '#D97706' }]}>{summary.medium}</Text>
            <Text style={styles.summaryLabel}>Medias</Text>
          </View>
        </View>
      )}

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {(['all', 'relapse', 'inactivity', 'negative_emotion'] as const).map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.filterTab, filter === type && styles.filterTabActive]}
              onPress={() => setFilter(type)}
            >
              <Text style={[styles.filterTabText, filter === type && styles.filterTabTextActive]}>
                {getFilterLabel(type)}
                {type !== 'all' && summary && (
                  <Text> ({summary.by_type[type as keyof typeof summary.by_type]})</Text>
                )}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Alerts List */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
        {filteredAlerts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle" size={64} color="#10B981" />
            <Text style={styles.emptyTitle}>¡Sin alertas!</Text>
            <Text style={styles.emptyText}>
              {filter === 'all' 
                ? 'No hay alertas pendientes para tus pacientes.'
                : `No hay alertas de tipo "${getFilterLabel(filter)}".`}
            </Text>
          </View>
        ) : (
          filteredAlerts.map((alert) => (
            <TouchableOpacity
              key={alert.alert_id}
              style={[
                styles.alertCard,
                { borderLeftColor: getSeverityColor(alert.severity) }
              ]}
              onPress={() => router.push(`/patient-detail?id=${alert.patient_id}`)}
            >
              <View style={styles.alertHeader}>
                <View style={[styles.alertIconContainer, { backgroundColor: getSeverityBgColor(alert.severity) }]}>
                  <Ionicons 
                    name={getAlertIcon(alert.alert_type) as any} 
                    size={24} 
                    color={getSeverityColor(alert.severity)} 
                  />
                </View>
                <View style={styles.alertInfo}>
                  <Text style={styles.alertTitle}>{alert.title}</Text>
                  <Text style={styles.alertPatient}>{alert.patient_name}</Text>
                </View>
                <View style={[styles.severityBadge, { backgroundColor: getSeverityBgColor(alert.severity) }]}>
                  <Text style={[styles.severityText, { color: getSeverityColor(alert.severity) }]}>
                    {alert.severity === 'critical' ? 'Crítica' : 
                     alert.severity === 'high' ? 'Alta' :
                     alert.severity === 'medium' ? 'Media' : 'Baja'}
                  </Text>
                </View>
              </View>

              <Text style={styles.alertDescription}>{alert.description}</Text>

              <View style={styles.alertFooter}>
                <View style={styles.alertTime}>
                  <Ionicons name="time-outline" size={14} color="#9CA3AF" />
                  <Text style={styles.alertTimeText}>
                    {new Date(alert.created_at).toLocaleDateString('es-CL', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Text>
                </View>
                <TouchableOpacity style={styles.viewButton}>
                  <Text style={styles.viewButtonText}>Ver Paciente</Text>
                  <Ionicons name="chevron-forward" size={16} color="#3B82F6" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
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
  refreshButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#FFFFFF',
  },
  summaryCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  filterContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  filterTabActive: {
    backgroundColor: '#3B82F6',
  },
  filterTabText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  alertCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  alertIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  alertInfo: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  alertPatient: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  severityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  severityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  alertDescription: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 12,
  },
  alertFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  alertTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  alertTimeText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewButtonText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
});
