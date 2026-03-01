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

const PROFESSIONAL_TYPES = [
  { id: 'psychologist', label: 'Psicólogo/a', icon: 'brain' },
  { id: 'psychiatrist', label: 'Psiquiatra', icon: 'medical' },
  { id: 'therapist', label: 'Terapeuta', icon: 'heart' },
  { id: 'counselor', label: 'Consejero/a', icon: 'people' },
  { id: 'social_worker', label: 'Trabajador/a Social', icon: 'hand-left' },
  { id: 'other', label: 'Otro profesional', icon: 'person' },
];

const SPECIALIZATIONS = [
  'Adicciones',
  'Terapia familiar',
  'Trauma',
  'Adolescentes',
  'Terapia grupal',
  'Rehabilitación',
  'Salud mental comunitaria',
  'Otro',
];

export default function ProfessionalOnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form data
  const [professionalType, setProfessionalType] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [institution, setInstitution] = useState('');
  const [bio, setBio] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [consultationFee, setConsultationFee] = useState('');
  const [acceptsPatients, setAcceptsPatients] = useState(true);

  const totalSteps = 4;

  const handleNext = () => {
    if (step === 1 && !professionalType) {
      setError('Por favor selecciona tu profesión');
      return;
    }
    setError('');
    setStep(step + 1);
  };

  const handleBack = () => {
    setError('');
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError('');

    try {
      const response = await authenticatedFetch('/api/profile/professional-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          professional_type: professionalType,
          specialization: specialization || null,
          years_experience: yearsExperience ? parseInt(yearsExperience) : null,
          license_number: licenseNumber || null,
          institution: institution || null,
          bio: bio || null,
          whatsapp: whatsapp || null,
          consultation_fee: consultationFee || null,
          accepts_patients: acceptsPatients,
        }),
      });

      if (response.ok) {
        router.replace('/(tabs)/home');
      } else {
        const data = await response.json();
        setError(data.detail || 'Error al guardar el perfil');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>¿Cuál es tu profesión?</Text>
      <Text style={styles.stepSubtitle}>
        Selecciona tu área de especialización profesional
      </Text>

      <View style={styles.optionsGrid}>
        {PROFESSIONAL_TYPES.map((type) => (
          <TouchableOpacity
            key={type.id}
            style={[
              styles.optionCard,
              professionalType === type.id && styles.optionCardSelected,
            ]}
            onPress={() => setProfessionalType(type.id)}
          >
            <Ionicons
              name={type.icon as any}
              size={28}
              color={professionalType === type.id ? '#10B981' : '#6B7280'}
            />
            <Text
              style={[
                styles.optionLabel,
                professionalType === type.id && styles.optionLabelSelected,
              ]}
            >
              {type.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Tu experiencia</Text>
      <Text style={styles.stepSubtitle}>
        Cuéntanos sobre tu trayectoria profesional
      </Text>

      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Especialización</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagsScroll}>
          <View style={styles.tagsContainer}>
            {SPECIALIZATIONS.map((spec) => (
              <TouchableOpacity
                key={spec}
                style={[
                  styles.tag,
                  specialization === spec && styles.tagSelected,
                ]}
                onPress={() => setSpecialization(spec)}
              >
                <Text
                  style={[
                    styles.tagText,
                    specialization === spec && styles.tagTextSelected,
                  ]}
                >
                  {spec}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Años de experiencia</Text>
        <View style={styles.inputContainer}>
          <Ionicons name="time" size={20} color="#9CA3AF" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={yearsExperience}
            onChangeText={setYearsExperience}
            placeholder="Ej: 5"
            placeholderTextColor="#9CA3AF"
            keyboardType="numeric"
          />
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Número de licencia/registro (opcional)</Text>
        <View style={styles.inputContainer}>
          <Ionicons name="document-text" size={20} color="#9CA3AF" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={licenseNumber}
            onChangeText={setLicenseNumber}
            placeholder="Tu número de registro profesional"
            placeholderTextColor="#9CA3AF"
          />
        </View>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Información adicional</Text>
      <Text style={styles.stepSubtitle}>
        Ayuda a tus pacientes a conocerte mejor
      </Text>

      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Institución o consultorio (opcional)</Text>
        <View style={styles.inputContainer}>
          <Ionicons name="business" size={20} color="#9CA3AF" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={institution}
            onChangeText={setInstitution}
            placeholder="Ej: Hospital San Juan, Consultorio Privado"
            placeholderTextColor="#9CA3AF"
          />
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Breve biografía (opcional)</Text>
        <View style={[styles.inputContainer, styles.textAreaContainer]}>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={bio}
            onChangeText={setBio}
            placeholder="Cuéntales a tus pacientes sobre tu enfoque terapéutico, formación o motivación..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>✨ ¡Casi listo!</Text>
        <Text style={styles.summaryText}>
          Al completar tu perfil, los pacientes podrán encontrarte y vincularse contigo para que puedas acompañar su proceso de recuperación.
        </Text>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['#3B82F6', '#2563EB', '#1D4ED8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            {/* Progress */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${(step / totalSteps) * 100}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                Paso {step} de {totalSteps}
              </Text>
            </View>

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerIcon}>
                <Ionicons name="medical" size={32} color="#3B82F6" />
              </View>
              <Text style={styles.headerTitle}>Perfil Profesional</Text>
            </View>

            {/* Step Content */}
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}

            {/* Error */}
            {error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={18} color="#EF4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Navigation */}
            <View style={styles.navigation}>
              {step > 1 && (
                <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                  <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
                  <Text style={styles.backButtonText}>Atrás</Text>
                </TouchableOpacity>
              )}

              {step < totalSteps ? (
                <TouchableOpacity
                  style={[styles.nextButton, step === 1 && styles.nextButtonFull]}
                  onPress={handleNext}
                >
                  <Text style={styles.nextButtonText}>Siguiente</Text>
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.nextButton, styles.submitButton]}
                  onPress={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={styles.nextButtonText}>Completar Perfil</Text>
                      <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
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
  },
  content: {
    flex: 1,
    padding: 24,
    paddingTop: 50,
  },
  progressContainer: {
    marginBottom: 24,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
  },
  progressText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    textAlign: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  stepContent: {
    flex: 1,
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 24,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  optionCard: {
    width: '45%',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionCardSelected: {
    borderColor: '#10B981',
    backgroundColor: '#FFFFFF',
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
    marginTop: 8,
    textAlign: 'center',
  },
  optionLabelSelected: {
    color: '#10B981',
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  tagsScroll: {
    marginHorizontal: -24,
    paddingHorizontal: 24,
  },
  tagsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  tag: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  tagSelected: {
    backgroundColor: '#FFFFFF',
    borderColor: '#10B981',
  },
  tagText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  tagTextSelected: {
    color: '#10B981',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  textAreaContainer: {
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1F2937',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  summaryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 20,
    marginTop: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 20,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 14,
    flex: 1,
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  nextButtonFull: {
    flex: 1,
  },
  submitButton: {
    backgroundColor: '#059669',
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
