import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { authenticatedFetch, getBackendURL } from '../utils/api';

const BACKEND_URL = getBackendURL();

export default function RecommendationsScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await authenticatedFetch(`${BACKEND_URL}/api/profile`);
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const openWebsite = () => {
    Linking.openURL('https://sinadicciones.cl');
  };

  const getPersonalizedAnalysis = () => {
    if (!profile) return [];

    const analysis = [];

    // Análisis de años de consumo
    if (profile.years_using) {
      if (profile.years_using >= 10) {
        analysis.push({
          icon: 'alert-circle',
          color: '#EF4444',
          title: 'Adicción de larga data',
          description: `Has vivido con esta adicción por ${profile.years_using} años. La recuperación es un proceso gradual, pero cada día limpio es una victoria importante.`,
        });
      } else if (profile.years_using >= 5) {
        analysis.push({
          icon: 'warning',
          color: '#F59E0B',
          title: 'Experiencia significativa con la adicción',
          description: `${profile.years_using} años de consumo indican que la adicción ha sido parte importante de tu vida. Es fundamental construir nuevas rutinas saludables.`,
        });
      } else {
        analysis.push({
          icon: 'information-circle',
          color: '#3B82F6',
          title: 'Identificación temprana',
          description: 'Has reconocido el problema relativamente pronto, lo cual es positivo para tu recuperación.',
        });
      }
    }

    // Análisis de patología dual
    if (profile.dual_diagnosis && profile.diagnoses.length > 0) {
      analysis.push({
        icon: 'medical',
        color: '#8B5CF6',
        title: 'Patología Dual Identificada',
        description: `Has identificado condiciones como ${profile.diagnoses.join(', ')}. Es crucial un tratamiento integral que aborde tanto la adicción como tu salud mental.`,
      });
    }

    // Análisis de gatillos
    if (profile.triggers.length > 5) {
      analysis.push({
        icon: 'alert',
        color: '#EF4444',
        title: 'Múltiples gatillos identificados',
        description: `Has identificado ${profile.triggers.length} gatillos. Es importante trabajar en estrategias de afrontamiento para cada uno.`,
      });
    } else if (profile.triggers.length > 0) {
      analysis.push({
        icon: 'shield-checkmark',
        color: '#10B981',
        title: 'Autoconocimiento de gatillos',
        description: 'Conocer tus gatillos es el primer paso para evitarlos o manejarlos efectivamente.',
      });
    }

    // Análisis de factores protectores
    if (profile.protective_factors.length >= 3) {
      analysis.push({
        icon: 'checkmark-circle',
        color: '#10B981',
        title: 'Buenos recursos de apoyo',
        description: `Has identificado ${profile.protective_factors.length} factores protectores. Estos serán tu escudo en momentos difíciles.`,
      });
    } else if (profile.protective_factors.length > 0) {
      analysis.push({
        icon: 'construct',
        color: '#F59E0B',
        title: 'Construye más recursos',
        description: 'Es recomendable ampliar tu red de apoyo y actividades protectoras.',
      });
    }

    return analysis;
  };

  const getRecommendations = () => {
    if (!profile) return [];

    const recommendations = [];

    // Recomendación de tratamiento profesional
    const needsProfessionalHelp =
      profile.years_using >= 5 ||
      profile.dual_diagnosis ||
      profile.triggers.length > 5 ||
      profile.protective_factors.length < 2;

    if (needsProfessionalHelp) {
      recommendations.push({
        icon: 'person',
        color: '#8B5CF6',
        title: 'Tratamiento Profesional Recomendado',
        description: 'Basado en tu perfil, es altamente recomendable que busques apoyo profesional especializado en adicciones.',
        priority: 'high',
      });
    }

    // Recomendación de grupos de apoyo
    recommendations.push({
      icon: 'people',
      color: '#3B82F6',
      title: 'Grupos de Apoyo',
      description: 'Considera unirte a grupos como Alcohólicos Anónimos (AA), Narcóticos Anónimos (NA) o grupos de apoyo específicos para tu adicción.',
      priority: 'high',
    });

    // Si tiene patología dual
    if (profile.dual_diagnosis) {
      recommendations.push({
        icon: 'fitness',
        color: '#EC4899',
        title: 'Atención de Salud Mental',
        description: 'Es fundamental que recibas tratamiento paralelo para tus condiciones de salud mental. Un psiquiatra o psicólogo especializado puede ayudarte.',
        priority: 'high',
      });
    }

    // Recomendaciones generales
    recommendations.push({
      icon: 'barbell',
      color: '#10B981',
      title: 'Actividad Física',
      description: 'El ejercicio regular ayuda a reducir la ansiedad, mejorar el estado de ánimo y fortalecer tu recuperación.',
      priority: 'medium',
    });

    recommendations.push({
      icon: 'moon',
      color: '#6366F1',
      title: 'Rutinas Saludables',
      description: 'Establece horarios regulares de sueño, alimentación y actividades. La estructura ayuda en la recuperación.',
      priority: 'medium',
    });

    if (profile.triggers.includes('Soledad') || profile.triggers.includes('soledad')) {
      recommendations.push({
        icon: 'chatbubbles',
        color: '#F59E0B',
        title: 'Conexión Social',
        description: 'Has identificado la soledad como gatillo. Mantén contacto regular con tu red de apoyo y busca actividades grupales.',
        priority: 'high',
      });
    }

    return recommendations;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Cargando...</Text>
      </View>
    );
  }

  const analysis = getPersonalizedAnalysis();
  const recommendations = getRecommendations();

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#8B5CF6', '#EC4899']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.homeButton}
            onPress={() => router.push('/(tabs)/home')}
          >
            <Ionicons name="home" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerTitle}>Tu Perfil de Recuperación</Text>
        <Text style={styles.headerSubtitle}>Análisis y recomendaciones personalizadas</Text>
      </LinearGradient>

      <ScrollView style={styles.content}>
        {/* Disclaimer */}
        <View style={styles.disclaimerCard}>
          <View style={styles.disclaimerHeader}>
            <Ionicons name="information-circle" size={24} color="#F59E0B" />
            <Text style={styles.disclaimerTitle}>Información Importante</Text>
          </View>
          <Text style={styles.disclaimerText}>
            Esta información es solo una guía educativa y <Text style={styles.bold}>NO reemplaza</Text> el diagnóstico,
            tratamiento o consejo de un profesional de la salud. Si necesitas ayuda profesional, por favor contacta
            con especialistas en adicciones.
          </Text>
        </View>

        {/* Análisis Personalizado */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Análisis de tu perfil</Text>
          {analysis.map((item, index) => (
            <View key={index} style={styles.analysisCard}>
              <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
                <Ionicons name={item.icon as any} size={28} color={item.color} />
              </View>
              <View style={styles.analysisContent}>
                <Text style={styles.analysisTitle}>{item.title}</Text>
                <Text style={styles.analysisDescription}>{item.description}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Recomendaciones */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💡 Recomendaciones</Text>
          {recommendations.map((item, index) => (
            <View
              key={index}
              style={[
                styles.recommendationCard,
                item.priority === 'high' && styles.highPriority,
              ]}
            >
              <View style={styles.recommendationHeader}>
                <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
                  <Ionicons name={item.icon as any} size={24} color={item.color} />
                </View>
                {item.priority === 'high' && (
                  <View style={styles.priorityBadge}>
                    <Text style={styles.priorityText}>Prioritario</Text>
                  </View>
                )}
              </View>
              <Text style={styles.recommendationTitle}>{item.title}</Text>
              <Text style={styles.recommendationDescription}>{item.description}</Text>
            </View>
          ))}
        </View>

        {/* Contacto Profesional */}
        <View style={styles.section}>
          <View style={styles.contactCard}>
            <LinearGradient
              colors={['#10B981', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.contactGradient}
            >
              <Ionicons name="call" size={32} color="#FFFFFF" />
              <Text style={styles.contactTitle}>¿Necesitas ayuda profesional?</Text>
              <Text style={styles.contactDescription}>
                Contáctanos en sinadicciones.cl para orientación y apoyo profesional en adicciones
              </Text>
              <TouchableOpacity style={styles.contactButton} onPress={openWebsite}>
                <Text style={styles.contactButtonText}>Visitar sinadicciones.cl</Text>
                <Ionicons name="arrow-forward" size={20} color="#10B981" />
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </View>

        {/* Líneas de ayuda */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📞 Líneas de ayuda 24/7</Text>
          <View style={styles.helplineCard}>
            <View style={styles.helplineItem}>
              <Text style={styles.helplineTitle}>Salud Responde (Chile)</Text>
              <TouchableOpacity
                style={styles.phoneButton}
                onPress={() => Linking.openURL('tel:600 360 7777')}
              >
                <Ionicons name="call" size={20} color="#10B981" />
                <Text style={styles.phoneText}>600 360 7777</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.helplineItem}>
              <Text style={styles.helplineTitle}>SENDA Previene</Text>
              <TouchableOpacity
                style={styles.phoneButton}
                onPress={() => Linking.openURL('tel:1412')}
              >
                <Ionicons name="call" size={20} color="#10B981" />
                <Text style={styles.phoneText}>1412</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Botón para continuar */}
        <TouchableOpacity
          style={styles.continueButton}
          onPress={() => router.replace('/(tabs)/home')}
        >
          <Text style={styles.continueButtonText}>Ir al inicio</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>

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
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  homeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#FAE8FF',
  },
  content: {
    flex: 1,
  },
  disclaimerCard: {
    backgroundColor: '#FEF3C7',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  disclaimerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  disclaimerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#92400E',
    marginLeft: 8,
  },
  disclaimerText: {
    fontSize: 14,
    color: '#78350F',
    lineHeight: 20,
  },
  bold: {
    fontWeight: 'bold',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  analysisCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  analysisContent: {
    flex: 1,
  },
  analysisTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  analysisDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  recommendationCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  highPriority: {
    borderWidth: 2,
    borderColor: '#EF4444',
  },
  recommendationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  priorityBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#EF4444',
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  recommendationDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  contactCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  contactGradient: {
    padding: 24,
    alignItems: 'center',
  },
  contactTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  contactDescription: {
    fontSize: 14,
    color: '#F0FDF4',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  contactButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10B981',
  },
  helplineCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  helplineItem: {
    marginBottom: 16,
  },
  helplineTitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  phoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  phoneText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10B981',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    gap: 8,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
