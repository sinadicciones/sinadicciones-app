import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function ChallengeStartScreen() {
  const router = useRouter();

  return (
    <LinearGradient
      colors={['#1A1A1A', '#2D2D2D', '#1A1A1A']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          {/* Success Icon */}
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={80} color="#10B981" />
          </View>

          <Text style={styles.title}>¡Felicidades!</Text>
          <Text style={styles.subtitle}>Has dado el primer paso más importante</Text>

          {/* Challenge Card */}
          <View style={styles.challengeCard}>
            <View style={styles.challengeHeader}>
              <Ionicons name="flame" size={32} color="#F59E0B" />
              <Text style={styles.challengeTitle}>RETO 21 DÍAS</Text>
            </View>
            
            <Text style={styles.challengeDescription}>
              Tu plan de recuperación personalizado ha sido creado. Durante los próximos 21 días te guiaremos paso a paso hacia una nueva vida.
            </Text>

            <View style={styles.challengeFeatures}>
              <View style={styles.featureItem}>
                <Ionicons name="checkbox" size={20} color="#10B981" />
                <Text style={styles.featureText}>Acciones diarias de protección</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="fitness" size={20} color="#10B981" />
                <Text style={styles.featureText}>Hábitos positivos personalizados</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="book" size={20} color="#10B981" />
                <Text style={styles.featureText}>Contenido educativo sobre adicciones</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="map" size={20} color="#10B981" />
                <Text style={styles.featureText}>Timeline de lo que puedes esperar</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="trending-up" size={20} color="#10B981" />
                <Text style={styles.featureText}>Seguimiento de tu progreso</Text>
              </View>
            </View>
          </View>

          {/* Warning Card */}
          <View style={styles.warningCard}>
            <Ionicons name="medical" size={24} color="#3B82F6" />
            <View style={styles.warningContent}>
              <Text style={styles.warningTitle}>Importante</Text>
              <Text style={styles.warningText}>
                Esta app es una herramienta de apoyo. Te recomendamos buscar ayuda profesional para aumentar tus probabilidades de éxito.
              </Text>
              <TouchableOpacity 
                style={styles.directoryButton}
                onPress={() => router.push('/centers')}
              >
                <Text style={styles.directoryButtonText}>Ver Directorio de Centros</Text>
                <Ionicons name="arrow-forward" size={16} color="#3B82F6" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Start Button */}
          <TouchableOpacity
            style={styles.startButton}
            onPress={() => router.replace('/(tabs)/home')}
          >
            <Ionicons name="rocket" size={24} color="#1A1A1A" />
            <Text style={styles.startButtonText}>Comenzar mi Reto</Text>
          </TouchableOpacity>

          <Text style={styles.motivationalText}>
            "El viaje de mil millas comienza con un solo paso"
          </Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    paddingTop: 60,
    alignItems: 'center',
  },
  successIcon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 32,
  },
  challengeCard: {
    width: '100%',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 20,
    padding: 24,
    borderWidth: 2,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    marginBottom: 20,
  },
  challengeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  challengeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F59E0B',
  },
  challengeDescription: {
    fontSize: 15,
    color: '#E5E7EB',
    lineHeight: 22,
    marginBottom: 20,
  },
  challengeFeatures: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#D1D5DB',
  },
  warningCard: {
    width: '100%',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    marginBottom: 24,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
    marginBottom: 6,
  },
  warningText: {
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 18,
    marginBottom: 12,
  },
  directoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  directoryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  startButton: {
    width: '100%',
    backgroundColor: '#F59E0B',
    paddingVertical: 18,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  startButtonText: {
    color: '#1A1A1A',
    fontSize: 20,
    fontWeight: 'bold',
  },
  motivationalText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
