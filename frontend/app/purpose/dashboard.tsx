import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
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

export default function PurposeDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [areaRatings, setAreaRatings] = useState<any>({});

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

  const WheelOfLife = () => {
    const centerX = 150;
    const centerY = 150;
    const maxRadius = 120;
    const numSides = 6;
    
    // Create polygon points based on ratings
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

    // Create guide circles
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

    // Create axis lines
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

    // Create labels
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
      <View style={styles.container}>
        <LinearGradient
          colors={['#F59E0B', '#EF4444']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
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
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#F59E0B', '#EF4444']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
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

        {/* Purpose Type Badge */}
        {stats.purpose_type && (
          <View style={styles.purposeCard}>
            <Text style={styles.purposeLabel}>Tu tipo de propósito:</Text>
            <Text style={styles.purposeType}>{stats.purpose_type}</Text>
            <View style={styles.valuesContainer}>
              {stats.top_values.map((value: string) => (
                <View key={value} style={styles.valueBadge}>
                  <Text style={styles.valueText}>{value}</Text>
                </View>
              ))}
            </View>
          </View>
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
            Toca las áreas abajo para ver detalles y objetivos
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
            <Ionicons name="list" size={24} color="#F59E0B" />
            <Text style={styles.actionButtonText}>Ver todos mis objetivos</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/purpose/checkin')}
          >
            <Ionicons name="checkmark-circle" size={24} color="#10B981" />
            <Text style={styles.actionButtonText}>Check-in semanal</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/purpose/inspiration')}
          >
            <Ionicons name="bulb" size={24} color="#8B5CF6" />
            <Text style={styles.actionButtonText}>Biblioteca de inspiración</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
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
  },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 24,
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
  purposeLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  purposeType: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F59E0B',
    marginBottom: 12,
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
  actionButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
});
