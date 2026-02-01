import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  RefreshControl,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

const SINADICCIONES_URL = 'https://sinadicciones.cl';

// Static list of featured centers
const FEATURED_CENTERS = [
  {
    id: '1',
    name: 'Centro Existencia Plena',
    description: 'Se puede, pero no solo!',
    phone: '+56 9 5402 0968',
    address: 'El Copihue 3238',
    price: 'Desde $1M a $1.2M',
    modality: ['Online', 'Residencial', 'Ambulatorio'],
    type: 'Mixto',
    url: 'https://sinadicciones.cl/listing/centro-rehabilitacion-existencia-plena/',
    featured: true,
  },
  {
    id: '2',
    name: 'Tratamiento Los Olivos - Arica',
    description: 'Programa de Tratamiento Ambulatorio y Residencial',
    phone: '58 2 24 6387',
    address: 'Arica',
    price: 'Consultar',
    modality: ['Residencial', 'Ambulatorio'],
    type: 'Mixto',
    url: 'https://sinadicciones.cl/listing/tratamiento-adicciones-los-olivos-arica/',
    featured: false,
  },
  {
    id: '3',
    name: 'Centro Clínico Comunitario - Puerto Montt',
    description: 'Universidad Austral De Chile',
    phone: '+56 9 4163 8395',
    address: 'Puerto Montt',
    price: 'Gratis',
    modality: ['Ambulatorio'],
    type: 'Mixto',
    url: 'https://sinadicciones.cl/listing/centro-clinico-comunitario-de-drogas-puerto-montt/',
    featured: false,
  },
  {
    id: '4',
    name: 'Centro Nawel Chile',
    description: 'El Rumbo a Seguir',
    phone: '+56 9 35450840',
    address: 'San Joaquín de los Mayos',
    price: 'Desde $500.000 a $700.000',
    modality: ['Residencial'],
    type: 'Mixto',
    url: 'https://sinadicciones.cl/listing/centro-de-rehabilitacion-de-drogas-nawel-chile/',
    featured: false,
  },
  {
    id: '5',
    name: 'Comunidad Terapéutica Suyaí',
    description: 'Comunidad terapéutica de adicciones para mujeres',
    phone: '+569 2230 8440',
    address: 'Mirador del Valle 68',
    price: 'Desde $250.000 a $500.000',
    modality: ['Residencial'],
    type: 'Femenino',
    url: 'https://sinadicciones.cl/listing/comunidad-terapeutica-de-mujeres-suyai/',
    featured: false,
  },
];

const QUICK_FILTERS = [
  { label: 'Todos', value: 'all' },
  { label: 'Residencial', value: 'residencial' },
  { label: 'Ambulatorio', value: 'ambulatorio' },
  { label: 'Gratis', value: 'gratis' },
  { label: 'Mujeres', value: 'femenino' },
];

export default function CentersScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  const handleOpenCenter = (url: string) => {
    Linking.openURL(url);
  };

  const handleOpenDirectory = () => {
    Linking.openURL(`${SINADICCIONES_URL}/explore-no-map/?type=place&sort=latest`);
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone.replace(/\s/g, '')}`);
  };

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const filteredCenters = FEATURED_CENTERS.filter((center) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'gratis') return center.price === 'Gratis';
    if (activeFilter === 'femenino') return center.type === 'Femenino';
    return center.modality.some((m) => m.toLowerCase() === activeFilter);
  });

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
        </View>
        <Text style={styles.headerSubtitle}>
          Directorio de sinadicciones.cl
        </Text>
      </LinearGradient>

      {/* Search Button */}
      <TouchableOpacity style={styles.searchButton} onPress={handleOpenDirectory}>
        <View style={styles.searchContent}>
          <Ionicons name="search" size={20} color="#6B7280" />
          <Text style={styles.searchText}>Buscar más centros con filtros avanzados...</Text>
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

      {/* Centers List */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={styles.sectionTitle}>
          Centros destacados ({filteredCenters.length})
        </Text>

        {filteredCenters.map((center) => (
          <TouchableOpacity
            key={center.id}
            style={[styles.centerCard, center.featured && styles.centerCardFeatured]}
            onPress={() => handleOpenCenter(center.url)}
          >
            {center.featured && (
              <View style={styles.featuredBadge}>
                <Ionicons name="star" size={12} color="#FFFFFF" />
                <Text style={styles.featuredText}>Destacado</Text>
              </View>
            )}
            
            <View style={styles.centerHeader}>
              <View style={styles.centerIcon}>
                <Ionicons name="home" size={24} color="#10B981" />
              </View>
              <View style={styles.centerInfo}>
                <Text style={styles.centerName}>{center.name}</Text>
                <Text style={styles.centerDescription}>{center.description}</Text>
              </View>
            </View>

            <View style={styles.centerDetails}>
              <View style={styles.detailRow}>
                <Ionicons name="location" size={16} color="#6B7280" />
                <Text style={styles.detailText}>{center.address}</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="cash" size={16} color="#6B7280" />
                <Text style={styles.detailText}>{center.price}</Text>
              </View>
            </View>

            <View style={styles.modalityContainer}>
              {center.modality.map((mod, index) => (
                <View key={index} style={styles.modalityBadge}>
                  <Text style={styles.modalityText}>{mod}</Text>
                </View>
              ))}
              <View style={[styles.modalityBadge, styles.typeBadge]}>
                <Text style={styles.typeText}>{center.type}</Text>
              </View>
            </View>

            <View style={styles.centerActions}>
              <TouchableOpacity
                style={styles.callButton}
                onPress={() => handleCall(center.phone)}
              >
                <Ionicons name="call" size={18} color="#FFFFFF" />
                <Text style={styles.callButtonText}>Llamar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.viewButton}
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
            <Ionicons name="search" size={32} color="#FFFFFF" />
            <Text style={styles.viewMoreTitle}>Ver todos los centros</Text>
            <Text style={styles.viewMoreText}>
              Explora el directorio completo con filtros por región, precio, modalidad y más
            </Text>
            <View style={styles.viewMoreButton}>
              <Text style={styles.viewMoreButtonText}>Ir a sinadicciones.cl</Text>
              <Ionicons name="open-outline" size={18} color="#10B981" />
            </View>
          </LinearGradient>
        </TouchableOpacity>

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
  headerSubtitle: {
    fontSize: 14,
    color: '#D1FAE5',
    marginTop: 4,
    marginLeft: 34,
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
  content: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
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
  centerCardFeatured: {
    borderWidth: 2,
    borderColor: '#10B981',
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    marginBottom: 12,
  },
  featuredText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
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
  typeBadge: {
    backgroundColor: '#F3E8FF',
  },
  typeText: {
    fontSize: 12,
    color: '#8B5CF6',
    fontWeight: '500',
  },
  centerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  callButtonText: {
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
