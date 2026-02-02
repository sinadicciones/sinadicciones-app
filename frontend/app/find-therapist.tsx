import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { authenticatedFetch } from '../utils/api';

interface Therapist {
  user_id: string;
  name: string;
  professional_type?: string;
  specialization?: string;
  institution?: string;
  years_experience?: number;
}

const PROFESSIONAL_TYPE_LABELS: { [key: string]: string } = {
  psychologist: 'Psicólogo/a',
  psychiatrist: 'Psiquiatra',
  therapist: 'Terapeuta',
  counselor: 'Consejero/a',
  social_worker: 'Trabajador/a Social',
  other: 'Otro profesional',
};

export default function FindTherapistScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLinking, setIsLinking] = useState(false);
  const [linkedTherapistId, setLinkedTherapistId] = useState<string | null>(null);

  useEffect(() => {
    fetchTherapists();
    fetchCurrentProfile();
  }, []);

  const fetchCurrentProfile = async () => {
    try {
      const response = await authenticatedFetch('/api/profile');
      if (response.ok) {
        const profile = await response.json();
        setLinkedTherapistId(profile.linked_therapist_id || null);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  const fetchTherapists = async (query: string = '') => {
    setIsLoading(true);
    try {
      const response = await authenticatedFetch(`/api/therapists/search?query=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setTherapists(data);
      }
    } catch (err) {
      console.error('Error fetching therapists:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    fetchTherapists(searchQuery);
  };

  const handleLinkTherapist = async (therapist: Therapist) => {
    Alert.alert(
      'Vincular Terapeuta',
      `¿Deseas vincular a ${therapist.name} como tu terapeuta? Podrá ver tu progreso y estadísticas.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Vincular',
          onPress: async () => {
            setIsLinking(true);
            try {
              const response = await authenticatedFetch('/api/patient/link-therapist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ therapist_id: therapist.user_id }),
              });

              if (response.ok) {
                setLinkedTherapistId(therapist.user_id);
                Alert.alert(
                  '¡Vinculado!',
                  `${therapist.name} ahora puede acompañar tu proceso de recuperación.`,
                  [{ text: 'OK' }]
                );
              } else {
                Alert.alert('Error', 'No se pudo vincular al terapeuta');
              }
            } catch (err) {
              Alert.alert('Error', 'Error de conexión');
            } finally {
              setIsLinking(false);
            }
          },
        },
      ]
    );
  };

  const handleUnlinkTherapist = async () => {
    Alert.alert(
      'Desvincular Terapeuta',
      '¿Estás seguro de que deseas desvincular a tu terapeuta actual?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desvincular',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await authenticatedFetch('/api/patient/unlink-therapist', {
                method: 'POST',
              });

              if (response.ok) {
                setLinkedTherapistId(null);
                Alert.alert('Desvinculado', 'Ya no tienes un terapeuta vinculado.');
              }
            } catch (err) {
              Alert.alert('Error', 'Error de conexión');
            }
          },
        },
      ]
    );
  };

  const getProfessionalTypeLabel = (type?: string) => {
    if (!type) return 'Profesional';
    return PROFESSIONAL_TYPE_LABELS[type] || type;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Buscar Terapeuta</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); fetchTherapists(); }}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>Buscar</Text>
        </TouchableOpacity>
      </View>

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Ionicons name="information-circle" size={20} color="#3B82F6" />
        <Text style={styles.infoBannerText}>
          Al vincular un terapeuta, podrá ver tu progreso, estadísticas y acompañar tu recuperación.
        </Text>
      </View>

      {/* Results */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={styles.loadingText}>Buscando profesionales...</Text>
          </View>
        ) : therapists.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No hay terapeutas disponibles</Text>
            <Text style={styles.emptyText}>
              {searchQuery
                ? 'No se encontraron resultados para tu búsqueda.'
                : 'Aún no hay profesionales registrados en la plataforma.'}
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.resultsCount}>
              {therapists.length} {therapists.length === 1 ? 'profesional encontrado' : 'profesionales encontrados'}
            </Text>
            {therapists.map((therapist) => {
              const isLinked = linkedTherapistId === therapist.user_id;
              return (
                <View key={therapist.user_id} style={[styles.therapistCard, isLinked && styles.therapistCardLinked]}>
                  <View style={styles.therapistHeader}>
                    <View style={styles.therapistAvatar}>
                      <Ionicons name="medical" size={24} color={isLinked ? '#10B981' : '#3B82F6'} />
                    </View>
                    <View style={styles.therapistInfo}>
                      <View style={styles.therapistNameRow}>
                        <Text style={styles.therapistName}>{therapist.name}</Text>
                        {isLinked && (
                          <View style={styles.linkedBadge}>
                            <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                            <Text style={styles.linkedBadgeText}>Vinculado</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.therapistType}>
                        {getProfessionalTypeLabel(therapist.professional_type)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.therapistDetails}>
                    {therapist.specialization && (
                      <View style={styles.detailItem}>
                        <Ionicons name="ribbon" size={16} color="#6B7280" />
                        <Text style={styles.detailText}>{therapist.specialization}</Text>
                      </View>
                    )}
                    {therapist.institution && (
                      <View style={styles.detailItem}>
                        <Ionicons name="business" size={16} color="#6B7280" />
                        <Text style={styles.detailText}>{therapist.institution}</Text>
                      </View>
                    )}
                    {therapist.years_experience && (
                      <View style={styles.detailItem}>
                        <Ionicons name="time" size={16} color="#6B7280" />
                        <Text style={styles.detailText}>{therapist.years_experience} años de experiencia</Text>
                      </View>
                    )}
                  </View>

                  {isLinked ? (
                    <TouchableOpacity
                      style={styles.unlinkButton}
                      onPress={handleUnlinkTherapist}
                    >
                      <Ionicons name="person-remove" size={18} color="#EF4444" />
                      <Text style={styles.unlinkButtonText}>Desvincular</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.linkButton, isLinking && styles.linkButtonDisabled]}
                      onPress={() => handleLinkTherapist(therapist)}
                      disabled={isLinking || linkedTherapistId !== null}
                    >
                      {isLinking ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Ionicons name="person-add" size={18} color="#FFFFFF" />
                          <Text style={styles.linkButtonText}>
                            {linkedTherapistId ? 'Ya tienes terapeuta' : 'Vincular'}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  placeholder: {
    width: 40,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  searchButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: 'center',
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF5FF',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    gap: 12,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    padding: 60,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  resultsCount: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  therapistCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  therapistCardLinked: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  therapistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  therapistAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EBF5FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  therapistInfo: {
    flex: 1,
  },
  therapistNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  therapistName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
  },
  linkedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  linkedBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#065F46',
  },
  therapistType: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  therapistDetails: {
    gap: 8,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#4B5563',
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 12,
    gap: 8,
  },
  linkButtonDisabled: {
    opacity: 0.5,
  },
  linkButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  unlinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 12,
    gap: 8,
  },
  unlinkButtonText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '600',
  },
});
