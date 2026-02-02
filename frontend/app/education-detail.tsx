import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function EducationDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  let section: any = null;
  try {
    if (params.section && typeof params.section === 'string') {
      section = JSON.parse(params.section);
    }
  } catch (e) {
    console.error('Error parsing section:', e);
  }

  if (!section) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={60} color="#EF4444" />
          <Text style={styles.errorText}>No se encontró el contenido</Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            <Text style={styles.backButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#3B82F6', '#2563EB']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <SafeAreaView>
          <View style={styles.headerContent}>
            <TouchableOpacity 
              style={styles.headerBackBtn}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerInfo}>
              <Text style={styles.headerTitle}>{section.title}</Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Icon Section */}
        <View style={styles.iconSection}>
          <View style={styles.iconCircle}>
            <Ionicons name={section.icon || 'book'} size={40} color="#3B82F6" />
          </View>
        </View>

        {/* Content */}
        {section.content && (
          <View style={styles.contentSection}>
            <Text style={styles.contentText}>{section.content}</Text>
          </View>
        )}

        {/* Points/Tips if available */}
        {section.points && Array.isArray(section.points) && (
          <View style={styles.pointsSection}>
            <Text style={styles.pointsTitle}>Puntos Clave</Text>
            {section.points.map((point: string, index: number) => (
              <View key={index} style={styles.pointItem}>
                <View style={styles.pointBullet}>
                  <Text style={styles.pointBulletText}>{index + 1}</Text>
                </View>
                <Text style={styles.pointText}>{point}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Tips if available */}
        {section.tips && Array.isArray(section.tips) && (
          <View style={styles.tipsSection}>
            <Text style={styles.tipsTitle}>💡 Consejos</Text>
            {section.tips.map((tip: string, index: number) => (
              <View key={index} style={styles.tipItem}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Example if available */}
        {section.example && (
          <View style={styles.exampleSection}>
            <Text style={styles.exampleTitle}>📝 Ejemplo</Text>
            <View style={styles.exampleBox}>
              <Text style={styles.exampleText}>{section.example}</Text>
            </View>
          </View>
        )}

        {/* Video if available */}
        {section.video_url && (
          <TouchableOpacity 
            style={styles.videoSection}
            onPress={() => Linking.openURL(section.video_url)}
          >
            <View style={styles.videoIconContainer}>
              <Ionicons name="logo-youtube" size={32} color="#FF0000" />
            </View>
            <View style={styles.videoInfo}>
              <Text style={styles.videoTitle}>🎬 Ver Video Explicativo</Text>
              {section.video_title && (
                <Text style={styles.videoSubtitle}>{section.video_title}</Text>
              )}
            </View>
            <Ionicons name="open-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        {/* Back Button */}
        <TouchableOpacity 
          style={styles.bottomBackButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={20} color="#3B82F6" />
          <Text style={styles.bottomBackButtonText}>Volver al Reto</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    paddingTop: 10,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  iconSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  contentText: {
    fontSize: 16,
    color: '#E5E7EB',
    lineHeight: 26,
  },
  pointsSection: {
    marginBottom: 20,
  },
  pointsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  pointItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    gap: 12,
  },
  pointBullet: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pointBulletText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  pointText: {
    flex: 1,
    fontSize: 15,
    color: '#D1D5DB',
    lineHeight: 22,
  },
  tipsSection: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10B981',
    marginBottom: 16,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 10,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 20,
  },
  exampleSection: {
    marginBottom: 20,
  },
  exampleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  exampleBox: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#8B5CF6',
  },
  exampleText: {
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  bottomBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 10,
  },
  bottomBackButtonText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '600',
  },
});
