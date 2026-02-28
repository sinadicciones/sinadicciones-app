import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BarChart } from 'react-native-gifted-charts';
import { format } from 'date-fns';
import { authenticatedFetch, getBackendURL } from '../../utils/api';
import EmotionalInsights from '../../components/EmotionalInsights';

const BACKEND_URL = getBackendURL();

const MOOD_EMOJIS = [
  { value: 1, emoji: '😭', label: 'Muy mal' },
  { value: 2, emoji: '😟', label: 'Mal' },
  { value: 3, emoji: '😔', label: 'Regular bajo' },
  { value: 4, emoji: '😕', label: 'Regular' },
  { value: 5, emoji: '😐', label: 'Neutro' },
  { value: 6, emoji: '🙂', label: 'Bien' },
  { value: 7, emoji: '😊', label: 'Bien +' },
  { value: 8, emoji: '😄', label: 'Muy bien' },
  { value: 9, emoji: '😁', label: 'Excelente' },
  { value: 10, emoji: '🤩', label: 'Increíble' },
];

const EMOTION_TAGS = [
  'ansiedad',
  'ira',
  'vacío',
  'tristeza',
  'paz',
  'motivación',
  'orgullo',
  'gratitud',
  'esperanza',
  'miedo',
];

export default function EmotionalScreen() {
  const [logs, setLogs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMood, setSelectedMood] = useState(5);
  const [note, setNote] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showInsights, setShowInsights] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load emotional logs
      const logsResponse = await authenticatedFetch(`${BACKEND_URL}/api/emotional-logs`);
      if (logsResponse.ok) {
        setLogs(await logsResponse.json());
      }

      // Load stats
      const statsResponse = await authenticatedFetch(`${BACKEND_URL}/api/emotional-logs/stats`);
      if (statsResponse.ok) {
        setStats(await statsResponse.json());
      }
    } catch (error) {
      console.error('Failed to load emotional data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const saveLog = async () => {
    try {
      await authenticatedFetch(`${BACKEND_URL}/api/emotional-logs`, {
        method: 'POST',
        body: JSON.stringify({
          mood_scale: selectedMood,
          note: note,
          tags: selectedTags,
        }),
      });

      setModalVisible(false);
      setNote('');
      setSelectedTags([]);
      setSelectedMood(5);
      loadData();
    } catch (error) {
      console.error('Failed to save emotional log:', error);
    }
  };

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const getMoodColor = (mood: number) => {
    if (mood <= 3) return '#EF4444';
    if (mood <= 5) return '#F59E0B';
    if (mood <= 7) return '#3B82F6';
    return '#10B981';
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#EC4899', '#8B5CF6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Estado Emocional</Text>
            <Text style={styles.headerSubtitle}>Monitorea cómo te sientes</Text>
          </View>
          <TouchableOpacity 
            style={styles.insightsBtn}
            onPress={() => setShowInsights(true)}
          >
            <Ionicons name="analytics" size={20} color="#EC4899" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Insights Button Card */}
      <TouchableOpacity 
        style={styles.insightsCard}
        onPress={() => setShowInsights(true)}
      >
        <Ionicons name="sparkles" size={20} color="#EC4899" />
        <View style={styles.insightsCardContent}>
          <Text style={styles.insightsCardTitle}>💭 Análisis Emocional</Text>
          <Text style={styles.insightsCardSubtitle}>Patrones y bienestar con IA</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#EC4899" />
      </TouchableOpacity>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} />}
      >
        {/* Stats Card */}
        {stats && (
          <View style={styles.statsCard}>
            <View style={styles.statRow}>
              <View style={styles.stat}>
                <Text style={styles.statNumber}>{stats.average_mood}</Text>
                <Text style={styles.statLabel}>Promedio</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statNumber}>{stats.total_logs}</Text>
                <Text style={styles.statLabel}>Registros</Text>
              </View>
            </View>

            {stats.recent_logs && stats.recent_logs.length > 0 && (
              <View style={styles.chartContainer}>
                <Text style={styles.chartTitle}>Últimos 7 días</Text>
                <BarChart
                  data={stats.recent_logs.map((log: any) => ({
                    value: log.mood_scale,
                    frontColor: getMoodColor(log.mood_scale),
                  }))}
                  barWidth={32}
                  spacing={20}
                  roundedTop
                  hideRules
                  xAxisThickness={0}
                  yAxisThickness={0}
                  yAxisTextStyle={{ color: '#A1A1AA' }}
                  noOfSections={5}
                  maxValue={10}
                />
              </View>
            )}
          </View>
        )}

        {/* Recent Logs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Historial</Text>
          {logs.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="heart-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyText}>Aún no has registrado tus emociones</Text>
            </View>
          ) : (
            logs.slice(0, 10).map((log) => {
              const moodValue = log.mood_scale || log.mood || 0;
              console.log('Rendering log:', log.log_id, 'mood:', moodValue, 'emoji:', MOOD_EMOJIS[moodValue - 1]?.emoji);
              return (
              <View key={log.log_id} style={styles.logCard}>
                <View style={styles.logHeader}>
                  <Text style={styles.logMood}>
                    {MOOD_EMOJIS[moodValue - 1]?.emoji} {moodValue}/10
                  </Text>
                  <Text style={styles.logDate}>{log.date}</Text>
                </View>
                {log.note && <Text style={styles.logNote}>{log.note}</Text>}
                {(log.tags || log.emotions) && (log.tags || log.emotions).length > 0 && (
                  <View style={styles.logTags}>
                    {(log.tags || log.emotions).map((tag: string) => (
                      <View key={tag} style={styles.tag}>
                        <Text style={styles.tagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )})
          )}
        </View>
      </ScrollView>

      {/* Floating Add Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Add Log Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>¿Cómo te sientes?</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {/* Mood Selector */}
              <View style={styles.moodSelector}>
                {MOOD_EMOJIS.map((mood) => (
                  <TouchableOpacity
                    key={mood.value}
                    style={[
                      styles.moodOption,
                      selectedMood === mood.value && styles.moodSelected,
                    ]}
                    onPress={() => setSelectedMood(mood.value)}
                  >
                    <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                    <Text style={styles.moodValue}>{mood.value}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Tags */}
              <Text style={styles.tagsLabel}>Emociones (opcional)</Text>
              <View style={styles.tagsContainer}>
                {EMOTION_TAGS.map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    style={[
                      styles.tagOption,
                      selectedTags.includes(tag) && styles.tagSelected,
                    ]}
                    onPress={() => toggleTag(tag)}
                  >
                    <Text
                      style={[
                        styles.tagOptionText,
                        selectedTags.includes(tag) && styles.tagSelectedText,
                      ]}
                    >
                      {tag}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Note */}
              <TextInput
                style={styles.noteInput}
                placeholder="¿Qué sucedió? ¿Qué lo gatilló? (opcional)"
                placeholderTextColor="#9CA3AF"
                value={note}
                onChangeText={setNote}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <TouchableOpacity style={styles.saveButton} onPress={saveLog}>
                <Text style={styles.saveButtonText}>Guardar Registro</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal de Insights */}
      <Modal
        visible={showInsights}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowInsights(false)}
      >
        <View style={styles.insightsModal}>
          <View style={styles.insightsModalHeader}>
            <Text style={styles.insightsModalTitle}>💭 Análisis Emocional</Text>
            <TouchableOpacity onPress={() => setShowInsights(false)}>
              <Ionicons name="close" size={28} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <EmotionalInsights onClose={() => setShowInsights(false)} />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  insightsBtn: {
    backgroundColor: '#1A1A1A',
    padding: 8,
    borderRadius: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#FAE8FF',
    marginTop: 2,
  },
  // Insights Card Styles
  insightsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FCE7F3',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 12,
  },
  insightsCardContent: {
    flex: 1,
  },
  insightsCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#BE185D',
  },
  insightsCardSubtitle: {
    fontSize: 12,
    color: '#EC4899',
    marginTop: 2,
  },
  // Modal Styles
  insightsModal: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  insightsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#1A1A1A',
    borderBottomWidth: 1,
    borderBottomColor: '#2D2D2D',
  },
  insightsModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  statsCard: {
    backgroundColor: '#1A1A1A',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  stat: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#EC4899',
  },
  statLabel: {
    fontSize: 14,
    color: '#A1A1AA',
    marginTop: 4,
  },
  chartContainer: {
    marginTop: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    padding: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#A1A1AA',
    marginTop: 12,
    textAlign: 'center',
  },
  logCard: {
    backgroundColor: '#1A1A1A',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  logMood: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  logDate: {
    fontSize: 14,
    color: '#A1A1AA',
  },
  logNote: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 8,
  },
  logTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 12,
    color: '#A1A1AA',
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EC4899',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'android' ? 40 : 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  moodSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
  },
  moodOption: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  moodSelected: {
    borderColor: '#EC4899',
    backgroundColor: '#FCE7F3',
  },
  moodEmoji: {
    fontSize: 32,
  },
  moodValue: {
    fontSize: 12,
    color: '#A1A1AA',
    marginTop: 4,
  },
  tagsLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  tagOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  tagSelected: {
    backgroundColor: '#EC4899',
  },
  tagOptionText: {
    fontSize: 14,
    color: '#A1A1AA',
  },
  tagSelectedText: {
    color: '#FFFFFF',
  },
  noteInput: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    marginBottom: 24,
    minHeight: 100,
  },
  saveButton: {
    backgroundColor: '#EC4899',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});