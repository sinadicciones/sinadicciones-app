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

type Role = 'patient' | 'professional' | 'active_user' | 'family' | null;

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
        } else if (selectedRole === 'professional') {
          router.replace('/onboarding-professional');
        } else if (selectedRole === 'active_user') {
          router.replace('/onboarding-active');
        } else if (selectedRole === 'family') {
          router.replace('/onboarding-family');
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
        colors={['#1A1A1A', '#2D2D2D', '#1A1A1A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>¡Bienvenido!</Text>
              <Text style={styles.subtitle}>¿Cómo te identificas?</Text>
            </View>

            {/* Role Cards */}
            <View style={styles.rolesContainer}>
              {/* Patient Card - In Recovery */}
              <TouchableOpacity
                style={[
                  styles.roleCard,
                  selectedRole === 'patient' && styles.roleCardSelectedGreen,
                ]}
                onPress={() => setSelectedRole('patient')}
              >
                <View style={[styles.roleIconContainer, styles.iconGreen]}>
                  <Ionicons 
                    name="leaf" 
                    size={28} 
                    color="#10B981" 
                  />
                </View>
                <View style={styles.roleTextContainer}>
                  <Text style={[
                    styles.roleTitle,
                    selectedRole === 'patient' && styles.roleTitleSelectedGreen
                  ]}>
                    Estoy en Recuperación
                  </Text>
                  <Text style={styles.roleDescription}>
                    Ya dejé de consumir y quiero mantener mi sobriedad
                  </Text>
                </View>
                {selectedRole === 'patient' && (
                  <View style={styles.checkmark}>
                    <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                  </View>
                )}
              </TouchableOpacity>

              {/* Active User Card - Wants to Quit */}
              <TouchableOpacity
                style={[
                  styles.roleCard,
                  selectedRole === 'active_user' && styles.roleCardSelectedOrange,
                ]}
                onPress={() => setSelectedRole('active_user')}
              >
                <View style={[styles.roleIconContainer, styles.iconOrange]}>
                  <Ionicons 
                    name="flame" 
                    size={28} 
                    color="#F59E0B" 
                  />
                </View>
                <View style={styles.roleTextContainer}>
                  <Text style={[
                    styles.roleTitle,
                    selectedRole === 'active_user' && styles.roleTitleSelectedOrange
                  ]}>
                    Quiero Dejarlo
                  </Text>
                  <Text style={styles.roleDescription}>
                    Estoy consumiendo pero quiero dejar • Reto 21 días
                  </Text>
                  <View style={styles.badgeContainer}>
                    <View style={styles.badge}>
                      <Ionicons name="rocket" size={12} color="#F59E0B" />
                      <Text style={styles.badgeText}>Reto 21 Días</Text>
                    </View>
                  </View>
                </View>
                {selectedRole === 'active_user' && (
                  <View style={styles.checkmark}>
                    <Ionicons name="checkmark-circle" size={24} color="#F59E0B" />
                  </View>
                )}
              </TouchableOpacity>

              {/* Professional Card */}
              <TouchableOpacity
                style={[
                  styles.roleCard,
                  selectedRole === 'professional' && styles.roleCardSelectedBlue,
                ]}
                onPress={() => setSelectedRole('professional')}
              >
                <View style={[styles.roleIconContainer, styles.iconBlue]}>
                  <Ionicons 
                    name="medical" 
                    size={28} 
                    color="#3B82F6" 
                  />
                </View>
                <View style={styles.roleTextContainer}>
                  <Text style={[
                    styles.roleTitle,
                    selectedRole === 'professional' && styles.roleTitleSelectedBlue
                  ]}>
                    Soy Profesional de Salud
                  </Text>
                  <Text style={styles.roleDescription}>
                    Psicólogo, psiquiatra, terapeuta o consejero
                  </Text>
                </View>
                {selectedRole === 'professional' && (
                  <View style={styles.checkmark}>
                    <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />
                  </View>
                )}
              </TouchableOpacity>

              {/* Family Card */}
              <TouchableOpacity
                style={[
                  styles.roleCard,
                  selectedRole === 'family' && styles.roleCardSelectedPurple,
                ]}
                onPress={() => setSelectedRole('family')}
              >
                <View style={[styles.roleIconContainer, styles.iconPurple]}>
                  <Ionicons 
                    name="people" 
                    size={28} 
                    color="#8B5CF6" 
                  />
                </View>
                <View style={styles.roleTextContainer}>
                  <Text style={[
                    styles.roleTitle,
                    selectedRole === 'family' && styles.roleTitleSelectedPurple
                  ]}>
                    Soy Familiar
                  </Text>
                  <Text style={styles.roleDescription}>
                    Quiero apoyar a mi ser querido en su recuperación
                  </Text>
                  <View style={styles.badgeContainer}>
                    <View style={[styles.badge, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
                      <Ionicons name="heart" size={12} color="#8B5CF6" />
                      <Text style={[styles.badgeText, { color: '#8B5CF6' }]}>Contenido educativo</Text>
                    </View>
                  </View>
                </View>
                {selectedRole === 'family' && (
                  <View style={styles.checkmark}>
                    <Ionicons name="checkmark-circle" size={24} color="#8B5CF6" />
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Identification Section - Only for patient and professional */}
            {selectedRole && selectedRole !== 'active_user' && selectedRole !== 'family' && (
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

            {/* Privacy note for active_user */}
            {selectedRole === 'active_user' && (
              <View style={styles.privacyNote}>
                <Ionicons name="shield-checkmark" size={20} color="#10B981" />
                <Text style={styles.privacyNoteText}>
                  Tu información es 100% confidencial. No pedimos datos de identificación.
                </Text>
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
                <ActivityIndicator size="small" color="#1A1A1A" />
              ) : (
                <>
                  <Text style={styles.continueButtonText}>Continuar</Text>
                  <Ionicons name="arrow-forward" size={20} color="#1A1A1A" />
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
    marginBottom: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  rolesContainer: {
    gap: 12,
    marginBottom: 20,
  },
  roleCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  roleCardSelectedGreen: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  roleCardSelectedOrange: {
    borderColor: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  roleCardSelectedBlue: {
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  roleIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  iconGreen: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  iconOrange: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  iconBlue: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
  iconPurple: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
  },
  roleTextContainer: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  roleTitleSelectedGreen: {
    color: '#10B981',
  },
  roleTitleSelectedOrange: {
    color: '#F59E0B',
  },
  roleTitleSelectedBlue: {
    color: '#3B82F6',
  },
  roleTitleSelectedPurple: {
    color: '#8B5CF6',
  },
  roleDescription: {
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 18,
  },
  badgeContainer: {
    flexDirection: 'row',
    marginTop: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F59E0B',
  },
  checkmark: {
    marginLeft: 8,
  },
  identificationSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 14,
    color: '#9CA3AF',
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
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  privacyNoteText: {
    flex: 1,
    color: '#10B981',
    fontSize: 14,
    lineHeight: 20,
  },
  continueButton: {
    backgroundColor: '#FFFFFF',
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
    color: '#1A1A1A',
    fontSize: 18,
    fontWeight: 'bold',
  },
  privacy: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
