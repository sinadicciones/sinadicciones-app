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
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { authenticatedFetch, getBackendURL } from '../../utils/api';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '../../contexts/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import { theme } from '../../utils/theme';

const BACKEND_URL = getBackendURL();

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  
  // Edit modals
  const [editModal, setEditModal] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  
  // Password modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await authenticatedFetch(`${BACKEND_URL}/api/profile`);
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        if (data.clean_since) {
          setSelectedDate(new Date(data.clean_since));
        }
        if (data.profile_photo) {
          setProfilePhoto(data.profile_photo);
        }
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateField = async (field: string, value: any) => {
    setSaving(true);
    try {
      const response = await authenticatedFetch(`${BACKEND_URL}/api/profile`, {
        method: 'PUT',
        body: JSON.stringify({ [field]: value }),
      });
      if (response.ok) {
        setProfile((prev: any) => ({ ...prev, [field]: value }));
        setEditModal(null);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const pickImage = async () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e: any) => {
        const file = e.target?.files?.[0];
        if (file) {
          if (file.size > 5 * 1024 * 1024) {
            alert('La imagen es muy grande. Máximo 5MB.');
            return;
          }
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64Image = reader.result as string;
            await uploadProfilePhoto(base64Image);
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    } else {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permiso requerido', 'Necesitas permitir acceso a la galería');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });
      if (!result.canceled && result.assets[0].base64) {
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
        await uploadProfilePhoto(base64Image);
      }
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
        const data = await response.json();
        setProfilePhoto(data.photo_url || base64Image);
        setProfile((prev: any) => ({ ...prev, profile_photo: data.photo_url || base64Image }));
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo subir la foto');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const changePassword = async () => {
    setPasswordError('');
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('Las contraseñas no coinciden');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setPasswordError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    try {
      const response = await authenticatedFetch(`${BACKEND_URL}/api/auth/change-password`, {
        method: 'POST',
        body: JSON.stringify({
          current_password: passwordData.currentPassword,
          new_password: passwordData.newPassword,
        }),
      });
      if (response.ok) {
        Alert.alert('Éxito', 'Contraseña actualizada');
        setShowPasswordModal(false);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setPasswordError('Contraseña actual incorrecta');
      }
    } catch (error) {
      setPasswordError('Error al cambiar contraseña');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar Sesión', style: 'destructive', onPress: logout },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'No establecido';
    return format(new Date(dateString), "d 'de' MMMM, yyyy", { locale: es });
  };

  const getDaysClean = () => {
    if (!profile?.clean_since) return 0;
    const cleanDate = new Date(profile.clean_since);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - cleanDate.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  const getRoleName = (role: string) => {
    const roles: { [key: string]: string } = {
      'active_user': 'En Recuperación',
      'patient': 'Paciente',
      'professional': 'Profesional',
      'family': 'Familiar',
      'challenge': 'Reto',
    };
    return roles[role] || role;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header with Avatar */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.avatarContainer} onPress={pickImage}>
            {uploadingPhoto ? (
              <ActivityIndicator color={theme.text.primary} />
            ) : profilePhoto ? (
              <Image source={{ uri: profilePhoto }} style={styles.avatar} />
            ) : (
              <Text style={styles.avatarText}>
                {profile?.name?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            )}
            <View style={styles.editAvatarBadge}>
              <Ionicons name="camera" size={12} color={theme.text.primary} />
            </View>
          </TouchableOpacity>
          <Text style={styles.userName}>{profile?.name || 'Usuario'}</Text>
          <Text style={styles.userEmail}>{profile?.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{getRoleName(profile?.role)}</Text>
          </View>
        </View>

        {/* Stats Cards */}
        {profile?.role === 'active_user' && (
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{getDaysClean()}</Text>
              <Text style={styles.statLabel}>Días limpio</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{profile?.best_streak || 0}</Text>
              <Text style={styles.statLabel}>Mejor racha</Text>
            </View>
          </View>
        )}

        {/* Personal Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información Personal</Text>
          
          <TouchableOpacity 
            style={styles.listItem}
            onPress={() => { setEditValue(profile?.name || ''); setEditModal('name'); }}
          >
            <View style={styles.listItemLeft}>
              <Ionicons name="person-outline" size={20} color={theme.text.secondary} />
              <View style={styles.listItemContent}>
                <Text style={styles.listItemLabel}>Nombre</Text>
                <Text style={styles.listItemValue}>{profile?.name || 'No establecido'}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.text.muted} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.listItem}
            onPress={() => { setEditValue(profile?.phone || ''); setEditModal('phone'); }}
          >
            <View style={styles.listItemLeft}>
              <Ionicons name="call-outline" size={20} color={theme.text.secondary} />
              <View style={styles.listItemContent}>
                <Text style={styles.listItemLabel}>Teléfono</Text>
                <Text style={styles.listItemValue}>{profile?.phone || 'No establecido'}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.text.muted} />
          </TouchableOpacity>

          {profile?.role === 'active_user' && (
            <TouchableOpacity 
              style={styles.listItem}
              onPress={() => setShowDatePicker(true)}
            >
              <View style={styles.listItemLeft}>
                <Ionicons name="calendar-outline" size={20} color={theme.text.secondary} />
                <View style={styles.listItemContent}>
                  <Text style={styles.listItemLabel}>Fecha de inicio</Text>
                  <Text style={styles.listItemValue}>{formatDate(profile?.clean_since)}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.text.muted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Recovery Info - Only for active_user */}
        {profile?.role === 'active_user' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Información de Recuperación</Text>
            
            <TouchableOpacity 
              style={styles.listItem}
              onPress={() => { setEditValue(profile?.addiction_type || ''); setEditModal('addiction_type'); }}
            >
              <View style={styles.listItemLeft}>
                <Ionicons name="medical-outline" size={20} color={theme.text.secondary} />
                <View style={styles.listItemContent}>
                  <Text style={styles.listItemLabel}>Tipo de adicción</Text>
                  <Text style={styles.listItemValue}>{profile?.addiction_type || 'No establecido'}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.text.muted} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.listItem}
              onPress={() => { setEditValue(profile?.years_using || ''); setEditModal('years_using'); }}
            >
              <View style={styles.listItemLeft}>
                <Ionicons name="time-outline" size={20} color={theme.text.secondary} />
                <View style={styles.listItemContent}>
                  <Text style={styles.listItemLabel}>Años de consumo</Text>
                  <Text style={styles.listItemValue}>{profile?.years_using || 'No establecido'}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.text.muted} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.listItem}
              onPress={() => { setEditValue(profile?.recovery_method || ''); setEditModal('recovery_method'); }}
            >
              <View style={styles.listItemLeft}>
                <Ionicons name="fitness-outline" size={20} color={theme.text.secondary} />
                <View style={styles.listItemContent}>
                  <Text style={styles.listItemLabel}>Método de recuperación</Text>
                  <Text style={styles.listItemValue}>{profile?.recovery_method || 'No establecido'}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.text.muted} />
            </TouchableOpacity>
          </View>
        )}

        {/* Emergency Contact */}
        {profile?.role === 'active_user' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contacto de Emergencia</Text>
            
            <TouchableOpacity 
              style={styles.listItem}
              onPress={() => { setEditValue(profile?.emergency_contact?.name || ''); setEditModal('emergency_name'); }}
            >
              <View style={styles.listItemLeft}>
                <Ionicons name="people-outline" size={20} color={theme.text.secondary} />
                <View style={styles.listItemContent}>
                  <Text style={styles.listItemLabel}>Nombre</Text>
                  <Text style={styles.listItemValue}>{profile?.emergency_contact?.name || 'No establecido'}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.text.muted} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.listItem}
              onPress={() => { setEditValue(profile?.emergency_contact?.phone || ''); setEditModal('emergency_phone'); }}
            >
              <View style={styles.listItemLeft}>
                <Ionicons name="call-outline" size={20} color={theme.text.secondary} />
                <View style={styles.listItemContent}>
                  <Text style={styles.listItemLabel}>Teléfono</Text>
                  <Text style={styles.listItemValue}>{profile?.emergency_contact?.phone || 'No establecido'}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.text.muted} />
            </TouchableOpacity>
          </View>
        )}

        {/* Security Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Seguridad</Text>
          
          <TouchableOpacity 
            style={styles.listItem}
            onPress={() => setShowPasswordModal(true)}
          >
            <View style={styles.listItemLeft}>
              <Ionicons name="lock-closed-outline" size={20} color={theme.text.secondary} />
              <View style={styles.listItemContent}>
                <Text style={styles.listItemLabel}>Contraseña</Text>
                <Text style={styles.listItemValue}>••••••••</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.text.muted} />
          </TouchableOpacity>
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={theme.status.error} />
            <Text style={styles.logoutText}>Cerrar Sesión</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={editModal !== null} animationType="slide" transparent>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar</Text>
              <TouchableOpacity onPress={() => setEditModal(null)}>
                <Ionicons name="close" size={24} color={theme.text.secondary} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              value={editValue}
              onChangeText={setEditValue}
              placeholder="Ingresa el valor"
              placeholderTextColor={theme.text.muted}
              autoFocus
            />
            <TouchableOpacity 
              style={styles.saveButton}
              onPress={() => {
                if (editModal === 'emergency_name') {
                  updateField('emergency_contact', { ...profile?.emergency_contact, name: editValue });
                } else if (editModal === 'emergency_phone') {
                  updateField('emergency_contact', { ...profile?.emergency_contact, phone: editValue });
                } else if (editModal) {
                  updateField(editModal, editValue);
                }
              }}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={theme.text.primary} />
              ) : (
                <Text style={styles.saveButtonText}>Guardar</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Password Modal */}
      <Modal visible={showPasswordModal} animationType="slide" transparent>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cambiar Contraseña</Text>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
                <Ionicons name="close" size={24} color={theme.text.secondary} />
              </TouchableOpacity>
            </View>
            
            {passwordError ? (
              <Text style={styles.errorText}>{passwordError}</Text>
            ) : null}
            
            <TextInput
              style={styles.input}
              value={passwordData.currentPassword}
              onChangeText={(text) => setPasswordData(prev => ({ ...prev, currentPassword: text }))}
              placeholder="Contraseña actual"
              placeholderTextColor={theme.text.muted}
              secureTextEntry
            />
            <TextInput
              style={styles.input}
              value={passwordData.newPassword}
              onChangeText={(text) => setPasswordData(prev => ({ ...prev, newPassword: text }))}
              placeholder="Nueva contraseña"
              placeholderTextColor={theme.text.muted}
              secureTextEntry
            />
            <TextInput
              style={styles.input}
              value={passwordData.confirmPassword}
              onChangeText={(text) => setPasswordData(prev => ({ ...prev, confirmPassword: text }))}
              placeholder="Confirmar contraseña"
              placeholderTextColor={theme.text.muted}
              secureTextEntry
            />
            
            <TouchableOpacity style={styles.saveButton} onPress={changePassword}>
              <Text style={styles.saveButtonText}>Cambiar Contraseña</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowDatePicker(false);
            if (date) {
              setSelectedDate(date);
              updateField('clean_since', date.toISOString());
            }
          }}
          maximumDate={new Date()}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.accent.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: theme.text.primary,
  },
  editAvatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.background.primary,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.text.primary,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: theme.text.secondary,
    marginBottom: 12,
  },
  roleBadge: {
    backgroundColor: theme.accent.primary,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.text.primary,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.background.secondary,
    borderRadius: theme.radius.lg,
    padding: 20,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.accent.primary,
  },
  statLabel: {
    fontSize: 13,
    color: theme.text.secondary,
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.background.secondary,
    padding: 16,
    borderRadius: theme.radius.md,
    marginBottom: 1,
  },
  listItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  listItemContent: {
    marginLeft: 14,
    flex: 1,
  },
  listItemLabel: {
    fontSize: 13,
    color: theme.text.muted,
  },
  listItemValue: {
    fontSize: 16,
    color: theme.text.primary,
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.background.secondary,
    padding: 16,
    borderRadius: theme.radius.md,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.status.error,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.background.secondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'android' ? 40 : 24,
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
    color: theme.text.primary,
  },
  input: {
    backgroundColor: theme.background.tertiary,
    borderRadius: theme.radius.md,
    padding: 16,
    fontSize: 16,
    color: theme.text.primary,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.border.primary,
  },
  saveButton: {
    backgroundColor: theme.accent.primary,
    borderRadius: theme.radius.md,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text.primary,
  },
  errorText: {
    color: theme.status.error,
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
});
