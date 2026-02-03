import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Alert,
  Linking,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { authenticatedFetch, getBackendURL } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

const BACKEND_URL = getBackendURL();
const ACADEMIA_WHATSAPP = '+34635952916';

interface Patient {
  user_id: string;
  name: string;
  email: string;
  picture?: string;
  clean_since?: string;
  addiction_type?: string;
  role?: string;
  days_clean?: number;
  last_activity?: string;
  profile?: any;
}

interface AlertItem {
  alert_id: string;
  patient_name: string;
  type: 'relapse' | 'inactivity' | 'negative_emotions';
  severity: 'critical' | 'high' | 'medium';
  message: string;
  created_at: string;
}

export default function ProfessionalDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'patients' | 'alerts' | 'formation'>('patients');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showAddPatient, setShowAddPatient] = useState(false);

  const loadData = useCallback(async () => {
    try {
      // Load patients
      const patientsRes = await authenticatedFetch(`${BACKEND_URL}/api/professional/patients`);
      if (patientsRes.ok) {
        const data = await patientsRes.json();
        setPatients(data.patients || []);
      }

      // Load alerts
      const alertsRes = await authenticatedFetch(`${BACKEND_URL}/api/professional/alerts`);
      if (alertsRes.ok) {
        const data = await alertsRes.json();
        setAlerts(data.alerts || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  const searchPatientByEmail = async () => {
    if (!searchEmail.trim()) {
      Alert.alert('Error', 'Ingresa un email para buscar');
      return;
    }

    setIsSearching(true);
    setSearchResults([]);
    
    try {
      const response = await authenticatedFetch(
        `${BACKEND_URL}/api/therapists/search-patient?email=${encodeURIComponent(searchEmail.trim().toLowerCase())}`
      );
      
      if (response.ok) {
        const data = await response.json();
        console.log('Search result:', data);
        
        if (data.patient) {
          setSearchResults([data.patient]);
          Alert.alert('¡Encontrado!', `Paciente: ${data.patient.name}`);
        } else {
          setSearchResults([]);
          Alert.alert(
            'No encontrado', 
            data.message || 'No se encontró un paciente registrado con ese email. Verifica que:\n\n• El email esté correcto\n• El usuario tenga una cuenta en la app\n• Haya seleccionado rol de paciente o "Quiero dejarlo"'
          );
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        Alert.alert('Error', errorData.detail || 'Error al buscar paciente');
      }
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Error', 'Error de conexión. Intenta de nuevo.');
    } finally {
      setIsSearching(false);
    }
  };

  const linkPatient = async (patientId: string) => {
    try {
      const response = await authenticatedFetch(`${BACKEND_URL}/api/professional/link-patient`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: patientId }),
      });

      if (response.ok) {
        Alert.alert('Éxito', 'Paciente vinculado correctamente');
        setShowAddPatient(false);
        setSearchEmail('');
        setSearchResults([]);
        loadData();
      } else {
        const data = await response.json();
        Alert.alert('Error', data.detail || 'No se pudo vincular el paciente');
      }
    } catch (error) {
      Alert.alert('Error', 'Error de conexión');
    }
  };

  const openAcademiaWhatsApp = () => {
    const message = '¡Hola Academia Lidera! Soy profesional de SinAdicciones.cl y me interesa el Máster en Adicciones e Intervención Psicosocial.';
    const url = `https://wa.me/${ACADEMIA_WHATSAPP.replace(/\+/g, '')}?text=${encodeURIComponent(message)}`;
    Linking.openURL(url);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#EF4444';
      case 'high': return '#F59E0B';
      case 'medium': return '#3B82F6';
      default: return '#6B7280';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'relapse': return 'warning';
      case 'inactivity': return 'time';
      case 'negative_emotions': return 'sad';
      default: return 'alert-circle';
    }
  };

  const calculateDaysClean = (cleanSince?: string) => {
    if (!cleanSince) return 0;
    const start = new Date(cleanSince);
    const now = new Date();
    return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#1A1A1A', '#2D2D2D', '#1A1A1A']}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hola, {user?.name?.split(' ')[0] || 'Profesional'}</Text>
            <Text style={styles.subtitle}>Panel de Profesional</Text>
          </View>
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <Ionicons name="person-circle" size={40} color="#3B82F6" />
          </TouchableOpacity>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.statCardBlue]}>
            <Ionicons name="people" size={24} color="#3B82F6" />
            <Text style={styles.statNumber}>{patients.length}</Text>
            <Text style={styles.statLabel}>Pacientes</Text>
          </View>
          <View style={[styles.statCard, criticalAlerts > 0 ? styles.statCardRed : styles.statCardGreen]}>
            <Ionicons name="notifications" size={24} color={criticalAlerts > 0 ? '#EF4444' : '#10B981'} />
            <Text style={[styles.statNumber, criticalAlerts > 0 && styles.statNumberRed]}>
              {criticalAlerts}
            </Text>
            <Text style={styles.statLabel}>Alertas críticas</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'patients' && styles.tabActive]}
            onPress={() => setActiveTab('patients')}
          >
            <Ionicons 
              name="people" 
              size={18} 
              color={activeTab === 'patients' ? '#3B82F6' : '#9CA3AF'} 
            />
            <Text style={[styles.tabText, activeTab === 'patients' && styles.tabTextActive]}>
              Pacientes
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'alerts' && styles.tabActive]}
            onPress={() => setActiveTab('alerts')}
          >
            <Ionicons 
              name="notifications" 
              size={18} 
              color={activeTab === 'alerts' ? '#F59E0B' : '#9CA3AF'} 
            />
            <Text style={[styles.tabText, activeTab === 'alerts' && styles.tabTextActive]}>
              Alertas
            </Text>
            {alerts.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{alerts.length}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'formation' && styles.tabActive]}
            onPress={() => setActiveTab('formation')}
          >
            <Ionicons 
              name="school" 
              size={18} 
              color={activeTab === 'formation' ? '#10B981' : '#9CA3AF'} 
            />
            <Text style={[styles.tabText, activeTab === 'formation' && styles.tabTextActive]}>
              Formación
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#3B82F6" />
          }
        >
          {/* PATIENTS TAB */}
          {activeTab === 'patients' && (
            <View style={styles.tabContent}>
              {/* Add Patient Button */}
              <TouchableOpacity
                style={styles.addPatientButton}
                onPress={() => setShowAddPatient(!showAddPatient)}
              >
                <Ionicons name={showAddPatient ? 'close' : 'person-add'} size={20} color="#FFFFFF" />
                <Text style={styles.addPatientButtonText}>
                  {showAddPatient ? 'Cancelar' : 'Agregar Paciente'}
                </Text>
              </TouchableOpacity>

              {/* Add Patient Form */}
              {showAddPatient && (
                <View style={styles.addPatientForm}>
                  <Text style={styles.formTitle}>Buscar paciente por email</Text>
                  <View style={styles.searchRow}>
                    <TextInput
                      style={styles.searchInput}
                      value={searchEmail}
                      onChangeText={setSearchEmail}
                      placeholder="email@ejemplo.com"
                      placeholderTextColor="#6B7280"
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      style={styles.searchButton}
                      onPress={searchPatientByEmail}
                      disabled={isSearching}
                    >
                      {isSearching ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Ionicons name="search" size={20} color="#FFFFFF" />
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Search Results */}
                  {searchResults.map((patient) => (
                    <View key={patient.user_id} style={styles.searchResult}>
                      <View style={styles.searchResultInfo}>
                        <Text style={styles.searchResultName}>{patient.name}</Text>
                        <Text style={styles.searchResultEmail}>{patient.email}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.linkButton}
                        onPress={() => linkPatient(patient.user_id)}
                      >
                        <Text style={styles.linkButtonText}>Vincular</Text>
                      </TouchableOpacity>
                    </View>
                  ))}

                  <Text style={styles.formNote}>
                    El paciente debe tener una cuenta en SinAdicciones y haber seleccionado el rol de "Usuario en recuperación" o "Quiero dejarlo".
                  </Text>
                </View>
              )}

              {/* Patients List */}
              {patients.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="people-outline" size={60} color="#4B5563" />
                  <Text style={styles.emptyStateTitle}>Sin pacientes aún</Text>
                  <Text style={styles.emptyStateText}>
                    Agrega pacientes usando el botón de arriba o espera a que te vinculen desde la app.
                  </Text>
                </View>
              ) : (
                patients.map((patient) => (
                  <TouchableOpacity
                    key={patient.user_id}
                    style={styles.patientCard}
                    onPress={() => router.push({
                      pathname: '/patient-detail',
                      params: { patientId: patient.user_id }
                    })}
                  >
                    <View style={styles.patientAvatar}>
                      {patient.picture ? (
                        <Image source={{ uri: patient.picture }} style={styles.avatarImage} />
                      ) : (
                        <Ionicons name="person" size={24} color="#3B82F6" />
                      )}
                    </View>
                    <View style={styles.patientInfo}>
                      <Text style={styles.patientName}>{patient.name}</Text>
                      <Text style={styles.patientAddiction}>
                        {patient.addiction_type || 'No especificado'}
                      </Text>
                      <View style={styles.patientStats}>
                        <View style={styles.patientStat}>
                          <Ionicons name="calendar" size={14} color="#10B981" />
                          <Text style={styles.patientStatText}>
                            {calculateDaysClean(patient.clean_since)} días
                          </Text>
                        </View>
                        <View style={styles.patientStat}>
                          <Ionicons 
                            name={patient.role === 'active_user' ? 'flame' : 'leaf'} 
                            size={14} 
                            color={patient.role === 'active_user' ? '#F59E0B' : '#10B981'} 
                          />
                          <Text style={styles.patientStatText}>
                            {patient.role === 'active_user' ? 'Reto 21 días' : 'En recuperación'}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#6B7280" />
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}

          {/* ALERTS TAB */}
          {activeTab === 'alerts' && (
            <View style={styles.tabContent}>
              {alerts.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="checkmark-circle" size={60} color="#10B981" />
                  <Text style={styles.emptyStateTitle}>Sin alertas</Text>
                  <Text style={styles.emptyStateText}>
                    Tus pacientes están bien. Las alertas aparecerán aquí si detectamos recaídas, inactividad o emociones negativas.
                  </Text>
                </View>
              ) : (
                alerts.map((alert) => (
                  <View 
                    key={alert.alert_id} 
                    style={[styles.alertCard, { borderLeftColor: getSeverityColor(alert.severity) }]}
                  >
                    <View style={[styles.alertIcon, { backgroundColor: `${getSeverityColor(alert.severity)}20` }]}>
                      <Ionicons 
                        name={getAlertIcon(alert.type) as any} 
                        size={24} 
                        color={getSeverityColor(alert.severity)} 
                      />
                    </View>
                    <View style={styles.alertContent}>
                      <View style={styles.alertHeader}>
                        <Text style={styles.alertPatient}>{alert.patient_name}</Text>
                        <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(alert.severity) }]}>
                          <Text style={styles.severityText}>
                            {alert.severity === 'critical' ? 'CRÍTICO' : 
                             alert.severity === 'high' ? 'ALTO' : 'MEDIO'}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.alertMessage}>{alert.message}</Text>
                      <Text style={styles.alertTime}>
                        {new Date(alert.created_at).toLocaleDateString('es-CL', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {/* FORMATION TAB */}
          {activeTab === 'formation' && (
            <View style={styles.tabContent}>
              {/* Academia Lidera Card */}
              <View style={styles.academiaCard}>
                <View style={styles.academiaHeader}>
                  <View style={styles.academiaLogo}>
                    <Ionicons name="school" size={32} color="#10B981" />
                  </View>
                  <View style={styles.academiaHeaderText}>
                    <Text style={styles.academiaPartner}>SOCIO FORMATIVO</Text>
                    <Text style={styles.academiaName}>Academia Lidera</Text>
                  </View>
                </View>

                <Text style={styles.academiaTitle}>
                  Máster en Adicciones e Intervención Psicosocial
                </Text>

                <Text style={styles.academiaDescription}>
                  Especialízate y domina las técnicas de intervención más efectivas y actualizadas en el tratamiento integral de adicciones.
                </Text>

                {/* Features */}
                <View style={styles.academiaFeatures}>
                  <View style={styles.academiaFeature}>
                    <Ionicons name="time" size={18} color="#3B82F6" />
                    <Text style={styles.academiaFeatureText}>400 horas de formación</Text>
                  </View>
                  <View style={styles.academiaFeature}>
                    <Ionicons name="laptop" size={18} color="#3B82F6" />
                    <Text style={styles.academiaFeatureText}>Modalidad semipresencial</Text>
                  </View>
                  <View style={styles.academiaFeature}>
                    <Ionicons name="calendar" size={18} color="#3B82F6" />
                    <Text style={styles.academiaFeatureText}>Inicio según matrícula</Text>
                  </View>
                  <View style={styles.academiaFeature}>
                    <Ionicons name="ribbon" size={18} color="#3B82F6" />
                    <Text style={styles.academiaFeatureText}>Título avalado por ANTA y AICM</Text>
                  </View>
                </View>

                {/* What you'll learn */}
                <View style={styles.academiaSection}>
                  <Text style={styles.academiaSectionTitle}>¿Qué aprenderás?</Text>
                  <View style={styles.academiaLearnings}>
                    <View style={styles.academiaLearning}>
                      <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                      <Text style={styles.academiaLearningText}>
                        Comprender las adicciones desde una mirada biopsicosocial
                      </Text>
                    </View>
                    <View style={styles.academiaLearning}>
                      <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                      <Text style={styles.academiaLearningText}>
                        Aplicar estrategias de intervención clínica y psicosocial
                      </Text>
                    </View>
                    <View style={styles.academiaLearning}>
                      <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                      <Text style={styles.academiaLearningText}>
                        Trabajar con familias en el proceso de recuperación
                      </Text>
                    </View>
                    <View style={styles.academiaLearning}>
                      <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                      <Text style={styles.academiaLearningText}>
                        Diseñar programas de prevención y acompañamiento
                      </Text>
                    </View>
                    <View style={styles.academiaLearning}>
                      <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                      <Text style={styles.academiaLearningText}>
                        Técnicas de TCC, ACT, Mindfulness y modelo transteórico
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Modules Preview */}
                <View style={styles.academiaSection}>
                  <Text style={styles.academiaSectionTitle}>Módulos principales</Text>
                  <View style={styles.academiaModules}>
                    <View style={styles.academiaModule}>
                      <Text style={styles.academiaModuleNumber}>01</Text>
                      <Text style={styles.academiaModuleText}>Fundamentos del programa terapéutico</Text>
                    </View>
                    <View style={styles.academiaModule}>
                      <Text style={styles.academiaModuleNumber}>02</Text>
                      <Text style={styles.academiaModuleText}>Terapia cognitiva de las drogodependencias</Text>
                    </View>
                    <View style={styles.academiaModule}>
                      <Text style={styles.academiaModuleNumber}>03</Text>
                      <Text style={styles.academiaModuleText}>Familia y trabajo en equipo</Text>
                    </View>
                    <View style={styles.academiaModule}>
                      <Text style={styles.academiaModuleNumber}>04</Text>
                      <Text style={styles.academiaModuleText}>Recovery coaching en adicciones</Text>
                    </View>
                    <View style={styles.academiaModule}>
                      <Text style={styles.academiaModuleNumber}>05</Text>
                      <Text style={styles.academiaModuleText}>Psicología aplicada + 5 módulos más</Text>
                    </View>
                  </View>
                </View>

                {/* For who */}
                <View style={styles.academiaSection}>
                  <Text style={styles.academiaSectionTitle}>¿Para quién es este máster?</Text>
                  <Text style={styles.academiaForWho}>
                    • Psicólogos, trabajadores sociales o terapeutas{'\n'}
                    • Docentes y orientadores con jóvenes vulnerables{'\n'}
                    • Personas en recuperación que quieren ayudar a otros{'\n'}
                    • Profesionales con vocación de servicio
                  </Text>
                </View>

                {/* CTA Button */}
                <TouchableOpacity
                  style={styles.academiaButton}
                  onPress={openAcademiaWhatsApp}
                >
                  <Ionicons name="logo-whatsapp" size={24} color="#FFFFFF" />
                  <Text style={styles.academiaButtonText}>Solicitar información</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.academiaWebButton}
                  onPress={() => Linking.openURL('https://www.academialidera.es/')}
                >
                  <Ionicons name="globe" size={18} color="#3B82F6" />
                  <Text style={styles.academiaWebButtonText}>Visitar sitio web</Text>
                </TouchableOpacity>
              </View>

              {/* Additional Resources */}
              <View style={styles.resourcesSection}>
                <Text style={styles.resourcesTitle}>Recursos adicionales</Text>
                
                <TouchableOpacity 
                  style={styles.resourceCard}
                  onPress={() => router.push('/centers')}
                >
                  <Ionicons name="business" size={24} color="#F59E0B" />
                  <View style={styles.resourceInfo}>
                    <Text style={styles.resourceName}>Directorio de Centros</Text>
                    <Text style={styles.resourceDesc}>Centros de rehabilitación en Chile</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={styles.bottomSpacing} />
        </ScrollView>

        {/* Bottom Navigation */}
        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.navItem} onPress={() => {}}>
            <Ionicons name="home" size={24} color="#3B82F6" />
            <Text style={[styles.navLabel, { color: '#3B82F6' }]}>Inicio</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => router.push('/(tabs)/centers')}
          >
            <Ionicons name="search" size={24} color="#6B7280" />
            <Text style={styles.navLabel}>Centros</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <Ionicons name="person" size={24} color="#6B7280" />
            <Text style={styles.navLabel}>Perfil</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  gradient: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    color: '#3B82F6',
    marginTop: 2,
  },
  profileButton: {
    padding: 4,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  statCardBlue: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  statCardGreen: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  statCardRed: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 8,
  },
  statNumberRed: {
    color: '#EF4444',
  },
  statLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    gap: 6,
  },
  tabActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.4)',
  },
  tabText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  badge: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    paddingHorizontal: 20,
  },
  addPatientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
  },
  addPatientButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  addPatientForm: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  formTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  searchButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  searchResult: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  searchResultEmail: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  linkButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  linkButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  formNote: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 12,
    lineHeight: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  patientAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  patientAddiction: {
    color: '#9CA3AF',
    fontSize: 13,
    marginTop: 2,
  },
  patientStats: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  patientStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  patientStatText: {
    color: '#D1D5DB',
    fontSize: 12,
  },
  alertCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  alertIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  alertPatient: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  severityText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  alertMessage: {
    color: '#D1D5DB',
    fontSize: 13,
    lineHeight: 18,
  },
  alertTime: {
    color: '#6B7280',
    fontSize: 11,
    marginTop: 6,
  },
  academiaCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    marginBottom: 20,
  },
  academiaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  academiaLogo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  academiaHeaderText: {
    flex: 1,
  },
  academiaPartner: {
    fontSize: 10,
    color: '#10B981',
    fontWeight: '700',
    letterSpacing: 1,
  },
  academiaName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  academiaTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  academiaDescription: {
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 20,
    marginBottom: 16,
  },
  academiaFeatures: {
    gap: 10,
    marginBottom: 20,
  },
  academiaFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  academiaFeatureText: {
    color: '#E5E7EB',
    fontSize: 14,
  },
  academiaSection: {
    marginBottom: 20,
  },
  academiaSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
    marginBottom: 12,
  },
  academiaLearnings: {
    gap: 8,
  },
  academiaLearning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  academiaLearningText: {
    flex: 1,
    color: '#D1D5DB',
    fontSize: 13,
    lineHeight: 18,
  },
  academiaModules: {
    gap: 10,
  },
  academiaModule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    padding: 12,
    borderRadius: 10,
    gap: 12,
  },
  academiaModuleNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#10B981',
  },
  academiaModuleText: {
    flex: 1,
    color: '#E5E7EB',
    fontSize: 13,
  },
  academiaForWho: {
    color: '#D1D5DB',
    fontSize: 13,
    lineHeight: 22,
  },
  academiaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
    marginBottom: 12,
  },
  academiaButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  academiaWebButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  academiaWebButtonText: {
    color: '#3B82F6',
    fontSize: 15,
    fontWeight: '600',
  },
  resourcesSection: {
    marginTop: 8,
  },
  resourcesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  resourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  resourceInfo: {
    flex: 1,
  },
  resourceName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  resourceDesc: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 2,
  },
  bottomSpacing: {
    height: 100,
  },
});
