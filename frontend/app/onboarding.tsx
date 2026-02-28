import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { authenticatedFetch, getBackendURL } from '../utils/api';
import Slider from '@react-native-community/slider';

const BACKEND_URL = getBackendURL();
const TOTAL_STEPS = 10;

// Información educativa para cada sección
const INFO_CONTENT = {
  addiction_type: {
    title: '¿Qué es el tipo de adicción?',
    content: 'Identifica la sustancia o comportamiento principal que te ha causado problemas. Puede ser alcohol, drogas (cocaína, marihuana, etc.), juego, tecnología, etc. Ser específico ayuda a personalizar tu recuperación.',
  },
  years_using: {
    title: 'Años de consumo',
    content: 'Estimar cuánto tiempo has tenido problemas con tu adicción. No necesita ser exacto, pero ayuda a entender la magnitud del desafío y celebrar tu decisión de recuperarte.',
  },
  clean_since: {
    title: 'Fecha de inicio de recuperación',
    content: 'El día que decidiste comenzar tu recuperación. Esta fecha marca tu nuevo comienzo y te ayudará a llevar la cuenta de tu tiempo limpio.',
  },
  dual_diagnosis: {
    title: '¿Qué es la patología dual?',
    content: 'Muchas personas con adicciones también tienen condiciones de salud mental como depresión, ansiedad, TDAH o trastorno bipolar. Reconocer esto es importante para un tratamiento integral.',
  },
  triggers: {
    title: '¿Qué son los gatillos?',
    content: 'Son personas, lugares, emociones o situaciones que aumentan tu deseo de consumir. Ejemplos: ciertos amigos, bares, estrés, soledad, conflictos. Identificarlos te ayuda a evitarlos o prepararte.',
  },
  protective_factors: {
    title: 'Factores protectores',
    content: 'Son las cosas que te mantienen fuerte en recuperación: ejercicio, meditación, tu padrino, reuniones de apoyo, hobbies, familia, trabajo significativo. Son tu escudo contra las recaídas.',
  },
  my_why: {
    title: 'Tu "Para Qué"',
    content: 'Tu razón más profunda para estar limpio. No es "dejar de consumir" sino lo que quieres ganar: estar presente para tus hijos, recuperar tu salud, volver a ser tú mismo. Esto te motiva en momentos difíciles.',
  },
  emotional_baseline: {
    title: 'Estado emocional inicial',
    content: 'Conocer cómo te sientes ahora nos ayuda a medir tu progreso. A medida que avances en tu recuperación, podrás ver cómo mejora tu bienestar emocional.',
  },
  habits: {
    title: 'Hábitos saludables',
    content: 'Los hábitos positivos reemplazan los comportamientos dañinos. Pequeñas acciones diarias construyen una nueva identidad. Selecciona los que te gustaría desarrollar y los crearemos por ti.',
  },
  support_level: {
    title: 'Red de apoyo',
    content: 'Nadie se recupera solo. Tener un sistema de apoyo (terapeuta, grupo, familia, padrino) aumenta significativamente las posibilidades de éxito. Identifica tus recursos actuales.',
  },
  life_areas: {
    title: 'Áreas de vida',
    content: 'La adicción afecta todas las áreas de tu vida. Identificar cuáles quieres mejorar primero te ayuda a establecer metas claras y medir tu progreso integral.',
  },
};

// Emociones comunes
const COMMON_EMOTIONS = [
  { emoji: '😰', label: 'Ansiedad' },
  { emoji: '😢', label: 'Tristeza' },
  { emoji: '😤', label: 'Enojo' },
  { emoji: '😔', label: 'Culpa' },
  { emoji: '😨', label: 'Miedo' },
  { emoji: '😞', label: 'Vergüenza' },
  { emoji: '😴', label: 'Cansancio' },
  { emoji: '🤔', label: 'Confusión' },
  { emoji: '😊', label: 'Esperanza' },
  { emoji: '💪', label: 'Determinación' },
];

// Hábitos sugeridos
const SUGGESTED_HABITS = [
  { icon: '🏃', name: 'Ejercicio físico', color: '#10B981', frequency: 'daily' },
  { icon: '🧘', name: 'Meditación', color: '#8B5CF6', frequency: 'daily' },
  { icon: '📖', name: 'Lectura', color: '#3B82F6', frequency: 'daily' },
  { icon: '😴', name: 'Dormir 8 horas', color: '#6366F1', frequency: 'daily' },
  { icon: '🥗', name: 'Alimentación sana', color: '#F59E0B', frequency: 'daily' },
  { icon: '💧', name: 'Tomar agua', color: '#06B6D4', frequency: 'daily' },
  { icon: '📝', name: 'Escribir diario', color: '#EC4899', frequency: 'daily' },
  { icon: '🙏', name: 'Gratitud', color: '#F97316', frequency: 'daily' },
  { icon: '👥', name: 'Reunión de apoyo', color: '#14B8A6', frequency: 'weekly' },
  { icon: '📞', name: 'Llamar a mi padrino', color: '#EF4444', frequency: 'weekly' },
];

// Áreas de vida
const LIFE_AREAS = [
  { icon: '👨‍👩‍👧‍👦', label: 'Familia', color: '#EF4444' },
  { icon: '💼', label: 'Trabajo/Carrera', color: '#3B82F6' },
  { icon: '❤️', label: 'Salud física', color: '#10B981' },
  { icon: '🧠', label: 'Salud mental', color: '#8B5CF6' },
  { icon: '💑', label: 'Relaciones', color: '#EC4899' },
  { icon: '💰', label: 'Finanzas', color: '#F59E0B' },
  { icon: '🎯', label: 'Crecimiento personal', color: '#6366F1' },
  { icon: '🙏', label: 'Espiritualidad', color: '#14B8A6' },
  { icon: '🎨', label: 'Creatividad/Hobbies', color: '#F97316' },
  { icon: '🤝', label: 'Comunidad/Social', color: '#06B6D4' },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [showInfo, setShowInfo] = useState(false);
  const [currentInfo, setCurrentInfo] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  
  // Step 1-2: Adicción
  const [addictionType, setAddictionType] = useState('');
  const [yearsUsing, setYearsUsing] = useState('');
  const [cleanSince, setCleanSince] = useState('');
  
  // Step 3: Patología dual
  const [hasDualDiagnosis, setHasDualDiagnosis] = useState(false);
  const [diagnoses, setDiagnoses] = useState<string[]>([]);
  const [newDiagnosis, setNewDiagnosis] = useState('');
  
  // Step 4: Gatillos
  const [triggers, setTriggers] = useState<string[]>([]);
  const [newTrigger, setNewTrigger] = useState('');
  
  // Step 5: Factores protectores
  const [protectiveFactors, setProtectiveFactors] = useState<string[]>([]);
  const [newFactor, setNewFactor] = useState('');
  
  // Step 6: Mi Para Qué
  const [myWhy, setMyWhy] = useState('');
  
  // Step 7: Estado emocional inicial (NUEVO)
  const [initialMood, setInitialMood] = useState(5);
  const [frequentEmotions, setFrequentEmotions] = useState<string[]>([]);
  
  // Step 8: Hábitos deseados (NUEVO)
  const [selectedHabits, setSelectedHabits] = useState<typeof SUGGESTED_HABITS>([]);
  
  // Step 9: Nivel de apoyo (NUEVO)
  const [inTreatment, setInTreatment] = useState(false);
  const [hasTherapist, setHasTherapist] = useState(false);
  const [hasSupportGroup, setHasSupportGroup] = useState(false);
  const [supportGroupType, setSupportGroupType] = useState('');
  const [emergencyContact, setEmergencyContact] = useState({ name: '', phone: '', relationship: '' });
  
  // Step 10: Áreas de vida (NUEVO)
  const [priorityAreas, setPriorityAreas] = useState<string[]>([]);

  const COMMON_DIAGNOSES = ['Depresión', 'Ansiedad', 'TDAH', 'Trastorno Bipolar', 'Estrés Postraumático'];
  const COMMON_TRIGGERS = ['Estrés', 'Soledad', 'Conflictos', 'Ciertos lugares', 'Personas del pasado', 'Emociones negativas', 'Aburrimiento', 'Celebraciones'];
  const COMMON_FACTORS = ['Ejercicio', 'Meditación', 'Reuniones de apoyo', 'Padrino/Mentor', 'Familia', 'Trabajo/Estudio', 'Terapia', 'Fe/Espiritualidad'];
  const SUPPORT_GROUPS = ['AA', 'NA', 'CA', 'Jugadores Anónimos', 'SMART Recovery', 'Celebrate Recovery', 'Otro'];

  const showInfoModal = (key: string) => {
    setCurrentInfo(INFO_CONTENT[key as keyof typeof INFO_CONTENT]);
    setShowInfo(true);
  };

  const addItem = (list: string[], setList: (list: string[]) => void, item: string, setItem: (item: string) => void) => {
    if (item.trim() && !list.includes(item.trim())) {
      setList([...list, item.trim()]);
      setItem('');
    }
  };

  const removeItem = (list: string[], setList: (list: string[]) => void, index: number) => {
    setList(list.filter((_, i) => i !== index));
  };

  const toggleHabit = (habit: typeof SUGGESTED_HABITS[0]) => {
    if (selectedHabits.find(h => h.name === habit.name)) {
      setSelectedHabits(selectedHabits.filter(h => h.name !== habit.name));
    } else {
      setSelectedHabits([...selectedHabits, habit]);
    }
  };

  const toggleLifeArea = (area: string) => {
    if (priorityAreas.includes(area)) {
      setPriorityAreas(priorityAreas.filter(a => a !== area));
    } else if (priorityAreas.length < 3) {
      setPriorityAreas([...priorityAreas, area]);
    } else {
      Alert.alert('Máximo 3 áreas', 'Selecciona las 3 áreas más importantes para ti ahora');
    }
  };

  const getMoodEmoji = (mood: number) => {
    if (mood <= 2) return '😢';
    if (mood <= 4) return '😔';
    if (mood <= 6) return '😐';
    if (mood <= 8) return '🙂';
    return '😊';
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      // 1. Guardar perfil principal
      const profileData = {
        addiction_type: addictionType,
        years_using: yearsUsing ? parseInt(yearsUsing) : null,
        clean_since: cleanSince || null,
        dual_diagnosis: hasDualDiagnosis,
        diagnoses: diagnoses,
        triggers: triggers,
        protective_factors: protectiveFactors,
        my_why: myWhy,
        initial_mood: initialMood,
        frequent_emotions: frequentEmotions,
        in_treatment: inTreatment,
        has_therapist: hasTherapist,
        has_support_group: hasSupportGroup,
        support_group_type: supportGroupType,
        emergency_contacts: emergencyContact.name ? [emergencyContact] : [],
        priority_life_areas: priorityAreas,
        profile_completed: true,
      };

      const profileResponse = await authenticatedFetch(`${BACKEND_URL}/api/profile`, {
        method: 'PUT',
        body: JSON.stringify(profileData),
      });

      if (!profileResponse.ok) {
        throw new Error('Error al guardar perfil');
      }

      // 2. Crear hábitos seleccionados
      for (const habit of selectedHabits) {
        await authenticatedFetch(`${BACKEND_URL}/api/habits`, {
          method: 'POST',
          body: JSON.stringify({
            name: habit.name,
            icon: habit.icon,
            color: habit.color,
            frequency: habit.frequency,
          }),
        });
      }

      // 3. Registrar estado emocional inicial
      const today = new Date().toISOString().split('T')[0];
      await authenticatedFetch(`${BACKEND_URL}/api/emotional-logs`, {
        method: 'POST',
        body: JSON.stringify({
          date: today,
          mood_scale: initialMood,
          emotions: frequentEmotions,
          notes: 'Estado inicial al comenzar mi recuperación',
        }),
      });

      // 4. Guardar áreas de vida para propósito
      if (priorityAreas.length > 0) {
        await authenticatedFetch(`${BACKEND_URL}/api/purpose/areas`, {
          method: 'POST',
          body: JSON.stringify({
            areas: priorityAreas.map(area => ({
              name: area,
              score: 5, // Score inicial medio
              priority: true,
            })),
          }),
        });
      }

      router.replace('/recommendations');
    } catch (error) {
      console.error('Failed to save profile:', error);
      Alert.alert('Error', 'No se pudo guardar tu perfil. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const canContinue = () => {
    switch (step) {
      case 1: return addictionType.trim().length > 0;
      case 2: return cleanSince.length > 0;
      case 3: return true;
      case 4: return triggers.length > 0;
      case 5: return protectiveFactors.length > 0;
      case 6: return myWhy.trim().length > 0;
      case 7: return true; // Estado emocional siempre puede continuar
      case 8: return selectedHabits.length > 0;
      case 9: return true; // Apoyo es opcional
      case 10: return priorityAreas.length > 0;
      default: return false;
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 1: return '¿Cuál es tu adicción principal?';
      case 2: return '¿Cuándo comenzaste tu recuperación?';
      case 3: return '¿Tienes alguna condición de salud mental?';
      case 4: return '¿Cuáles son tus principales gatillos?';
      case 5: return '¿Qué te ayuda a mantenerte limpio?';
      case 6: return 'Tu "Para Qué" 🎯';
      case 7: return '¿Cómo te sientes hoy?';
      case 8: return '¿Qué hábitos quieres desarrollar?';
      case 9: return '¿Cuál es tu red de apoyo?';
      case 10: return '¿Qué áreas de tu vida quieres mejorar?';
      default: return '';
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['#10B981', '#3B82F6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Construye tu perfil</Text>
        <Text style={styles.headerSubtitle}>Paso {step} de {TOTAL_STEPS}</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progress, { width: `${(step / TOTAL_STEPS) * 100}%` }]} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Step 1: Tipo de adicción */}
        {step === 1 && (
          <View style={styles.stepContainer}>
            <View style={styles.titleRow}>
              <Text style={styles.stepTitle}>{getStepTitle()}</Text>
              <TouchableOpacity onPress={() => showInfoModal('addiction_type')}>
                <Ionicons name="information-circle" size={28} color="#3B82F6" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Ej: Alcohol, Cocaína, Juego, etc."
              placeholderTextColor="#9CA3AF"
              value={addictionType}
              onChangeText={setAddictionType}
              autoFocus
            />
            <TextInput
              style={styles.input}
              placeholder="¿Cuántos años aproximadamente?"
              placeholderTextColor="#9CA3AF"
              value={yearsUsing}
              onChangeText={setYearsUsing}
              keyboardType="numeric"
            />
          </View>
        )}

        {/* Step 2: Fecha limpio */}
        {step === 2 && (
          <View style={styles.stepContainer}>
            <View style={styles.titleRow}>
              <Text style={styles.stepTitle}>{getStepTitle()}</Text>
              <TouchableOpacity onPress={() => showInfoModal('clean_since')}>
                <Ionicons name="information-circle" size={28} color="#3B82F6" />
              </TouchableOpacity>
            </View>
            <Text style={styles.helperText}>Ingresa la fecha (AAAA-MM-DD)</Text>
            <TextInput
              style={styles.input}
              placeholder="2024-01-15"
              placeholderTextColor="#9CA3AF"
              value={cleanSince}
              onChangeText={setCleanSince}
              autoFocus
            />
          </View>
        )}

        {/* Step 3: Patología dual */}
        {step === 3 && (
          <View style={styles.stepContainer}>
            <View style={styles.titleRow}>
              <Text style={styles.stepTitle}>{getStepTitle()}</Text>
              <TouchableOpacity onPress={() => showInfoModal('dual_diagnosis')}>
                <Ionicons name="information-circle" size={28} color="#3B82F6" />
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => setHasDualDiagnosis(!hasDualDiagnosis)}
            >
              <Ionicons
                name={hasDualDiagnosis ? 'checkbox' : 'square-outline'}
                size={24}
                color="#10B981"
              />
              <Text style={styles.toggleText}>Sí, tengo diagnóstico de salud mental</Text>
            </TouchableOpacity>

            {hasDualDiagnosis && (
              <>
                <Text style={styles.sectionLabel}>Selecciona o agrega:</Text>
                <View style={styles.chipsContainer}>
                  {COMMON_DIAGNOSES.map((diag) => (
                    <TouchableOpacity
                      key={diag}
                      style={[styles.chip, diagnoses.includes(diag) && styles.chipSelected]}
                      onPress={() => {
                        if (diagnoses.includes(diag)) {
                          setDiagnoses(diagnoses.filter((d) => d !== diag));
                        } else {
                          setDiagnoses([...diagnoses, diag]);
                        }
                      }}
                    >
                      <Text style={[styles.chipText, diagnoses.includes(diag) && styles.chipTextSelected]}>
                        {diag}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="O escribe otro diagnóstico"
              placeholderTextColor="#9CA3AF"
                  value={newDiagnosis}
                  onChangeText={setNewDiagnosis}
                  onSubmitEditing={() => addItem(diagnoses, setDiagnoses, newDiagnosis, setNewDiagnosis)}
                />
              </>
            )}
          </View>
        )}

        {/* Step 4: Gatillos */}
        {step === 4 && (
          <View style={styles.stepContainer}>
            <View style={styles.titleRow}>
              <Text style={styles.stepTitle}>{getStepTitle()}</Text>
              <TouchableOpacity onPress={() => showInfoModal('triggers')}>
                <Ionicons name="information-circle" size={28} color="#3B82F6" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.helperText}>Selecciona los más comunes o agrega los tuyos</Text>
            
            <View style={styles.chipsContainer}>
              {COMMON_TRIGGERS.map((trigger) => (
                <TouchableOpacity
                  key={trigger}
                  style={[styles.chip, triggers.includes(trigger) && styles.chipSelected]}
                  onPress={() => {
                    if (triggers.includes(trigger)) {
                      setTriggers(triggers.filter((t) => t !== trigger));
                    } else {
                      setTriggers([...triggers, trigger]);
                    }
                  }}
                >
                  <Text style={[styles.chipText, triggers.includes(trigger) && styles.chipTextSelected]}>
                    {trigger}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.input}
              placeholder="Agregar otro gatillo"
              placeholderTextColor="#9CA3AF"
              value={newTrigger}
              onChangeText={setNewTrigger}
              onSubmitEditing={() => addItem(triggers, setTriggers, newTrigger, setNewTrigger)}
            />
          </View>
        )}

        {/* Step 5: Factores protectores */}
        {step === 5 && (
          <View style={styles.stepContainer}>
            <View style={styles.titleRow}>
              <Text style={styles.stepTitle}>{getStepTitle()}</Text>
              <TouchableOpacity onPress={() => showInfoModal('protective_factors')}>
                <Ionicons name="information-circle" size={28} color="#3B82F6" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.helperText}>Identifica tus fortalezas y apoyos</Text>
            
            <View style={styles.chipsContainer}>
              {COMMON_FACTORS.map((factor) => (
                <TouchableOpacity
                  key={factor}
                  style={[styles.chip, protectiveFactors.includes(factor) && styles.chipSelected]}
                  onPress={() => {
                    if (protectiveFactors.includes(factor)) {
                      setProtectiveFactors(protectiveFactors.filter((f) => f !== factor));
                    } else {
                      setProtectiveFactors([...protectiveFactors, factor]);
                    }
                  }}
                >
                  <Text style={[styles.chipText, protectiveFactors.includes(factor) && styles.chipTextSelected]}>
                    {factor}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.input}
              placeholder="Agregar otro factor protector"
              placeholderTextColor="#9CA3AF"
              value={newFactor}
              onChangeText={setNewFactor}
              onSubmitEditing={() => addItem(protectiveFactors, setProtectiveFactors, newFactor, setNewFactor)}
            />
          </View>
        )}

        {/* Step 6: Mi Para Qué */}
        {step === 6 && (
          <View style={styles.stepContainer}>
            <View style={styles.titleRow}>
              <Text style={styles.stepTitle}>{getStepTitle()}</Text>
              <TouchableOpacity onPress={() => showInfoModal('my_why')}>
                <Ionicons name="information-circle" size={28} color="#3B82F6" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.helperText}>Tu razón más profunda para estar en recuperación</Text>
            
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Ejemplo: Para estar presente para mis hijos, recuperar mi salud, volver a ser quien era antes..."
              placeholderTextColor="#9CA3AF"
              value={myWhy}
              onChangeText={setMyWhy}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>
        )}

        {/* Step 7: Estado emocional inicial (NUEVO) */}
        {step === 7 && (
          <View style={styles.stepContainer}>
            <View style={styles.titleRow}>
              <Text style={styles.stepTitle}>{getStepTitle()}</Text>
              <TouchableOpacity onPress={() => showInfoModal('emotional_baseline')}>
                <Ionicons name="information-circle" size={28} color="#3B82F6" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.moodContainer}>
              <Text style={styles.moodEmoji}>{getMoodEmoji(initialMood)}</Text>
              <Text style={styles.moodValue}>{initialMood}/10</Text>
              <Slider
                style={styles.slider}
                minimumValue={1}
                maximumValue={10}
                step={1}
                value={initialMood}
                onValueChange={setInitialMood}
                minimumTrackTintColor="#10B981"
                maximumTrackTintColor="#E5E7EB"
                thumbTintColor="#10B981"
              />
              <View style={styles.sliderLabels}>
                <Text style={styles.sliderLabel}>Muy mal</Text>
                <Text style={styles.sliderLabel}>Excelente</Text>
              </View>
            </View>

            <Text style={styles.sectionLabel}>¿Qué emociones sientes con frecuencia?</Text>
            <View style={styles.emotionsGrid}>
              {COMMON_EMOTIONS.map((emotion) => (
                <TouchableOpacity
                  key={emotion.label}
                  style={[
                    styles.emotionCard,
                    frequentEmotions.includes(emotion.label) && styles.emotionCardSelected,
                  ]}
                  onPress={() => {
                    if (frequentEmotions.includes(emotion.label)) {
                      setFrequentEmotions(frequentEmotions.filter(e => e !== emotion.label));
                    } else {
                      setFrequentEmotions([...frequentEmotions, emotion.label]);
                    }
                  }}
                >
                  <Text style={styles.emotionEmoji}>{emotion.emoji}</Text>
                  <Text style={[
                    styles.emotionLabel,
                    frequentEmotions.includes(emotion.label) && styles.emotionLabelSelected,
                  ]}>{emotion.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Step 8: Hábitos deseados (NUEVO) */}
        {step === 8 && (
          <View style={styles.stepContainer}>
            <View style={styles.titleRow}>
              <Text style={styles.stepTitle}>{getStepTitle()}</Text>
              <TouchableOpacity onPress={() => showInfoModal('habits')}>
                <Ionicons name="information-circle" size={28} color="#3B82F6" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.helperText}>
              Selecciona los hábitos que quieres crear. Los agregaremos automáticamente a tu lista.
            </Text>
            
            <View style={styles.habitsGrid}>
              {SUGGESTED_HABITS.map((habit) => (
                <TouchableOpacity
                  key={habit.name}
                  style={[
                    styles.habitCard,
                    selectedHabits.find(h => h.name === habit.name) && { borderColor: habit.color, borderWidth: 2 },
                  ]}
                  onPress={() => toggleHabit(habit)}
                >
                  <View style={[styles.habitIconContainer, { backgroundColor: habit.color + '20' }]}>
                    <Text style={styles.habitIcon}>{habit.icon}</Text>
                  </View>
                  <Text style={styles.habitName}>{habit.name}</Text>
                  <Text style={styles.habitFrequency}>
                    {habit.frequency === 'daily' ? 'Diario' : 'Semanal'}
                  </Text>
                  {selectedHabits.find(h => h.name === habit.name) && (
                    <View style={[styles.habitCheck, { backgroundColor: habit.color }]}>
                      <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
            
            {selectedHabits.length > 0 && (
              <Text style={styles.selectedCount}>
                {selectedHabits.length} hábito{selectedHabits.length > 1 ? 's' : ''} seleccionado{selectedHabits.length > 1 ? 's' : ''}
              </Text>
            )}
          </View>
        )}

        {/* Step 9: Nivel de apoyo (NUEVO) */}
        {step === 9 && (
          <View style={styles.stepContainer}>
            <View style={styles.titleRow}>
              <Text style={styles.stepTitle}>{getStepTitle()}</Text>
              <TouchableOpacity onPress={() => showInfoModal('support_level')}>
                <Ionicons name="information-circle" size={28} color="#3B82F6" />
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => setInTreatment(!inTreatment)}
            >
              <Ionicons name={inTreatment ? 'checkbox' : 'square-outline'} size={24} color="#10B981" />
              <Text style={styles.toggleText}>Estoy en tratamiento actualmente</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => setHasTherapist(!hasTherapist)}
            >
              <Ionicons name={hasTherapist ? 'checkbox' : 'square-outline'} size={24} color="#10B981" />
              <Text style={styles.toggleText}>Tengo terapeuta o psicólogo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => setHasSupportGroup(!hasSupportGroup)}
            >
              <Ionicons name={hasSupportGroup ? 'checkbox' : 'square-outline'} size={24} color="#10B981" />
              <Text style={styles.toggleText}>Asisto a grupo de apoyo</Text>
            </TouchableOpacity>

            {hasSupportGroup && (
              <View style={styles.chipsContainer}>
                {SUPPORT_GROUPS.map((group) => (
                  <TouchableOpacity
                    key={group}
                    style={[styles.chip, supportGroupType === group && styles.chipSelected]}
                    onPress={() => setSupportGroupType(group)}
                  >
                    <Text style={[styles.chipText, supportGroupType === group && styles.chipTextSelected]}>
                      {group}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={[styles.sectionLabel, { marginTop: 20 }]}>
              Contacto de emergencia (para el botón SOS)
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Nombre del contacto"
              placeholderTextColor="#9CA3AF"
              value={emergencyContact.name}
              onChangeText={(text) => setEmergencyContact({ ...emergencyContact, name: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Teléfono (con código de país)"
              placeholderTextColor="#9CA3AF"
              value={emergencyContact.phone}
              onChangeText={(text) => setEmergencyContact({ ...emergencyContact, phone: text })}
              keyboardType="phone-pad"
            />
            <TextInput
              style={styles.input}
              placeholder="Relación (padrino, familiar, amigo)"
              placeholderTextColor="#9CA3AF"
              value={emergencyContact.relationship}
              onChangeText={(text) => setEmergencyContact({ ...emergencyContact, relationship: text })}
            />
          </View>
        )}

        {/* Step 10: Áreas de vida (NUEVO) */}
        {step === 10 && (
          <View style={styles.stepContainer}>
            <View style={styles.titleRow}>
              <Text style={styles.stepTitle}>{getStepTitle()}</Text>
              <TouchableOpacity onPress={() => showInfoModal('life_areas')}>
                <Ionicons name="information-circle" size={28} color="#3B82F6" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.helperText}>
              Selecciona las 3 áreas más importantes para ti ahora
            </Text>
            
            <View style={styles.areasGrid}>
              {LIFE_AREAS.map((area) => (
                <TouchableOpacity
                  key={area.label}
                  style={[
                    styles.areaCard,
                    priorityAreas.includes(area.label) && { borderColor: area.color, borderWidth: 2, backgroundColor: area.color + '10' },
                  ]}
                  onPress={() => toggleLifeArea(area.label)}
                >
                  <Text style={styles.areaIcon}>{area.icon}</Text>
                  <Text style={[
                    styles.areaLabel,
                    priorityAreas.includes(area.label) && { color: area.color, fontWeight: '600' },
                  ]}>{area.label}</Text>
                  {priorityAreas.includes(area.label) && (
                    <View style={styles.areaPriority}>
                      <Text style={styles.areaPriorityText}>
                        #{priorityAreas.indexOf(area.label) + 1}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
            
            {priorityAreas.length > 0 && (
              <View style={styles.selectedAreas}>
                <Text style={styles.selectedAreasTitle}>Tus prioridades:</Text>
                {priorityAreas.map((area, index) => (
                  <Text key={area} style={styles.selectedAreaText}>
                    {index + 1}. {area}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Navigation buttons */}
      <View style={styles.footer}>
        {step > 1 && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setStep(step - 1)}
          >
            <Ionicons name="arrow-back" size={20} color="#6B7280" />
            <Text style={styles.backButtonText}>Atrás</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={[
            styles.continueButton,
            (!canContinue() || saving) && styles.continueButtonDisabled,
          ]}
          onPress={() => {
            if (step < TOTAL_STEPS) {
              setStep(step + 1);
            } else {
              saveProfile();
            }
          }}
          disabled={!canContinue() || saving}
        >
          <Text style={styles.continueButtonText}>
            {saving ? 'Guardando...' : step === TOTAL_STEPS ? '¡Comenzar! 🚀' : 'Continuar'}
          </Text>
          {!saving && <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />}
        </TouchableOpacity>
      </View>

      {/* Info Modal */}
      <Modal
        visible={showInfo}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowInfo(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{currentInfo?.title}</Text>
              <TouchableOpacity onPress={() => setShowInfo(false)}>
                <Ionicons name="close" size={28} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalText}>{currentInfo?.content}</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowInfo(false)}
            >
              <Text style={styles.modalButtonText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#D1FAE5',
    marginBottom: 12,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progress: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  stepContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
    marginRight: 12,
  },
  helperText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  input: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  textArea: {
    minHeight: 100,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  toggleText: {
    fontSize: 15,
    color: '#1F2937',
    marginLeft: 12,
    flex: 1,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
    marginTop: 8,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chipSelected: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  chipText: {
    fontSize: 14,
    color: '#6B7280',
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  // Mood styles
  moodContainer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  moodEmoji: {
    fontSize: 60,
    marginBottom: 8,
  },
  moodValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10B981',
    marginBottom: 16,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  sliderLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  emotionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  emotionCard: {
    width: '30%',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emotionCardSelected: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  emotionEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  emotionLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  emotionLabelSelected: {
    color: '#10B981',
    fontWeight: '600',
  },
  // Habits styles
  habitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  habitCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    position: 'relative',
  },
  habitIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  habitIcon: {
    fontSize: 24,
  },
  habitName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1F2937',
    textAlign: 'center',
  },
  habitFrequency: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  habitCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedCount: {
    textAlign: 'center',
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
    marginTop: 16,
  },
  // Areas styles
  areasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  areaCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    position: 'relative',
  },
  areaIcon: {
    fontSize: 32,
    marginBottom: 6,
  },
  areaLabel: {
    fontSize: 13,
    color: '#374151',
    textAlign: 'center',
  },
  areaPriority: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#10B981',
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  areaPriorityText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  selectedAreas: {
    backgroundColor: '#ECFDF5',
    padding: 14,
    borderRadius: 12,
    marginTop: 16,
  },
  selectedAreasTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
    marginBottom: 8,
  },
  selectedAreaText: {
    fontSize: 14,
    color: '#047857',
    marginBottom: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
    marginLeft: 6,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#10B981',
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  continueButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginRight: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
  },
  modalText: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 22,
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: '#10B981',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
