import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authenticatedFetch, getBackendURL } from '../../utils/api';
import BottomNavigation from '../../components/BottomNavigation';

const BACKEND_URL = getBackendURL();

const AREAS = [
  { key: 'health', label: 'Salud Física', icon: 'fitness', color: '#10B981' },
  { key: 'relationships', label: 'Relaciones', icon: 'people', color: '#3B82F6' },
  { key: 'work', label: 'Trabajo/Carrera', icon: 'briefcase', color: '#8B5CF6' },
  { key: 'personal', label: 'Desarrollo Personal', icon: 'school', color: '#EC4899' },
  { key: 'spiritual', label: 'Espiritualidad', icon: 'sparkles', color: '#F59E0B' },
  { key: 'finances', label: 'Finanzas', icon: 'cash', color: '#EF4444' },
];

export default function WeeklyCheckin() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [ratings, setRatings] = useState<{ [key: string]: number }>({});
  const [achievements, setAchievements] = useState('');
  const [challenges, setChallenges] = useState('');
  const [nextWeekPlan, setNextWeekPlan] = useState('');
  const [saving, setSaving] = useState(false);

  const getWeekStart = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    return monday.toISOString().split('T')[0];
  };

  const handleRating = (areaKey: string, rating: number) => {
    setRatings({ ...ratings, [areaKey]: rating });
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const checkinData = {
        week_start: getWeekStart(),
        area_ratings: ratings,
        achievements: achievements.split('\n').filter((a) => a.trim()),
        challenges: challenges.split('\n').filter((c) => c.trim()),
        next_week_plan: nextWeekPlan,
      };

      const response = await authenticatedFetch(`${BACKEND_URL}/api/purpose/checkins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkinData),
      });

      if (response.ok) {
        Alert.alert(
          '¡Check-in completado!',
          'Tu progreso semanal ha sido guardado.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        Alert.alert('Error', 'No se pudo guardar el check-in');
      }
    } catch (error) {
      Alert.alert('Error', 'Hubo un problema al guardar');
    } finally {
      setSaving(false);
    }
  };

  const renderRatingsStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>¿Cómo te fue esta semana?</Text>
      <Text style={styles.stepSubtitle}>
        Califica cada área del 1 al 10 según cómo te sentiste
      </Text>

      {AREAS.map((area) => (
        <View key={area.key} style={styles.areaRating}>
          <View style={styles.areaHeader}>
            <View style={[styles.areaIcon, { backgroundColor: area.color + '20' }]}>
              <Ionicons name={area.icon as any} size={20} color={area.color} />
            </View>
            <Text style={styles.areaLabel}>{area.label}</Text>
            <Text style={[styles.ratingValue, { color: area.color }]}>
              {ratings[area.key] || '-'}
            </Text>
          </View>
          <View style={styles.ratingSlider}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
              <TouchableOpacity
                key={num}
                style={[
                  styles.ratingDot,
                  (ratings[area.key] || 0) >= num && {
                    backgroundColor: area.color,
                  },
                ]}
                onPress={() => handleRating(area.key, num)}
              />
            ))}
          </View>
        </View>
      ))}
    </View>
  );

  const renderAchievementsStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>🎉 Logros de la semana</Text>
      <Text style={styles.stepSubtitle}>
        ¿Qué lograste esta semana? (un logro por línea)
      </Text>
      <TextInput
        style={styles.textArea}
        placeholder="Ej: Hice ejercicio 3 veces\nLlamé a mi familia\nAsistí a una reunión de grupo"
              placeholderTextColor="#9CA3AF"
        value={achievements}
        onChangeText={setAchievements}
        multiline
        numberOfLines={6}
        textAlignVertical="top"
      />
    </View>
  );

  const renderChallengesStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>💪 Desafíos enfrentados</Text>
      <Text style={styles.stepSubtitle}>
        ¿Qué dificultades encontraste? (una por línea)
      </Text>
      <TextInput
        style={styles.textArea}
        placeholder="Ej: Ansiedad el martes\nDificultad para dormir\nTentación de usar"
              placeholderTextColor="#9CA3AF"
        value={challenges}
        onChangeText={setChallenges}
        multiline
        numberOfLines={6}
        textAlignVertical="top"
      />
    </View>
  );

  const renderPlanStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>🎯 Plan para la próxima semana</Text>
      <Text style={styles.stepSubtitle}>
        ¿Qué quieres lograr la semana que viene?
      </Text>
      <TextInput
        style={styles.textArea}
        placeholder="Escribe tu plan para la próxima semana..."
              placeholderTextColor="#9CA3AF"
        value={nextWeekPlan}
        onChangeText={setNextWeekPlan}
        multiline
        numberOfLines={6}
        textAlignVertical="top"
      />
    </View>
  );

  const steps = [
    { render: renderRatingsStep, title: 'Calificación' },
    { render: renderAchievementsStep, title: 'Logros' },
    { render: renderChallengesStep, title: 'Desafíos' },
    { render: renderPlanStep, title: 'Plan' },
  ];

  const canProceed = () => {
    if (step === 0) return Object.keys(ratings).length === AREAS.length;
    return true;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={['#10B981', '#059669']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Check-in Semanal</Text>
        <Text style={styles.headerSubtitle}>
          Semana del {getWeekStart()}
        </Text>
      </LinearGradient>

      {/* Progress Indicators */}
      <View style={styles.progressContainer}>
        {steps.map((s, i) => (
          <View key={i} style={styles.progressStep}>
            <View
              style={[
                styles.progressDot,
                i <= step && styles.progressDotActive,
              ]}
            >
              {i < step ? (
                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
              ) : (
                <Text style={[styles.progressNumber, i <= step && styles.progressNumberActive]}>
                  {i + 1}
                </Text>
              )}
            </View>
            <Text style={[styles.progressLabel, i <= step && styles.progressLabelActive]}>
              {s.title}
            </Text>
          </View>
        ))}
      </View>

      <ScrollView style={styles.content}>
        {steps[step].render()}
      </ScrollView>

      {/* Navigation Buttons */}
      <View style={styles.navigationContainer}>
        {step > 0 && (
          <TouchableOpacity
            style={styles.navButtonSecondary}
            onPress={() => setStep(step - 1)}
          >
            <Ionicons name="arrow-back" size={20} color="#6B7280" />
            <Text style={styles.navButtonSecondaryText}>Anterior</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[
            styles.navButtonPrimary,
            !canProceed() && styles.navButtonDisabled,
          ]}
          onPress={() => {
            if (step < steps.length - 1) {
              setStep(step + 1);
            } else {
              handleSubmit();
            }
          }}
          disabled={!canProceed() || saving}
        >
          <Text style={styles.navButtonPrimaryText}>
            {step < steps.length - 1 ? 'Siguiente' : saving ? 'Guardando...' : 'Completar'}
          </Text>
          {step < steps.length - 1 && (
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>

      <BottomNavigation />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
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
    color: '#D1FAE5',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#1A1A1A',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  progressStep: {
    alignItems: 'center',
    flex: 1,
  },
  progressDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressDotActive: {
    backgroundColor: '#10B981',
  },
  progressNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  progressNumberActive: {
    color: '#FFFFFF',
  },
  progressLabel: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  progressLabelActive: {
    color: '#10B981',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  stepContent: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    color: '#A1A1AA',
    marginBottom: 24,
    lineHeight: 20,
  },
  areaRating: {
    backgroundColor: '#1A1A1A',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  areaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  areaIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  areaLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  ratingValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  ratingSlider: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ratingDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
  },
  textArea: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2D2D2D',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 150,
    textAlignVertical: 'top',
  },
  navigationContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#1A1A1A',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  navButtonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#0D0D0D',
    gap: 8,
  },
  navButtonSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#A1A1AA',
  },
  navButtonPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#10B981',
    gap: 8,
  },
  navButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  navButtonPrimaryText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
