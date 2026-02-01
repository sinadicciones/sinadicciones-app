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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

const BACKEND_URL = process.env.EXPO_PUBLIC_API_URL || '';
const SINADICCIONES_URL = 'https://sinadicciones.cl';

const QUICK_FILTERS = [
  { label: 'Todos', value: 'all' },
  { label: 'Residencial', value: 'residencial' },
  { label: 'Ambulatorio', value: 'ambulatorio' },
  { label: 'Online', value: 'online' },
];

export default function CentersScreen() {
  const [centers, setCenters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCenters();
  }, []);

  const fetchCenters = async () => {
    try {
      setError(null);
      const response = await fetch(`${BACKEND_URL}/api/centers`);
      
      if (response.ok) {
        const data = await response.json();
        setCenters(data.centers || []);
        setLastUpdated(data.last_updated);
      } else {
        throw new Error('Error fetching centers');
      }
    } catch (err) {
      console.error('Error fetching centers:', err);
      setError('No se pudieron cargar los centros');
      // Keep existing centers if we have them
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchCenters();
  };

  const handleOpenCenter = (url: string) => {
    Linking.openURL(url);
  };

  const handleOpenDirectory = () => {
    Linking.openURL(`${SINADICCIONES_URL}/explore-no-map/?type=place&sort=latest`);
  };

  const handleWhatsApp = (phone: string, centerName: string) => {
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
    const message = `Hola estoy interesado, encontré tu servicio en Sinadicciones.cl, puedes darme más información del centro`;
    const encodedMessage = encodeURIComponent(message);
    
    // Remover el + para la URL de WhatsApp
    const whatsappNumber = cleanPhone.replace('+', '');
    
    if (whatsappNumber) {
      Linking.openURL(`https://wa.me/${whatsappNumber}?text=${encodedMessage}`);
    }
  };

  const filteredCenters = centers.filter((center) => {
    if (activeFilter === 'all') return true;
    const modalities = center.modalities || [];
    return modalities.some((m: string) => 
      m.toLowerCase().includes(activeFilter.toLowerCase())
    );
  });

  const formatLastUpdated = () => {
    if (!lastUpdated) return '';
    const date = new Date(lastUpdated);
    return date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
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
            <Text style={styles.headerTitle}>Centros de Rehabilitación</Text>
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>Cargando centros actualizados...</Text>
        </View>
        <BottomNavigation />
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
            <Text style={styles.headerTitle}>Centros de Rehabilitación</Text>
          </View>
          <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
            <Ionicons name="refresh" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSubtitle}>
          {centers.length} centros disponibles • Actualizado {formatLastUpdated()}
        </Text>
      </LinearGradient>

      {/* Search Button */}
      <TouchableOpacity style={styles.searchButton} onPress={handleOpenDirectory}>
        <View style={styles.searchContent}>
          <Ionicons name="search" size={20} color="#6B7280" />
          <Text style={styles.searchText}>Buscar con filtros avanzados...</Text>
        </View>
        <Ionicons name="open-outline" size={18} color="#10B981" />
      </TouchableOpacity>

      {/* Quick Filters */}
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

      {/* Error Message */}
      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="warning" size={18} color="#DC2626" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchCenters}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Centers List */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredCenters.length === 0 ? (
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
                key={index}
                style={styles.centerCard}
                onPress={() => handleOpenCenter(center.url)}
              >
                <View style={styles.centerHeader}>
                  <View style={styles.centerIcon}>
                    <Ionicons name="home" size={24} color="#10B981" />
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
                  {center.address ? (
                    <View style={styles.detailRow}>
                      <Ionicons name="location" size={16} color="#6B7280" />
                      <Text style={styles.detailText} numberOfLines={1}>{center.address}</Text>
                    </View>
                  ) : null}
                  {center.price ? (
                    <View style={styles.detailRow}>
                      <Ionicons name="cash" size={16} color="#6B7280" />
                      <Text style={styles.detailText}>{center.price}</Text>
                    </View>
                  ) : null}
                </View>

                {center.modalities && center.modalities.length > 0 && (
                  <View style={styles.modalityContainer}>
                    {center.modalities.slice(0, 4).map((mod: string, idx: number) => (
                      <View key={idx} style={styles.modalityBadge}>
                        <Text style={styles.modalityText}>{mod}</Text>
                      </View>
                    ))}
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
                  <TouchableOpacity
                    style={[styles.viewButton, !center.phone && styles.viewButtonFull]}
                    onPress={() => handleOpenCenter(center.url)}
                  >
                    <Text style={styles.viewButtonText}>Ver detalles</Text>
                    <Ionicons name="chevron-forward" size={18} color="#10B981" />
                  </TouchableOpacity>
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
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <BottomNavigation />
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
});
