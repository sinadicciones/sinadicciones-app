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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { authenticatedFetch, getBackendURL } from '../utils/api';

const BACKEND_URL = getBackendURL();

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
};

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [showInfo, setShowInfo] = useState(false);
  const [currentInfo, setCurrentInfo] = useState<any>(null);
  
  // Form data
  const [addictionType, setAddictionType] = useState('');
  const [yearsUsing, setYearsUsing] = useState('');
  const [cleanSince, setCleanSince] = useState('');
  const [hasDualDiagnosis, setHasDualDiagnosis] = useState(false);
  const [diagnoses, setDiagnoses] = useState<string[]>([]);
  const [newDiagnosis, setNewDiagnosis] = useState('');
  const [triggers, setTriggers] = useState<string[]>([]);
  const [newTrigger, setNewTrigger] = useState('');
  const [protectiveFactors, setProtectiveFactors] = useState<string[]>([]);
  const [newFactor, setNewFactor] = useState('');
  const [myWhy, setMyWhy] = useState('');

  const COMMON_DIAGNOSES = ['Depresión', 'Ansiedad', 'TDAH', 'Trastorno Bipolar', 'Estrés Postraumático'];
  const COMMON_TRIGGERS = ['Estrés', 'Soledad', 'Conflictos', 'Ciertos lugares', 'Personas del pasado', 'Emociones negativas'];
  const COMMON_FACTORS = ['Ejercicio', 'Meditación', 'Reuniones de apoyo', 'Padrino/Mentor', 'Familia', 'Trabajo/Estudio'];

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

  const saveProfile = async () => {
    try {
      const profileData = {
        addiction_type: addictionType,
        years_using: yearsUsing ? parseInt(yearsUsing) : null,
        clean_since: cleanSince || null,
        dual_diagnosis: hasDualDiagnosis,
        diagnoses: diagnoses,
        triggers: triggers,
        protective_factors: protectiveFactors,
        my_why: myWhy,
        profile_completed: true,
      };

      const response = await authenticatedFetch(`${BACKEND_URL}/api/profile`, {
        method: 'PUT',
        body: JSON.stringify(profileData),
      });

      if (response.ok) {
        router.replace('/recommendations');
      }
    } catch (error) {
      console.error('Failed to save profile:', error);
    }
  };

  const canContinue = () => {
    switch (step) {
      case 1:
        return addictionType.trim().length > 0;
      case 2:
        return cleanSince.length > 0;
      case 3:
        return true; // Dual diagnosis is optional
      case 4:
        return triggers.length > 0;
      case 5:
        return protectiveFactors.length > 0;
      case 6:
        return myWhy.trim().length > 0;
      default:
        return false;
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
        <Text style={styles.headerSubtitle}>Paso {step} de 6</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progress, { width: `${(step / 6) * 100}%` }]} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Step 1: Tipo de adicción */}
        {step === 1 && (
          <View style={styles.stepContainer}>
            <View style={styles.titleRow}>
              <Text style={styles.stepTitle}>¿Cuál es tu adicción principal?</Text>
              <TouchableOpacity onPress={() => showInfoModal('addiction_type')}>
                <Ionicons name="information-circle" size={28} color="#3B82F6" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Ej: Alcohol, Cocaína, Juego, etc."
              value={addictionType}
              onChangeText={setAddictionType}
              autoFocus
            />
            <TextInput
              style={styles.input}
              placeholder="¿Cuántos años aproximadamente?"
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
              <Text style={styles.stepTitle}>¿Cuándo comenzaste tu recuperación?</Text>
              <TouchableOpacity onPress={() => showInfoModal('clean_since')}>
                <Ionicons name="information-circle" size={28} color="#3B82F6" />
              </TouchableOpacity>
            </View>
            <Text style={styles.helperText}>Ingresa la fecha (AAAA-MM-DD)</Text>
            <TextInput
              style={styles.input}
              placeholder="2024-01-15"
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
              <Text style={styles.stepTitle}>¿Tienes alguna condición de salud mental?</Text>
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
                      style={[
                        styles.chip,
                        diagnoses.includes(diag) && styles.chipSelected,
                      ]}
                      onPress={() => {
                        if (diagnoses.includes(diag)) {
                          setDiagnoses(diagnoses.filter((d) => d !== diag));
                        } else {
                          setDiagnoses([...diagnoses, diag]);
                        }
                      }}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          diagnoses.includes(diag) && styles.chipTextSelected,
                        ]}
                      >
                        {diag}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TextInput
                  style={styles.input}
                  placeholder="O escribe otro diagnóstico"
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
              <Text style={styles.stepTitle}>¿Cuáles son tus principales gatillos?</Text>
              <TouchableOpacity onPress={() => showInfoModal('triggers')}>
                <Ionicons name="information-circle" size={28} color="#3B82F6" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.helperText}>Selecciona los más comunes o agrega los tuyos</Text>
            
            <View style={styles.chipsContainer}>
              {COMMON_TRIGGERS.map((trigger) => (
                <TouchableOpacity
                  key={trigger}
                  style={[
                    styles.chip,
                    triggers.includes(trigger) && styles.chipSelected,
                  ]}
                  onPress={() => {
                    if (triggers.includes(trigger)) {
                      setTriggers(triggers.filter((t) => t !== trigger));
                    } else {
                      setTriggers([...triggers, trigger]);
                    }
                  }}
                >
                  <Text
                    style={[
                      styles.chipText,
                      triggers.includes(trigger) && styles.chipTextSelected,
                    ]}
                  >
                    {trigger}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.input}
              placeholder="Agregar otro gatillo"
              value={newTrigger}
              onChangeText={setNewTrigger}
              onSubmitEditing={() => addItem(triggers, setTriggers, newTrigger, setNewTrigger)}
            />

            {triggers.length > 0 && (
              <View style={styles.selectedContainer}>
                <Text style={styles.selectedTitle}>Tus gatillos:</Text>
                {triggers.map((trigger, index) => (
                  <View key={index} style={styles.selectedItem}>
                    <Text style={styles.selectedText}>• {trigger}</Text>
                    <TouchableOpacity onPress={() => removeItem(triggers, setTriggers, index)}>
                      <Ionicons name="close-circle" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Step 5: Factores protectores */}
        {step === 5 && (
          <View style={styles.stepContainer}>
            <View style={styles.titleRow}>
              <Text style={styles.stepTitle}>¿Qué te ayuda a mantenerte limpio?</Text>
              <TouchableOpacity onPress={() => showInfoModal('protective_factors')}>
                <Ionicons name="information-circle" size={28} color="#3B82F6" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.helperText}>Identifica tus fortalezas y apoyos</Text>
            
            <View style={styles.chipsContainer}>
              {COMMON_FACTORS.map((factor) => (
                <TouchableOpacity
                  key={factor}
                  style={[
                    styles.chip,
                    protectiveFactors.includes(factor) && styles.chipSelected,
                  ]}
                  onPress={() => {
                    if (protectiveFactors.includes(factor)) {
                      setProtectiveFactors(protectiveFactors.filter((f) => f !== factor));
                    } else {
                      setProtectiveFactors([...protectiveFactors, factor]);
                    }
                  }}
                >
                  <Text
                    style={[
                      styles.chipText,
                      protectiveFactors.includes(factor) && styles.chipTextSelected,
                    ]}
                  >
                    {factor}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.input}
              placeholder="Agregar otro factor protector"
              value={newFactor}
              onChangeText={setNewFactor}
              onSubmitEditing={() => addItem(protectiveFactors, setProtectiveFactors, newFactor, setNewFactor)}
            />

            {protectiveFactors.length > 0 && (
              <View style={styles.selectedContainer}>
                <Text style={styles.selectedTitle}>Tus fortalezas:</Text>
                {protectiveFactors.map((factor, index) => (
                  <View key={index} style={styles.selectedItem}>
                    <Text style={styles.selectedText}>• {factor}</Text>
                    <TouchableOpacity onPress={() => removeItem(protectiveFactors, setProtectiveFactors, index)}>
                      <Ionicons name="close-circle" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Step 6: Mi Para Qué */}
        {step === 6 && (
          <View style={styles.stepContainer}>
            <View style={styles.titleRow}>
              <Text style={styles.stepTitle}>Tu "Para Qué" 🎯</Text>
              <TouchableOpacity onPress={() => showInfoModal('my_why')}>
                <Ionicons name="information-circle" size={28} color="#3B82F6" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.helperText}>
              Tu razón más profunda para estar en recuperación
            </Text>
            
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Ejemplo: Para estar presente para mis hijos, recuperar mi salud, volver a ser quien era antes..."
              value={myWhy}
              onChangeText={setMyWhy}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              autoFocus
            />
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
            !canContinue() && styles.continueButtonDisabled,
          ]}
          onPress={() => {
            if (step < 6) {
              setStep(step + 1);
            } else {
              saveProfile();
            }
          }}
          disabled={!canContinue()}
        >
          <Text style={styles.continueButtonText}>
            {step === 6 ? 'Comenzar' : 'Continuar'}
          </Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
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
    color: '#F0FDFA',
    marginBottom: 16,
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
    padding: 24,
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
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
    marginRight: 12,
  },
  helperText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  textArea: {
    minHeight: 120,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  toggleText: {
    fontSize: 16,
    color: '#1F2937',
    marginLeft: 12,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
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
  selectedContainer: {
    backgroundColor: '#F0FDF4',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  selectedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
    marginBottom: 8,
  },
  selectedItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectedText: {
    fontSize: 14,
    color: '#047857',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginLeft: 8,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
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
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginRight: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
  },
  modalText: {
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 24,
    marginBottom: 24,
  },
  modalButton: {
    backgroundColor: '#10B981',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
