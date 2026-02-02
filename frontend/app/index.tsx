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

// Logo de sinadicciones.cl
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
          
          const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL || 'https://heal-journey-4.preview.emergentagent.com'}/api/profile`, {
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
              } else {
                router.replace('/onboarding');
              }
            } else {
              // Profile complete - go to home
              router.replace('/(tabs)/home');
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
            {/* Header with Logo */}
            <View style={styles.header}>
              <Image 
                source={{ uri: LOGO_URL }}
                style={styles.logoImage}
                resizeMode="contain"
              />
              <Text style={styles.subtitle}>Tu camino hacia una vida con propósito</Text>
            </View>

            {!showEmailForm ? (
              <>
                {/* Features - Updated with new functionalities */}
                <View style={styles.features}>
                  <View style={styles.feature}>
                    <View style={styles.featureIconContainer}>
                      <Ionicons name="calendar" size={22} color="#FFFFFF" />
                    </View>
                    <View style={styles.featureTextContainer}>
                      <Text style={styles.featureTitle}>Seguimiento diario</Text>
                      <Text style={styles.featureText}>Hábitos, emociones y días limpio</Text>
                    </View>
                  </View>
                  
                  <View style={styles.feature}>
                    <View style={styles.featureIconContainer}>
                      <Ionicons name="star" size={22} color="#FFFFFF" />
                    </View>
                    <View style={styles.featureTextContainer}>
                      <Text style={styles.featureTitle}>Sobriedad con Sentido</Text>
                      <Text style={styles.featureText}>Descubre tu propósito y objetivos SMART</Text>
                    </View>
                  </View>
                  
                  <View style={styles.feature}>
                    <View style={styles.featureIconContainer}>
                      <Ionicons name="search" size={22} color="#FFFFFF" />
                    </View>
                    <View style={styles.featureTextContainer}>
                      <Text style={styles.featureTitle}>Directorio de centros</Text>
                      <Text style={styles.featureText}>Busca tratamientos en sinadicciones.cl</Text>
                    </View>
                  </View>
                  
                  <View style={styles.feature}>
                    <View style={styles.featureIconContainer}>
                      <Ionicons name="call" size={22} color="#FFFFFF" />
                    </View>
                    <View style={styles.featureTextContainer}>
                      <Text style={styles.featureTitle}>Botón SOS</Text>
                      <Text style={styles.featureText}>Contacto de emergencia inmediato</Text>
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
    marginBottom: 40,
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
    fontSize: 34,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  features: {
    width: '100%',
    marginBottom: 32,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  featureIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 2,
  },
  featureText: {
    fontSize: 13,
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
});
