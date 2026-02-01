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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { authenticatedFetch, getBackendURL } from '../../utils/api';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';

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
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  };

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(Platform.OS === 'ios'); // En iOS mantener abierto
    
    if (date) {
      setSelectedDate(date);
      // Formatear fecha a YYYY-MM-DD
      const formattedDate = format(date, 'yyyy-MM-dd');
      setFormData({ ...formData, clean_since: formattedDate });
    }
  };

  const openDatePicker = () => {
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

  const handleLogout = () => {
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
        <Text style={styles.headerTitle}>Caja de Herramientas</Text>
        <Text style={styles.headerSubtitle}>Tu espacio personal de recuperación</Text>
      </LinearGradient>

      <ScrollView style={styles.content}>
        {/* Mi Cuenta Section */}
        <View style={styles.accountSection}>
          <View style={styles.accountHeader}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0).toUpperCase() || '?'}
              </Text>
            </View>
            <View style={styles.accountInfo}>
              <Text style={styles.accountName}>{user?.name || 'Usuario'}</Text>
              <Text style={styles.accountEmail}>{user?.email || ''}</Text>
            </View>
          </View>
          
          <View style={styles.accountActions}>
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

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Limpio desde</Text>
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
          </View>
        </View>

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
});
