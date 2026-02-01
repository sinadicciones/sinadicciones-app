import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Modal,
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
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState<any>(null);

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
        detailedInfo: {
          title: 'Por qué necesitas tratamiento profesional',
          content: `Basándome en tu perfil:\n\n• Años de consumo: ${profile.years_using || 0} años\n• Patología dual: ${profile.dual_diagnosis ? 'Sí' : 'No'}\n• Gatillos identificados: ${profile.triggers.length}\n• Factores protectores: ${profile.protective_factors.length}\n\nUn profesional puede ayudarte con:\n\n1. **Evaluación completa**: Diagnóstico preciso de tu situación\n2. **Plan de tratamiento personalizado**: Adaptado a tus necesidades específicas\n3. **Terapia individual**: Espacio seguro para trabajar traumas y patrones\n4. **Manejo de síntomas**: Control de ansiedad, depresión y craving\n5. **Prevención de recaídas**: Estrategias específicas para tu perfil\n6. **Medicación si es necesaria**: Especialmente en patología dual\n\nRecuerda: Pedir ayuda es un signo de fortaleza, no de debilidad.`,
          actions: ['Agenda tu primera sesión', 'Busca centros especializados cercanos'],
        },
      });
    }

    // Recomendación de grupos de apoyo
    recommendations.push({
      icon: 'people',
      color: '#3B82F6',
      title: 'Grupos de Apoyo',
      description: 'Considera unirte a grupos como Alcohólicos Anónimos (AA), Narcóticos Anónimos (NA) o grupos de apoyo específicos para tu adicción.',
      priority: 'high',
      detailedInfo: {
        title: 'Beneficios de los grupos de apoyo',
        content: `Los grupos de apoyo son fundamentales en la recuperación:\n\n**Beneficios principales:**\n\n1. **Sentido de pertenencia**: No estás solo en esto\n2. **Experiencias compartidas**: Aprende de quienes han pasado por lo mismo\n3. **Apoyo 24/7**: Siempre hay alguien disponible\n4. **Accountability**: Te ayuda a mantenerte comprometido\n5. **Herramientas prácticas**: Aprende estrategias que funcionan\n6. **Padrinos/Mentores**: Guía de alguien con más tiempo limpio\n\n**Grupos recomendados en Chile:**\n\n• Alcohólicos Anónimos (AA): www.aa.cl\n• Narcóticos Anónimos (NA): www.na.org.ar\n• Jugadores Anónimos: Para adicción al juego\n• Al-Anon: Para familiares\n\n**Cómo empezar:**\n1. Busca reuniones cerca de tu ubicación\n2. Asiste a varias para encontrar donde te sientas cómodo\n3. No tienes que hablar la primera vez, solo escucha\n4. Considera conseguir un padrino después de algunas semanas`,
        actions: ['Buscar reuniones cercanas', 'Asistir a tu primera reunión'],
      },
    });

    // Si tiene patología dual
    if (profile.dual_diagnosis) {
      recommendations.push({
        icon: 'fitness',
        color: '#EC4899',
        title: 'Atención de Salud Mental',
        description: 'Es fundamental que recibas tratamiento paralelo para tus condiciones de salud mental. Un psiquiatra o psicólogo especializado puede ayudarte.',
        priority: 'high',
        detailedInfo: {
          title: 'Tratamiento integral de patología dual',
          content: `Has identificado las siguientes condiciones: ${profile.diagnoses.join(', ')}\n\n**Por qué es crucial tratar ambos:**\n\nLa adicción y los trastornos mentales se alimentan mutuamente. Tratar solo uno no es suficiente.\n\n**Lo que necesitas:**\n\n1. **Psiquiatra**: Para evaluación y medicación si es necesaria\n   - Antidepresivos\n   - Estabilizadores del ánimo\n   - Medicación para ansiedad\n   - Control del craving\n\n2. **Psicólogo/Terapeuta**: Para terapia regular\n   - Terapia Cognitivo-Conductual (TCC)\n   - Terapia Dialéctico-Conductual (TDC)\n   - EMDR para trauma\n\n3. **Seguimiento continuo**: No es algo de una vez\n\n**Señales de alerta:**\n• Pensamientos de hacerte daño\n• Ideación suicida\n• Crisis de pánico\n• Episodios de ira incontrolable\n• Aislamiento extremo\n\n⚠️ Si experimentas alguna de estas, busca ayuda inmediata.`,
          actions: ['Agendar evaluación psiquiátrica', 'Llamar a Salud Responde: 600 360 7777'],
        },
      });
    }

    // Recomendaciones generales
    recommendations.push({
      icon: 'barbell',
      color: '#10B981',
      title: 'Actividad Física',
      description: 'El ejercicio regular ayuda a reducir la ansiedad, mejorar el estado de ánimo y fortalecer tu recuperación.',
      priority: 'medium',
      detailedInfo: {
        title: 'Ejercicio como herramienta de recuperación',
        content: `El ejercicio es una de las mejores herramientas naturales:\n\n**Beneficios científicamente comprobados:**\n\n1. **Produce endorfinas**: El "high natural"\n2. **Reduce el craving**: Disminuye el deseo de consumir\n3. **Mejora el sueño**: Fundamental en recuperación\n4. **Reduce ansiedad y depresión**: Tan efectivo como medicación\n5. **Estructura tu día**: Crea rutina saludable\n6. **Mejora autoestima**: Te ves y sientes mejor\n\n**Recomendaciones prácticas:**\n\n• Caminar 30 minutos diarios\n• Trotar/correr 3 veces por semana\n• Yoga o Pilates para mindfulness\n• Natación (muy terapéutica)\n• Gimnasio con rutina estructurada\n• Deportes de equipo (fútbol, básquet)\n\n**Tips para empezar:**\n1. Empieza pequeño: 10 minutos es suficiente\n2. Hazlo a la misma hora cada día\n3. Encuentra algo que disfrutes\n4. Consigue un compañero de ejercicio\n5. Celebra cada logro pequeño`,
        actions: ['Hacer caminata de 10 minutos hoy', 'Buscar gimnasio o parque cercano'],
      },
    });

    recommendations.push({
      icon: 'moon',
      color: '#6366F1',
      title: 'Rutinas Saludables',
      description: 'Establece horarios regulares de sueño, alimentación y actividades. La estructura ayuda en la recuperación.',
      priority: 'medium',
      detailedInfo: {
        title: 'La importancia de la rutina',
        content: `La estructura es tu aliada en la recuperación:\n\n**Por qué las rutinas son cruciales:**\n\n1. **Reducen decisiones**: Menos espacio para autosabotaje\n2. **Crean estabilidad**: Tu cerebro necesita predictibilidad\n3. **Evitan tiempos muertos**: Los momentos peligrosos\n4. **Construyen disciplina**: Fortaleza mental\n\n**Rutina recomendada:**\n\n**Mañana (6:00-9:00)**\n• Despierta a la misma hora\n• Hidratación inmediata (2 vasos de agua)\n• Ejercicio ligero o meditación\n• Desayuno nutritivo\n• Revisar tu "Para Qué"\n\n**Día (9:00-18:00)**\n• Trabajo/estudio estructurado\n• Comidas a horas fijas\n• Pausas activas cada 2 horas\n• Evitar lugares/personas gatillo\n\n**Tarde (18:00-21:00)**\n• Ejercicio o actividad recreativa\n• Cena saludable\n• Tiempo con familia/amigos\n• Reunión de apoyo si es tu día\n\n**Noche (21:00-22:00)**\n• Sin pantallas 1 hora antes de dormir\n• Registro del día (app)\n• Gratitud: 3 cosas buenas del día\n• Lectura o relajación\n\n**Sueño (22:00-6:00)**\n• 7-8 horas no negociables\n• Ambiente oscuro y fresco\n• Misma hora siempre`,
        actions: ['Crear horario de sueño', 'Planificar semana'],
      },
    });

    if (profile.triggers.includes('Soledad') || profile.triggers.includes('soledad')) {
      recommendations.push({
        icon: 'chatbubbles',
        color: '#F59E0B',
        title: 'Conexión Social',
        description: 'Has identificado la soledad como gatillo. Mantén contacto regular con tu red de apoyo y busca actividades grupales.',
        priority: 'high',
        detailedInfo: {
          title: 'Combatiendo la soledad',
          content: `La soledad es un gatillo muy común y peligroso:\n\n**Por qué la soledad es peligrosa:**\n• Tiempo para pensar en consumir\n• Nadie que te detenga\n• Pensamientos negativos se amplifican\n• Falta de accountability\n\n**Estrategias inmediatas (cuando te sientes solo):**\n\n1. **Llamar a alguien**: No importa la hora\n   - Tu padrino/mentor\n   - Familiar de confianza\n   - Línea de ayuda 1412\n\n2. **Salir de casa**: Ir a un lugar público\n   - Café\n   - Biblioteca\n   - Parque\n   - Centro comercial\n\n3. **Reunión virtual o presencial**: Siempre hay una\n\n**Estrategias a largo plazo:**\n\n• Voluntariado regular\n• Clases grupales (yoga, idiomas, cocina)\n• Deportes de equipo\n• Grupos de interés (lectura, senderismo)\n• Comunidad religiosa/espiritual\n• Adoptar una mascota (responsabilidad)\n\n**Red de apoyo:**\nAsegúrate de tener al menos:\n• 1 padrino/mentor\n• 2-3 amigos en recuperación\n• 1 familiar de confianza\n• 1 profesional (terapeuta)\n\n**Activar tu red:**\n• Envía mensaje diario a alguien\n• Programa llamadas semanales\n• Comparte tus logros\n• Pide ayuda cuando la necesites`,
          actions: ['Llamar a un amigo ahora', 'Unirse a grupo social'],
        },
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
                <View style={styles.headerRight}>
                  {item.priority === 'high' && (
                    <View style={styles.priorityBadge}>
                      <Text style={styles.priorityText}>Prioritario</Text>
                    </View>
                  )}
                  {item.detailedInfo && (
                    <TouchableOpacity
                      style={styles.infoButton}
                      onPress={() => {
                        setSelectedRecommendation(item);
                        setShowInfoModal(true);
                      }}
                    >
                      <Ionicons name="information-circle" size={28} color={item.color} />
                    </TouchableOpacity>
                  )}
                </View>
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
              
              {/* Botón principal de agendar */}
              <TouchableOpacity 
                style={styles.scheduleButton} 
                onPress={() => Linking.openURL('https://sinadicciones.site.agendapro.com/cl/sucursal/446599')}
              >
                <Ionicons name="calendar" size={20} color="#FFFFFF" />
                <Text style={styles.scheduleButtonText}>
                  Asesórate con un profesional experto que te guíe
                </Text>
              </TouchableOpacity>

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

      {/* Modal de información detallada */}
      <Modal
        visible={showInfoModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowInfoModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.detailedModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedRecommendation?.detailedInfo?.title}
              </Text>
              <TouchableOpacity onPress={() => setShowInfoModal(false)}>
                <Ionicons name="close" size={28} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScroll}>
              <Text style={styles.modalContent}>
                {selectedRecommendation?.detailedInfo?.content}
              </Text>
              
              {selectedRecommendation?.detailedInfo?.actions && (
                <View style={styles.actionsSection}>
                  <Text style={styles.actionsSectionTitle}>Próximos pasos:</Text>
                  {selectedRecommendation.detailedInfo.actions.map((action: string, index: number) => (
                    <View key={index} style={styles.actionItem}>
                      <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                      <Text style={styles.actionText}>{action}</Text>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
            
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowInfoModal(false)}
            >
              <Text style={styles.modalCloseButtonText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoButton: {
    padding: 4,
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
  scheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  scheduleButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#059669',
    textAlign: 'center',
    flex: 1,
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
  detailedModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalScroll: {
    maxHeight: 500,
  },
  modalContent: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 24,
    marginBottom: 24,
  },
  actionsSection: {
    backgroundColor: '#F0FDF4',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  actionsSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#059669',
    marginBottom: 12,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  actionText: {
    fontSize: 14,
    color: '#047857',
    flex: 1,
  },
  modalCloseButton: {
    backgroundColor: '#10B981',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  modalCloseButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
