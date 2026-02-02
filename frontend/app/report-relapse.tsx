import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { authenticatedFetch } from '../utils/api';

const COMMON_TRIGGERS = [
  'Estrés',
  'Ansiedad',
  'Depresión',
  'Soledad',
  'Problemas familiares',
  'Problemas laborales',
  'Presión social',
  'Celebración',
  'Aburrimiento',
  'Dolor físico',
  'Insomnio',
  'Otro',
];

export default function ReportRelapseScreen() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  
  // Form data
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [substance, setSubstance] = useState('');
  const [trigger, setTrigger] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const response = await authenticatedFetch('/api/patient/report-relapse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          substance: substance || null,
          trigger: trigger || null,
          notes: notes || null,
        }),
      });

      if (response.ok) {
        Alert.alert(
          'Recaída Registrada',
          'Gracias por tu honestidad. Recuerda que una recaída no borra tu progreso. Tu contador se ha reiniciado. Si tienes un terapeuta vinculado, será notificado para apoyarte.',
          [
            {
              text: 'Entendido',
              onPress: () => router.replace('/(tabs)/home'),
            },
          ]
        );
      } else {
        const data = await response.json();
        Alert.alert('Error', data.detail || 'No se pudo registrar la recaída');
      }
    } catch (err) {
      Alert.alert('Error', 'Error de conexión');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmSubmit = () => {
    Alert.alert(
      '¿Confirmar registro?',
      'Al confirmar, tu contador de días limpios se reiniciará a partir de esta fecha. Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Confirmar', style: 'destructive', onPress: handleSubmit },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reportar Recaída</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Support Message */}
        <View style={styles.supportCard}>
          <LinearGradient
            colors={['#FEE2E2', '#FECACA']}
            style={styles.supportGradient}
          >
            <Ionicons name="heart" size={32} color="#DC2626" />
            <Text style={styles.supportTitle}>Estamos contigo</Text>
            <Text style={styles.supportText}>
              Una recaída no define tu recuperación. Lo importante es que estás aquí, siendo honesto/a contigo mismo/a. Cada día es una nueva oportunidad.
            </Text>
          </LinearGradient>
        </View>

        {/* Form */}
        <View style={styles.formContainer}>
          {/* Date */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>¿Cuándo ocurrió?</Text>
            {Platform.OS === 'web' ? (
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{
                  padding: '14px 16px',
                  fontSize: '16px',
                  borderRadius: '12px',
                  border: '1px solid #E5E7EB',
                  backgroundColor: '#FFFFFF',
                  width: '100%',
                  color: '#1F2937',
                }}
              />
            ) : (
              <View style={styles.dateDisplay}>
                <Ionicons name="calendar" size={20} color="#6B7280" />
                <Text style={styles.dateText}>{date}</Text>
              </View>
            )}
          </View>

          {/* Substance */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Sustancia (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Alcohol, Cannabis, etc."
              placeholderTextColor="#9CA3AF"
              value={substance}
              onChangeText={setSubstance}
            />
          </View>

          {/* Trigger */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>¿Qué lo provocó? (opcional)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.triggersScroll}>
              <View style={styles.triggersContainer}>
                {COMMON_TRIGGERS.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.triggerChip, trigger === t && styles.triggerChipSelected]}
                    onPress={() => setTrigger(trigger === t ? '' : t)}
                  >
                    <Text style={[styles.triggerChipText, trigger === t && styles.triggerChipTextSelected]}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            {trigger === 'Otro' && (
              <TextInput
                style={[styles.input, { marginTop: 12 }]}
                placeholder="Describe el trigger..."
                placeholderTextColor="#9CA3AF"
                value={trigger === 'Otro' ? '' : trigger}
                onChangeText={(text) => setTrigger(text || 'Otro')}
              />
            )}
          </View>

          {/* Notes */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Notas adicionales (opcional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="¿Hay algo más que quieras registrar sobre esta experiencia?"
              placeholderTextColor="#9CA3AF"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Warning */}
        <View style={styles.warningCard}>
          <Ionicons name="information-circle" size={24} color="#D97706" />
          <View style={styles.warningContent}>
            <Text style={styles.warningTitle}>Importante</Text>
            <Text style={styles.warningText}>
              Al registrar esta recaída, tu contador de días limpios se reiniciará. 
              Si tienes un terapeuta vinculado, recibirá una alerta para poder apoyarte.
            </Text>
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={styles.submitButton}
          onPress={confirmSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>Registrar y Continuar</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Help Resources */}
        <View style={styles.helpCard}>
          <Text style={styles.helpTitle}>¿Necesitas hablar con alguien?</Text>
          <TouchableOpacity style={styles.helpButton}>
            <Ionicons name="call" size={20} color="#10B981" />
            <Text style={styles.helpButtonText}>Línea de Ayuda: 1412</Text>
          </TouchableOpacity>
        </View>
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
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  supportCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  supportGradient: {
    padding: 24,
    alignItems: 'center',
  },
  supportTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#DC2626',
    marginTop: 12,
  },
  supportText: {
    fontSize: 14,
    color: '#7F1D1D',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#1F2937',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  dateText: {
    fontSize: 16,
    color: '#1F2937',
  },
  triggersScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  triggersContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 20,
  },
  triggerChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  triggerChipSelected: {
    backgroundColor: '#FEE2E2',
    borderColor: '#DC2626',
  },
  triggerChipText: {
    fontSize: 14,
    color: '#6B7280',
  },
  triggerChipTextSelected: {
    color: '#DC2626',
    fontWeight: '500',
  },
  warningCard: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
  },
  warningText: {
    fontSize: 13,
    color: '#92400E',
    marginTop: 4,
    lineHeight: 18,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 24,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  helpCard: {
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  helpTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#065F46',
    marginBottom: 12,
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  helpButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#10B981',
  },
});
