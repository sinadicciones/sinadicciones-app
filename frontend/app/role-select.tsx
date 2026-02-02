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

type Role = 'patient' | 'professional' | null;

export default function RoleSelectScreen() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<Role>(null);
  const [country, setCountry] = useState('Chile');
  const [identification, setIdentification] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleContinue = async () => {
    if (!selectedRole) {
      setError('Por favor selecciona un rol');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await authenticatedFetch('/api/profile/set-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: selectedRole,
          country,
          identification: identification || null,
        }),
      });

      if (response.ok) {
        if (selectedRole === 'patient') {
          router.replace('/onboarding');
        } else {
          router.replace('/onboarding-professional');
        }
      } else {
        const data = await response.json();
        setError(data.detail || 'Error al guardar el rol');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['#10B981', '#059669', '#047857']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.logo}>🌱</Text>
              <Text style={styles.title}>¡Bienvenido!</Text>
              <Text style={styles.subtitle}>¿Cómo usarás Sin Adicciones?</Text>
            </View>

            {/* Role Cards */}
            <View style={styles.rolesContainer}>
              {/* Patient Card */}
              <TouchableOpacity
                style={[
                  styles.roleCard,
                  selectedRole === 'patient' && styles.roleCardSelected,
                ]}
                onPress={() => setSelectedRole('patient')}
              >
                <View style={styles.roleIconContainer}>
                  <Ionicons 
                    name="person" 
                    size={32} 
                    color={selectedRole === 'patient' ? '#10B981' : '#6B7280'} 
                  />
                </View>
                <View style={styles.roleTextContainer}>
                  <Text style={[
                    styles.roleTitle,
                    selectedRole === 'patient' && styles.roleTitleSelected
                  ]}>
                    Persona en Recuperación
                  </Text>
                  <Text style={styles.roleDescription}>
                    Quiero llevar un seguimiento de mi proceso de recuperación personal
                  </Text>
                </View>
                {selectedRole === 'patient' && (
                  <View style={styles.checkmark}>
                    <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                  </View>
                )}
              </TouchableOpacity>

              {/* Professional Card */}
              <TouchableOpacity
                style={[
                  styles.roleCard,
                  selectedRole === 'professional' && styles.roleCardSelected,
                ]}
                onPress={() => setSelectedRole('professional')}
              >
                <View style={styles.roleIconContainer}>
                  <Ionicons 
                    name="medical" 
                    size={32} 
                    color={selectedRole === 'professional' ? '#10B981' : '#6B7280'} 
                  />
                </View>
                <View style={styles.roleTextContainer}>
                  <Text style={[
                    styles.roleTitle,
                    selectedRole === 'professional' && styles.roleTitleSelected
                  ]}>
                    Profesional de Salud
                  </Text>
                  <Text style={styles.roleDescription}>
                    Soy psicólogo, psiquiatra, terapeuta o consejero y quiero acompañar pacientes
                  </Text>
                </View>
                {selectedRole === 'professional' && (
                  <View style={styles.checkmark}>
                    <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Identification Section */}
            {selectedRole && (
              <View style={styles.identificationSection}>
                <Text style={styles.sectionTitle}>Información adicional</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>País</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="globe" size={20} color="#9CA3AF" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={country}
                      onChangeText={setCountry}
                      placeholder="Ej: Chile"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    {country === 'Chile' ? 'RUT' : 'Identificación'} (opcional)
                  </Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="card" size={20} color="#9CA3AF" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={identification}
                      onChangeText={setIdentification}
                      placeholder={country === 'Chile' ? 'Ej: 12.345.678-9' : 'Número de identificación'}
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                </View>
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
                !selectedRole && styles.continueButtonDisabled,
              ]}
              onPress={handleContinue}
              disabled={!selectedRole || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.continueButtonText}>Continuar</Text>
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.privacy}>
              🔒 Tu información está segura y es confidencial
            </Text>
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
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    fontSize: 60,
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#D1FAE5',
    textAlign: 'center',
  },
  rolesContainer: {
    gap: 16,
    marginBottom: 24,
  },
  roleCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  roleCardSelected: {
    borderColor: '#10B981',
    backgroundColor: '#FFFFFF',
  },
  roleIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  roleTextContainer: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  roleTitleSelected: {
    color: '#10B981',
  },
  roleDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  checkmark: {
    marginLeft: 8,
  },
  identificationSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#D1FAE5',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
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
  continueButton: {
    backgroundColor: '#047857',
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  privacy: {
    fontSize: 14,
    color: '#D1FAE5',
    textAlign: 'center',
  },
});
