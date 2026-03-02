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
import { authenticatedFetch } from '../utils/api';
import * as ImagePicker from 'expo-image-picker';

const SUBSTANCES = [
  { id: 'alcohol', label: 'Alcohol', icon: 'wine' },
  { id: 'cocaine', label: 'Cocaína', icon: 'snow' },
  { id: 'marijuana', label: 'Marihuana', icon: 'leaf' },
  { id: 'pills', label: 'Pastillas/Benzos', icon: 'medical' },
  { id: 'methamphetamine', label: 'Metanfetamina', icon: 'flash' },
  { id: 'heroin', label: 'Heroína/Opioides', icon: 'bandage' },
  { id: 'tobacco', label: 'Tabaco', icon: 'cloudy' },
  { id: 'gambling', label: 'Juego/Apuestas', icon: 'dice' },
  { id: 'other', label: 'Otra sustancia', icon: 'ellipsis-horizontal' },
];

const FREQUENCIES = [
  { id: 'daily', label: 'Diario', description: 'Todos los días' },
  { id: 'several_weekly', label: 'Varios días/semana', description: '3-6 días por semana' },
  { id: 'weekly', label: 'Semanal', description: '1-2 días por semana' },
  { id: 'occasional', label: 'Ocasional', description: 'Algunos días al mes' },
];

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
];

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
];

export default function OnboardingActiveScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Form data
  const [selectedSubstances, setSelectedSubstances] = useState<string[]>([]);
  const [primarySubstance, setPrimarySubstance] = useState('');
  const [yearsUsing, setYearsUsing] = useState('');
  const [frequency, setFrequency] = useState('');
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>([]);
  const [selectedProtective, setSelectedProtective] = useState<string[]>([]);
  
  // Tu Para Qué
  const [whyQuit, setWhyQuit] = useState('');
  const [myWhyPhotos, setMyWhyPhotos] = useState<string[]>([]);
  
  // Foto negativa
  const [negativePhoto, setNegativePhoto] = useState<string | null>(null);
  const [showNegativePhotoInfo, setShowNegativePhotoInfo] = useState(false);
  
  // Contacto de apoyo
  const [supportName, setSupportName] = useState('');
  const [supportPhone, setSupportPhone] = useState('');
  const [supportRelationship, setSupportRelationship] = useState('');

  const totalSteps = 7;

  const toggleSubstance = (id: string) => {
    if (selectedSubstances.includes(id)) {
      setSelectedSubstances(selectedSubstances.filter(s => s !== id));
      if (primarySubstance === id) setPrimarySubstance('');
    } else {
      setSelectedSubstances([...selectedSubstances, id]);
      if (selectedSubstances.length === 0) setPrimarySubstance(id);
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

  const pickMyWhyImage = async () => {
    if (myWhyPhotos.length >= 3) return;
    
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

  const removeMyWhyPhoto = (index: number) => {
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

  const canContinue = () => {
    switch (step) {
      case 1: return selectedSubstances.length > 0 && primarySubstance;
      case 2: return yearsUsing && frequency;
      case 3: return selectedTriggers.length > 0;
      case 4: return selectedProtective.length > 0;
      case 5: return whyQuit.length >= 10;
      case 6: return true; // Foto negativa es opcional
      case 7: return true; // Contacto de apoyo es opcional
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
      // Convertir triggers y factores protectores a labels para el Plan de Recuperación
      const triggersLabels = selectedTriggers.map(id => 
        TRIGGERS.find(t => t.id === id)?.label || id
      );
      const protectiveLabels = selectedProtective.map(id => 
        PROTECTIVE_FACTORS.find(p => p.id === id)?.label || id
      );

      const response = await authenticatedFetch('/api/profile/active-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          substances: selectedSubstances,
          primary_substance: primarySubstance,
          years_using: parseInt(yearsUsing) || 0,
          frequency,
          triggers: triggersLabels, // Enviar labels en español
          protective_factors: protectiveLabels, // Enviar labels en español
          why_quit: whyQuit,
          my_why_photos: myWhyPhotos,
          negative_photo: negativePhoto,
          support_person: supportName ? {
            name: supportName,
            phone: supportPhone,
            relationship: supportRelationship,
          } : null,
        }),
      });

      if (response.ok) {
        router.replace('/challenge-start');
      } else {
        const data = await response.json();
        setError(data.detail || 'Error al guardar');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <View style={styles.stepContent}>
            <View style={styles.stepHeader}>
              <Ionicons name="medical" size={40} color="#F59E0B" />
              <Text style={styles.stepTitle}>¿Qué consumes?</Text>
              <Text style={styles.stepSubtitle}>Selecciona todas las sustancias que usas</Text>
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
              <Ionicons name="time" size={40} color="#F59E0B" />
              <Text style={styles.stepTitle}>Tu consumo</Text>
              <Text style={styles.stepSubtitle}>Esto nos ayuda a personalizar tu plan</Text>
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>¿Cuántos años llevas consumiendo?</Text>
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
              <Text style={styles.inputLabel}>¿Con qué frecuencia consumes?</Text>
              <View style={styles.frequencyOptions}>
                {FREQUENCIES.map((freq) => (
                  <TouchableOpacity
                    key={freq.id}
                    style={[
                      styles.frequencyOption,
                      frequency === freq.id && styles.frequencyOptionSelected,
                    ]}
                    onPress={() => setFrequency(freq.id)}
                  >
                    <Text style={[
                      styles.frequencyLabel,
                      frequency === freq.id && styles.frequencyLabelSelected,
                    ]}>
                      {freq.label}
                    </Text>
                    <Text style={styles.frequencyDescription}>{freq.description}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContent}>
            <View style={styles.stepHeader}>
              <Ionicons name="warning" size={40} color="#F59E0B" />
              <Text style={styles.stepTitle}>Tus triggers</Text>
              <Text style={styles.stepSubtitle}>¿Qué situaciones te llevan a consumir?</Text>
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

      case 4:
        return (
          <View style={styles.stepContent}>
            <View style={styles.stepHeader}>
              <Ionicons name="shield-checkmark" size={40} color="#10B981" />
              <Text style={styles.stepTitle}>Tu fortaleza</Text>
              <Text style={styles.stepSubtitle}>¿Qué te ayuda a mantenerte bien?</Text>
            </View>

            <View style={styles.optionsGrid}>
              {PROTECTIVE_FACTORS.map((factor) => (
                <TouchableOpacity
                  key={factor.id}
                  style={[
                    styles.optionCard,
                    styles.optionCardGreen,
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

            <View style={styles.tipBoxGreen}>
              <Ionicons name="bulb" size={20} color="#10B981" />
              <Text style={styles.tipTextGreen}>
                Estos factores te protegen. Fortalécelos durante el reto.
              </Text>
            </View>
          </View>
        );

      case 5:
        return (
          <View style={styles.stepContent}>
            <View style={styles.stepHeader}>
              <Ionicons name="heart" size={40} color="#EC4899" />
              <Text style={styles.stepTitle}>Tu "Para Qué"</Text>
              <Text style={styles.stepSubtitle}>Tu razón más profunda para dejar de consumir</Text>
            </View>

            <View style={styles.tipBox}>
              <Ionicons name="bulb" size={20} color="#F59E0B" />
              <Text style={styles.tipText}>
                No es "dejar la droga", sino lo que quieres ganar: estar presente para tus hijos, recuperar tu salud, volver a ser tú mismo.
              </Text>
            </View>

            <View style={styles.textAreaContainer}>
              <TextInput
                style={styles.textArea}
                value={whyQuit}
                onChangeText={setWhyQuit}
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
                    onPress={() => removeMyWhyPhoto(index)}
                  >
                    <Ionicons name="close-circle" size={24} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}
              {myWhyPhotos.length < 3 && (
                <TouchableOpacity style={styles.addPhotoButton} onPress={pickMyWhyImage}>
                  <Ionicons name="camera" size={32} color="#9CA3AF" />
                  <Text style={styles.addPhotoText}>Agregar</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        );

      case 6:
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
                Esta foto te recordará por qué quieres dejar de consumir. La verás solo cuando tú decidas, en tu Plan de Recuperación. Es opcional pero puede ser una herramienta poderosa en momentos difíciles.
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

      case 7:
        return (
          <View style={styles.stepContent}>
            <View style={styles.stepHeader}>
              <Ionicons name="call" size={40} color="#10B981" />
              <Text style={styles.stepTitle}>Contacto de apoyo</Text>
              <Text style={styles.stepSubtitle}>Alguien a quien llamar en momentos difíciles</Text>
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Nombre</Text>
              <View style={styles.inputContainerWhite}>
                <Ionicons name="person" size={20} color="#6B7280" />
                <TextInput
                  style={styles.inputWhite}
                  value={supportName}
                  onChangeText={setSupportName}
                  placeholder="Ej: Mi hermano Juan"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Teléfono</Text>
              <View style={styles.inputContainerWhite}>
                <Ionicons name="call" size={20} color="#6B7280" />
                <TextInput
                  style={styles.inputWhite}
                  value={supportPhone}
                  onChangeText={setSupportPhone}
                  placeholder="+56 9 1234 5678"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Relación</Text>
              <View style={styles.inputContainerWhite}>
                <Ionicons name="heart" size={20} color="#6B7280" />
                <TextInput
                  style={styles.inputWhite}
                  value={supportRelationship}
                  onChangeText={setSupportRelationship}
                  placeholder="Ej: Hermano, amigo, padrino AA"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            <View style={styles.optionalNote}>
              <Ionicons name="information-circle" size={18} color="#9CA3AF" />
              <Text style={styles.optionalText}>
                Este paso es opcional. Podrás agregarlo después desde tu perfil.
              </Text>
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
          {renderStep()}

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
                      {step === totalSteps ? 'Comenzar Reto' : 'Continuar'}
                    </Text>
                    <Ionicons name={step === totalSteps ? "rocket" : "arrow-forward"} size={20} color="#1A1A1A" />
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
  titleWithInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  infoButton: {
    padding: 4,
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
  optionCardGreen: {
    borderColor: 'transparent',
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
    marginBottom: 20,
  },
  inputLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
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
  inputContainerWhite: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  inputWhite: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#FFFFFF',
  },
  frequencyOptions: {
    gap: 10,
  },
  frequencyOption: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  frequencyOptionSelected: {
    borderColor: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  frequencyLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  frequencyLabelSelected: {
    color: '#F59E0B',
  },
  frequencyDescription: {
    color: '#9CA3AF',
    fontSize: 13,
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
  tipBoxGreen: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginTop: 16,
  },
  tipTextGreen: {
    flex: 1,
    color: '#10B981',
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
});
