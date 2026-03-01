import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Modal,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { authenticatedFetch, getBackendURL } from '../utils/api';

const BACKEND_URL = getBackendURL();

// Recomendaciones específicas por gatillo
const TRIGGER_RECOMMENDATIONS: Record<string, any> = {
  'Estrés': {
    title: 'Manejo del Estrés',
    icon: 'fitness',
    color: '#EF4444',
    tips: [
      'Practica respiración diafragmática 4-7-8 cuando sientas tensión',
      'Realiza ejercicio físico regular (30 min diarios)',
      'Identifica las fuentes de estrés y trabaja en reducirlas',
      'Considera técnicas como yoga o tai chi',
    ],
    habit: { name: 'Meditación anti-estrés', icon: '🧘', frequency: 'daily' },
  },
  'Soledad': {
    title: 'Combatir la Soledad',
    icon: 'people',
    color: '#3B82F6',
    tips: [
      'Asiste a reuniones de grupos de apoyo (AA, NA)',
      'Llama a tu padrino o contacto de emergencia',
      'Participa en actividades comunitarias',
      'Considera adoptar una mascota',
    ],
    habit: { name: 'Llamar a alguien', icon: '📞', frequency: 'daily' },
  },
  'Conflictos': {
    title: 'Gestión de Conflictos',
    icon: 'chatbubbles',
    color: '#F59E0B',
    tips: [
      'Aprende técnicas de comunicación asertiva',
      'Practica el "time-out" antes de reaccionar',
      'Busca resolver conflictos cuando estés calmado',
      'Considera terapia de pareja o familiar si es necesario',
    ],
    habit: { name: 'Escribir antes de reaccionar', icon: '📝', frequency: 'daily' },
  },
  'Emociones negativas': {
    title: 'Regulación Emocional',
    icon: 'heart-dislike',
    color: '#EC4899',
    tips: [
      'Practica el reconocimiento y nombrado de emociones',
      'Usa la técnica HALT: Hambre, Enojo, Soledad, Cansancio',
      'Escribe un diario emocional',
      'Habla con alguien de confianza sobre cómo te sientes',
    ],
    habit: { name: 'Diario emocional', icon: '📖', frequency: 'daily' },
  },
  'Aburrimiento': {
    title: 'Vencer el Aburrimiento',
    icon: 'game-controller',
    color: '#10B981',
    tips: [
      'Desarrolla nuevos hobbies y pasatiempos',
      'Crea una lista de actividades para momentos de ocio',
      'Aprende algo nuevo (idioma, instrumento, arte)',
      'Mantén una rutina estructurada',
    ],
    habit: { name: 'Actividad creativa', icon: '🎨', frequency: 'daily' },
  },
  'Celebraciones': {
    title: 'Navegando Celebraciones',
    icon: 'wine',
    color: '#8B5CF6',
    tips: [
      'Planifica con anticipación eventos sociales',
      'Ten siempre una bebida sin alcohol en la mano',
      'Identifica aliados en las reuniones',
      'Permítete salir temprano si es necesario',
    ],
    habit: { name: 'Plan de salida', icon: '🚪', frequency: 'weekly' },
  },
  'Ciertos lugares': {
    title: 'Evitar Lugares de Riesgo',
    icon: 'location',
    color: '#06B6D4',
    tips: [
      'Identifica y evita lugares asociados al consumo',
      'Planifica rutas alternativas',
      'Si debes ir, hazlo acompañado',
      'Crea nuevos lugares "seguros" para socializar',
    ],
    habit: { name: 'Revisar ruta diaria', icon: '🗺️', frequency: 'daily' },
  },
  'Personas del pasado': {
    title: 'Relaciones del Pasado',
    icon: 'person-remove',
    color: '#EF4444',
    tips: [
      'Establece límites claros con personas que consumen',
      'No temas alejarte de amistades tóxicas',
      'Construye nuevas relaciones en grupos de recuperación',
      'Comunica tus necesidades de forma clara',
    ],
    habit: { name: 'Evaluar relaciones', icon: '👥', frequency: 'weekly' },
  },
};

// Recomendaciones por factor protector
const PROTECTIVE_RECOMMENDATIONS: Record<string, any> = {
  'Ejercicio': {
    boost: 'El ejercicio libera endorfinas naturales que reducen el craving',
    goal: 'Aumenta gradualmente a 150 minutos semanales',
  },
  'Meditación': {
    boost: 'La meditación fortalece tu autocontrol y reduce la impulsividad',
    goal: 'Practica 10-20 minutos diarios, preferiblemente por la mañana',
  },
  'Reuniones de apoyo': {
    boost: 'Los grupos de apoyo reducen el aislamiento y proveen modelos a seguir',
    goal: 'Asiste al menos a 90 reuniones en 90 días al inicio',
  },
  'Padrino/Mentor': {
    boost: 'Tener un padrino aumenta significativamente las tasas de éxito',
    goal: 'Habla con tu padrino al menos 3 veces por semana',
  },
  'Familia': {
    boost: 'El apoyo familiar es uno de los mejores predictores de recuperación',
    goal: 'Comunica tu proceso y necesidades a tu familia',
  },
  'Trabajo/Estudio': {
    boost: 'Tener propósito diario reduce el tiempo de ocio peligroso',
    goal: 'Mantén una rutina laboral o de estudio estable',
  },
  'Terapia': {
    boost: 'La terapia profesional aborda las causas raíz de la adicción',
    goal: 'Asiste semanalmente y realiza las tareas entre sesiones',
  },
  'Fe/Espiritualidad': {
    boost: 'La espiritualidad provee significado y comunidad',
    goal: 'Dedica tiempo diario a tu práctica espiritual',
  },
};

export default function RecommendationsScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [habits, setHabits] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [profileRes, habitsRes] = await Promise.all([
        authenticatedFetch(`${BACKEND_URL}/api/profile`),
        authenticatedFetch(`${BACKEND_URL}/api/habits`),
      ]);
      
      if (profileRes.ok) {
        setProfile(await profileRes.json());
      }
      if (habitsRes.ok) {
        setHabits(await habitsRes.json());
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createHabit = async (habit: any) => {
    try {
      const response = await authenticatedFetch(`${BACKEND_URL}/api/habits`, {
        method: 'POST',
        body: JSON.stringify({
          name: habit.name,
          icon: habit.icon,
          frequency: habit.frequency,
          color: '#10B981',
        }),
      });
      if (response.ok) {
        loadData();
        alert(`Hábito "${habit.name}" creado exitosamente`);
      }
    } catch (error) {
      console.error('Failed to create habit:', error);
    }
  };

  const habitExists = (habitName: string) => {
    return habits.some(h => h.name.toLowerCase() === habitName.toLowerCase());
  };

  const openSinAdicciones = () => {
    Linking.openURL('https://sinadicciones.org');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Analizando tu perfil...</Text>
      </View>
    );
  }

  const triggers = profile?.triggers || [];
  const protectiveFactors = profile?.protective_factors || [];
  const diagnoses = profile?.diagnoses || [];
  const yearsUsing = profile?.years_using || 0;
  const myWhy = profile?.my_why || '';
  const priorityAreas = profile?.priority_life_areas || [];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#10B981', '#3B82F6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity 
            style={styles.headerBackBtn}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Mi Plan de Recuperación</Text>
            <Text style={styles.headerSubtitle}>Tu guía personalizada hacia una vida libre</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Tu Reto - Resumen de Recuperación */}
        <View style={styles.retoSection}>
          <View style={styles.retoHeader}>
            <Ionicons name="flag" size={22} color="#F59E0B" />
            <Text style={styles.retoTitle}>Tu Reto</Text>
          </View>
          <View style={styles.retoCards}>
            <View style={styles.retoCard}>
              <Text style={styles.retoCardLabel}>Tipo de adicción</Text>
              <Text style={styles.retoCardValue}>{profile?.addiction_type || 'No especificado'}</Text>
            </View>
            <View style={styles.retoCardHighlight}>
              <Text style={styles.retoCardLabel}>Días en recuperación</Text>
              <Text style={styles.retoCardValueBig}>{profile?.days_clean || 0} días</Text>
            </View>
          </View>
        </View>

        {/* Mis Gatillos como Tags */}
        {triggers.length > 0 && (
          <View style={styles.tagsSection}>
            <View style={styles.tagsSectionHeader}>
              <Ionicons name="alert-circle" size={20} color="#EF4444" />
              <Text style={styles.tagsSectionTitle}>Mis Gatillos</Text>
            </View>
            <View style={styles.tagsContainer}>
              {triggers.map((trigger: string, index: number) => (
                <View key={index} style={styles.triggerTag}>
                  <Text style={styles.triggerTagText}>{trigger}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Mis Factores Protectores como Tags */}
        {protectiveFactors.length > 0 && (
          <View style={styles.tagsSection}>
            <View style={styles.tagsSectionHeader}>
              <Ionicons name="shield-checkmark" size={20} color="#10B981" />
              <Text style={styles.tagsSectionTitle}>Mis Factores Protectores</Text>
            </View>
            <View style={styles.tagsContainer}>
              {protectiveFactors.map((factor: string, index: number) => (
                <View key={index} style={styles.protectorTag}>
                  <Text style={styles.protectorTagText}>{factor}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Mi Para Qué - Recordatorio */}
        {myWhy && (
          <View style={styles.whyCard}>
            <View style={styles.whyHeader}>
              <Ionicons name="heart" size={24} color="#EF4444" />
              <Text style={styles.whyTitle}>Tu "Para Qué"</Text>
            </View>
            <Text style={styles.whyText}>"{myWhy}"</Text>
            <Text style={styles.whyReminder}>Recuerda esto cuando la tentación llegue</Text>
            
            {/* Fotos de Mi Para Qué */}
            {profile?.my_why_photos && profile.my_why_photos.length > 0 && (
              <View style={styles.whyPhotosContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {profile.my_why_photos.map((photo: string, index: number) => (
                    <Image key={index} source={{ uri: photo }} style={styles.whyPhoto} />
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        )}

        {/* Contactos de Emergencia */}
        {profile?.emergency_contacts && profile.emergency_contacts.length > 0 && (
          <View style={styles.emergencySection}>
            <View style={styles.emergencyHeader}>
              <Ionicons name="call" size={22} color="#EF4444" />
              <Text style={styles.emergencyTitle}>Contactos de Emergencia</Text>
            </View>
            {profile.emergency_contacts.map((contact: any, index: number) => (
              <TouchableOpacity 
                key={index} 
                style={styles.emergencyContact}
                onPress={() => Linking.openURL(`tel:${contact.phone}`)}
              >
                <View style={styles.emergencyContactInfo}>
                  <Text style={styles.emergencyContactName}>{contact.name}</Text>
                  <Text style={styles.emergencyContactRelation}>{contact.relationship || 'Contacto de apoyo'}</Text>
                </View>
                <View style={styles.emergencyCallBtn}>
                  <Ionicons name="call" size={20} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Red de Apoyo */}
        {profile?.support_network && profile.support_network.length > 0 && (
          <View style={styles.supportSection}>
            <View style={styles.supportHeader}>
              <Ionicons name="people" size={22} color="#8B5CF6" />
              <Text style={styles.supportTitle}>Tu Red de Apoyo</Text>
            </View>
            <View style={styles.supportList}>
              {profile.support_network.map((person: string, index: number) => (
                <View key={index} style={styles.supportPerson}>
                  <Ionicons name="person-circle" size={24} color="#8B5CF6" />
                  <Text style={styles.supportPersonName}>{person}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Análisis de Riesgo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Tu Análisis Personal</Text>
          
          {/* Años de consumo */}
          <View style={[styles.analysisCard, { borderLeftColor: yearsUsing >= 10 ? '#EF4444' : yearsUsing >= 5 ? '#F59E0B' : '#10B981' }]}>
            <Ionicons name="time" size={24} color={yearsUsing >= 10 ? '#EF4444' : yearsUsing >= 5 ? '#F59E0B' : '#10B981'} />
            <View style={styles.analysisContent}>
              <Text style={styles.analysisTitle}>
                {yearsUsing >= 10 ? 'Adicción de larga data' : yearsUsing >= 5 ? 'Experiencia significativa' : 'Identificación temprana'}
              </Text>
              <Text style={styles.analysisDesc}>
                {yearsUsing} años de consumo. {yearsUsing >= 10 
                  ? 'Considera tratamiento residencial o intensivo.' 
                  : yearsUsing >= 5 
                    ? 'Un programa estructurado puede ayudarte mucho.'
                    : 'Has dado el primer paso a tiempo, ¡felicitaciones!'}
              </Text>
            </View>
          </View>

          {/* Patología Dual */}
          {diagnoses.length > 0 && (
            <View style={[styles.analysisCard, { borderLeftColor: '#8B5CF6' }]}>
              <Ionicons name="medical" size={24} color="#8B5CF6" />
              <View style={styles.analysisContent}>
                <Text style={styles.analysisTitle}>Patología Dual Identificada</Text>
                <Text style={styles.analysisDesc}>
                  Has identificado: {diagnoses.join(', ')}. Es crucial tratar ambas condiciones simultáneamente.
                </Text>
              </View>
            </View>
          )}

          {/* Áreas prioritarias */}
          {priorityAreas.length > 0 && (
            <View style={[styles.analysisCard, { borderLeftColor: '#06B6D4' }]}>
              <Ionicons name="flag" size={24} color="#06B6D4" />
              <View style={styles.analysisContent}>
                <Text style={styles.analysisTitle}>Tus Áreas Prioritarias</Text>
                <Text style={styles.analysisDesc}>
                  {priorityAreas.join(', ')}. Enfócate en mejorar estas áreas durante tu recuperación.
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Estrategias por Gatillo */}
        {triggers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚠️ Estrategias para tus Gatillos</Text>
            <Text style={styles.sectionSubtitle}>
              Has identificado {triggers.length} gatillos. Aquí tienes estrategias específicas:
            </Text>
            
            {triggers.map((trigger: string, index: number) => {
              const rec = TRIGGER_RECOMMENDATIONS[trigger];
              if (!rec) return null;
              
              return (
                <TouchableOpacity 
                  key={index}
                  style={styles.triggerCard}
                  onPress={() => {
                    setSelectedItem(rec);
                    setShowInfoModal(true);
                  }}
                >
                  <View style={[styles.triggerIcon, { backgroundColor: rec.color + '20' }]}>
                    <Ionicons name={rec.icon} size={24} color={rec.color} />
                  </View>
                  <View style={styles.triggerContent}>
                    <Text style={styles.triggerTitle}>{trigger}</Text>
                    <Text style={styles.triggerTip}>{rec.tips[0]}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Potencia tus Factores Protectores */}
        {protectiveFactors.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💪 Potencia tus Fortalezas</Text>
            <Text style={styles.sectionSubtitle}>
              Tus {protectiveFactors.length} factores protectores son tu escudo:
            </Text>
            
            {protectiveFactors.map((factor: string, index: number) => {
              const rec = PROTECTIVE_RECOMMENDATIONS[factor];
              if (!rec) return null;
              
              return (
                <View key={index} style={styles.protectiveCard}>
                  <View style={styles.protectiveHeader}>
                    <Ionicons name="shield-checkmark" size={20} color="#10B981" />
                    <Text style={styles.protectiveName}>{factor}</Text>
                  </View>
                  <Text style={styles.protectiveBoost}>{rec.boost}</Text>
                  <View style={styles.protectiveGoal}>
                    <Ionicons name="flag" size={16} color="#3B82F6" />
                    <Text style={styles.protectiveGoalText}>{rec.goal}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Hábitos Recomendados */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✅ Hábitos Recomendados</Text>
          <Text style={styles.sectionSubtitle}>
            Basado en tus gatillos, te recomendamos estos hábitos:
          </Text>
          
          {triggers.map((trigger: string, index: number) => {
            const rec = TRIGGER_RECOMMENDATIONS[trigger];
            if (!rec?.habit) return null;
            
            const exists = habitExists(rec.habit.name);
            
            return (
              <View key={index} style={styles.habitRecCard}>
                <Text style={styles.habitRecIcon}>{rec.habit.icon}</Text>
                <View style={styles.habitRecContent}>
                  <Text style={styles.habitRecName}>{rec.habit.name}</Text>
                  <Text style={styles.habitRecFor}>Para manejar: {trigger}</Text>
                </View>
                {exists ? (
                  <View style={styles.habitExistsBadge}>
                    <Ionicons name="checkmark" size={16} color="#10B981" />
                    <Text style={styles.habitExistsText}>Activo</Text>
                  </View>
                ) : (
                  <TouchableOpacity 
                    style={styles.addHabitBtn}
                    onPress={() => createHabit(rec.habit)}
                  >
                    <Ionicons name="add" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>

        {/* Recursos Profesionales */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏥 Recursos Profesionales</Text>
          
          <TouchableOpacity style={styles.resourceCard} onPress={openSinAdicciones}>
            <LinearGradient
              colors={['#10B981', '#059669']}
              style={styles.resourceGradient}
            >
              <Ionicons name="globe" size={32} color="#FFFFFF" />
              <View style={styles.resourceContent}>
                <Text style={styles.resourceTitle}>SinAdicciones.cl</Text>
                <Text style={styles.resourceDesc}>Directorio de centros de rehabilitación en Chile</Text>
              </View>
              <Ionicons name="open-outline" size={24} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.resourceCard} 
            onPress={() => router.push('/(tabs)/centers')}
          >
            <LinearGradient
              colors={['#3B82F6', '#2563EB']}
              style={styles.resourceGradient}
            >
              <Ionicons name="location" size={32} color="#FFFFFF" />
              <View style={styles.resourceContent}>
                <Text style={styles.resourceTitle}>Centros Cercanos</Text>
                <Text style={styles.resourceDesc}>Encuentra ayuda profesional cerca de ti</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Botón Comenzar */}
        <TouchableOpacity
          style={styles.startButton}
          onPress={() => router.replace('/(tabs)/home')}
        >
          <Text style={styles.startButtonText}>¡Comenzar mi Recuperación!</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal de Detalles */}
      <Modal
        visible={showInfoModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowInfoModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedItem?.title}</Text>
              <TouchableOpacity onPress={() => setShowInfoModal(false)}>
                <Ionicons name="close" size={28} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              {selectedItem?.tips?.map((tip: string, index: number) => (
                <View key={index} style={styles.tipItem}>
                  <View style={styles.tipNumber}>
                    <Text style={styles.tipNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
              
              {selectedItem?.habit && (
                <View style={styles.modalHabit}>
                  <Text style={styles.modalHabitTitle}>Hábito Sugerido:</Text>
                  <View style={styles.modalHabitCard}>
                    <Text style={styles.modalHabitIcon}>{selectedItem.habit.icon}</Text>
                    <Text style={styles.modalHabitName}>{selectedItem.habit.name}</Text>
                  </View>
                  {!habitExists(selectedItem.habit.name) && (
                    <TouchableOpacity 
                      style={styles.modalAddBtn}
                      onPress={() => {
                        createHabit(selectedItem.habit);
                        setShowInfoModal(false);
                      }}
                    >
                      <Text style={styles.modalAddBtnText}>Agregar este hábito</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </ScrollView>
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
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#D1FAE5',
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  whyCard: {
    backgroundColor: '#FEF2F2',
    margin: 16,
    padding: 16,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  whyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  whyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#991B1B',
  },
  whyText: {
    fontSize: 16,
    color: '#1F2937',
    fontStyle: 'italic',
    lineHeight: 24,
  },
  whyReminder: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
  },
  section: {
    padding: 16,
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
  analysisCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    alignItems: 'flex-start',
    gap: 12,
  },
  analysisContent: {
    flex: 1,
  },
  analysisTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  analysisDesc: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    lineHeight: 18,
  },
  triggerCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  triggerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  triggerContent: {
    flex: 1,
    marginLeft: 12,
  },
  triggerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  triggerTip: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  protectiveCard: {
    backgroundColor: '#ECFDF5',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  protectiveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  protectiveName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#065F46',
  },
  protectiveBoost: {
    fontSize: 13,
    color: '#047857',
    marginTop: 8,
    lineHeight: 18,
  },
  protectiveGoal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#A7F3D0',
  },
  protectiveGoalText: {
    fontSize: 12,
    color: '#3B82F6',
    flex: 1,
  },
  habitRecCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  habitRecIcon: {
    fontSize: 28,
  },
  habitRecContent: {
    flex: 1,
    marginLeft: 12,
  },
  habitRecName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
  },
  habitRecFor: {
    fontSize: 12,
    color: '#6B7280',
  },
  habitExistsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  habitExistsText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  addHabitBtn: {
    backgroundColor: '#10B981',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resourceCard: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  resourceGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  resourceContent: {
    flex: 1,
  },
  resourceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  resourceDesc: {
    fontSize: 12,
    color: '#D1FAE5',
  },
  startButton: {
    flexDirection: 'row',
    backgroundColor: '#10B981',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  modalBody: {
    padding: 20,
  },
  tipItem: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  tipNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tipNumberText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  tipText: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  modalHabit: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  modalHabitTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
  },
  modalHabitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalHabitIcon: {
    fontSize: 32,
  },
  modalHabitName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalAddBtn: {
    backgroundColor: '#10B981',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16,
  },
  modalAddBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  // Estilos para fotos de Mi Para Qué
  whyPhotosContainer: {
    marginTop: 16,
  },
  whyPhoto: {
    width: 100,
    height: 100,
    borderRadius: 12,
    marginRight: 10,
  },
  // Estilos para Contactos de Emergencia
  emergencySection: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  emergencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  emergencyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#991B1B',
    marginLeft: 8,
  },
  emergencyContact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  emergencyContactInfo: {
    flex: 1,
  },
  emergencyContactName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  emergencyContactRelation: {
    fontSize: 13,
    color: '#6B7280',
  },
  emergencyCallBtn: {
    backgroundColor: '#EF4444',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Estilos para Red de Apoyo
  supportSection: {
    backgroundColor: '#F5F3FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  supportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  supportTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#5B21B6',
    marginLeft: 8,
  },
  supportList: {
    gap: 8,
  },
  supportPerson: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 8,
  },
  supportPersonName: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
  },
  // Tu Reto section styles
  retoSection: {
    backgroundColor: '#1A1A1A',
    margin: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2D2D2D',
  },
  retoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  retoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  retoCards: {
    gap: 12,
  },
  retoCard: {
    backgroundColor: '#0D0D0D',
    padding: 14,
    borderRadius: 12,
  },
  retoCardHighlight: {
    backgroundColor: '#10B98115',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  retoCardLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  retoCardValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  retoCardValueBig: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#10B981',
  },
});
