import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import BottomNavigation from '../../components/BottomNavigation';

const { width } = Dimensions.get('window');

const CATEGORIES = [
  { key: 'all', label: 'Todo', icon: 'apps' },
  { key: 'quotes', label: 'Frases', icon: 'chatbubble-ellipses' },
  { key: 'stories', label: 'Historias', icon: 'book' },
  { key: 'videos', label: 'Videos', icon: 'play-circle' },
  { key: 'exercises', label: 'Ejercicios', icon: 'fitness' },
];

const INSPIRATION_CONTENT = [
  {
    id: '1',
    category: 'quotes',
    title: 'El primer paso',
    content: '"El viaje de mil millas comienza con un solo paso." - Lao Tzu',
    color: '#F59E0B',
  },
  {
    id: '2',
    category: 'quotes',
    title: 'Cada día cuenta',
    content: '"No tienes que ser perfecto, solo tienes que estar presente."',
    color: '#10B981',
  },
  {
    id: '3',
    category: 'quotes',
    title: 'La fortaleza interior',
    content: '"La recuperación no es una carrera. Es un viaje. Tómate tu tiempo."',
    color: '#3B82F6',
  },
  {
    id: '4',
    category: 'stories',
    title: 'Historia de esperanza',
    content: 'María llevaba 5 años luchando contra su adicción. Hoy celebra 3 años de sobriedad y ayuda a otros en su camino. "Nunca pensé que llegaría aquí, pero un día a la vez, lo logré."',
    color: '#8B5CF6',
  },
  {
    id: '5',
    category: 'stories',
    title: 'Reconstruyendo relaciones',
    content: 'Carlos perdió la confianza de su familia. Después de 2 años de trabajo constante en su recuperación, logró reconstruir los lazos con sus hijos. "El perdón llega, pero hay que ganárselo con acciones."',
    color: '#EC4899',
  },
  {
    id: '6',
    category: 'exercises',
    title: 'Respiración 4-7-8',
    content: 'Cuando sientas ansiedad o antojos:\n\n1. Inhala por 4 segundos\n2. Mantén por 7 segundos\n3. Exhala por 8 segundos\n\nRepite 4 veces.',
    color: '#10B981',
  },
  {
    id: '7',
    category: 'exercises',
    title: 'Grounding 5-4-3-2-1',
    content: 'Para volver al presente:\n\n• 5 cosas que puedes VER\n• 4 cosas que puedes TOCAR\n• 3 cosas que puedes OÍR\n• 2 cosas que puedes OLER\n• 1 cosa que puedes SABOREAR',
    color: '#3B82F6',
  },
  {
    id: '8',
    category: 'quotes',
    title: 'Sobre los errores',
    content: '"Una recaída no borra tu progreso. Un mal día no significa una mala vida."',
    color: '#EF4444',
  },
  {
    id: '9',
    category: 'exercises',
    title: 'Diario de gratitud',
    content: 'Cada noche escribe:\n\n1. Tres cosas por las que estás agradecido hoy\n2. Una pequeña victoria\n3. Una persona que te apoyó\n\nLa gratitud cambia la perspectiva.',
    color: '#F59E0B',
  },
  {
    id: '10',
    category: 'videos',
    title: 'Charla TED: La adicción',
    content: 'Johann Hari explica por qué la conexión es el opuesto de la adicción. Una perspectiva reveladora sobre la recuperación.',
    url: 'https://www.youtube.com/watch?v=PY9DcIMGxMs',
    color: '#EF4444',
  },
];

export default function InspirationLibrary() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const filteredContent = INSPIRATION_CONTENT.filter(
    (item) => selectedCategory === 'all' || item.category === selectedCategory
  );

  const handleOpenURL = (url: string) => {
    Linking.openURL(url).catch(() => {
      console.error('Could not open URL');
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={['#8B5CF6', '#A855F7']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Biblioteca de Inspiración</Text>
        <Text style={styles.headerSubtitle}>
          Recursos para tu camino de recuperación
        </Text>
      </LinearGradient>

      {/* Category Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
        contentContainerStyle={styles.categoriesContent}
      >
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.key}
            style={[
              styles.categoryChip,
              selectedCategory === cat.key && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory(cat.key)}
          >
            <Ionicons
              name={cat.icon as any}
              size={18}
              color={selectedCategory === cat.key ? '#FFFFFF' : '#6B7280'}
            />
            <Text
              style={[
                styles.categoryText,
                selectedCategory === cat.key && styles.categoryTextActive,
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.content}>
        {filteredContent.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.card}
            onPress={() =>
              setExpandedCard(expandedCard === item.id ? null : item.id)
            }
            activeOpacity={0.9}
          >
            <View style={[styles.cardAccent, { backgroundColor: item.color }]} />
            <View style={styles.cardContent}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIcon, { backgroundColor: item.color + '20' }]}>
                  <Ionicons
                    name={
                      item.category === 'quotes'
                        ? 'chatbubble-ellipses'
                        : item.category === 'stories'
                        ? 'book'
                        : item.category === 'videos'
                        ? 'play-circle'
                        : 'fitness'
                    }
                    size={20}
                    color={item.color}
                  />
                </View>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Ionicons
                  name={expandedCard === item.id ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color="#9CA3AF"
                />
              </View>

              {(expandedCard === item.id || item.category === 'quotes') && (
                <Text
                  style={[
                    styles.cardText,
                    item.category === 'quotes' && styles.quoteText,
                  ]}
                >
                  {item.content}
                </Text>
              )}

              {expandedCard === item.id && (item as any).url && (
                <TouchableOpacity
                  style={[styles.watchButton, { backgroundColor: item.color }]}
                  onPress={() => handleOpenURL((item as any).url)}
                >
                  <Ionicons name="play" size={18} color="#FFFFFF" />
                  <Text style={styles.watchButtonText}>Ver video</Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        ))}

        {/* Daily Reflection Card */}
        <View style={styles.reflectionCard}>
          <LinearGradient
            colors={['#F59E0B', '#EF4444']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.reflectionGradient}
          >
            <Ionicons name="sunny" size={40} color="#FFFFFF" />
            <Text style={styles.reflectionTitle}>Reflexión del día</Text>
            <Text style={styles.reflectionText}>
              "Hoy es un nuevo día. Cada momento es una oportunidad para elegir de
              nuevo. No importa lo que pasó ayer, hoy puedes dar un paso hacia
              adelante."
            </Text>
          </LinearGradient>
        </View>

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
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  backButton: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#E9D5FF',
  },
  categoriesContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  categoriesContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
    gap: 6,
  },
  categoryChipActive: {
    backgroundColor: '#8B5CF6',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  categoryTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    flexDirection: 'row',
  },
  cardAccent: {
    width: 4,
  },
  cardContent: {
    flex: 1,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  cardText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 22,
    marginTop: 12,
  },
  quoteText: {
    fontStyle: 'italic',
    fontSize: 15,
    color: '#374151',
  },
  watchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  watchButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  reflectionCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
  },
  reflectionGradient: {
    padding: 24,
    alignItems: 'center',
  },
  reflectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 12,
    marginBottom: 12,
  },
  reflectionText: {
    fontSize: 15,
    color: '#FEF3C7',
    textAlign: 'center',
    lineHeight: 24,
    fontStyle: 'italic',
  },
});
