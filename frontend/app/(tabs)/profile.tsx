import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { authenticatedFetch, getBackendURL } from '../../utils/api';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import * as ImagePicker from 'expo-image-picker';

const BACKEND_URL = getBackendURL();

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Estados para cambio de contraseña
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  
  // Estados para foto de perfil
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await authenticatedFetch(`${BACKEND_URL}/api/profile`);

      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        setFormData(data);
        
        // Si tiene fecha limpio desde, establecerla en el date picker
        if (data.clean_since) {
          setSelectedDate(new Date(data.clean_since));
        }
        
        // Cargar foto de perfil si existe
        if (data.profile_photo) {
          setProfilePhoto(data.profile_photo);
        }
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  };

  const pickImage = async () => {
    // En web, usar input de archivo nativo
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e: any) => {
        const file = e.target?.files?.[0];
        if (file) {
          // Validar tamaño (max 5MB)
          if (file.size > 5 * 1024 * 1024) {
            alert('La imagen es muy grande. Máximo 5MB.');
            return;
          }
          
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64Image = reader.result as string;
            console.log('Image loaded, uploading...');
            await uploadProfilePhoto(base64Image);
          };
          reader.onerror = () => {
            alert('Error al leer la imagen');
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
      return;
    }

    // En móvil, usar expo-image-picker
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Necesitamos acceso a tu galería para cambiar la foto de perfil');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      await uploadProfilePhoto(base64Image);
    }
  };

  const takePhoto = async () => {
    // En web, la cámara no está disponible fácilmente, usar galería
    if (Platform.OS === 'web') {
      Alert.alert('No disponible', 'La cámara no está disponible en web. Usa "Elegir de galería".');
      return;
    }

    // En móvil, usar cámara
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Necesitamos acceso a tu cámara para tomar una foto');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      await uploadProfilePhoto(base64Image);
    }
  };

  const uploadProfilePhoto = async (base64Image: string) => {
    setUploadingPhoto(true);
    try {
      const response = await authenticatedFetch(`${BACKEND_URL}/api/profile/photo`, {
        method: 'POST',
        body: JSON.stringify({ photo: base64Image }),
      });

      if (response.ok) {
        setProfilePhoto(base64Image);
        Alert.alert('Éxito', 'Foto de perfil actualizada');
      } else {
        Alert.alert('Error', 'No se pudo actualizar la foto');
      }
    } catch (error) {
      console.error('Failed to upload photo:', error);
      Alert.alert('Error', 'Error de conexión');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const showPhotoOptions = () => {
    if (Platform.OS === 'web') {
      // En web, ir directo a seleccionar archivo
      pickImage();
      return;
    }
    
    Alert.alert(
      'Cambiar foto de perfil',
      'Elige una opción',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Tomar foto', onPress: takePhoto },
        { text: 'Elegir de galería', onPress: pickImage },
      ]
    );
  };

  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'web') {
      // En web, el evento tiene la fecha en event.target.value
      const dateValue = event?.target?.value || event;
      if (dateValue && typeof dateValue === 'string') {
        setFormData({ ...formData, clean_since: dateValue });
      }
      return;
    }
    
    setShowDatePicker(Platform.OS === 'ios'); // En iOS mantener abierto
    
    if (date) {
      setSelectedDate(date);
      // Formatear fecha a YYYY-MM-DD
      const formattedDate = format(date, 'yyyy-MM-dd');
      setFormData({ ...formData, clean_since: formattedDate });
    }
  };

  const openDatePicker = () => {
    if (Platform.OS === 'web') {
      // En web, disparar click en el input de fecha oculto
      const dateInput = document.getElementById('date-picker-input');
      if (dateInput) {
        dateInput.click();
      }
      return;
    }
    setShowDatePicker(true);
  };

  const saveProfile = async () => {
    try {
      const response = await authenticatedFetch(`${BACKEND_URL}/api/profile`, {
        method: 'PUT',
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        Alert.alert('Éxito', 'Perfil actualizado correctamente');
        setEditing(false);
        loadProfile();
      }
    } catch (error) {
      console.error('Failed to save profile:', error);
      Alert.alert('Error', 'No se pudo guardar el perfil');
    }
  };

  const addItemToList = (field: string, value: string) => {
    if (!value.trim()) return;
    
    const currentList = formData[field] || [];
    setFormData({
      ...formData,
      [field]: [...currentList, value.trim()],
    });
  };

  const removeItemFromList = (field: string, index: number) => {
    const currentList = formData[field] || [];
    setFormData({
      ...formData,
      [field]: currentList.filter((_: any, i: number) => i !== index),
    });
  };

  const addEmergencyContact = () => {
    const currentContacts = formData.emergency_contacts || [];
    setFormData({
      ...formData,
      emergency_contacts: [
        ...currentContacts,
        { name: '', phone: '', relationship: '' },
      ],
    });
  };

  const updateEmergencyContact = (index: number, field: string, value: string) => {
    const contacts = [...(formData.emergency_contacts || [])];
    contacts[index] = { ...contacts[index], [field]: value };
    setFormData({ ...formData, emergency_contacts: contacts });
  };

  const removeEmergencyContact = (index: number) => {
    const contacts = formData.emergency_contacts || [];
    setFormData({
      ...formData,
      emergency_contacts: contacts.filter((_: any, i: number) => i !== index),
    });
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    
    // Validaciones
    if (!passwordData.currentPassword) {
      setPasswordError('Ingresa tu contraseña actual');
      return;
    }
    if (!passwordData.newPassword) {
      setPasswordError('Ingresa tu nueva contraseña');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setPasswordError('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('Las contraseñas no coinciden');
      return;
    }

    setChangingPassword(true);
    try {
      const response = await authenticatedFetch(`${BACKEND_URL}/api/auth/change-password`, {
        method: 'POST',
        body: JSON.stringify({
          current_password: passwordData.currentPassword,
          new_password: passwordData.newPassword,
        }),
      });

      if (response.ok) {
        Alert.alert('Éxito', 'Contraseña actualizada correctamente');
        setShowPasswordModal(false);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        const data = await response.json();
        setPasswordError(data.detail || 'Error al cambiar la contraseña');
      }
    } catch (error) {
      setPasswordError('Error de conexión');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = async () => {
    // En web, usar confirm nativo
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('¿Estás seguro que quieres cerrar sesión?');
      if (confirmed) {
        await logout();
        router.replace('/');
      }
      return;
    }
    
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro que quieres cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Cerrar sesión', 
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/');
          }
        },
      ]
    );
  };

  if (!profile) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Cargando...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <LinearGradient
        colors={['#F59E0B', '#EF4444']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Mi Perfil</Text>
        <Text style={styles.headerSubtitle}>Tu espacio personal de recuperación</Text>
      </LinearGradient>

      <ScrollView style={styles.content}>
        {/* Mi Cuenta Section */}
        <View style={styles.accountSection}>
          <View style={styles.accountHeader}>
            <TouchableOpacity 
              style={styles.avatarContainer}
              onPress={showPhotoOptions}
              disabled={uploadingPhoto}
            >
              {uploadingPhoto ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : profilePhoto ? (
                <Image 
                  source={{ uri: profilePhoto }} 
                  style={styles.avatarImage}
                />
              ) : (
                <Text style={styles.avatarText}>
                  {user?.name?.charAt(0).toUpperCase() || '?'}
                </Text>
              )}
              <View style={styles.cameraIconContainer}>
                <Ionicons name="camera" size={14} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
            <View style={styles.accountInfo}>
              <Text style={styles.accountName}>{user?.name || 'Usuario'}</Text>
              <Text style={styles.accountEmail}>{user?.email || ''}</Text>
            </View>
          </View>
          
          <View style={styles.accountActions}>
            {/* Botón para Dashboard Admin (solo admins) */}
            {(profile?.role === 'admin' || user?.email === 'contacto@sinadicciones.cl') && (
              <TouchableOpacity 
                style={[styles.accountButton, styles.adminButton]}
                onPress={() => router.push('/admin-dashboard')}
              >
                <Ionicons name="shield" size={20} color="#8B5CF6" />
                <Text style={[styles.accountButtonText, { color: '#8B5CF6' }]}>
                  Panel de Administración
                </Text>
                <Ionicons name="chevron-forward" size={20} color="#8B5CF6" />
              </TouchableOpacity>
            )}
            
            {/* Botón para dashboard profesional */}
            {profile?.role === 'professional' && (
              <TouchableOpacity 
                style={[styles.accountButton, styles.therapistButton]}
                onPress={() => router.push('/professional-dashboard')}
              >
                <Ionicons name="people" size={20} color="#3B82F6" />
                <Text style={[styles.accountButtonText, { color: '#3B82F6' }]}>
                  Ver Mis Pacientes
                </Text>
                <Ionicons name="chevron-forward" size={20} color="#3B82F6" />
              </TouchableOpacity>
            )}

            {/* Botón para reportar recaída (solo pacientes) */}
            {profile?.role !== 'professional' && profile?.role !== 'admin' && (
              <TouchableOpacity 
                style={[styles.accountButton, styles.relapseButton]}
                onPress={() => router.push('/report-relapse')}
              >
                <Ionicons name="warning" size={20} color="#DC2626" />
                <Text style={[styles.accountButtonText, { color: '#DC2626' }]}>
                  Reportar Recaída
                </Text>
                <Ionicons name="chevron-forward" size={20} color="#DC2626" />
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              style={styles.accountButton}
              onPress={() => setShowPasswordModal(true)}
            >
              <Ionicons name="key-outline" size={20} color="#6B7280" />
              <Text style={styles.accountButtonText}>Cambiar contraseña</Text>
              <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.accountButton, styles.logoutButton]}
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={20} color="#EF4444" />
              <Text style={[styles.accountButtonText, styles.logoutText]}>Cerrar sesión</Text>
              <Ionicons name="chevron-forward" size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Edit Button */}
        <View style={styles.section}>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.actionButton, editing && styles.editButtonActive]}
              onPress={() => {
                if (editing) {
                  saveProfile();
                } else {
                  setEditing(true);
                }
              }}
            >
              <Ionicons
                name={editing ? 'checkmark' : 'create'}
                size={20}
                color="#FFFFFF"
              />
              <Text style={styles.actionButtonText}>
                {editing ? 'Guardar' : 'Editar Perfil'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.recommendationsButton]}
              onPress={() => router.push('/recommendations')}
            >
              <Ionicons name="bulb" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Recomendaciones</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* PROFESSIONAL PROFILE CONTENT */}
        {profile?.role === 'professional' ? (
          <>
            {/* Professional Info */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Información Profesional</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Especialización</Text>
                <TextInput
                  style={styles.input}
                  value={formData.specialization || ''}
                  onChangeText={(text) =>
                    setFormData({ ...formData, specialization: text })
                  }
                  placeholder="Ej: Adicciones, Salud Mental..."
                  editable={editing}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Institución</Text>
                <TextInput
                  style={styles.input}
                  value={formData.institution || ''}
                  onChangeText={(text) =>
                    setFormData({ ...formData, institution: text })
                  }
                  placeholder="Centro o clínica donde trabajas"
                  editable={editing}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Años de experiencia</Text>
                <TextInput
                  style={styles.input}
                  value={formData.years_experience?.toString() || ''}
                  onChangeText={(text) =>
                    setFormData({ ...formData, years_experience: parseInt(text) || 0 })
                  }
                  placeholder="Número de años"
                  keyboardType="numeric"
                  editable={editing}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Número de licencia</Text>
                <TextInput
                  style={styles.input}
                  value={formData.license_number || ''}
                  onChangeText={(text) =>
                    setFormData({ ...formData, license_number: text })
                  }
                  placeholder="Número de registro profesional"
                  editable={editing}
                />
              </View>
            </View>

            {/* Bio */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Biografía Profesional 📋</Text>
              <Text style={styles.sectionDescription}>
                Describe tu experiencia y enfoque de trabajo
              </Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.bio || ''}
                onChangeText={(text) => setFormData({ ...formData, bio: text })}
                placeholder="Tu experiencia trabajando con adicciones, metodologías que utilizas..."
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                editable={editing}
              />
            </View>

            {/* Resources for Professionals */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recursos para tu Práctica 📚</Text>
              
              <TouchableOpacity 
                style={styles.resourceCard}
                onPress={() => router.push('/professional-dashboard')}
              >
                <View style={[styles.resourceIcon, { backgroundColor: 'rgba(59, 130, 246, 0.2)' }]}>
                  <Ionicons name="people" size={24} color="#3B82F6" />
                </View>
                <View style={styles.resourceInfo}>
                  <Text style={styles.resourceTitle}>Panel de Pacientes</Text>
                  <Text style={styles.resourceDesc}>Gestiona y monitorea a tus pacientes</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#6B7280" />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.resourceCard}
                onPress={() => router.push('/centers')}
              >
                <View style={[styles.resourceIcon, { backgroundColor: 'rgba(245, 158, 11, 0.2)' }]}>
                  <Ionicons name="business" size={24} color="#F59E0B" />
                </View>
                <View style={styles.resourceInfo}>
                  <Text style={styles.resourceTitle}>Directorio de Centros</Text>
                  <Text style={styles.resourceDesc}>Centros para referir pacientes</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Tips for Professionals */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tips para el Tratamiento 💡</Text>
              
              <View style={styles.tipCard}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.tipText}>
                  <Text style={styles.tipBold}>Entrevista Motivacional:</Text> Usa preguntas abiertas y refuerza el discurso de cambio del paciente.
                </Text>
              </View>
              
              <View style={styles.tipCard}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.tipText}>
                  <Text style={styles.tipBold}>Prevención de Recaídas:</Text> Ayuda a identificar triggers y desarrollar estrategias de afrontamiento.
                </Text>
              </View>
              
              <View style={styles.tipCard}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.tipText}>
                  <Text style={styles.tipBold}>Red de Apoyo:</Text> Involucra a la familia y promueve grupos de autoayuda como AA/NA.
                </Text>
              </View>
              
              <View style={styles.tipCard}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.tipText}>
                  <Text style={styles.tipBold}>Patología Dual:</Text> Evalúa siempre comorbilidades psiquiátricas (depresión, ansiedad, TDAH).
                </Text>
              </View>
            </View>
          </>
        ) : profile?.role === 'family' ? (
          <>
            {/* FAMILY PROFILE CONTENT */}
            {/* Family Info */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Información del Familiar 👨‍👩‍👧</Text>
              
              <View style={styles.infoRow}>
                <Ionicons name="people" size={20} color="#8B5CF6" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Relación</Text>
                  <Text style={styles.infoValue}>
                    {profile?.relationship_to_addict === 'parent' ? 'Padre/Madre' :
                     profile?.relationship_to_addict === 'spouse' ? 'Pareja' :
                     profile?.relationship_to_addict === 'child' ? 'Hijo/a' :
                     profile?.relationship_to_addict === 'sibling' ? 'Hermano/a' :
                     'Otro familiar'}
                  </Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="school" size={20} color="#8B5CF6" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Conocimiento sobre adicciones</Text>
                  <Text style={styles.infoValue}>
                    {profile?.knowledge_level === 'none' ? 'Ninguno' :
                     profile?.knowledge_level === 'basic' ? 'Básico' :
                     'Intermedio'}
                  </Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="home" size={20} color="#8B5CF6" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Vive con el familiar en recuperación</Text>
                  <Text style={styles.infoValue}>
                    {profile?.lives_with_relative ? 'Sí' : 'No'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Linked Relative Status */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Mi Familiar Vinculado 🔗</Text>
              {profile?.linked_relative_id ? (
                <View style={styles.linkedRelativeCard}>
                  <View style={styles.linkedRelativeAvatar}>
                    <Ionicons name="person" size={28} color="#10B981" />
                  </View>
                  <View style={styles.linkedRelativeInfo}>
                    <Text style={styles.linkedRelativeName}>Familiar vinculado</Text>
                    <Text style={styles.linkedRelativeStatus}>
                      ✓ Puedes ver su progreso en el dashboard
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.noLinkedCard}>
                  <Ionicons name="link" size={24} color="#6B7280" />
                  <Text style={styles.noLinkedText}>
                    No tienes un familiar vinculado. Puedes vincular desde tu Dashboard → Mi Familiar
                  </Text>
                </View>
              )}
            </View>

            {/* Resources for Family */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recursos de Apoyo 📚</Text>
              
              <TouchableOpacity 
                style={styles.resourceCard}
                onPress={() => router.push('/family-dashboard')}
              >
                <View style={[styles.resourceIcon, { backgroundColor: 'rgba(139, 92, 246, 0.2)' }]}>
                  <Ionicons name="home" size={24} color="#8B5CF6" />
                </View>
                <View style={styles.resourceInfo}>
                  <Text style={styles.resourceTitle}>Mi Dashboard</Text>
                  <Text style={styles.resourceDesc}>Contenido educativo y seguimiento</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#6B7280" />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.resourceCard}
                onPress={() => router.push('/(tabs)/centers')}
              >
                <View style={[styles.resourceIcon, { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
                  <Ionicons name="medical" size={24} color="#10B981" />
                </View>
                <View style={styles.resourceInfo}>
                  <Text style={styles.resourceTitle}>Centros y Terapeutas</Text>
                  <Text style={styles.resourceDesc}>Buscar ayuda profesional</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Self Care Tips */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Cuida tu Bienestar 💜</Text>
              
              <View style={[styles.tipCard, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
                <Ionicons name="heart" size={20} color="#8B5CF6" />
                <Text style={styles.tipText}>
                  <Text style={[styles.tipBold, { color: '#8B5CF6' }]}>No eres responsable:</Text> de la adicción de tu familiar. Puedes apoyar, pero la recuperación es su proceso.
                </Text>
              </View>
              
              <View style={[styles.tipCard, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
                <Ionicons name="shield" size={20} color="#8B5CF6" />
                <Text style={styles.tipText}>
                  <Text style={[styles.tipBold, { color: '#8B5CF6' }]}>Establece límites:</Text> Los límites saludables son actos de amor, no de castigo.
                </Text>
              </View>
              
              <View style={[styles.tipCard, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
                <Ionicons name="people" size={20} color="#8B5CF6" />
                <Text style={styles.tipText}>
                  <Text style={[styles.tipBold, { color: '#8B5CF6' }]}>Busca apoyo:</Text> Grupos como Al-Anon o Nar-Anon son para familias como tú.
                </Text>
              </View>
            </View>

            <View style={{ height: 40 }} />
          </>
        ) : (
          <>
            {/* PATIENT/ACTIVE_USER PROFILE CONTENT */}
            {/* Basic Info */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Información básica</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Adicción principal</Text>
                <TextInput
                  style={styles.input}
                  value={formData.addiction_type || ''}
                  onChangeText={(text) =>
                    setFormData({ ...formData, addiction_type: text })
                  }
                  placeholder="Ej: Alcohol, Drogas, Juego..."
                  editable={editing}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Años de consumo</Text>
                <TextInput
                  style={styles.input}
                  value={formData.years_using?.toString() || ''}
                  onChangeText={(text) =>
                    setFormData({ ...formData, years_using: parseInt(text) || 0 })
                  }
                  placeholder="Número de años"
                  keyboardType="numeric"
                  editable={editing}
                />
              </View>

              {profile?.role !== 'active_user' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Limpio desde</Text>
                  {Platform.OS === 'web' ? (
                    <View style={styles.datePickerButton}>
                      <Ionicons name="calendar" size={20} color="#10B981" />
                      <input
                        id="date-picker-input"
                        type="date"
                        value={formData.clean_since || ''}
                        onChange={(e) => handleDateChange(e)}
                        disabled={!editing}
                        max={new Date().toISOString().split('T')[0]}
                        style={{
                          flex: 1,
                          border: 'none',
                          background: 'transparent',
                          fontSize: 16,
                          color: '#1F2937',
                          marginLeft: 8,
                          cursor: editing ? 'pointer' : 'not-allowed',
                          opacity: editing ? 1 : 0.6,
                        }}
                      />
                    </View>
                  ) : (
                    <>
                      <TouchableOpacity
                        style={styles.datePickerButton}
                        onPress={openDatePicker}
                        disabled={!editing}
                      >
                        <Ionicons name="calendar" size={20} color="#10B981" />
                        <Text style={styles.datePickerText}>
                          {formData.clean_since || 'Seleccionar fecha'}
                        </Text>
                      </TouchableOpacity>
                      {showDatePicker && (
                        <DateTimePicker
                          value={selectedDate}
                          mode="date"
                          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                          onChange={handleDateChange}
                          maximumDate={new Date()}
                        />
                      )}
                    </>
                  )}
                </View>
              )}
            </View>

            {/* Linked Therapist Section */}
            {profile?.linked_therapist_id ? (
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="medical" size={22} color="#8B5CF6" />
                  <Text style={[styles.sectionTitle, { marginLeft: 8 }]}>Mi Terapeuta</Text>
                </View>
                <View style={styles.therapistLinkedCard}>
                  <View style={styles.therapistLinkedAvatar}>
                    <Ionicons name="person" size={28} color="#8B5CF6" />
                  </View>
                  <View style={styles.therapistLinkedInfo}>
                    <Text style={styles.therapistLinkedName}>
                      Terapeuta vinculado
                    </Text>
                    <Text style={styles.therapistLinkedStatus}>
                      ✓ Tu progreso es monitoreado por tu profesional
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="medical" size={22} color="#6B7280" />
                  <Text style={[styles.sectionTitle, { marginLeft: 8 }]}>Mi Terapeuta</Text>
                </View>
                <View style={styles.noTherapistCard}>
                  <Ionicons name="information-circle" size={24} color="#6B7280" />
                  <Text style={styles.noTherapistText}>
                    No tienes un terapeuta vinculado aún. Tu terapeuta puede vincularte desde su panel profesional usando tu email de registro.
                  </Text>
                </View>
              </View>
            )}

            {/* My Why */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Mi "Para Qué" 🎯</Text>
              <Text style={styles.sectionDescription}>
                Tu razón más profunda para mantenerte en recuperación
              </Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.my_why || ''}
                onChangeText={(text) => setFormData({ ...formData, my_why: text })}
                placeholder="Ej: Para estar presente para mis hijos, para recuperar mi salud..."
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                editable={editing}
              />
            </View>

            {/* Triggers */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Gatillos ⚠️</Text>
              <Text style={styles.sectionDescription}>
                Personas, lugares, emociones que activan el deseo de consumir
              </Text>
              {(formData.triggers || []).map((trigger: string, index: number) => (
                <View key={index} style={styles.listItem}>
                  <Text style={styles.listItemText}>{trigger}</Text>
                  {editing && (
                    <TouchableOpacity
                      onPress={() => removeItemFromList('triggers', index)}
                    >
                      <Ionicons name="trash-outline" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              {editing && (
                <TextInput
                  style={styles.input}
                  placeholder="Agregar gatillo"
                  onSubmitEditing={(e) => {
                    addItemToList('triggers', e.nativeEvent.text);
                    e.currentTarget.clear();
                  }}
                />
              )}
            </View>

            {/* Protective Factors */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Factores Protectores 🛡️</Text>
              <Text style={styles.sectionDescription}>
                Lo que te ayuda a mantenerte limpio
              </Text>
              {(formData.protective_factors || []).map((factor: string, index: number) => (
                <View key={index} style={styles.listItem}>
                  <Text style={styles.listItemText}>{factor}</Text>
                  {editing && (
                    <TouchableOpacity
                      onPress={() => removeItemFromList('protective_factors', index)}
                    >
                      <Ionicons name="trash-outline" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              {editing && (
                <TextInput
                  style={styles.input}
                  placeholder="Agregar factor protector"
                  onSubmitEditing={(e) => {
                    addItemToList('protective_factors', e.nativeEvent.text);
                    e.currentTarget.clear();
                  }}
                />
              )}
            </View>

            {/* Emergency Contacts */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Contactos de Emergencia 📞</Text>
              <Text style={styles.sectionDescription}>
                Personas a las que puedes llamar en momentos difíciles
              </Text>
              {(formData.emergency_contacts || []).map((contact: any, index: number) => (
                <View key={index} style={styles.contactCard}>
                  <TextInput
                    style={styles.input}
                    value={contact.name}
                    onChangeText={(text) =>
                      updateEmergencyContact(index, 'name', text)
                }
                placeholder="Nombre"
                editable={editing}
              />
              <TextInput
                style={styles.input}
                value={contact.phone}
                onChangeText={(text) =>
                  updateEmergencyContact(index, 'phone', text)
                }
                placeholder="Teléfono"
                keyboardType="phone-pad"
                editable={editing}
              />
              <TextInput
                style={styles.input}
                value={contact.relationship}
                onChangeText={(text) =>
                  updateEmergencyContact(index, 'relationship', text)
                }
                placeholder="Relación (ej: Padrino, Terapeuta)"
                editable={editing}
              />
              {editing && (
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeEmergencyContact(index)}
                >
                  <Text style={styles.removeButtonText}>Eliminar</Text>
                </TouchableOpacity>
              )}
              {!editing && contact.phone && (
                <TouchableOpacity style={styles.callButton}>
                  <Ionicons name="call" size={20} color="#FFFFFF" />
                  <Text style={styles.callButtonText}>Llamar</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
          {editing && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={addEmergencyContact}
            >
              <Ionicons name="add-circle" size={24} color="#10B981" />
              <Text style={styles.addButtonText}>Agregar contacto</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Life Story */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mi Historia 📖</Text>
          <Text style={styles.sectionDescription}>
            Hitos importantes, traumas, motivadores
          </Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.life_story || ''}
            onChangeText={(text) =>
              setFormData({ ...formData, life_story: text })
            }
            placeholder="Escribe tu historia..."
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            editable={editing}
          />
        </View>

            <View style={{ height: 40 }} />
          </>
        )}
      </ScrollView>

      {/* Modal de Cambio de Contraseña */}
      <Modal
        visible={showPasswordModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cambiar contraseña</Text>
              <TouchableOpacity onPress={() => {
                setShowPasswordModal(false);
                setPasswordError('');
                setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
              }}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {passwordError ? (
              <View style={styles.passwordError}>
                <Ionicons name="alert-circle" size={18} color="#EF4444" />
                <Text style={styles.passwordErrorText}>{passwordError}</Text>
              </View>
            ) : null}

            <View style={styles.passwordInputGroup}>
              <Text style={styles.passwordLabel}>Contraseña actual</Text>
              <TextInput
                style={styles.passwordInput}
                placeholder="Ingresa tu contraseña actual"
                secureTextEntry
                value={passwordData.currentPassword}
                onChangeText={(text) => setPasswordData({ ...passwordData, currentPassword: text })}
              />
            </View>

            <View style={styles.passwordInputGroup}>
              <Text style={styles.passwordLabel}>Nueva contraseña</Text>
              <TextInput
                style={styles.passwordInput}
                placeholder="Mínimo 6 caracteres"
                secureTextEntry
                value={passwordData.newPassword}
                onChangeText={(text) => setPasswordData({ ...passwordData, newPassword: text })}
              />
            </View>

            <View style={styles.passwordInputGroup}>
              <Text style={styles.passwordLabel}>Confirmar nueva contraseña</Text>
              <TextInput
                style={styles.passwordInput}
                placeholder="Repite tu nueva contraseña"
                secureTextEntry
                value={passwordData.confirmPassword}
                onChangeText={(text) => setPasswordData({ ...passwordData, confirmPassword: text })}
              />
            </View>

            <TouchableOpacity 
              style={[styles.savePasswordButton, changingPassword && styles.savePasswordButtonDisabled]}
              onPress={handleChangePassword}
              disabled={changingPassword}
            >
              <Text style={styles.savePasswordButtonText}>
                {changingPassword ? 'Guardando...' : 'Guardar contraseña'}
              </Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#FEF3C7',
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  editButtonActive: {
    backgroundColor: '#10B981',
  },
  recommendationsButton: {
    backgroundColor: '#8B5CF6',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    fontSize: 16,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  datePickerText: {
    fontSize: 16,
    color: '#1F2937',
  },
  textArea: {
    minHeight: 100,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  listItemText: {
    fontSize: 16,
    color: '#1F2937',
    flex: 1,
  },
  contactCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  removeButton: {
    backgroundColor: '#FEE2E2',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  removeButtonText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  callButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#10B981',
    borderStyle: 'dashed',
  },
  addButtonText: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: '600',
  },
  // Estilos para la sección de cuenta
  accountSection: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  accountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 16,
  },
  avatarContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    position: 'relative',
  },
  avatarImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#6B7280',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  accountEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  accountActions: {
    gap: 8,
  },
  accountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    gap: 12,
  },
  accountButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
  },
  logoutButton: {
    backgroundColor: '#FEF2F2',
  },
  logoutText: {
    color: '#EF4444',
  },
  therapistButton: {
    backgroundColor: '#EBF5FF',
  },
  relapseButton: {
    backgroundColor: '#FEE2E2',
  },
  adminButton: {
    backgroundColor: '#EDE9FE',
  },
  // Estilos para el modal de contraseña
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  passwordError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  passwordErrorText: {
    color: '#EF4444',
    fontSize: 14,
    flex: 1,
  },
  passwordInputGroup: {
    marginBottom: 16,
  },
  passwordLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  passwordInput: {
    backgroundColor: '#F9FAFB',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    fontSize: 16,
  },
  savePasswordButton: {
    backgroundColor: '#10B981',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  savePasswordButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  savePasswordButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Professional Profile Styles
  resourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  resourceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  resourceInfo: {
    flex: 1,
  },
  resourceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  resourceDesc: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    gap: 10,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  tipBold: {
    fontWeight: '700',
    color: '#10B981',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  therapistLinkedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDE9FE',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#8B5CF6',
  },
  therapistLinkedAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  therapistLinkedInfo: {
    flex: 1,
  },
  therapistLinkedName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5B21B6',
  },
  therapistLinkedStatus: {
    fontSize: 13,
    color: '#7C3AED',
    marginTop: 4,
  },
  noTherapistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  noTherapistText: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 2,
  },
  linkedRelativeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  linkedRelativeAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  linkedRelativeInfo: {
    flex: 1,
  },
  linkedRelativeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#065F46',
  },
  linkedRelativeStatus: {
    fontSize: 13,
    color: '#047857',
    marginTop: 4,
  },
  noLinkedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  noLinkedText: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
});
