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
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authenticatedFetch } from '../utils/api';

const RELATIONSHIPS = [
  { id: 'parent', label: 'Padre/Madre', icon: 'people' },
  { id: 'spouse', label: 'Pareja/Esposo(a)', icon: 'heart' },
  { id: 'child', label: 'Hijo(a)', icon: 'person' },
  { id: 'sibling', label: 'Hermano(a)', icon: 'people-circle' },
  { id: 'other', label: 'Otro familiar/amigo', icon: 'person-add' },
];

const KNOWLEDGE_LEVELS = [
  { id: 'none', label: 'Ninguno', desc: 'No sé casi nada sobre adicciones' },
  { id: 'basic', label: 'Básico', desc: 'Tengo conocimientos generales' },
  { id: 'intermediate', label: 'Intermedio', desc: 'He investigado bastante sobre el tema' },
];

const CONCERNS = [
  { id: 'relapse', label: 'Miedo a recaída', icon: 'warning' },
  { id: 'communication', label: 'Comunicación', icon: 'chatbubbles' },
  { id: 'boundaries', label: 'Establecer límites', icon: 'shield' },
  { id: 'self_care', label: 'Mi propio bienestar', icon: 'heart' },
];

export default function OnboardingFamilyScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [relationship, setRelationship] = useState('');
  const [relativeEmail, setRelativeEmail] = useState('');
  const [knowledgeLevel, setKnowledgeLevel] = useState('');
  const [livesWithRelative, setLivesWithRelative] = useState(false);
  const [mainConcern, setMainConcern] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const canProceed = () => {
    if (step === 1) return relationship !== '';
    if (step === 2) return knowledgeLevel !== '';
    if (step === 3) return mainConcern !== '';
    return true;
  };

  const handleNext = () => {
    if (step < 4) {
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
      const response = await authenticatedFetch('/api/profile/family-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          relationship,
          relative_email: relativeEmail || null,
          knowledge_level: knowledgeLevel,
          lives_with_relative: livesWithRelative,
          main_concern: mainConcern,
        }),
      });

      if (response.ok) {
        router.replace('/family-dashboard');
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

  return (
    <LinearGradient
      colors={['#1A1A1A', '#2D1F4E', '#1A1A1A']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Header */}
          <View style={styles.header}>
            {step > 1 && (
              <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            )}
            <View style={styles.progressContainer}>
              {[1, 2, 3, 4].map((s) => (
                <View
                  key={s}
                  style={[
                    styles.progressDot,
                    s === step && styles.progressDotActive,
                    s < step && styles.progressDotCompleted,
                  ]}
                />
              ))}
            </View>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Step 1: Relationship */}
            {step === 1 && (
              <View style={styles.stepContent}>
                <View style={styles.stepHeader}>
                  <Ionicons name="people" size={48} color="#8B5CF6" />
                  <Text style={styles.stepTitle}>¿Cuál es tu relación?</Text>
                  <Text style={styles.stepSubtitle}>
                    Con la persona en recuperación
                  </Text>
                </View>

                <View style={styles.optionsGrid}>
                  {RELATIONSHIPS.map((rel) => (
                    <TouchableOpacity
                      key={rel.id}
                      style={[
                        styles.optionCard,
                        relationship === rel.id && styles.optionCardSelected,
                      ]}
                      onPress={() => setRelationship(rel.id)}
                    >
                      <Ionicons
                        name={rel.icon as any}
                        size={28}
                        color={relationship === rel.id ? '#8B5CF6' : '#9CA3AF'}
                      />
                      <Text
                        style={[
                          styles.optionLabel,
                          relationship === rel.id && styles.optionLabelSelected,
                        ]}
                      >
                        {rel.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Step 2: Knowledge Level */}
            {step === 2 && (
              <View style={styles.stepContent}>
                <View style={styles.stepHeader}>
                  <Ionicons name="school" size={48} color="#8B5CF6" />
                  <Text style={styles.stepTitle}>Tu conocimiento</Text>
                  <Text style={styles.stepSubtitle}>
                    ¿Cuánto sabes sobre adicciones?
                  </Text>
                </View>

                <View style={styles.levelOptions}>
                  {KNOWLEDGE_LEVELS.map((level) => (
                    <TouchableOpacity
                      key={level.id}
                      style={[
                        styles.levelCard,
                        knowledgeLevel === level.id && styles.levelCardSelected,
                      ]}
                      onPress={() => setKnowledgeLevel(level.id)}
                    >
                      <View style={styles.levelHeader}>
                        <Text
                          style={[
                            styles.levelTitle,
                            knowledgeLevel === level.id && styles.levelTitleSelected,
                          ]}
                        >
                          {level.label}
                        </Text>
                        {knowledgeLevel === level.id && (
                          <Ionicons name="checkmark-circle" size={22} color="#8B5CF6" />
                        )}
                      </View>
                      <Text style={styles.levelDesc}>{level.desc}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.switchRow}>
                  <View style={styles.switchInfo}>
                    <Ionicons name="home" size={24} color="#8B5CF6" />
                    <Text style={styles.switchLabel}>¿Vives con tu familiar?</Text>
                  </View>
                  <Switch
                    value={livesWithRelative}
                    onValueChange={setLivesWithRelative}
                    trackColor={{ false: '#4B5563', true: '#8B5CF6' }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>
            )}

            {/* Step 3: Main Concern */}
            {step === 3 && (
              <View style={styles.stepContent}>
                <View style={styles.stepHeader}>
                  <Ionicons name="help-circle" size={48} color="#8B5CF6" />
                  <Text style={styles.stepTitle}>Tu principal preocupación</Text>
                  <Text style={styles.stepSubtitle}>
                    ¿En qué área necesitas más ayuda?
                  </Text>
                </View>

                <View style={styles.concernOptions}>
                  {CONCERNS.map((concern) => (
                    <TouchableOpacity
                      key={concern.id}
                      style={[
                        styles.concernCard,
                        mainConcern === concern.id && styles.concernCardSelected,
                      ]}
                      onPress={() => setMainConcern(concern.id)}
                    >
                      <View
                        style={[
                          styles.concernIcon,
                          mainConcern === concern.id && styles.concernIconSelected,
                        ]}
                      >
                        <Ionicons
                          name={concern.icon as any}
                          size={26}
                          color={mainConcern === concern.id ? '#FFFFFF' : '#8B5CF6'}
                        />
                      </View>
                      <Text
                        style={[
                          styles.concernLabel,
                          mainConcern === concern.id && styles.concernLabelSelected,
                        ]}
                      >
                        {concern.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Step 4: Link Relative */}
            {step === 4 && (
              <View style={styles.stepContent}>
                <View style={styles.stepHeader}>
                  <Ionicons name="link" size={48} color="#8B5CF6" />
                  <Text style={styles.stepTitle}>Vincular familiar</Text>
                  <Text style={styles.stepSubtitle}>
                    Opcional: conecta con tu familiar en la app
                  </Text>
                </View>

                <View style={styles.linkSection}>
                  <Text style={styles.linkInfo}>
                    Si tu familiar usa esta app, puedes vincularte para ver su progreso (con su aprobación).
                  </Text>

                  <View style={styles.inputContainer}>
                    <Ionicons name="mail" size={20} color="#9CA3AF" />
                    <TextInput
                      style={styles.input}
                      placeholder="Email de tu familiar (opcional)"
                      placeholderTextColor="#6B7280"
                      value={relativeEmail}
                      onChangeText={setRelativeEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>

                  <View style={styles.privacyNote}>
                    <Ionicons name="shield-checkmark" size={20} color="#10B981" />
                    <Text style={styles.privacyText}>
                      Tu familiar deberá aprobar la vinculación desde su app.
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.skipLink}
                  onPress={handleSubmit}
                >
                  <Text style={styles.skipLinkText}>Omitir por ahora</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Error */}
            {error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={18} color="#EF4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Continue Button */}
            <TouchableOpacity
              style={[
                styles.continueButton,
                !canProceed() && styles.continueButtonDisabled,
              ]}
              onPress={handleNext}
              disabled={!canProceed() || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.continueButtonText}>
                    {step === 4 ? 'Completar' : 'Continuar'}
                  </Text>
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  progressContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  progressDotActive: {
    backgroundColor: '#8B5CF6',
    width: 24,
  },
  progressDotCompleted: {
    backgroundColor: '#10B981',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  stepContent: {
    flex: 1,
  },
  stepHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  stepTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: 15,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  optionCard: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionCardSelected: {
    borderColor: '#8B5CF6',
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
    marginTop: 10,
    textAlign: 'center',
  },
  optionLabelSelected: {
    color: '#FFFFFF',
  },
  levelOptions: {
    gap: 12,
  },
  levelCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 18,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  levelCardSelected: {
    borderColor: '#8B5CF6',
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  levelTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  levelTitleSelected: {
    color: '#8B5CF6',
  },
  levelDesc: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 6,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 18,
    marginTop: 20,
  },
  switchInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  switchLabel: {
    fontSize: 15,
    color: '#FFFFFF',
  },
  concernOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  concernCard: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  concernCardSelected: {
    borderColor: '#8B5CF6',
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  concernIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  concernIconSelected: {
    backgroundColor: '#8B5CF6',
  },
  concernLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
    marginTop: 12,
    textAlign: 'center',
  },
  concernLabelSelected: {
    color: '#FFFFFF',
  },
  linkSection: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 20,
  },
  linkInfo: {
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 22,
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 10,
  },
  privacyText: {
    flex: 1,
    fontSize: 13,
    color: '#10B981',
  },
  skipLink: {
    alignItems: 'center',
    marginTop: 20,
  },
  skipLinkText: {
    fontSize: 15,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    gap: 10,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#EF4444',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
    marginTop: 24,
  },
  continueButtonDisabled: {
    backgroundColor: 'rgba(139, 92, 246, 0.4)',
  },
  continueButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
