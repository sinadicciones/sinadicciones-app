import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authenticatedFetch, getBackendURL } from '../../utils/api';

const BACKEND_URL = getBackendURL();
const SINADICCIONES_API = 'https://sinadicciones.org/api';

const QUICK_FILTERS = [
  { label: 'Todos', value: 'all' },
  { label: 'Residencial', value: 'Residencial' },
  { label: 'Ambulatorio', value: 'Ambulatorio' },
  { label: 'Online', value: 'Online' },
];

const CITY_FILTERS = [
  { label: 'Todas', value: 'all' },
  { label: 'Santiago', value: 'Santiago' },
  { label: 'Valparaíso', value: 'Valparaíso' },
  { label: 'Concepción', value: 'Concepción' },
  { label: 'Antofagasta', value: 'Antofagasta' },
  { label: 'Temuco', value: 'Temuco' },
];

const TABS = [
  { label: 'Centros', value: 'centers', icon: 'business' },
  { label: 'Terapeutas', value: 'therapists', icon: 'people' },
  { label: 'Talleres', value: 'workshops', icon: 'calendar' },
];

export default function CentersScreen() {
  const [activeTab, setActiveTab] = useState('centers');
  const [centers, setCenters] = useState<any[]>([]);
  const [therapists, setTherapists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  // Re-fetch when filters change
  useEffect(() => {
    if (!loading) {
      fetchCenters();
    }
  }, [activeFilter, cityFilter]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchCenters(), fetchTherapists()]);
    setLoading(false);
  };

  const fetchCenters = async () => {
    try {
      setError(null);
      // Build query params for sinadicciones.org API
      const params = new URLSearchParams();
      if (activeFilter !== 'all') {
        params.append('modality', activeFilter);
      }
      if (cityFilter !== 'all') {
        params.append('city', cityFilter);
      }
      params.append('limit', '50');
      
      const url = `${SINADICCIONES_API}/centers/public?${params.toString()}`;
      console.log('Fetching centers from:', url);
      
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        setCenters(data.centers || []);
        setLastUpdated(new Date().toISOString());
      } else {
        throw new Error('Error fetching centers');
      }
    } catch (err) {
      console.error('Error fetching centers:', err);
      setError('No se pudieron cargar los centros');
      // Fallback to local backend
      try {
        const response = await fetch(`${BACKEND_URL}/api/centers`);
        if (response.ok) {
          const data = await response.json();
          setCenters(data.centers || []);
        }
      } catch (fallbackErr) {
        console.error('Fallback also failed:', fallbackErr);
      }
    }
  };

  const fetchTherapists = async () => {
    try {
      // Fetch from sinadicciones.org API
      const params = new URLSearchParams();
      if (cityFilter !== 'all') {
        params.append('city', cityFilter);
      }
      
      const url = `${SINADICCIONES_API}/professionals/public?${params.toString()}`;
      console.log('Fetching professionals from:', url);
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setTherapists(data.professionals || []);
      }
    } catch (err) {
      console.error('Error fetching therapists:', err);
      // Fallback to local backend
      try {
        const response = await authenticatedFetch(`${BACKEND_URL}/api/therapists/search?query=`);
        if (response.ok) {
          const data = await response.json();
          setTherapists(data || []);
        }
      } catch (fallbackErr) {
        console.error('Fallback also failed:', fallbackErr);
      }
    }
      console.error('Error fetching therapists:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleOpenCenter = (url: string) => {
    Linking.openURL(url);
  };

  const handleOpenDirectory = () => {
    Linking.openURL('https://sinadicciones.org/centros');
  };

  const handleWhatsApp = (phone: string, name: string, isTherapist: boolean = false) => {
    // Limpiar el número de teléfono
    let cleanPhone = phone.replace(/\s/g, '').replace(/[^0-9+]/g, '');
    
    // Si el número empieza con +56, está bien. Si no, agregar código de Chile
    if (!cleanPhone.startsWith('+')) {
      if (cleanPhone.startsWith('56')) {
        cleanPhone = '+' + cleanPhone;
      } else if (cleanPhone.startsWith('9')) {
        cleanPhone = '+56' + cleanPhone;
      } else {
        cleanPhone = '+56' + cleanPhone;
      }
    }
    
    // Mensaje predefinido
    const message = isTherapist 
      ? `Hola ${name}, encontré tu perfil en la app SinAdicciones y me gustaría consultar sobre una sesión de terapia.`
      : `Hola estoy interesado, encontré tu servicio en Sinadicciones.cl, puedes darme más información del centro`;
    const encodedMessage = encodeURIComponent(message);
    
    // Remover el + para la URL de WhatsApp
    const whatsappNumber = cleanPhone.replace('+', '');
    
    if (whatsappNumber) {
      Linking.openURL(`https://wa.me/${whatsappNumber}?text=${encodedMessage}`);
    }
  };

  const handleContactTherapist = (therapist: any) => {
    const phone = therapist.whatsapp || therapist.phone;
    if (!phone) {
      Alert.alert(
        'Sin información de contacto',
        'Este terapeuta no ha agregado su número de contacto aún.'
      );
      return;
    }

    Alert.alert(
      'Contactar Terapeuta',
      `${therapist.consultation_fee ? `💰 Tarifa: ${therapist.consultation_fee}\n\n` : ''}Este servicio puede tener un costo indicado por el terapeuta. ¿Deseas contactar por WhatsApp?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Contactar', 
          onPress: () => handleWhatsApp(phone, therapist.name, true)
        }
      ]
    );
  };

  // Filter centers based on search query
  const filteredCenters = centers.filter((center) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      center.name?.toLowerCase().includes(query) ||
      center.city?.toLowerCase().includes(query) ||
      center.description?.toLowerCase().includes(query)
    );
  });

  // Filter therapists based on search query
  const filteredTherapists = therapists.filter((t) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      t.name?.toLowerCase().includes(query) ||
      t.specialty?.toLowerCase().includes(query) ||
      t.subspecialties?.some((s: string) => s.toLowerCase().includes(query)) ||
      t.city?.toLowerCase().includes(query)
    );
  });

  const formatLastUpdated = () => {
    if (!lastUpdated) return '';
    const date = new Date(lastUpdated);
    return date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  };

  const getProfessionalTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'psychologist': 'Psicólogo/a',
      'psychiatrist': 'Psiquiatra',
      'therapist': 'Terapeuta',
      'counselor': 'Consejero/a',
    };
    return types[type] || type;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <LinearGradient
          colors={['#10B981', '#059669']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerTitleContainer}>
            <Ionicons name="medical" size={24} color="#FFFFFF" />
            <Text style={styles.headerTitle}>Buscar Ayuda</Text>
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>Cargando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={['#10B981', '#059669']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <View style={styles.headerTitleContainer}>
            <Ionicons name="medical" size={24} color="#FFFFFF" />
            <Text style={styles.headerTitle}>Buscar Ayuda</Text>
          </View>
          <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
            <Ionicons name="refresh" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSubtitle}>
          {centers.length} centros • {therapists.length} terapeutas
        </Text>
      </LinearGradient>

      {/* Tab Switcher */}
      <View style={styles.tabContainer}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.value}
            style={[styles.tab, activeTab === tab.value && styles.tabActive]}
            onPress={() => setActiveTab(tab.value)}
          >
            <Ionicons 
              name={tab.icon as any} 
              size={20} 
              color={activeTab === tab.value ? '#10B981' : '#6B7280'} 
            />
            <Text style={[styles.tabText, activeTab === tab.value && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'centers' ? (
        <>
          {/* Search Button for Centers */}
          <TouchableOpacity style={styles.searchButton} onPress={handleOpenDirectory}>
            <View style={styles.searchContent}>
              <Ionicons name="search" size={20} color="#6B7280" />
              <Text style={styles.searchText}>Buscar con filtros avanzados...</Text>
            </View>
            <Ionicons name="open-outline" size={18} color="#10B981" />
          </TouchableOpacity>

          {/* Quick Filters - Modalidad */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.filtersContainer}
            contentContainerStyle={styles.filtersContent}
          >
            {QUICK_FILTERS.map((filter) => (
              <TouchableOpacity
                key={filter.value}
                style={[
                  styles.filterChip,
                  activeFilter === filter.value && styles.filterChipActive,
                ]}
                onPress={() => setActiveFilter(filter.value)}
              >
                <Text
                  style={[
                    styles.filterText,
                    activeFilter === filter.value && styles.filterTextActive,
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* City Filters */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.filtersContainer}
            contentContainerStyle={styles.filtersContent}
          >
            <Text style={styles.filterLabel}>Ciudad:</Text>
            {CITY_FILTERS.map((filter) => (
              <TouchableOpacity
                key={filter.value}
                style={[
                  styles.filterChip,
                  { borderColor: '#8B5CF6' },
                  cityFilter === filter.value && [styles.filterChipActive, { backgroundColor: '#8B5CF6' }],
                ]}
                onPress={() => setCityFilter(filter.value)}
              >
                <Text
                  style={[
                    styles.filterText,
                    { color: cityFilter === filter.value ? '#FFFFFF' : '#8B5CF6' },
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      ) : (
        /* Search Input for Therapists */
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre, especialización..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Error Message */}
      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="warning" size={18} color="#DC2626" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchData}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {activeTab === 'centers' ? (
          /* Centers List */
          filteredCenters.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="search" size={48} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No se encontraron centros</Text>
              <Text style={styles.emptyText}>
                Prueba con otro filtro o busca en el sitio web
              </Text>
              <TouchableOpacity style={styles.emptyButton} onPress={handleOpenDirectory}>
                <Text style={styles.emptyButtonText}>Ir a sinadicciones.cl</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.sectionTitle}>
                {filteredCenters.length} {filteredCenters.length === 1 ? 'centro encontrado' : 'centros encontrados'}
              </Text>

              {filteredCenters.map((center, index) => (
                <TouchableOpacity
                  key={center.center_id || index}
                  style={styles.centerCard}
                  onPress={() => center.website ? handleOpenCenter(center.website) : null}
                >
                  <View style={styles.centerHeader}>
                    <View style={styles.centerIcon}>
                      {center.is_verified ? (
                        <Ionicons name="shield-checkmark" size={24} color="#10B981" />
                      ) : (
                        <Ionicons name="home" size={24} color="#10B981" />
                      )}
                    </View>
                    <View style={styles.centerInfo}>
                      <Text style={styles.centerName} numberOfLines={2}>{center.name}</Text>
                      {center.description ? (
                        <Text style={styles.centerDescription} numberOfLines={2}>
                          {center.description}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  <View style={styles.centerDetails}>
                    {center.city || center.region ? (
                      <View style={styles.detailRow}>
                        <Ionicons name="location" size={16} color="#6B7280" />
                        <Text style={styles.detailText} numberOfLines={1}>
                          {[center.city, center.region].filter(Boolean).join(', ')}
                        </Text>
                      </View>
                    ) : null}
                    {center.address ? (
                      <View style={styles.detailRow}>
                        <Ionicons name="navigate" size={16} color="#6B7280" />
                        <Text style={styles.detailText} numberOfLines={1}>{center.address}</Text>
                      </View>
                    ) : null}
                    {center.price_range ? (
                      <View style={styles.detailRow}>
                        <Ionicons name="cash" size={16} color="#6B7280" />
                        <Text style={styles.detailText}>{center.price_range}</Text>
                      </View>
                    ) : null}
                    {center.rating ? (
                      <View style={styles.detailRow}>
                        <Ionicons name="star" size={16} color="#F59E0B" />
                        <Text style={styles.detailText}>{center.rating} ({center.review_count || 0} reseñas)</Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Services/Specialties */}
                  {center.specialties && center.specialties.length > 0 && (
                    <View style={styles.modalityContainer}>
                      {center.specialties.slice(0, 3).map((spec: string, idx: number) => (
                        <View key={idx} style={[styles.modalityBadge, { backgroundColor: '#EEF2FF' }]}>
                          <Text style={[styles.modalityText, { color: '#4F46E5' }]}>{spec}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Modality badge */}
                  {center.modality && (
                    <View style={styles.modalityContainer}>
                      <View style={styles.modalityBadge}>
                        <Text style={styles.modalityText}>{center.modality}</Text>
                      </View>
                    </View>
                  )}

                  <View style={styles.centerActions}>
                    {center.phone ? (
                      <TouchableOpacity
                        style={styles.whatsappButton}
                        onPress={() => handleWhatsApp(center.phone, center.name)}
                      >
                        <Ionicons name="logo-whatsapp" size={18} color="#FFFFFF" />
                        <Text style={styles.whatsappButtonText}>WhatsApp</Text>
                      </TouchableOpacity>
                    ) : null}
                    {center.website ? (
                      <TouchableOpacity
                        style={[styles.viewButton, !center.phone && styles.viewButtonFull]}
                        onPress={() => handleOpenCenter(center.website)}
                      >
                        <Text style={styles.viewButtonText}>Ver detalles</Text>
                        <Ionicons name="chevron-forward" size={18} color="#10B981" />
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[styles.viewButton, styles.viewButtonFull]}
                        onPress={() => center.email ? Linking.openURL(`mailto:${center.email}`) : null}
                      >
                        <Ionicons name="mail" size={18} color="#10B981" />
                        <Text style={styles.viewButtonText}>Contactar</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              ))}

              {/* CTA to view more */}
              <TouchableOpacity style={styles.viewMoreCard} onPress={handleOpenDirectory}>
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.viewMoreGradient}
                >
                  <Ionicons name="globe" size={32} color="#FFFFFF" />
                  <Text style={styles.viewMoreTitle}>Ver directorio completo</Text>
                  <Text style={styles.viewMoreText}>
                    Explora más centros con filtros avanzados en sinadicciones.cl
                  </Text>
                  <View style={styles.viewMoreButton}>
                    <Text style={styles.viewMoreButtonText}>Abrir sitio web</Text>
                    <Ionicons name="open-outline" size={18} color="#10B981" />
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </>
          )
        ) : (
          /* Therapists List */
          filteredTherapists.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people" size={48} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No se encontraron terapeutas</Text>
              <Text style={styles.emptyText}>
                {searchQuery 
                  ? 'Prueba con otro término de búsqueda'
                  : 'Aún no hay terapeutas registrados en la plataforma'}
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.sectionTitle}>
                {filteredTherapists.length} {filteredTherapists.length === 1 ? 'terapeuta encontrado' : 'terapeutas encontrados'}
              </Text>

              {/* Info Banner */}
              <View style={styles.infoBanner}>
                <Ionicons name="information-circle" size={20} color="#3B82F6" />
                <Text style={styles.infoBannerText}>
                  Los terapeutas establecen sus propias tarifas. Consulta directamente para conocer costos y disponibilidad.
                </Text>
              </View>

              {filteredTherapists.map((therapist, index) => (
                <View key={therapist.id || index} style={styles.therapistCard}>
                  <View style={styles.therapistHeader}>
                    <View style={styles.therapistAvatar}>
                      {therapist.photo ? (
                        <Ionicons name="person" size={28} color="#8B5CF6" />
                      ) : (
                        <Ionicons name="person" size={28} color="#8B5CF6" />
                      )}
                    </View>
                    <View style={styles.therapistInfo}>
                      <Text style={styles.therapistName}>{therapist.name}</Text>
                      <Text style={styles.therapistType}>
                        {therapist.specialty || getProfessionalTypeLabel(therapist.professional_type)}
                      </Text>
                    </View>
                    {therapist.is_verified && (
                      <View style={[styles.availableBadge, { backgroundColor: '#ECFDF5' }]}>
                        <Ionicons name="shield-checkmark" size={12} color="#10B981" />
                        <Text style={[styles.availableBadgeText, { color: '#10B981' }]}>Verificado</Text>
                      </View>
                    )}
                  </View>

                  {/* Location */}
                  {(therapist.city || therapist.region) && (
                    <View style={styles.therapistDetail}>
                      <Ionicons name="location" size={16} color="#6B7280" />
                      <Text style={styles.therapistDetailText}>
                        {[therapist.city, therapist.region].filter(Boolean).join(', ')}
                      </Text>
                    </View>
                  )}

                  {/* Subspecialties */}
                  {therapist.subspecialties && therapist.subspecialties.length > 0 && (
                    <View style={styles.therapistDetail}>
                      <Ionicons name="medical" size={16} color="#6B7280" />
                      <Text style={styles.therapistDetailText}>
                        {therapist.subspecialties.slice(0, 3).join(', ')}
                      </Text>
                    </View>
                  )}

                  {/* Old fields for backwards compatibility */}
                  {therapist.specialization && !therapist.subspecialties && (
                    <View style={styles.therapistDetail}>
                      <Ionicons name="medical" size={16} color="#6B7280" />
                      <Text style={styles.therapistDetailText}>{therapist.specialization}</Text>
                    </View>
                  )}

                  {therapist.institution && (
                    <View style={styles.therapistDetail}>
                      <Ionicons name="business" size={16} color="#6B7280" />
                      <Text style={styles.therapistDetailText}>{therapist.institution}</Text>
                    </View>
                  )}

                  {/* Modalities */}
                  {therapist.modality && therapist.modality.length > 0 && (
                    <View style={styles.modalityContainer}>
                      {(Array.isArray(therapist.modality) ? therapist.modality : [therapist.modality]).map((mod: string, idx: number) => (
                        <View key={idx} style={[styles.modalityBadge, { backgroundColor: '#F3E8FF' }]}>
                          <Text style={[styles.modalityText, { color: '#7C3AED' }]}>{mod}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Rating */}
                  {therapist.rating && (
                    <View style={styles.therapistDetail}>
                      <Ionicons name="star" size={16} color="#F59E0B" />
                      <Text style={styles.therapistDetailText}>
                        {therapist.rating} ({therapist.review_count || 0} reseñas)
                      </Text>
                    </View>
                  )}

                  {(therapist.consultation_fee || therapist.session_fee) && (
                    <View style={styles.feeContainer}>
                      <Ionicons name="cash" size={16} color="#10B981" />
                      <Text style={styles.feeText}>{therapist.consultation_fee || therapist.session_fee}</Text>
                    </View>
                  )}

                  {therapist.bio && (
                    <Text style={styles.therapistBio} numberOfLines={3}>{therapist.bio}</Text>
                  )}

                  <TouchableOpacity
                    style={[
                      styles.contactButton,
                      !(therapist.whatsapp || therapist.phone) && styles.contactButtonDisabled
                    ]}
                    onPress={() => handleContactTherapist(therapist)}
                  >
                    <Ionicons 
                      name="logo-whatsapp" 
                      size={20} 
                      color={(therapist.whatsapp || therapist.phone) ? '#FFFFFF' : '#9CA3AF'} 
                    />
                    <Text style={[
                      styles.contactButtonText,
                      !(therapist.whatsapp || therapist.phone) && styles.contactButtonTextDisabled
                    ]}>
                      {(therapist.whatsapp || therapist.phone) ? 'Contactar por WhatsApp' : 'Sin contacto disponible'}
                    </Text>
                  </TouchableOpacity>

                  {(therapist.consultation_fee || therapist.session_fee) && (
                    <Text style={styles.feeDisclaimer}>
                      💰 Este servicio tiene un costo definido por el terapeuta
                    </Text>
                  )}
                </View>
              ))}
            </>
          )
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  refreshButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#D1FAE5',
    marginTop: 4,
    marginLeft: 34,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#D1FAE5',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#10B981',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  searchContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchText: {
    fontSize: 14,
    color: '#6B7280',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
  },
  filtersContainer: {
    maxHeight: 50,
  },
  filtersContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  filterText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  filterLabel: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '600',
    marginRight: 8,
    alignSelf: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#DC2626',
  },
  retryText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EFF6FF',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 10,
    gap: 10,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#3B82F6',
    lineHeight: 18,
  },
  content: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    padding: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyButton: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  centerCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  centerHeader: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  centerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerInfo: {
    flex: 1,
  },
  centerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  centerDescription: {
    fontSize: 13,
    color: '#6B7280',
  },
  centerDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  detailText: {
    flex: 1,
    fontSize: 13,
    color: '#4B5563',
  },
  modalityContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  modalityBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  modalityText: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '500',
  },
  centerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  whatsappButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#25D366',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  whatsappButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  viewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 4,
  },
  viewButtonFull: {
    flex: 1,
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  viewMoreCard: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  viewMoreGradient: {
    padding: 24,
    alignItems: 'center',
  },
  viewMoreTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 12,
    marginBottom: 8,
  },
  viewMoreText: {
    fontSize: 14,
    color: '#D1FAE5',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  viewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  viewMoreButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
  },
  // Therapist styles
  therapistCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  therapistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  therapistAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  therapistInfo: {
    flex: 1,
  },
  therapistName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  therapistType: {
    fontSize: 13,
    color: '#8B5CF6',
    fontWeight: '500',
    marginTop: 2,
  },
  availableBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  availableBadgeText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
  },
  therapistDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  therapistDetailText: {
    flex: 1,
    fontSize: 13,
    color: '#4B5563',
  },
  feeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginVertical: 8,
    gap: 8,
  },
  feeText: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '600',
  },
  therapistBio: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  contactButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  contactButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  contactButtonTextDisabled: {
    color: '#9CA3AF',
  },
  feeDisclaimer: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
  },
});
