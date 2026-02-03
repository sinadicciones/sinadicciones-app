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
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authenticatedFetch, getBackendURL } from '../utils/api';

const BACKEND_URL = getBackendURL();

const TABS = [
  { id: 'home', label: 'Inicio', icon: 'home' },
  { id: 'learn', label: 'Aprende', icon: 'book' },
  { id: 'relative', label: 'Mi Familiar', icon: 'person' },
];

export default function FamilyDashboardScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('home');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [education, setEducation] = useState<any>(null);
  const [relativeStats, setRelativeStats] = useState<any>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [linkEmail, setLinkEmail] = useState('');
  const [linking, setLinking] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [eduRes, statsRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/family/education`),
        authenticatedFetch(`${BACKEND_URL}/api/family/relative-stats`),
      ]);

      if (eduRes.ok) {
        const eduData = await eduRes.json();
        setEducation(eduData);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setRelativeStats(statsData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleLinkRelative = async () => {
    if (!linkEmail.trim()) {
      Alert.alert('Error', 'Por favor ingresa el email de tu familiar');
      return;
    }

    setLinking(true);
    try {
      const response = await authenticatedFetch(`${BACKEND_URL}/api/family/link-relative`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ relative_email: linkEmail.trim() }),
      });

      const data = await response.json();
      Alert.alert(
        data.success ? 'Solicitud enviada' : 'Error',
        data.message
      );

      if (data.success) {
        setLinkEmail('');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo enviar la solicitud');
    } finally {
      setLinking(false);
    }
  };

  const openEducationDetail = (section: any) => {
    router.push({
      pathname: '/education-detail',
      params: { section: JSON.stringify(section) },
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#5B21B6', '#7C3AED', '#8B5CF6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.headerTitle}>Apoyo Familiar</Text>
              <Text style={styles.headerSubtitle}>
                Estás haciendo algo importante ❤️
              </Text>
            </View>
            <TouchableOpacity
              style={styles.profileBtn}
              onPress={() => router.push('/(tabs)/profile')}
            >
              <Ionicons name="person-circle" size={36} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={styles.tabsContainer}>
            {TABS.map((tab) => (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.tab,
                  activeTab === tab.id && styles.tabActive,
                ]}
                onPress={() => setActiveTab(tab.id)}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={18}
                  color={activeTab === tab.id ? '#8B5CF6' : 'rgba(255,255,255,0.7)'}
                />
                <Text
                  style={[
                    styles.tabText,
                    activeTab === tab.id && styles.tabTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Home Tab */}
        {activeTab === 'home' && (
          <View style={styles.tabContent}>
            {/* Welcome Card */}
            <View style={styles.welcomeCard}>
              <Ionicons name="heart" size={32} color="#8B5CF6" />
              <Text style={styles.welcomeTitle}>Bienvenido/a</Text>
              <Text style={styles.welcomeText}>
                Apoyar a un ser querido con adicción es difícil. Esta app te ayudará a entender, establecer límites y cuidarte a ti mismo/a.
              </Text>
            </View>

            {/* Quick Actions */}
            <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
            <View style={styles.quickActions}>
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => setActiveTab('learn')}
              >
                <View style={[styles.actionIcon, { backgroundColor: 'rgba(139, 92, 246, 0.2)' }]}>
                  <Ionicons name="book" size={24} color="#8B5CF6" />
                </View>
                <Text style={styles.actionTitle}>Aprende</Text>
                <Text style={styles.actionDesc}>Contenido educativo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => router.push('/(tabs)/centers')}
              >
                <View style={[styles.actionIcon, { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
                  <Ionicons name="medical" size={24} color="#10B981" />
                </View>
                <Text style={styles.actionTitle}>Buscar Ayuda</Text>
                <Text style={styles.actionDesc}>Centros y terapeutas</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => setActiveTab('relative')}
              >
                <View style={[styles.actionIcon, { backgroundColor: 'rgba(59, 130, 246, 0.2)' }]}>
                  <Ionicons name="person" size={24} color="#3B82F6" />
                </View>
                <Text style={styles.actionTitle}>Mi Familiar</Text>
                <Text style={styles.actionDesc}>Ver progreso</Text>
              </TouchableOpacity>
            </View>

            {/* Emergency Card */}
            <TouchableOpacity
              style={styles.emergencyCard}
              onPress={() => {
                Alert.alert(
                  '🆘 Números de Emergencia',
                  'Emergencias: 131\nFono Drogas SENDA: 1412\nSalud Responde: 600 360 7777',
                  [{ text: 'Cerrar' }]
                );
              }}
            >
              <Ionicons name="call" size={24} color="#EF4444" />
              <View style={styles.emergencyContent}>
                <Text style={styles.emergencyTitle}>¿Emergencia?</Text>
                <Text style={styles.emergencySubtitle}>Toca para ver números de ayuda</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>
        )}

        {/* Learn Tab */}
        {activeTab === 'learn' && education && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Contenido Educativo</Text>
            <Text style={styles.sectionSubtitle}>
              Aprende a apoyar sin habilitar
            </Text>

            {Object.entries(education).map(([key, section]: [string, any]) => (
              <View key={key} style={styles.educationSection}>
                <TouchableOpacity
                  style={styles.educationHeader}
                  onPress={() =>
                    setExpandedSection(expandedSection === key ? null : key)
                  }
                >
                  <View style={styles.educationTitleRow}>
                    <Text style={styles.educationTitle}>{section.title}</Text>
                    <Ionicons
                      name={expandedSection === key ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color="#8B5CF6"
                    />
                  </View>
                  {section.description && (
                    <Text style={styles.educationDesc}>{section.description}</Text>
                  )}
                </TouchableOpacity>

                {expandedSection === key && section.sections && (
                  <View style={styles.sectionsList}>
                    {section.sections.map((item: any, index: number) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.sectionItem}
                        onPress={() => openEducationDetail(item)}
                      >
                        <Ionicons
                          name={item.icon || 'document-text'}
                          size={22}
                          color="#8B5CF6"
                        />
                        <Text style={styles.sectionItemText}>{item.title}</Text>
                        <Ionicons name="chevron-forward" size={18} color="#6B7280" />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            ))}

            {/* Support Groups */}
            <View style={styles.supportCard}>
              <Ionicons name="people" size={32} color="#10B981" />
              <Text style={styles.supportTitle}>Grupos de Apoyo</Text>
              <Text style={styles.supportText}>
                No estás solo/a. Millones de familias pasan por esto.
              </Text>
              <View style={styles.supportLinks}>
                <TouchableOpacity
                  style={styles.supportLink}
                  onPress={() => Linking.openURL('https://al-anon.org')}
                >
                  <Text style={styles.supportLinkText}>Al-Anon</Text>
                  <Ionicons name="open-outline" size={16} color="#10B981" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.supportLink}
                  onPress={() => Linking.openURL('https://nar-anon.org')}
                >
                  <Text style={styles.supportLinkText}>Nar-Anon</Text>
                  <Ionicons name="open-outline" size={16} color="#10B981" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Relative Tab */}
        {activeTab === 'relative' && (
          <View style={styles.tabContent}>
            {relativeStats?.linked ? (
              <>
                {/* Relative Status */}
                <View style={styles.relativeCard}>
                  <View style={styles.relativeHeader}>
                    <View style={styles.relativeAvatar}>
                      <Ionicons name="person" size={36} color="#8B5CF6" />
                    </View>
                    <View style={styles.relativeInfo}>
                      <Text style={styles.relativeName}>
                        {relativeStats.relative.name}
                      </Text>
                      <Text style={styles.relativeRole}>
                        {relativeStats.relative.role === 'active_user'
                          ? 'En el Reto de 21 días'
                          : 'En recuperación'}
                      </Text>
                    </View>
                  </View>

                  {/* Stats Grid */}
                  <View style={styles.statsGrid}>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>
                        {relativeStats.relative.days_clean}
                      </Text>
                      <Text style={styles.statLabel}>Días limpio</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>
                        {relativeStats.relative.habit_completion}%
                      </Text>
                      <Text style={styles.statLabel}>Hábitos hoy</Text>
                    </View>
                    <View style={styles.statItem}>
                      <View
                        style={[
                          styles.emotionBadge,
                          relativeStats.relative.emotional_state === 'Positivo' && styles.emotionPositive,
                          relativeStats.relative.emotional_state === 'Neutral' && styles.emotionNeutral,
                          relativeStats.relative.emotional_state === 'Necesita apoyo' && styles.emotionNegative,
                        ]}
                      >
                        <Text style={styles.emotionText}>
                          {relativeStats.relative.emotional_state}
                        </Text>
                      </View>
                      <Text style={styles.statLabel}>Estado emocional</Text>
                    </View>
                  </View>

                  {/* Challenge Progress */}
                  {relativeStats.relative.challenge_day > 0 && (
                    <View style={styles.challengeProgress}>
                      <Text style={styles.challengeLabel}>
                        Día {relativeStats.relative.challenge_day} de {relativeStats.relative.challenge_total}
                      </Text>
                      <View style={styles.progressBar}>
                        <View
                          style={[
                            styles.progressFill,
                            {
                              width: `${(relativeStats.relative.challenge_day / relativeStats.relative.challenge_total) * 100}%`,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  )}
                </View>

                {/* Tips */}
                <View style={styles.tipsCard}>
                  <Text style={styles.tipsTitle}>💡 Cómo apoyar hoy</Text>
                  <Text style={styles.tipText}>
                    • Pregúntale cómo se siente sin presionar{"\n"}
                    • Celebra los pequeños logros{"\n"}
                    • Recuerda cuidar tu propio bienestar
                  </Text>
                </View>
              </>
            ) : (
              <>
                {/* Not Linked */}
                <View style={styles.notLinkedCard}>
                  <Ionicons name="link" size={48} color="#8B5CF6" />
                  <Text style={styles.notLinkedTitle}>Vincula a tu familiar</Text>
                  <Text style={styles.notLinkedText}>
                    Conecta con tu familiar para ver su progreso y recibir actualizaciones (con su aprobación).
                  </Text>

                  <View style={styles.linkInputContainer}>
                    <Ionicons name="mail" size={20} color="#6B7280" />
                    <TextInput
                      style={styles.linkInput}
                      placeholder="Email de tu familiar"
                      placeholderTextColor="#6B7280"
                      value={linkEmail}
                      onChangeText={setLinkEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>

                  <TouchableOpacity
                    style={styles.linkButton}
                    onPress={handleLinkRelative}
                    disabled={linking}
                  >
                    {linking ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="link" size={20} color="#FFFFFF" />
                        <Text style={styles.linkButtonText}>Enviar solicitud</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <Text style={styles.privacyNote}>
                    🔒 Tu familiar deberá aprobar la vinculación
                  </Text>
                </View>
              </>
            )}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => {}}
        >
          <Ionicons name="home" size={24} color="#8B5CF6" />
          <Text style={[styles.navLabel, { color: '#8B5CF6' }]}>Inicio</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push('/(tabs)/centers')}
        >
          <Ionicons name="medical" size={24} color="#6B7280" />
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
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  profileBtn: {
    padding: 4,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginTop: 20,
    marginHorizontal: 20,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  tabTextActive: {
    color: '#8B5CF6',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 20,
  },
  welcomeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 12,
  },
  welcomeText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  actionCard: {
    width: '31%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  actionDesc: {
    fontSize: 10,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 2,
  },
  emergencyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  emergencyContent: {
    flex: 1,
    marginLeft: 12,
  },
  emergencyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
  },
  emergencySubtitle: {
    fontSize: 12,
    color: '#EF4444',
  },
  educationSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  educationHeader: {
    padding: 18,
  },
  educationTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  educationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  educationDesc: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  sectionsList: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  sectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  sectionItemText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  supportCard: {
    backgroundColor: '#ECFDF5',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginTop: 20,
  },
  supportTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#065F46',
    marginTop: 10,
  },
  supportText: {
    fontSize: 14,
    color: '#047857',
    textAlign: 'center',
    marginTop: 8,
  },
  supportLinks: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
  },
  supportLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  supportLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  relativeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  relativeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  relativeAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  relativeInfo: {
    marginLeft: 16,
  },
  relativeName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  relativeRole: {
    fontSize: 14,
    color: '#8B5CF6',
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#8B5CF6',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  emotionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  emotionPositive: {
    backgroundColor: '#D1FAE5',
  },
  emotionNeutral: {
    backgroundColor: '#FEF3C7',
  },
  emotionNegative: {
    backgroundColor: '#FEE2E2',
  },
  emotionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  challengeProgress: {
    marginTop: 20,
  },
  challengeLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#8B5CF6',
    borderRadius: 4,
  },
  tipsCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 18,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 10,
  },
  tipText: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 24,
  },
  notLinkedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  notLinkedTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 16,
  },
  notLinkedText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 8,
    marginBottom: 20,
  },
  linkInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    width: '100%',
    gap: 10,
  },
  linkInput: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingVertical: 14,
    width: '100%',
    marginTop: 16,
    gap: 8,
  },
  linkButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  privacyNote: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 16,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
  },
  navLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
  },
});
