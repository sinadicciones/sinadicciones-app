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
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { authenticatedFetch } from '../utils/api';

interface Patient {
  user_id: string;
  name: string;
  email: string;
  picture?: string;
  clean_since?: string;
  addiction_type?: string;
  profile: {
    triggers?: string[];
    life_areas?: { [key: string]: number };
    diagnoses?: string[];
  };
}

interface PatientStats {
  daysClean: number;
  lastActivity: string;
  riskLevel: 'low' | 'medium' | 'high';
  alerts: string[];
}

interface AlertSummary {
  total: number;
  critical: number;
  high: number;
  medium: number;
}

export default function ProfessionalDashboard() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [alertSummary, setAlertSummary] = useState<AlertSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchPatients = useCallback(async () => {
    try {
      const [patientsRes, alertsRes] = await Promise.all([
        authenticatedFetch('/api/professional/patients'),
        authenticatedFetch('/api/professional/alerts/summary')
      ]);
      
      if (patientsRes.ok) {
        const data = await patientsRes.json();
        setPatients(data);
      } else {
        setError('Error al cargar pacientes');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchPatients();
  };

  const calculateDaysClean = (cleanSince?: string): number => {
    if (!cleanSince) return 0;
    const startDate = new Date(cleanSince);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - startDate.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  const getPatientStats = (patient: Patient): PatientStats => {
    const daysClean = calculateDaysClean(patient.clean_since);
    
    // Determine risk level based on various factors
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    const alerts: string[] = [];
    
    if (daysClean < 30) {
      riskLevel = 'high';
      alerts.push('Menos de 30 días de sobriedad');
    } else if (daysClean < 90) {
      riskLevel = 'medium';
    }
    
    // Check life areas if available
    const lifeAreas = patient.profile?.life_areas;
    if (lifeAreas) {
      const lowAreas = Object.entries(lifeAreas).filter(([_, value]) => value < 4);
      if (lowAreas.length >= 3) {
        riskLevel = riskLevel === 'low' ? 'medium' : 'high';
        alerts.push('Múltiples áreas de vida con bajo bienestar');
      }
    }
    
    return {
      daysClean,
      lastActivity: 'Hoy', // TODO: Calculate from actual activity
      riskLevel,
      alerts,
    };
  };

  const getRiskColor = (level: 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'low': return '#10B981';
      case 'medium': return '#F59E0B';
      case 'high': return '#EF4444';
    }
  };

  const getRiskLabel = (level: 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'low': return 'Bajo';
      case 'medium': return 'Medio';
      case 'high': return 'Alto';
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Cargando pacientes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Dashboard Profesional</Text>
          <Text style={styles.headerSubtitle}>
            {patients.length} {patients.length === 1 ? 'paciente' : 'pacientes'} vinculados
          </Text>
        </View>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="notifications-outline" size={24} color="#1F2937" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
        {/* Stats Overview */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: '#EBF5FF' }]}>
            <Ionicons name="people" size={24} color="#3B82F6" />
            <Text style={styles.statNumber}>{patients.length}</Text>
            <Text style={styles.statLabel}>Total Pacientes</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="alert-circle" size={24} color="#F59E0B" />
            <Text style={styles.statNumber}>
              {patients.filter(p => getPatientStats(p).riskLevel !== 'low').length}
            </Text>
            <Text style={styles.statLabel}>Requieren Atención</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#D1FAE5' }]}>
            <Ionicons name="checkmark-circle" size={24} color="#10B981" />
            <Text style={styles.statNumber}>
              {patients.filter(p => getPatientStats(p).riskLevel === 'low').length}
            </Text>
            <Text style={styles.statLabel}>Estables</Text>
          </View>
        </View>

        {/* Patients List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mis Pacientes</Text>
          
          {patients.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={64} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>Sin pacientes aún</Text>
              <Text style={styles.emptyText}>
                Cuando un paciente te vincule como su terapeuta, aparecerá aquí.
              </Text>
            </View>
          ) : (
            patients.map((patient) => {
              const stats = getPatientStats(patient);
              return (
                <TouchableOpacity
                  key={patient.user_id}
                  style={styles.patientCard}
                  onPress={() => router.push(`/patient-detail?id=${patient.user_id}`)}
                >
                  <View style={styles.patientHeader}>
                    <View style={styles.patientAvatar}>
                      {patient.picture ? (
                        <Image source={{ uri: patient.picture }} style={styles.avatarImage} />
                      ) : (
                        <Ionicons name="person" size={24} color="#9CA3AF" />
                      )}
                    </View>
                    <View style={styles.patientInfo}>
                      <Text style={styles.patientName}>{patient.name}</Text>
                      <Text style={styles.patientEmail}>{patient.email}</Text>
                    </View>
                    <View style={[styles.riskBadge, { backgroundColor: getRiskColor(stats.riskLevel) + '20' }]}>
                      <View style={[styles.riskDot, { backgroundColor: getRiskColor(stats.riskLevel) }]} />
                      <Text style={[styles.riskText, { color: getRiskColor(stats.riskLevel) }]}>
                        Riesgo {getRiskLabel(stats.riskLevel)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.patientStats}>
                    <View style={styles.patientStat}>
                      <Ionicons name="calendar" size={16} color="#6B7280" />
                      <Text style={styles.patientStatText}>
                        {stats.daysClean} días limpio
                      </Text>
                    </View>
                    {patient.addiction_type && (
                      <View style={styles.patientStat}>
                        <Ionicons name="medical" size={16} color="#6B7280" />
                        <Text style={styles.patientStatText}>
                          {patient.addiction_type}
                        </Text>
                      </View>
                    )}
                    <View style={styles.patientStat}>
                      <Ionicons name="time" size={16} color="#6B7280" />
                      <Text style={styles.patientStatText}>
                        Última actividad: {stats.lastActivity}
                      </Text>
                    </View>
                  </View>

                  {stats.alerts.length > 0 && (
                    <View style={styles.alertsContainer}>
                      {stats.alerts.map((alert, index) => (
                        <View key={index} style={styles.alertBadge}>
                          <Ionicons name="warning" size={12} color="#F59E0B" />
                          <Text style={styles.alertText}>{alert}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  <View style={styles.patientActions}>
                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={() => router.push(`/patient-detail?id=${patient.user_id}`)}
                    >
                      <Ionicons name="eye" size={18} color="#3B82F6" />
                      <Text style={styles.actionButtonText}>Ver Detalle</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton}>
                      <Ionicons name="chatbubble" size={18} color="#10B981" />
                      <Text style={[styles.actionButtonText, { color: '#10B981' }]}>Mensaje</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
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
  patientCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  patientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  patientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  patientEmail: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  riskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  riskDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  riskText: {
    fontSize: 12,
    fontWeight: '600',
  },
  patientStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  patientStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  patientStatText: {
    fontSize: 13,
    color: '#6B7280',
  },
  alertsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  alertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  alertText: {
    fontSize: 12,
    color: '#92400E',
  },
  patientActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    gap: 6,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
});
