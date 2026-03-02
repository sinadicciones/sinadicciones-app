import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { authenticatedFetch, getBackendURL } from '../utils/api';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';

const BACKEND_URL = getBackendURL();

// Sustancias/Adicciones disponibles
const SUBSTANCES = [
  { id: 'alcohol', label: 'Alcohol', icon: 'wine' },
  { id: 'cocaine', label: 'Cocaína', icon: 'snow' },
  { id: 'marijuana', label: 'Marihuana', icon: 'leaf' },
  { id: 'pills', label: 'Pastillas/Benzos', icon: 'medical' },
  { id: 'methamphetamine', label: 'Metanfetamina', icon: 'flash' },
  { id: 'heroin', label: 'Heroína/Opioides', icon: 'bandage' },
  { id: 'tobacco', label: 'Tabaco', icon: 'cloudy' },
  { id: 'gambling', label: 'Juego/Apuestas', icon: 'dice' },
  { id: 'technology', label: 'Tecnología/Redes', icon: 'phone-portrait' },
  { id: 'other', label: 'Otra', icon: 'ellipsis-horizontal' },
];

// Diagnósticos duales comunes
const DUAL_DIAGNOSES = [
  { id: 'depression', label: 'Depresión', icon: 'sad' },
  { id: 'anxiety', label: 'Ansiedad', icon: 'pulse' },
  { id: 'bipolar', label: 'Trastorno Bipolar', icon: 'swap-horizontal' },
  { id: 'adhd', label: 'TDAH', icon: 'flash' },
  { id: 'ptsd', label: 'Estrés Postraumático', icon: 'alert' },
  { id: 'schizophrenia', label: 'Esquizofrenia', icon: 'eye' },
  { id: 'eating', label: 'Trastorno Alimentario', icon: 'restaurant' },
  { id: 'personality', label: 'Trastorno de Personalidad', icon: 'person' },
  { id: 'none', label: 'Ninguno diagnosticado', icon: 'checkmark-circle' },
];

// Triggers/Gatillos
const TRIGGERS = [
  { id: 'stress', label: 'Estrés', icon: 'thunderstorm' },
  { id: 'anxiety', label: 'Ansiedad', icon: 'pulse' },
  { id: 'boredom', label: 'Aburrimiento', icon: 'time' },
  { id: 'social', label: 'Presión social', icon: 'people' },
  { id: 'loneliness', label: 'Soledad', icon: 'person' },
  { id: 'celebration', label: 'Celebraciones', icon: 'beer' },
  { id: 'sadness', label: 'Tristeza', icon: 'sad' },
  { id: 'anger', label: 'Enojo/Frustración', icon: 'flame' },
  { id: 'pain', label: 'Dolor físico', icon: 'fitness' },
  { id: 'insomnia', label: 'Insomnio', icon: 'moon' },
  { id: 'money', label: 'Problemas de dinero', icon: 'cash' },
  { id: 'relationship', label: 'Problemas de pareja', icon: 'heart-dislike' },
];

// Factores protectores
const PROTECTIVE_FACTORS = [
  { id: 'family', label: 'Familia', icon: 'people' },
  { id: 'friends', label: 'Amigos que apoyan', icon: 'heart' },
  { id: 'work', label: 'Trabajo/Estudios', icon: 'briefcase' },
  { id: 'hobbies', label: 'Hobbies/Pasatiempos', icon: 'color-palette' },
  { id: 'sports', label: 'Deporte/Ejercicio', icon: 'fitness' },
  { id: 'spirituality', label: 'Espiritualidad/Fe', icon: 'sparkles' },
  { id: 'therapy', label: 'Terapia/Profesional', icon: 'medkit' },
  { id: 'pets', label: 'Mascotas', icon: 'paw' },
  { id: 'nature', label: 'Naturaleza', icon: 'leaf' },
  { id: 'music', label: 'Música/Arte', icon: 'musical-notes' },
  { id: 'meditation', label: 'Meditación', icon: 'body' },
  { id: 'groups', label: 'Grupos de apoyo', icon: 'chatbubbles' },
];

// Hábitos sugeridos
const SUGGESTED_HABITS = [
  { id: 'exercise', icon: '🏃', name: 'Ejercicio físico', color: '#10B981' },
  { id: 'meditation', icon: '🧘', name: 'Meditación', color: '#8B5CF6' },
  { id: 'reading', icon: '📖', name: 'Lectura', color: '#3B82F6' },
  { id: 'sleep', icon: '😴', name: 'Dormir 8 horas', color: '#6366F1' },
  { id: 'nutrition', icon: '🥗', name: 'Alimentación sana', color: '#F59E0B' },
  { id: 'water', icon: '💧', name: 'Tomar agua', color: '#06B6D4' },
  { id: 'journal', icon: '📝', name: 'Escribir diario', color: '#EC4899' },
  { id: 'gratitude', icon: '🙏', name: 'Gratitud', color: '#F97316' },
  { id: 'support_meeting', icon: '👥', name: 'Reunión de apoyo', color: '#14B8A6' },
  { id: 'call_sponsor', icon: '📞', name: 'Llamar a mi padrino', color: '#EF4444' },
];

// Áreas de vida para mejorar
const LIFE_AREAS = [
  { id: 'family', icon: '👨‍👩‍👧‍👦', label: 'Familia', color: '#EF4444' },
  { id: 'work', icon: '💼', label: 'Trabajo/Carrera', color: '#3B82F6' },
  { id: 'health', icon: '❤️', label: 'Salud física', color: '#10B981' },
  { id: 'mental', icon: '🧠', label: 'Salud mental', color: '#8B5CF6' },
  { id: 'relationships', icon: '💑', label: 'Relaciones', color: '#EC4899' },
  { id: 'finances', icon: '💰', label: 'Finanzas', color: '#F59E0B' },
  { id: 'growth', icon: '🎯', label: 'Crecimiento personal', color: '#6366F1' },
  { id: 'spirituality', icon: '🙏', label: 'Espiritualidad', color: '#14B8A6' },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Step 1: Sustancias
  const [selectedSubstances, setSelectedSubstances] = useState<string[]>([]);
  const [primarySubstance, setPrimarySubstance] = useState('');
  const [otherSubstance, setOtherSubstance] = useState('');
  
  // Step 2: Tiempo y fecha
  const [yearsUsing, setYearsUsing] = useState('');
  const [cleanSince, setCleanSince] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Step 3: Diagnóstico dual
  const [selectedDiagnoses, setSelectedDiagnoses] = useState<string[]>([]);
  
  // Step 4: Triggers
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>([]);
  
  // Step 5: Factores protectores
  const [selectedProtective, setSelectedProtective] = useState<string[]>([]);
  
  // Step 6: Mi Para Qué
  const [myWhy, setMyWhy] = useState('');
  const [myWhyPhotos, setMyWhyPhotos] = useState<string[]>([]);
  
  // Step 7: Foto Negativa
  const [negativePhoto, setNegativePhoto] = useState<string | null>(null);
  const [showNegativePhotoInfo, setShowNegativePhotoInfo] = useState(false);
  
  // Step 8: Hábitos y Áreas
  const [selectedHabits, setSelectedHabits] = useState<string[]>([]);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);

  const totalSteps = 8;

  const toggleSubstance = (id: string) => {
    if (selectedSubstances.includes(id)) {
      setSelectedSubstances(selectedSubstances.filter(s => s !== id));
      if (primarySubstance === id) setPrimarySubstance('');
    } else {
      setSelectedSubstances([...selectedSubstances, id]);
      if (selectedSubstances.length === 0) setPrimarySubstance(id);
    }
  };

  const toggleDiagnosis = (id: string) => {
    if (id === 'none') {
      setSelectedDiagnoses(['none']);
    } else {
      const filtered = selectedDiagnoses.filter(d => d !== 'none');
      if (filtered.includes(id)) {
        setSelectedDiagnoses(filtered.filter(d => d !== id));
      } else {
        setSelectedDiagnoses([...filtered, id]);
      }
    }
  };

  const toggleTrigger = (id: string) => {
    if (selectedTriggers.includes(id)) {
      setSelectedTriggers(selectedTriggers.filter(t => t !== id));
    } else {
      setSelectedTriggers([...selectedTriggers, id]);
    }
  };

  const toggleProtective = (id: string) => {
    if (selectedProtective.includes(id)) {
      setSelectedProtective(selectedProtective.filter(p => p !== id));
    } else {
      setSelectedProtective([...selectedProtective, id]);
    }
  };

  const toggleHabit = (id: string) => {
    if (selectedHabits.includes(id)) {
      setSelectedHabits(selectedHabits.filter(h => h !== id));
    } else {
      setSelectedHabits([...selectedHabits, id]);
    }
  };

  const toggleArea = (id: string) => {
    if (selectedAreas.includes(id)) {
      setSelectedAreas(selectedAreas.filter(a => a !== id));
    } else {
      setSelectedAreas([...selectedAreas, id]);
    }
  };

  const pickImage = async () => {
    if (myWhyPhotos.length >= 3) {
      return;
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setMyWhyPhotos([...myWhyPhotos, `data:image/jpeg;base64,${result.assets[0].base64}`]);
    }
  };

  const removePhoto = (index: number) => {
    setMyWhyPhotos(myWhyPhotos.filter((_, i) => i !== index));
  };

  const pickNegativePhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setNegativePhoto(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const calculateCleanDays = () => {
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - cleanSince.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const canContinue = () => {
    switch (step) {
      case 1: return selectedSubstances.length > 0 && primarySubstance;
      case 2: return yearsUsing && cleanSince;
      case 3: return selectedDiagnoses.length > 0;
      case 4: return selectedTriggers.length > 0;
      case 5: return selectedProtective.length > 0;
      case 6: return myWhy.length >= 10;
      case 7: return true; // Foto negativa es opcional
      case 8: return selectedHabits.length > 0 || selectedAreas.length > 0;
      default: return false;
    }
  };

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError('');

    try {
      // Preparar datos de adicción
      const primaryLabel = SUBSTANCES.find(s => s.id === primarySubstance)?.label || otherSubstance || primarySubstance;
      
      // Preparar diagnósticos
      const diagnosesLabels = selectedDiagnoses
        .filter(d => d !== 'none')
        .map(d => DUAL_DIAGNOSES.find(dd => dd.id === d)?.label || d);
      
      // Preparar triggers como texto
      const triggersLabels = selectedTriggers.map(t => TRIGGERS.find(tr => tr.id === t)?.label || t);
      
      // Preparar factores protectores como texto
      const protectiveLabels = selectedProtective.map(p => PROTECTIVE_FACTORS.find(pf => pf.id === p)?.label || p);

      // Preparar hábitos seleccionados
      const habitsToCreate = selectedHabits.map(h => {
        const habit = SUGGESTED_HABITS.find(sh => sh.id === h);
        return {
          icon: habit?.icon || '✓',
          name: habit?.name || h,
          color: habit?.color || '#F59E0B',
          frequency: 'daily'
        };
      });

      // Preparar áreas de vida
      const areasLabels = selectedAreas.map(a => LIFE_AREAS.find(la => la.id === a)?.label || a);

      const response = await authenticatedFetch('/api/profile/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addiction_type: primaryLabel,
          substances: selectedSubstances.map(s => SUBSTANCES.find(sub => sub.id === s)?.label || s),
          years_using: parseInt(yearsUsing) || 0,
          clean_since: cleanSince.toISOString().split('T')[0],
          has_dual_diagnosis: !selectedDiagnoses.includes('none') && selectedDiagnoses.length > 0,
          diagnoses: diagnosesLabels,
          triggers: triggersLabels,
          protective_factors: protectiveLabels,
          my_why: myWhy,
          my_why_photos: myWhyPhotos,
          negative_photo: negativePhoto,
          selected_habits: habitsToCreate,
          life_areas: areasLabels,
          initial_mood: 5,
          frequent_emotions: [],
        }),
      });

      if (response.ok) {
        router.replace('/(tabs)/home');
      } else {
        const data = await response.json();
        setError(data.detail || 'Error al guardar tu perfil');
      }
    } catch (e) {
      console.error('Error submitting onboarding:', e);
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <View style={styles.stepContent}>
            <View style={styles.stepHeader}>
              <Ionicons name="medical" size={40} color="#F59E0B" />
              <Text style={styles.stepTitle}>Tu adicción</Text>
              <Text style={styles.stepSubtitle}>Selecciona todas las que aplican</Text>
            </View>
            
            <View style={styles.optionsGrid}>
              {SUBSTANCES.map((substance) => (
                <TouchableOpacity
                  key={substance.id}
                  style={[
                    styles.optionCard,
                    selectedSubstances.includes(substance.id) && styles.optionCardSelected,
                  ]}
                  onPress={() => toggleSubstance(substance.id)}
                >
                  <Ionicons 
                    name={substance.icon as any} 
                    size={24} 
                    color={selectedSubstances.includes(substance.id) ? '#F59E0B' : '#9CA3AF'} 
                  />
                  <Text style={[
                    styles.optionLabel,
                    selectedSubstances.includes(substance.id) && styles.optionLabelSelected,
                  ]}>
                    {substance.label}
                  </Text>
                  {selectedSubstances.includes(substance.id) && (
                    <Ionicons name="checkmark-circle" size={18} color="#F59E0B" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {selectedSubstances.includes('other') && (
              <View style={styles.otherInputContainer}>
                <TextInput
                  style={styles.otherInput}
                  value={otherSubstance}
                  onChangeText={setOtherSubstance}
                  placeholder="Especifica cuál..."
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            )}

            {selectedSubstances.length > 1 && (
              <View style={styles.primarySection}>
                <Text style={styles.primaryLabel}>¿Cuál es tu adicción PRINCIPAL?</Text>
                <View style={styles.primaryOptions}>
                  {selectedSubstances.map((id) => {
                    const substance = SUBSTANCES.find(s => s.id === id);
                    return (
                      <TouchableOpacity
                        key={id}
                        style={[
                          styles.primaryOption,
                          primarySubstance === id && styles.primaryOptionSelected,
                        ]}
                        onPress={() => setPrimarySubstance(id)}
                      >
                        <Text style={[
                          styles.primaryOptionText,
                          primarySubstance === id && styles.primaryOptionTextSelected,
                        ]}>
                          {substance?.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContent}>
            <View style={styles.stepHeader}>
              <Ionicons name="calendar" size={40} color="#F59E0B" />
              <Text style={styles.stepTitle}>Tu historia</Text>
              <Text style={styles.stepSubtitle}>Esto nos ayuda a personalizar tu experiencia</Text>
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>¿Cuántos años consumiste?</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={yearsUsing}
                  onChangeText={setYearsUsing}
                  placeholder="Ej: 5"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                />
                <Text style={styles.inputSuffix}>años</Text>
              </View>
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>¿Cuándo comenzaste tu recuperación?</Text>
              <TouchableOpacity 
                style={styles.datePickerButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={24} color="#F59E0B" />
                <Text style={styles.datePickerText}>{formatDate(cleanSince)}</Text>
                <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
              </TouchableOpacity>
              
              <View style={styles.cleanDaysBox}>
                <Ionicons name="trophy" size={24} color="#10B981" />
                <Text style={styles.cleanDaysText}>
                  ¡Llevas <Text style={styles.cleanDaysNumber}>{calculateCleanDays()}</Text> días en recuperación!
                </Text>
              </View>
            </View>

            {showDatePicker && (
              <Modal
                transparent
                animationType="fade"
                visible={showDatePicker}
                onRequestClose={() => setShowDatePicker(false)}
              >
                <View style={styles.dateModalOverlay}>
                  <View style={styles.dateModalContent}>
                    <Text style={styles.dateModalTitle}>Selecciona la fecha</Text>
                    <DateTimePicker
                      value={cleanSince}
                      mode="date"
                      display="spinner"
                      onChange={(event, date) => {
                        if (date) setCleanSince(date);
                      }}
                      maximumDate={new Date()}
                      textColor="#FFFFFF"
                      style={styles.datePicker}
                    />
                    <TouchableOpacity
                      style={styles.dateModalButton}
                      onPress={() => setShowDatePicker(false)}
                    >
                      <Text style={styles.dateModalButtonText}>Confirmar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Modal>
            )}
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContent}>
            <View style={styles.stepHeader}>
              <Ionicons name="medkit" size={40} color="#F59E0B" />
              <Text style={styles.stepTitle}>Salud mental</Text>
              <Text style={styles.stepSubtitle}>¿Tienes algún diagnóstico adicional?</Text>
            </View>

            <View style={styles.tipBox}>
              <Ionicons name="information-circle" size={20} color="#F59E0B" />
              <Text style={styles.tipText}>
                Muchas personas con adicciones también tienen condiciones como depresión o ansiedad. Esto nos ayuda a darte mejor apoyo.
              </Text>
            </View>

            <View style={styles.optionsGrid}>
              {DUAL_DIAGNOSES.map((diagnosis) => (
                <TouchableOpacity
                  key={diagnosis.id}
                  style={[
                    styles.optionCard,
                    selectedDiagnoses.includes(diagnosis.id) && (diagnosis.id === 'none' ? styles.optionCardSelectedGreen : styles.optionCardSelected),
                  ]}
                  onPress={() => toggleDiagnosis(diagnosis.id)}
                >
                  <Ionicons 
                    name={diagnosis.icon as any} 
                    size={24} 
                    color={selectedDiagnoses.includes(diagnosis.id) ? (diagnosis.id === 'none' ? '#10B981' : '#F59E0B') : '#9CA3AF'} 
                  />
                  <Text style={[
                    styles.optionLabel,
                    selectedDiagnoses.includes(diagnosis.id) && (diagnosis.id === 'none' ? styles.optionLabelSelectedGreen : styles.optionLabelSelected),
                  ]}>
                    {diagnosis.label}
                  </Text>
                  {selectedDiagnoses.includes(diagnosis.id) && (
                    <Ionicons name="checkmark-circle" size={18} color={diagnosis.id === 'none' ? '#10B981' : '#F59E0B'} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 4:
        return (
          <View style={styles.stepContent}>
            <View style={styles.stepHeader}>
              <Ionicons name="warning" size={40} color="#F59E0B" />
              <Text style={styles.stepTitle}>Tus gatillos</Text>
              <Text style={styles.stepSubtitle}>¿Qué situaciones te llevan a querer consumir?</Text>
            </View>

            <View style={styles.optionsGrid}>
              {TRIGGERS.map((trigger) => (
                <TouchableOpacity
                  key={trigger.id}
                  style={[
                    styles.optionCard,
                    selectedTriggers.includes(trigger.id) && styles.optionCardSelected,
                  ]}
                  onPress={() => toggleTrigger(trigger.id)}
                >
                  <Ionicons 
                    name={trigger.icon as any} 
                    size={24} 
                    color={selectedTriggers.includes(trigger.id) ? '#F59E0B' : '#9CA3AF'} 
                  />
                  <Text style={[
                    styles.optionLabel,
                    selectedTriggers.includes(trigger.id) && styles.optionLabelSelected,
                  ]}>
                    {trigger.label}
                  </Text>
                  {selectedTriggers.includes(trigger.id) && (
                    <Ionicons name="checkmark-circle" size={18} color="#F59E0B" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 5:
        return (
          <View style={styles.stepContent}>
            <View style={styles.stepHeader}>
              <Ionicons name="shield-checkmark" size={40} color="#10B981" />
              <Text style={styles.stepTitle}>Tu fortaleza</Text>
              <Text style={styles.stepSubtitle}>¿Qué te ayuda a mantenerte en recuperación?</Text>
            </View>

            <View style={styles.optionsGrid}>
              {PROTECTIVE_FACTORS.map((factor) => (
                <TouchableOpacity
                  key={factor.id}
                  style={[
                    styles.optionCard,
                    selectedProtective.includes(factor.id) && styles.optionCardSelectedGreen,
                  ]}
                  onPress={() => toggleProtective(factor.id)}
                >
                  <Ionicons 
                    name={factor.icon as any} 
                    size={24} 
                    color={selectedProtective.includes(factor.id) ? '#10B981' : '#9CA3AF'} 
                  />
                  <Text style={[
                    styles.optionLabel,
                    selectedProtective.includes(factor.id) && styles.optionLabelSelectedGreen,
                  ]}>
                    {factor.label}
                  </Text>
                  {selectedProtective.includes(factor.id) && (
                    <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 6:
        return (
          <View style={styles.stepContent}>
            <View style={styles.stepHeader}>
              <Ionicons name="heart" size={40} color="#EC4899" />
              <Text style={styles.stepTitle}>Tu "Para Qué"</Text>
              <Text style={styles.stepSubtitle}>Tu razón más profunda para estar en recuperación</Text>
            </View>

            <View style={styles.tipBox}>
              <Ionicons name="bulb" size={20} color="#F59E0B" />
              <Text style={styles.tipText}>
                No es "dejar de consumir", sino lo que quieres ganar: estar presente para tus hijos, recuperar tu salud, volver a ser tú mismo.
              </Text>
            </View>

            <View style={styles.textAreaContainer}>
              <TextInput
                style={styles.textArea}
                value={myWhy}
                onChangeText={setMyWhy}
                placeholder="Escribe tu motivación más profunda..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={5}
              />
            </View>

            <Text style={styles.photoSectionTitle}>Agrega fotos de tu motivación (opcional)</Text>
            <Text style={styles.photoSectionSubtitle}>Tu familia, metas, sueños... lo que te inspira</Text>
            
            <View style={styles.photosContainer}>
              {myWhyPhotos.map((photo, index) => (
                <View key={index} style={styles.photoWrapper}>
                  <Image source={{ uri: photo }} style={styles.photo} />
                  <TouchableOpacity 
                    style={styles.removePhotoButton}
                    onPress={() => removePhoto(index)}
                  >
                    <Ionicons name="close-circle" size={24} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}
              {myWhyPhotos.length < 3 && (
                <TouchableOpacity style={styles.addPhotoButton} onPress={pickImage}>
                  <Ionicons name="camera" size={32} color="#9CA3AF" />
                  <Text style={styles.addPhotoText}>Agregar</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        );

      case 7:
        return (
          <View style={styles.stepContent}>
            <View style={styles.stepHeader}>
              <Ionicons name="eye-off" size={40} color="#EF4444" />
              <Text style={styles.stepTitle}>Tu Recordatorio</Text>
              <View style={styles.titleWithInfo}>
                <Text style={styles.stepSubtitle}>Una imagen de las consecuencias</Text>
                <TouchableOpacity 
                  style={styles.infoButton}
                  onPress={() => setShowNegativePhotoInfo(true)}
                >
                  <Ionicons name="help-circle" size={24} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.warningBox}>
              <Ionicons name="information-circle" size={20} color="#F59E0B" />
              <Text style={styles.warningText}>
                Esta foto te recordará por qué quieres mantenerte en recuperación. La verás solo cuando tú decidas, en tu Plan de Recuperación. Es opcional pero puede ser una herramienta poderosa en momentos difíciles.
              </Text>
            </View>

            <View style={styles.negativePhotoSection}>
              {negativePhoto ? (
                <View style={styles.negativePhotoWrapper}>
                  <Image source={{ uri: negativePhoto }} style={styles.negativePhoto} />
                  <TouchableOpacity 
                    style={styles.removeNegativePhotoButton}
                    onPress={() => setNegativePhoto(null)}
                  >
                    <Ionicons name="trash" size={20} color="#FFFFFF" />
                    <Text style={styles.removeNegativePhotoText}>Eliminar</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.addNegativePhotoButton} onPress={pickNegativePhoto}>
                  <Ionicons name="camera" size={40} color="#EF4444" />
                  <Text style={styles.addNegativePhotoText}>Agregar foto</Text>
                  <Text style={styles.addNegativePhotoSubtext}>Toca para seleccionar</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.optionalNote}>
              <Ionicons name="checkmark-circle" size={18} color="#9CA3AF" />
              <Text style={styles.optionalText}>
                Este paso es opcional. Puedes continuar sin agregar una foto.
              </Text>
            </View>

            {/* Modal de información */}
            <Modal
              visible={showNegativePhotoInfo}
              transparent
              animationType="fade"
              onRequestClose={() => setShowNegativePhotoInfo(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <Ionicons name="information-circle" size={48} color="#F59E0B" />
                  <Text style={styles.modalTitle}>¿Por qué una foto negativa?</Text>
                  <Text style={styles.modalText}>
                    En momentos de tentación, recordar las consecuencias negativas de la adicción puede ayudarte a mantenerte firme en tu decisión.{'\n\n'}
                    Puede ser una foto de:{'\n'}
                    • Un momento difícil que viviste{'\n'}
                    • Las consecuencias en tu salud{'\n'}
                    • El impacto en tus relaciones{'\n'}
                    • Algo que perdiste por la adicción{'\n\n'}
                    Esta foto estará oculta y solo la verás cuando tú decidas, nunca se mostrará automáticamente.
                  </Text>
                  <TouchableOpacity 
                    style={styles.modalButton}
                    onPress={() => setShowNegativePhotoInfo(false)}
                  >
                    <Text style={styles.modalButtonText}>Entendido</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
          </View>
        );

      case 8:
        return (
          <View style={styles.stepContent}>
            <View style={styles.stepHeader}>
              <Ionicons name="rocket" size={40} color="#6366F1" />
              <Text style={styles.stepTitle}>Tu plan</Text>
              <Text style={styles.stepSubtitle}>Selecciona hábitos y áreas a mejorar</Text>
            </View>

            <Text style={styles.sectionTitle}>Hábitos que quieres desarrollar</Text>
            <View style={styles.habitsGrid}>
              {SUGGESTED_HABITS.map((habit) => (
                <TouchableOpacity
                  key={habit.id}
                  style={[
                    styles.habitCard,
                    selectedHabits.includes(habit.id) && { borderColor: habit.color, backgroundColor: `${habit.color}20` },
                  ]}
                  onPress={() => toggleHabit(habit.id)}
                >
                  <Text style={styles.habitIcon}>{habit.icon}</Text>
                  <Text style={[
                    styles.habitName,
                    selectedHabits.includes(habit.id) && { color: habit.color },
                  ]}>
                    {habit.name}
                  </Text>
                  {selectedHabits.includes(habit.id) && (
                    <Ionicons name="checkmark-circle" size={18} color={habit.color} />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Áreas de vida a mejorar</Text>
            <View style={styles.areasGrid}>
              {LIFE_AREAS.map((area) => (
                <TouchableOpacity
                  key={area.id}
                  style={[
                    styles.areaCard,
                    selectedAreas.includes(area.id) && { borderColor: area.color, backgroundColor: `${area.color}20` },
                  ]}
                  onPress={() => toggleArea(area.id)}
                >
                  <Text style={styles.areaIcon}>{area.icon}</Text>
                  <Text style={[
                    styles.areaName,
                    selectedAreas.includes(area.id) && { color: area.color },
                  ]}>
                    {area.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <LinearGradient colors={['#1A1A1A', '#2D2D2D']} style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(step / totalSteps) * 100}%` }]} />
          </View>
          <Text style={styles.progressText}>Paso {step} de {totalSteps}</Text>
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {renderStepContent()}

          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color="#FCA5A5" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.buttonContainer}>
            <View style={styles.buttonsRow}>
              {step > 1 && (
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={handleBack}
                >
                  <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
                  <Text style={styles.backButtonText}>Atrás</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={[
                  styles.continueButton,
                  !canContinue() && styles.continueButtonDisabled,
                  step === 1 && { flex: 1 },
                ]}
                onPress={handleNext}
                disabled={!canContinue() || isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#1A1A1A" />
                ) : (
                  <>
                    <Text style={styles.continueButtonText}>
                      {step === totalSteps ? 'Comenzar' : 'Continuar'}
                    </Text>
                    <Ionicons name={step === totalSteps ? "checkmark" : "arrow-forward"} size={20} color="#1A1A1A" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  progressContainer: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#F59E0B',
    borderRadius: 2,
  },
  progressText: {
    color: '#9CA3AF',
    fontSize: 12,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  stepContent: {
    marginTop: 10,
  },
  stepHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 12,
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
  optionsGrid: {
    gap: 10,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 14,
    gap: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionCardSelected: {
    borderColor: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  optionCardSelectedGreen: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  optionLabel: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
  },
  optionLabelSelected: {
    color: '#F59E0B',
    fontWeight: '600',
  },
  optionLabelSelectedGreen: {
    color: '#10B981',
    fontWeight: '600',
  },
  otherInputContainer: {
    marginTop: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  otherInput: {
    paddingVertical: 14,
    fontSize: 16,
    color: '#FFFFFF',
  },
  primarySection: {
    marginTop: 20,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 12,
    padding: 16,
  },
  primaryLabel: {
    color: '#F59E0B',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  primaryOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  primaryOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  primaryOptionSelected: {
    backgroundColor: '#F59E0B',
  },
  primaryOptionText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  primaryOptionTextSelected: {
    color: '#1A1A1A',
    fontWeight: '600',
  },
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 18,
    color: '#FFFFFF',
  },
  inputSuffix: {
    color: '#9CA3AF',
    fontSize: 16,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  datePickerText: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
  },
  cleanDaysBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    gap: 12,
  },
  cleanDaysText: {
    flex: 1,
    fontSize: 15,
    color: '#10B981',
  },
  cleanDaysNumber: {
    fontWeight: 'bold',
    fontSize: 18,
  },
  dateModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateModalContent: {
    backgroundColor: '#2D2D2D',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 350,
  },
  dateModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  datePicker: {
    height: 200,
  },
  dateModalButton: {
    backgroundColor: '#F59E0B',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 16,
  },
  dateModalButtonText: {
    color: '#1A1A1A',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginBottom: 20,
  },
  tipText: {
    flex: 1,
    color: '#F59E0B',
    fontSize: 13,
    lineHeight: 18,
  },
  textAreaContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  textArea: {
    minHeight: 120,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
    textAlignVertical: 'top',
  },
  photoSectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  photoSectionSubtitle: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 16,
  },
  photosContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  photoWrapper: {
    position: 'relative',
  },
  photo: {
    width: 90,
    height: 90,
    borderRadius: 12,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
  },
  addPhotoButton: {
    width: 90,
    height: 90,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoText: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 4,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  habitsGrid: {
    gap: 10,
  },
  habitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 14,
    gap: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  habitIcon: {
    fontSize: 24,
  },
  habitName: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
  },
  areasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  areaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  areaIcon: {
    fontSize: 20,
  },
  areaName: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 14,
    flex: 1,
  },
  buttonContainer: {
    marginTop: 24,
    marginBottom: 20,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    gap: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  continueButton: {
    flex: 1,
    backgroundColor: '#F59E0B',
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    color: '#1A1A1A',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Estilos para foto negativa
  titleWithInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  infoButton: {
    padding: 4,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginBottom: 24,
  },
  warningText: {
    flex: 1,
    color: '#F59E0B',
    fontSize: 13,
    lineHeight: 20,
  },
  negativePhotoSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  negativePhotoWrapper: {
    alignItems: 'center',
  },
  negativePhoto: {
    width: 200,
    height: 200,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#EF4444',
  },
  removeNegativePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 12,
    gap: 8,
  },
  removeNegativePhotoText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  addNegativePhotoButton: {
    width: 200,
    height: 200,
    borderRadius: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addNegativePhotoText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  addNegativePhotoSubtext: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 4,
  },
  optionalNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 16,
    gap: 10,
  },
  optionalText: {
    flex: 1,
    color: '#9CA3AF',
    fontSize: 13,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#2D2D2D',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    maxWidth: 350,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalText: {
    color: '#D1D5DB',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'left',
  },
  modalButton: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
  },
  modalButtonText: {
    color: '#1A1A1A',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
