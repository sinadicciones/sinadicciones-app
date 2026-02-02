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
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { authenticatedFetch } from '../utils/api';

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
  const [whyQuit, setWhyQuit] = useState('');
  const [supportName, setSupportName] = useState('');
  const [supportPhone, setSupportPhone] = useState('');
  const [supportRelationship, setSupportRelationship] = useState('');

  const totalSteps = 6; // Added one more step for protective factors

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

  const canContinue = () => {
    switch (step) {
      case 1: return selectedSubstances.length > 0 && primarySubstance;
      case 2: return yearsUsing && frequency;
      case 3: return selectedTriggers.length > 0;
      case 4: return selectedProtective.length > 0;
      case 5: return whyQuit.length >= 10;
      case 6: return true; // Support person is optional
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

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError('');

    try {
      const response = await authenticatedFetch('/api/profile/active-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          substances: selectedSubstances,
          primary_substance: primarySubstance,
          years_using: parseInt(yearsUsing) || 0,
          frequency,
          triggers: selectedTriggers,
          protective_factors: selectedProtective,
          why_quit: whyQuit,
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
              <Text style={styles.stepTitle}>Factores Protectores</Text>
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
                Estos son tus recursos para enfrentar los momentos difíciles. ¡Cultívalos!
              </Text>
            </View>
          </View>
        );

      case 5:
        return (
          <View style={styles.stepContent}>
            <View style={styles.stepHeader}>
              <Ionicons name="heart" size={40} color="#F59E0B" />
              <Text style={styles.stepTitle}>Tu porqué</Text>
              <Text style={styles.stepSubtitle}>¿Por qué quieres dejar de consumir?</Text>
            </View>

            <View style={styles.textAreaContainer}>
              <TextInput
                style={styles.textArea}
                value={whyQuit}
                onChangeText={setWhyQuit}
                placeholder="Escribe tu motivación... &#10;&#10;Ejemplos:&#10;• Por mi familia&#10;• Por mi salud&#10;• Quiero recuperar mi vida&#10;• Por mis hijos"
                placeholderTextColor="#6B7280"
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.tipBox}>
              <Ionicons name="bulb" size={20} color="#F59E0B" />
              <Text style={styles.tipText}>
                Tu "porqué" será tu ancla cuando las cosas se pongan difíciles. Sé honesto contigo mismo.
              </Text>
            </View>
          </View>
        );

      case 6:
        return (
          <View style={styles.stepContent}>
            <View style={styles.stepHeader}>
              <Ionicons name="people" size={40} color="#F59E0B" />
              <Text style={styles.stepTitle}>Tu persona de apoyo</Text>
              <Text style={styles.stepSubtitle}>Alguien a quien puedas llamar en momentos difíciles</Text>
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Nombre</Text>
              <View style={styles.inputContainerWhite}>
                <Ionicons name="person" size={20} color="#9CA3AF" />
                <TextInput
                  style={styles.inputWhite}
                  value={supportName}
                  onChangeText={setSupportName}
                  placeholder="Nombre de la persona"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Teléfono</Text>
              <View style={styles.inputContainerWhite}>
                <Ionicons name="call" size={20} color="#9CA3AF" />
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
                <Ionicons name="heart" size={20} color="#9CA3AF" />
                <TextInput
                  style={styles.inputWhite}
                  value={supportRelationship}
                  onChangeText={setSupportRelationship}
                  placeholder="Ej: Mamá, amigo, padrino"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            <View style={styles.optionalNote}>
              <Ionicons name="information-circle" size={18} color="#9CA3AF" />
              <Text style={styles.optionalText}>
                Este paso es opcional pero muy recomendado. Tener apoyo aumenta significativamente las probabilidades de éxito.
              </Text>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['#1A1A1A', '#2D2D2D', '#1A1A1A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${(step / totalSteps) * 100}%` }]} />
            </View>
            <Text style={styles.progressText}>Paso {step} de {totalSteps}</Text>
          </View>

          {/* Back Button */}
          {step > 1 && (
            <TouchableOpacity style={styles.backButton} onPress={() => setStep(step - 1)}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
              <Text style={styles.backText}>Atrás</Text>
            </TouchableOpacity>
          )}

          {renderStep()}

          {/* Error */}
          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={18} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Continue Button */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.continueButton,
                !canContinue() && styles.continueButtonDisabled,
              ]}
              onPress={handleNext}
              disabled={!canContinue() || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#1A1A1A" />
              ) : (
                <>
                  <Text style={styles.continueButtonText}>
                    {step === totalSteps ? 'Crear mi Plan' : 'Continuar'}
                  </Text>
                  <Ionicons 
                    name={step === totalSteps ? 'rocket' : 'arrow-forward'} 
                    size={20} 
                    color="#1A1A1A" 
                  />
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 50,
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#F59E0B',
    borderRadius: 3,
  },
  progressText: {
    color: '#9CA3AF',
    fontSize: 12,
    textAlign: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  backText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  stepContent: {
    flex: 1,
  },
  stepHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 12,
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 18,
    color: '#1F2937',
  },
  inputSuffix: {
    color: '#6B7280',
    fontSize: 16,
  },
  inputContainerWhite: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  inputWhite: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1F2937',
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
  textAreaContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  textArea: {
    minHeight: 150,
    padding: 12,
    fontSize: 16,
    color: '#1F2937',
    textAlignVertical: 'top',
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  tipText: {
    flex: 1,
    color: '#F59E0B',
    fontSize: 13,
    lineHeight: 18,
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
  continueButton: {
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
