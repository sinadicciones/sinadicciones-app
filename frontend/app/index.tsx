import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getBackendURL } from '../utils/api';

// Logo de sinadicciones.org
const LOGO_URL = 'https://customer-assets.emergentagent.com/job_b1701075-ef08-4c17-96e4-9e005036f1a8/artifacts/ftksetul_IMG_0917.jpeg';

export default function WelcomeScreen() {
  const { user, isLoading, login, loginWithEmail, registerWithEmail } = useAuth();
  const router = useRouter();
  
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const checkUserAndRedirect = async () => {
      if (user && !isLoading) {
        try {
          // Check if user has a profile with role
          const token = await getStoredToken();
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }
          
          const response = await fetch(`${getBackendURL()}/api/profile`, {
            headers,
            credentials: 'include',
          });
          
          if (response.ok) {
            const profile = await response.json();
            // Check if role is set
            if (!profile.role || profile.role === '') {
              // New user - go to role selection
              router.replace('/role-select');
            } else if (!profile.profile_completed) {
              // Has role but not completed onboarding
              if (profile.role === 'professional') {
                router.replace('/onboarding-professional');
              } else if (profile.role === 'active_user') {
                router.replace('/onboarding-active');
              } else if (profile.role === 'family') {
                router.replace('/onboarding-family');
              } else {
                router.replace('/onboarding');
              }
            } else {
              // Profile complete - redirect based on role
              if (profile.role === 'professional') {
                router.replace('/professional-dashboard');
              } else if (profile.role === 'family') {
                router.replace('/family-dashboard');
              } else if (profile.role === 'active_user') {
                router.replace('/(tabs)/challenge-dashboard');
              } else {
                router.replace('/(tabs)/home');
              }
            }
          } else {
            // No profile yet, go to role selection
            router.replace('/role-select');
          }
        } catch (err) {
          console.error('Error checking profile:', err);
          router.replace('/(tabs)/home');
        }
      }
    };
    
    checkUserAndRedirect();
  }, [user, isLoading]);

  // Helper to get token
  const getStoredToken = async () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return localStorage.getItem('session_token');
    }
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    return await AsyncStorage.getItem('session_token');
  };

  const handleEmailSubmit = async () => {
    console.log('handleEmailSubmit called');
    setError('');
    
    if (!email.trim()) {
      setError('Por favor ingresa tu email');
      return;
    }
    if (!password.trim()) {
      setError('Por favor ingresa tu contraseña');
      return;
    }
    if (isRegister && !name.trim()) {
      setError('Por favor ingresa tu nombre');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    console.log('Validation passed, submitting...');
    setIsSubmitting(true);
    
    try {
      let result;
      if (isRegister) {
        result = await registerWithEmail(email, password, name);
      } else {
        result = await loginWithEmail(email, password);
      }
      
      if (!result.success) {
        setError(result.error || 'Error al procesar la solicitud');
      }
    } catch (err) {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

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
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Sinadicciones.org</Text>
              <Text style={styles.subtitle}>Tu primer paso en tu recuperación</Text>
              <Text style={styles.versionBadge}>v21</Text>
            </View>

            {!showEmailForm ? (
              <>
                {/* Nelson AI - Featured for all */}
                <View style={styles.nelsonFeature}>
                  <View style={styles.nelsonIconContainer}>
                    <Ionicons name="chatbubble-ellipses" size={28} color="#FFFFFF" />
                  </View>
                  <View style={styles.nelsonTextContainer}>
                    <Text style={styles.nelsonTitle}>Nelson - Tu Terapeuta IA 24/7</Text>
                    <Text style={styles.nelsonText}>Apoyo emocional y guía personalizada cuando lo necesites, disponible las 24 horas</Text>
                  </View>
                </View>

                {/* For Recovery - Patient */}
                <View style={styles.sectionHeader}>
                  <Ionicons name="heart" size={18} color="#10B981" />
                  <Text style={styles.sectionTitle}>En Recuperación</Text>
                </View>
                <View style={styles.features}>
                  <View style={styles.feature}>
                    <View style={styles.featureIconContainer}>
                      <Ionicons name="calendar" size={20} color="#FFFFFF" />
                    </View>
                    <View style={styles.featureTextContainer}>
                      <Text style={styles.featureTitle}>Seguimiento diario</Text>
                      <Text style={styles.featureText}>Hábitos, emociones y días limpio</Text>
                    </View>
                  </View>
                  
                  <View style={styles.feature}>
                    <View style={styles.featureIconContainer}>
                      <Ionicons name="compass" size={20} color="#FFFFFF" />
                    </View>
                    <View style={styles.featureTextContainer}>
                      <Text style={styles.featureTitle}>Sobriedad con Sentido</Text>
                      <Text style={styles.featureText}>Propósito y objetivos de vida</Text>
                    </View>
                  </View>
                </View>

                {/* For Active Users - Challenge */}
                <View style={styles.sectionHeader}>
                  <Ionicons name="flame" size={18} color="#F59E0B" />
                  <Text style={[styles.sectionTitle, { color: '#F59E0B' }]}>Quiero Dejarlo</Text>
                </View>
                <View style={styles.features}>
                  <View style={[styles.feature, { borderColor: 'rgba(245, 158, 11, 0.3)' }]}>
                    <View style={[styles.featureIconContainer, { backgroundColor: '#F59E0B' }]}>
                      <Ionicons name="trophy" size={20} color="#FFFFFF" />
                    </View>
                    <View style={styles.featureTextContainer}>
                      <Text style={styles.featureTitle}>Reto de 21 días</Text>
                      <Text style={styles.featureText}>Programa guiado para comenzar</Text>
                    </View>
                  </View>
                  
                  <View style={[styles.feature, { borderColor: 'rgba(245, 158, 11, 0.3)' }]}>
                    <View style={[styles.featureIconContainer, { backgroundColor: '#F59E0B' }]}>
                      <Ionicons name="school" size={20} color="#FFFFFF" />
                    </View>
                    <View style={styles.featureTextContainer}>
                      <Text style={styles.featureTitle}>Contenido educativo</Text>
                      <Text style={styles.featureText}>Entiende la adicción y el craving</Text>
                    </View>
                  </View>
                </View>

                {/* For Professionals */}
                <View style={styles.sectionHeader}>
                  <Ionicons name="medical" size={18} color="#3B82F6" />
                  <Text style={styles.sectionTitlePro}>Para Profesionales</Text>
                </View>
                <View style={styles.features}>
                  <View style={[styles.feature, styles.featurePro]}>
                    <View style={[styles.featureIconContainer, styles.featureIconPro]}>
                      <Ionicons name="people" size={20} color="#FFFFFF" />
                    </View>
                    <View style={styles.featureTextContainer}>
                      <Text style={styles.featureTitle}>Gestión de Pacientes</Text>
                      <Text style={styles.featureText}>Vincula y monitorea pacientes</Text>
                    </View>
                  </View>
                  
                  <View style={[styles.feature, styles.featurePro]}>
                    <View style={[styles.featureIconContainer, styles.featureIconPro]}>
                      <Ionicons name="notifications" size={20} color="#FFFFFF" />
                    </View>
                    <View style={styles.featureTextContainer}>
                      <Text style={styles.featureTitle}>Alertas Inteligentes</Text>
                      <Text style={styles.featureText}>Recaídas, inactividad, emociones</Text>
                    </View>
                  </View>
                </View>

                {/* For Family */}
                <View style={styles.sectionHeader}>
                  <Ionicons name="people" size={18} color="#8B5CF6" />
                  <Text style={[styles.sectionTitle, { color: '#8B5CF6' }]}>Para Familiares</Text>
                </View>
                <View style={styles.features}>
                  <View style={[styles.feature, { borderColor: 'rgba(139, 92, 246, 0.3)' }]}>
                    <View style={[styles.featureIconContainer, { backgroundColor: '#8B5CF6' }]}>
                      <Ionicons name="book" size={20} color="#FFFFFF" />
                    </View>
                    <View style={styles.featureTextContainer}>
                      <Text style={styles.featureTitle}>Educación familiar</Text>
                      <Text style={styles.featureText}>Aprende a apoyar sin habilitar</Text>
                    </View>
                  </View>
                  
                  <View style={[styles.feature, { borderColor: 'rgba(139, 92, 246, 0.3)' }]}>
                    <View style={[styles.featureIconContainer, { backgroundColor: '#8B5CF6' }]}>
                      <Ionicons name="link" size={20} color="#FFFFFF" />
                    </View>
                    <View style={styles.featureTextContainer}>
                      <Text style={styles.featureTitle}>Seguimiento de tu familiar</Text>
                      <Text style={styles.featureText}>Ve su progreso con su permiso</Text>
                    </View>
                  </View>
                </View>

                {/* Auth Buttons */}
                <View style={styles.authButtons}>
                  <TouchableOpacity style={styles.googleButton} onPress={login}>
                    <Ionicons name="logo-google" size={20} color="#FFFFFF" />
                    <Text style={styles.googleButtonText}>Continuar con Google</Text>
                  </TouchableOpacity>
                  
                  <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>o</Text>
                    <View style={styles.dividerLine} />
                  </View>
                  
                  <TouchableOpacity 
                    style={styles.emailButton} 
                    onPress={() => {
                      setShowEmailForm(true);
                      setIsRegister(false);
                    }}
                  >
                    <Ionicons name="mail" size={20} color="#1A1A1A" />
                    <Text style={styles.emailButtonText}>Continuar con Email</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.versionContainer}>
                  <Text style={styles.versionText}>Versión 21</Text>
                </View>
              </>
            ) : (
              <>
                {/* Email Form */}
                <View style={styles.emailForm}>
                  <TouchableOpacity 
                    style={styles.backButton}
                    onPress={() => {
                      setShowEmailForm(false);
                      setError('');
                      setEmail('');
                      setPassword('');
                      setName('');
                    }}
                  >
                    <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                    <Text style={styles.backButtonText}>Volver</Text>
                  </TouchableOpacity>

                  <Text style={styles.formTitle}>
                    {isRegister ? 'Crear cuenta' : 'Iniciar sesión'}
                  </Text>
                  
                  {error ? (
                    <View style={styles.errorContainer}>
                      <Ionicons name="alert-circle" size={18} color="#EF4444" />
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  ) : null}

                  {isRegister && (
                    <View style={styles.inputContainer}>
                      <Ionicons name="person" size={20} color="#9CA3AF" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Tu nombre"
                        placeholderTextColor="#9CA3AF"
                        value={name}
                        onChangeText={setName}
                        autoCapitalize="words"
                      />
                    </View>
                  )}

                  <View style={styles.inputContainer}>
                    <Ionicons name="mail" size={20} color="#9CA3AF" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Email"
                      placeholderTextColor="#9CA3AF"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Ionicons name="lock-closed" size={20} color="#9CA3AF" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Contraseña"
                      placeholderTextColor="#9CA3AF"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                      <Ionicons 
                        name={showPassword ? "eye-off" : "eye"} 
                        size={20} 
                        color="#9CA3AF" 
                      />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity 
                    style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                    onPress={handleEmailSubmit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.submitButtonText}>
                        {isRegister ? 'Crear cuenta' : 'Iniciar sesión'}
                      </Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.switchModeButton}
                    onPress={() => {
                      setIsRegister(!isRegister);
                      setError('');
                    }}
                  >
                    <Text style={styles.switchModeText}>
                      {isRegister 
                        ? '¿Ya tienes cuenta? Inicia sesión' 
                        : '¿No tienes cuenta? Regístrate'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            <Text style={styles.privacy}>
              🔒 Tus datos están seguros y son privados
            </Text>

            <View style={styles.versionContainer}>
              <Text style={styles.versionText}>Versión 21</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoImage: {
    width: 200,
    height: 120,
    marginBottom: 16,
  },
  logo: {
    fontSize: 70,
    marginBottom: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  versionBadge: {
    fontSize: 12,
    color: '#10B981',
    marginTop: 8,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    width: '100%',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  sectionTitlePro: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  features: {
    width: '100%',
    marginBottom: 16,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  featurePro: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  featureIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(16, 185, 129, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureIconPro: {
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 2,
  },
  featureText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  authButtons: {
    width: '100%',
    marginBottom: 24,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4285F4',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  googleButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  dividerText: {
    color: '#9CA3AF',
    marginHorizontal: 16,
    fontSize: 14,
  },
  emailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
  },
  emailButtonText: {
    color: '#1A1A1A',
    fontSize: 16,
    fontWeight: '600',
  },
  emailForm: {
    width: '100%',
    marginBottom: 24,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1F2937',
  },
  submitButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#1A1A1A',
    fontSize: 16,
    fontWeight: 'bold',
  },
  switchModeButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  switchModeText: {
    color: '#9CA3AF',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  privacy: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    marginTop: 10,
  },
  versionText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '600',
  },
});
