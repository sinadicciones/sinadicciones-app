import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authenticatedFetch, getBackendURL } from '../../utils/api';
import { Svg, Polygon, Circle, Line as SvgLine, Text as SvgText } from 'react-native-svg';

const BACKEND_URL = getBackendURL();
const { width } = Dimensions.get('window');

const AREAS = [
  { key: 'health', label: 'Salud Física', icon: 'fitness', color: '#10B981' },
  { key: 'relationships', label: 'Relaciones', icon: 'people', color: '#3B82F6' },
  { key: 'work', label: 'Trabajo/Carrera', icon: 'briefcase', color: '#8B5CF6' },
  { key: 'personal', label: 'Desarrollo Personal', icon: 'school', color: '#EC4899' },
  { key: 'spiritual', label: 'Espiritualidad', icon: 'sparkles', color: '#F59E0B' },
  { key: 'finances', label: 'Finanzas', icon: 'cash', color: '#EF4444' },
];

// Definiciones de tipos de propósito
const PURPOSE_TYPES: { [key: string]: { description: string; strengths: string[]; tips: string[] } } = {
  'Cuidador': {
    description: 'Tu propósito se centra en el servicio y cuidado de otros. Encuentras significado en ayudar, proteger y apoyar a quienes te rodean. Tu empatía y compasión son tus mayores fortalezas.',
    strengths: ['Empatía profunda', 'Capacidad de escucha', 'Generosidad natural', 'Conexión emocional'],
    tips: [
      'Recuerda cuidarte a ti mismo primero para poder cuidar a otros',
      'Establece límites saludables para evitar el agotamiento',
      'Tu recuperación te permite ser un mejor apoyo para otros',
    ],
  },
  'Creador': {
    description: 'Tu propósito está en la expresión creativa y la innovación. Encuentras significado al crear, diseñar y dar vida a nuevas ideas. Tu imaginación y originalidad son tus mayores dones.',
    strengths: ['Pensamiento innovador', 'Expresión artística', 'Visión única', 'Resolución creativa'],
    tips: [
      'Usa la creatividad como herramienta de sanación',
      'Documenta tus ideas y proyectos creativos',
      'La sobriedad libera tu verdadero potencial creativo',
    ],
  },
  'Líder': {
    description: 'Tu propósito es guiar, inspirar y empoderar a otros. Tienes una capacidad natural para tomar decisiones y motivar al cambio positivo.',
    strengths: ['Visión clara', 'Capacidad de influencia', 'Toma de decisiones', 'Inspirar a otros'],
    tips: [
      'Lidera con el ejemplo en tu recuperación',
      'Usa tu influencia para crear impacto positivo',
      'Tu historia puede inspirar a otros en su camino',
    ],
  },
  'Explorador': {
    description: 'Tu propósito está en el descubrimiento y la aventura. Buscas nuevas experiencias, conocimiento y crecimiento constante.',
    strengths: ['Curiosidad infinita', 'Adaptabilidad', 'Apertura mental', 'Valentía'],
    tips: [
      'Explora nuevas formas saludables de vivir',
      'Tu curiosidad te llevará a descubrir tu mejor versión',
      'Cada día en sobriedad es una nueva aventura',
    ],
  },
  'Sabio': {
    description: 'Tu propósito es buscar y compartir conocimiento. Valoras la verdad, el aprendizaje y la comprensión profunda.',
    strengths: ['Análisis profundo', 'Búsqueda de verdad', 'Reflexión', 'Compartir sabiduría'],
    tips: [
      'Aprende de tu experiencia para ayudar a otros',
      'La reflexión es clave en tu recuperación',
      'Comparte tu conocimiento con quienes lo necesitan',
    ],
  },
  'Guerrero': {
    description: 'Tu propósito es superar desafíos y proteger lo que valoras. Tienes una fuerza interior extraordinaria y determinación.',
    strengths: ['Resiliencia', 'Determinación', 'Valentía', 'Protección'],
    tips: [
      'Tu fortaleza te ha traído hasta aquí',
      'Canaliza tu energía en batallas que valen la pena',
      'Cada día limpio es una victoria',
    ],
  },
};

export default function PurposeDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [areaRatings, setAreaRatings] = useState<any>({});
  const [showPurposeModal, setShowPurposeModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const response = await authenticatedFetch(`${BACKEND_URL}/api/purpose/stats`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
        setAreaRatings(data.latest_area_ratings || {});
      }
    } catch (error) {
      console.error('Failed to load purpose data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getPurposeInfo = () => {
    if (!stats?.purpose_type) return null;
    return PURPOSE_TYPES[stats.purpose_type] || PURPOSE_TYPES['Cuidador'];
  };

  const WheelOfLife = () => {
    const centerX = 150;
    const centerY = 150;
    const maxRadius = 120;
    const numSides = 6;
    
    const createPolygonPoints = () => {
      const points: string[] = [];
      AREAS.forEach((area, index) => {
        const angle = (Math.PI * 2 * index) / numSides - Math.PI / 2;
        const rating = areaRatings[area.key] || 5;
        const radius = (rating / 10) * maxRadius;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        points.push(`${x},${y}`);
      });
      return points.join(' ');
    };

    const guideCircles = [2, 4, 6, 8, 10].map((value) => {
      const radius = (value / 10) * maxRadius;
      return (
        <Circle
          key={value}
          cx={centerX}
          cy={centerY}
          r={radius}
          stroke="#E5E7EB"
          strokeWidth="1"
          fill="none"
        />
      );
    });

    const axisLines = AREAS.map((area, index) => {
      const angle = (Math.PI * 2 * index) / numSides - Math.PI / 2;
      const x = centerX + maxRadius * Math.cos(angle);
      const y = centerY + maxRadius * Math.sin(angle);
      return (
        <SvgLine
          key={area.key}
          x1={centerX}
          y1={centerY}
          x2={x}
          y2={y}
          stroke="#D1D5DB"
          strokeWidth="1"
        />
      );
    });

    const labels = AREAS.map((area, index) => {
      const angle = (Math.PI * 2 * index) / numSides - Math.PI / 2;
      const labelRadius = maxRadius + 30;
      const x = centerX + labelRadius * Math.cos(angle);
      const y = centerY + labelRadius * Math.sin(angle);
      
      return (
        <SvgText
          key={area.key}
          x={x}
          y={y}
          fontSize="12"
          fill="#6B7280"
          textAnchor="middle"
          alignmentBaseline="middle"
        >
          {area.label.split(' ')[0]}
        </SvgText>
      );
    });

    return (
      <Svg height="320" width="300" style={styles.wheelSvg}>
        {guideCircles}
        {axisLines}
        <Polygon
          points={createPolygonPoints()}
          fill="rgba(245, 158, 11, 0.3)"
          stroke="#F59E0B"
          strokeWidth="2"
        />
        {labels}
      </Svg>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Cargando...</Text>
      </View>
    );
  }

  // If test not completed, show prompt
  if (!stats?.test_completed) {
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
          <Text style={styles.headerTitle}>Sobriedad con Sentido</Text>
          <Text style={styles.headerSubtitle}>Construye tu vida con propósito</Text>
        </LinearGradient>

        <ScrollView style={styles.content} contentContainerStyle={styles.centerContent}>
          <Ionicons name="compass" size={80} color="#F59E0B" />
          <Text style={styles.emptyTitle}>Descubre tu propósito</Text>
          <Text style={styles.emptyText}>
            Responde un test de 12 preguntas para descubrir tus valores, fortalezas y construir un plan de vida significativo.
          </Text>
          <TouchableOpacity
            style={styles.startButton}
            onPress={() => router.push('/purpose/test')}
          >
            <Text style={styles.startButtonText}>Comenzar Test</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const purposeInfo = getPurposeInfo();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={['#F59E0B', '#EF4444']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.helpButton} onPress={() => setShowGuideModal(true)}>
            <Ionicons name="help-circle-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerTitle}>Sobriedad con Sentido</Text>
        <Text style={styles.headerSubtitle}>Tu camino hacia una vida significativa</Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Days Working on Vision */}
        {stats.days_working_on_vision > 0 && (
          <View style={styles.daysCard}>
            <LinearGradient
              colors={['#F59E0B', '#D97706']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.daysGradient}
            >
              <Ionicons name="flame" size={40} color="#FFFFFF" />
              <Text style={styles.daysNumber}>{stats.days_working_on_vision}</Text>
              <Text style={styles.daysLabel}>Días trabajando en tu visión</Text>
            </LinearGradient>
          </View>
        )}

        {/* Purpose Type Badge - Now expandable */}
        {stats.purpose_type && (
          <TouchableOpacity 
            style={styles.purposeCard}
            onPress={() => setShowPurposeModal(true)}
            activeOpacity={0.8}
          >
            <View style={styles.purposeHeader}>
              <View>
                <Text style={styles.purposeLabel}>Tu tipo de propósito:</Text>
                <Text style={styles.purposeType}>{stats.purpose_type}</Text>
              </View>
              <View style={styles.expandButton}>
                <Text style={styles.expandButtonText}>Ver más</Text>
                <Ionicons name="chevron-forward" size={16} color="#F59E0B" />
              </View>
            </View>
            <View style={styles.valuesContainer}>
              {stats.top_values?.map((value: string) => (
                <View key={value} style={styles.valueBadge}>
                  <Text style={styles.valueText}>{value}</Text>
                </View>
              ))}
            </View>
          </TouchableOpacity>
        )}

        {/* Wheel of Life */}
        <View style={styles.wheelCard}>
          <Text style={styles.cardTitle}>🎯 Rueda de la Vida</Text>
          <Text style={styles.cardSubtitle}>
            Tu equilibrio actual en las 6 áreas clave
          </Text>
          <View style={styles.wheelContainer}>
            <WheelOfLife />
          </View>
          <Text style={styles.wheelHelper}>
            Toca las áreas abajo para ver detalles y crear objetivos SMART
          </Text>
        </View>

        {/* Areas Grid */}
        <View style={styles.areasGrid}>
          {AREAS.map((area) => (
            <TouchableOpacity
              key={area.key}
              style={styles.areaCard}
              onPress={() => router.push(`/purpose/${area.key}`)}
            >
              <View style={[styles.areaIconContainer, { backgroundColor: area.color + '20' }]}>
                <Ionicons name={area.icon as any} size={24} color={area.color} />
              </View>
              <Text style={styles.areaLabel}>{area.label}</Text>
              <View style={styles.areaProgress}>
                <View
                  style={[
                    styles.areaProgressBar,
                    {
                      width: `${areaRatings[area.key] * 10 || 50}%`,
                      backgroundColor: area.color,
                    },
                  ]}
                />
              </View>
              <Text style={styles.areaRating}>{areaRatings[area.key] || 5}/10</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Acciones</Text>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/purpose/goals')}
          >
            <Ionicons name="flag" size={24} color="#F59E0B" />
            <View style={styles.actionContent}>
              <Text style={styles.actionButtonText}>Mis objetivos SMART</Text>
              <Text style={styles.actionButtonSubtext}>Específicos, Medibles, Alcanzables</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/purpose/checkin')}
          >
            <Ionicons name="checkmark-circle" size={24} color="#10B981" />
            <View style={styles.actionContent}>
              <Text style={styles.actionButtonText}>Check-in semanal</Text>
              <Text style={styles.actionButtonSubtext}>Evalúa tu progreso</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/purpose/inspiration')}
          >
            <Ionicons name="bulb" size={24} color="#8B5CF6" />
            <View style={styles.actionContent}>
              <Text style={styles.actionButtonText}>Biblioteca de inspiración</Text>
              <Text style={styles.actionButtonSubtext}>Frases, historias y ejercicios</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Purpose Type Modal */}
      <Modal visible={showPurposeModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tu Tipo: {stats?.purpose_type}</Text>
              <TouchableOpacity onPress={() => setShowPurposeModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              {purposeInfo && (
                <>
                  <Text style={styles.modalDescription}>{purposeInfo.description}</Text>
                  
                  <Text style={styles.modalSectionTitle}>💪 Tus Fortalezas</Text>
                  <View style={styles.strengthsContainer}>
                    {purposeInfo.strengths.map((strength, index) => (
                      <View key={index} style={styles.strengthBadge}>
                        <Ionicons name="star" size={14} color="#F59E0B" />
                        <Text style={styles.strengthText}>{strength}</Text>
                      </View>
                    ))}
                  </View>

                  <Text style={styles.modalSectionTitle}>💡 Consejos para tu Recuperación</Text>
                  {purposeInfo.tips.map((tip, index) => (
                    <View key={index} style={styles.tipCard}>
                      <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                      <Text style={styles.tipText}>{tip}</Text>
                    </View>
                  ))}

                  <Text style={styles.modalSectionTitle}>🎯 Valores que te definen</Text>
                  <View style={styles.valuesModalContainer}>
                    {stats?.top_values?.map((value: string) => (
                      <View key={value} style={styles.valueModalBadge}>
                        <Text style={styles.valueModalText}>{value}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowPurposeModal(false)}
            >
              <Text style={styles.modalButtonText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Guide Modal - How to use */}
      <Modal visible={showGuideModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>¿Cómo usar esta sección?</Text>
              <TouchableOpacity onPress={() => setShowGuideModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.guideSection}>
                <View style={styles.guideIcon}>
                  <Ionicons name="compass" size={32} color="#F59E0B" />
                </View>
                <Text style={styles.guideTitle}>1. Descubre tu Propósito</Text>
                <Text style={styles.guideText}>
                  El test inicial identifica tu tipo de propósito, valores y fortalezas. Esto te ayuda a entender qué te motiva en la vida.
                </Text>
              </View>

              <View style={styles.guideSection}>
                <View style={styles.guideIcon}>
                  <Ionicons name="pie-chart" size={32} color="#3B82F6" />
                </View>
                <Text style={styles.guideTitle}>2. Rueda de la Vida</Text>
                <Text style={styles.guideText}>
                  Visualiza tu equilibrio en 6 áreas clave. Identifica qué áreas necesitan más atención para una vida balanceada.
                </Text>
              </View>

              <View style={styles.guideSection}>
                <View style={styles.guideIcon}>
                  <Ionicons name="flag" size={32} color="#10B981" />
                </View>
                <Text style={styles.guideTitle}>3. Objetivos SMART</Text>
                <Text style={styles.guideText}>
                  Crea objetivos en cada área que sean:{'\n'}
                  • <Text style={styles.bold}>S</Text>pecíficos{'\n'}
                  • <Text style={styles.bold}>M</Text>edibles{'\n'}
                  • <Text style={styles.bold}>A</Text>lcanzables{'\n'}
                  • <Text style={styles.bold}>R</Text>elevantes{'\n'}
                  • <Text style={styles.bold}>T</Text>emporales
                </Text>
              </View>

              <View style={styles.guideSection}>
                <View style={styles.guideIcon}>
                  <Ionicons name="calendar" size={32} color="#8B5CF6" />
                </View>
                <Text style={styles.guideTitle}>4. Check-in Semanal</Text>
                <Text style={styles.guideText}>
                  Cada semana evalúa tu progreso, celebra logros y ajusta tu plan. La consistencia es clave en la recuperación.
                </Text>
              </View>

              <View style={styles.guideHighlight}>
                <Ionicons name="heart" size={24} color="#EF4444" />
                <Text style={styles.guideHighlightText}>
                  "Sobriedad con Sentido" te ayuda a construir una vida que vale la pena vivir, no solo evitar el uso de sustancias.
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowGuideModal(false)}
            >
              <Text style={styles.modalButtonText}>¡Comenzar!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
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
    paddingTop: 10,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  backButton: {
    padding: 4,
  },
  helpButton: {
    padding: 4,
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
  content: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 24,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    gap: 8,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  daysCard: {
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  daysGradient: {
    padding: 32,
    alignItems: 'center',
  },
  daysNumber: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 12,
  },
  daysLabel: {
    fontSize: 16,
    color: '#FEF3C7',
    marginTop: 8,
    textAlign: 'center',
  },
  purposeCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginTop: 0,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  purposeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  purposeLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  purposeType: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F59E0B',
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  expandButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F59E0B',
  },
  valuesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  valueBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  valueText: {
    fontSize: 14,
    color: '#D97706',
    fontWeight: '600',
  },
  wheelCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginTop: 0,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
  },
  wheelContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelSvg: {
    alignSelf: 'center',
  },
  wheelHelper: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 12,
  },
  areasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    gap: 12,
  },
  areaCard: {
    width: (width - 56) / 2,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  areaIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  areaLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  areaProgress: {
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  areaProgressBar: {
    height: '100%',
    borderRadius: 3,
  },
  areaRating: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  actionsSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    gap: 12,
  },
  actionContent: {
    flex: 1,
  },
  actionButtonText: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '600',
  },
  actionButtonSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  modalDescription: {
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 24,
    marginBottom: 24,
  },
  modalSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
    marginTop: 8,
  },
  strengthsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  strengthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  strengthText: {
    fontSize: 14,
    color: '#D97706',
    fontWeight: '600',
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#166534',
    lineHeight: 20,
  },
  valuesModalContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  valueModalBadge: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  valueModalText: {
    fontSize: 14,
    color: '#7C3AED',
    fontWeight: '600',
  },
  modalButton: {
    backgroundColor: '#F59E0B',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  // Guide modal styles
  guideSection: {
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  guideIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  guideTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  guideText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  bold: {
    fontWeight: 'bold',
    color: '#F59E0B',
  },
  guideHighlight: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  guideHighlightText: {
    flex: 1,
    fontSize: 14,
    color: '#991B1B',
    fontStyle: 'italic',
    lineHeight: 20,
  },
});
