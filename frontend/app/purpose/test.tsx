import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { authenticatedFetch, getBackendURL } from '../../utils/api';
import BottomNavigation from '../../components/BottomNavigation';

const BACKEND_URL = getBackendURL();

const VALUES_OPTIONS = [
  'Familia', 'Salud', 'Carrera', 'Espiritualidad', 'Creatividad',
  'Ayudar a otros', 'Independencia', 'Aventura', 'Aprendizaje', 'Paz interior'
];

const STRENGTHS_OPTIONS = [
  'Deportes', 'Arte', 'Tecnología', 'Enseñar', 'Escuchar',
  'Organizar', 'Construir', 'Cocinar', 'Escribir', 'Resolver problemas'
];

const QUALITIES_OPTIONS = [
  'Honestidad', 'Valentía', 'Compasión', 'Creatividad',
  'Disciplina', 'Humor', 'Empatía', 'Perseverancia'
];

export default function PurposeTestScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const totalSteps = 12;

  // Respuestas del test
  const [answers, setAnswers] = useState<any>({
    values: [],
    happyBefore: '',
    qualities: [],
    strengths: [],
    peopleAsk: '',
    enjoyFree: '',
    futureVision: '',
    whatTheySay: '',
    noFailure: '',
    worldProblem: '',
    helpWho: '',
    legacy: '',
  });

  const canContinue = () => {
    switch (step) {
      case 1: return answers.values.length > 0;
      case 2: return answers.happyBefore.trim().length > 0;
      case 3: return answers.qualities.length > 0;
      case 4: return answers.strengths.length > 0;
      case 5: return answers.peopleAsk.trim().length > 0;
      case 6: return answers.enjoyFree.trim().length > 0;
      case 7: return answers.futureVision.trim().length > 0;
      case 8: return answers.whatTheySay.trim().length > 0;
      case 9: return answers.noFailure.trim().length > 0;
      case 10: return answers.worldProblem.trim().length > 0;
      case 11: return answers.helpWho.trim().length > 0;
      case 12: return answers.legacy.trim().length > 0;
      default: return false;
    }
  };

  const toggleOption = (field: string, option: string) => {
    const current = answers[field] || [];
    if (current.includes(option)) {
      setAnswers({ ...answers, [field]: current.filter((v: string) => v !== option) });
    } else {
      setAnswers({ ...answers, [field]: [...current, option] });
    }
  };

  const saveResults = async () => {
    try {
      // Analizar respuestas y generar perfil
      const profile = analyzeAnswers(answers);
      
      const response = await authenticatedFetch(`${BACKEND_URL}/api/purpose/test`, {
        method: 'POST',
        body: JSON.stringify({
          answers,
          profile,
          completed_at: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        router.replace('/purpose/dashboard');
      }
    } catch (error) {
      console.error('Failed to save test:', error);
    }
  };

  const analyzeAnswers = (data: any) => {
    // Algoritmo simple para determinar perfil
    const topValues = data.values.slice(0, 3);
    const topStrengths = data.strengths.slice(0, 5);
    
    // Determinar tipo de propósito basado en valores
    let purposeType = 'Constructor';
    if (data.values.includes('Ayudar a otros') || data.values.includes('Compasión')) {
      purposeType = 'Cuidador';
    } else if (data.values.includes('Creatividad') || data.values.includes('Arte')) {
      purposeType = 'Creador';
    } else if (data.values.includes('Espiritualidad')) {
      purposeType = 'Sanador';
    }

    return {
      top_values: topValues,
      top_strengths: topStrengths,
      purpose_type: purposeType,
      vision_summary: data.futureVision,
      legacy: data.legacy,
    };
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['#F59E0B', '#EF4444']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(tabs)/home')} style={styles.homeButton}>
            <Ionicons name="home" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerTitle}>Test de Descubrimiento</Text>
        <Text style={styles.headerSubtitle}>Paso {step} de {totalSteps}</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progress, { width: `${(step / totalSteps) * 100}%` }]} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Pregunta 1: Valores */}
        {step === 1 && (
          <View style={styles.questionContainer}>
            <Text style={styles.question}>¿Qué es lo más importante en tu vida?</Text>
            <Text style={styles.helper}>Selecciona todos los que apliquen</Text>
            <View style={styles.optionsGrid}>
              {VALUES_OPTIONS.map((value) => (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.optionChip,
                    answers.values.includes(value) && styles.optionSelected,
                  ]}
                  onPress={() => toggleOption('values', value)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      answers.values.includes(value) && styles.optionTextSelected,
                    ]}
                  >
                    {value}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Pregunta 2: Felicidad pasada */}
        {step === 2 && (
          <View style={styles.questionContainer}>
            <Text style={styles.question}>
              ¿Qué te hacía sentir vivo y feliz antes de la adicción?
            </Text>
            <TextInput
              style={styles.textArea}
              placeholder="Escribe aquí..."
              value={answers.happyBefore}
              onChangeText={(text) => setAnswers({ ...answers, happyBefore: text })}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              autoFocus
            />
          </View>
        )}

        {/* Pregunta 3: Cualidades */}
        {step === 3 && (
          <View style={styles.questionContainer}>
            <Text style={styles.question}>De estas cualidades, ¿cuáles te definen?</Text>
            <Text style={styles.helper}>Selecciona las que más resuenen contigo</Text>
            <View style={styles.optionsGrid}>
              {QUALITIES_OPTIONS.map((quality) => (
                <TouchableOpacity
                  key={quality}
                  style={[
                    styles.optionChip,
                    answers.qualities.includes(quality) && styles.optionSelected,
                  ]}
                  onPress={() => toggleOption('qualities', quality)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      answers.qualities.includes(quality) && styles.optionTextSelected,
                    ]}
                  >
                    {quality}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Pregunta 4: Fortalezas */}
        {step === 4 && (
          <View style={styles.questionContainer}>
            <Text style={styles.question}>¿En qué eres naturalmente bueno?</Text>
            <Text style={styles.helper}>Selecciona tus talentos naturales</Text>
            <View style={styles.optionsGrid}>
              {STRENGTHS_OPTIONS.map((strength) => (
                <TouchableOpacity
                  key={strength}
                  style={[
                    styles.optionChip,
                    answers.strengths.includes(strength) && styles.optionSelected,
                  ]}
                  onPress={() => toggleOption('strengths', strength)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      answers.strengths.includes(strength) && styles.optionTextSelected,
                    ]}
                  >
                    {strength}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Pregunta 5: Qué te pide la gente */}
        {step === 5 && (
          <View style={styles.questionContainer}>
            <Text style={styles.question}>¿Qué te pide la gente que hagas?</Text>
            <Text style={styles.helper}>
              ¿En qué buscan tu ayuda? (consejos, apoyo, habilidades...)
            </Text>
            <TextInput
              style={styles.textArea}
              placeholder="Escribe aquí..."
              value={answers.peopleAsk}
              onChangeText={(text) => setAnswers({ ...answers, peopleAsk: text })}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              autoFocus
            />
          </View>
        )}

        {/* Pregunta 6: Qué harías gratis */}
        {step === 6 && (
          <View style={styles.questionContainer}>
            <Text style={styles.question}>¿Qué harías gratis porque lo disfrutas?</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Escribe aquí..."
              value={answers.enjoyFree}
              onChangeText={(text) => setAnswers({ ...answers, enjoyFree: text })}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              autoFocus
            />
          </View>
        )}

        {/* Pregunta 7: Visión 5 años */}
        {step === 7 && (
          <View style={styles.questionContainer}>
            <Text style={styles.question}>
              En 5 años, ¿cómo quieres que sea tu vida?
            </Text>
            <Text style={styles.helper}>Sé específico: trabajo, relaciones, salud...</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Escribe aquí..."
              value={answers.futureVision}
              onChangeText={(text) => setAnswers({ ...answers, futureVision: text })}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              autoFocus
            />
          </View>
        )}

        {/* Pregunta 8: Qué dirán de ti */}
        {step === 8 && (
          <View style={styles.questionContainer}>
            <Text style={styles.question}>
              ¿Qué quieres que digan de ti tus seres queridos?
            </Text>
            <TextInput
              style={styles.textArea}
              placeholder="Escribe aquí..."
              value={answers.whatTheySay}
              onChangeText={(text) => setAnswers({ ...answers, whatTheySay: text })}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              autoFocus
            />
          </View>
        )}

        {/* Pregunta 9: Sin miedo al fracaso */}
        {step === 9 && (
          <View style={styles.questionContainer}>
            <Text style={styles.question}>
              Si supieras que no puedes fallar, ¿qué intentarías?
            </Text>
            <TextInput
              style={styles.textArea}
              placeholder="Escribe aquí..."
              value={answers.noFailure}
              onChangeText={(text) => setAnswers({ ...answers, noFailure: text })}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              autoFocus
            />
          </View>
        )}

        {/* Pregunta 10: Problema del mundo */}
        {step === 10 && (
          <View style={styles.questionContainer}>
            <Text style={styles.question}>
              ¿Qué problema del mundo te duele y querrías ayudar a resolver?
            </Text>
            <TextInput
              style={styles.textArea}
              placeholder="Escribe aquí..."
              value={answers.worldProblem}
              onChangeText={(text) => setAnswers({ ...answers, worldProblem: text })}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              autoFocus
            />
          </View>
        )}

        {/* Pregunta 11: A quién ayudar */}
        {step === 11 && (
          <View style={styles.questionContainer}>
            <Text style={styles.question}>
              ¿A quién quieres ayudar con tu experiencia de recuperación?
            </Text>
            <TextInput
              style={styles.textArea}
              placeholder="Escribe aquí..."
              value={answers.helpWho}
              onChangeText={(text) => setAnswers({ ...answers, helpWho: text })}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              autoFocus
            />
          </View>
        )}

        {/* Pregunta 12: Legado */}
        {step === 12 && (
          <View style={styles.questionContainer}>
            <Text style={styles.question}>Completa esta frase:</Text>
            <Text style={styles.legacyPrompt}>"El mundo será mejor porque yo..."</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Escribe aquí..."
              value={answers.legacy}
              onChangeText={(text) => setAnswers({ ...answers, legacy: text })}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              autoFocus
            />
          </View>
        )}
      </ScrollView>

      {/* Navigation */}
      <View style={styles.footer}>
        {step > 1 && (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => setStep(step - 1)}
          >
            <Ionicons name="arrow-back" size={20} color="#6B7280" />
            <Text style={styles.backBtnText}>Atrás</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={[
            styles.continueBtn,
            !canContinue() && styles.continueBtnDisabled,
          ]}
          onPress={() => {
            if (step < totalSteps) {
              setStep(step + 1);
            } else {
              saveResults();
            }
          }}
          disabled={!canContinue()}
        >
          <Text style={styles.continueBtnText}>
            {step === totalSteps ? 'Ver mi perfil' : 'Continuar'}
          </Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <BottomNavigation />
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
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerTop: {
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#FEF3C7',
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
  questionContainer: {
    flex: 1,
  },
  question: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
    lineHeight: 30,
  },
  helper: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
  },
  legacyPrompt: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F59E0B',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  optionChip: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  optionSelected: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  optionText: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
  },
  optionTextSelected: {
    color: '#D97706',
    fontWeight: '600',
  },
  textArea: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 150,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    gap: 8,
  },
  backBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#F59E0B',
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
    gap: 8,
  },
  continueBtnDisabled: {
    backgroundColor: '#D1D5DB',
  },
  continueBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
