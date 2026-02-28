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
import { SafeAreaView } from 'react-native-safe-area-context';
import { authenticatedFetch, getBackendURL } from '../../utils/api';
import { theme, MOOD_EMOJIS, getMoodEmoji, getMoodColor } from '../../utils/theme';
import { WeekSelector, MonthCalendar, FilterChips } from '../../components/Calendar';

const BACKEND_URL = getBackendURL();

const EMOTION_TAGS = [
  'Calma', 'Ansiedad', 'Felicidad', 'Tristeza', 'Enojo', 'Miedo',
  'Esperanza', 'Frustración', 'Gratitud', 'Culpa', 'Motivación', 'Soledad'
];

const MOOD_FILTERS = [
  { key: 'all', label: 'Todos' },
  { key: 'high', label: 'Alto (7-10)' },
  { key: 'medium', label: 'Medio (4-6)' },
  { key: 'low', label: 'Bajo (1-3)' },
];

export default function EmotionalScreen() {
  const [logs, setLogs] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMood, setSelectedMood] = useState(5);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [moodFilter, setMoodFilter] = useState('all');
  const [moodHistory, setMoodHistory] = useState<any>({});

  useEffect(() => {
    loadLogs();
    loadHistory();
  }, [selectedDate]);

  const loadLogs = async () => {
    try {
      const response = await authenticatedFetch(`${BACKEND_URL}/api/emotional/logs`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data);
      }
    } catch (error) {
      console.error('Failed to load logs:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const loadHistory = async () => {
    try {
      const response = await authenticatedFetch(`${BACKEND_URL}/api/emotional/history`);
      if (response.ok) {
        const data = await response.json();
        const historyMap: any = {};
        data.forEach((entry: any) => {
          const dateKey = entry.date || entry.created_at?.split('T')[0];
          if (dateKey) {
            historyMap[dateKey] = {
              mood: entry.mood,
              emoji: getMoodEmoji(entry.mood),
              color: getMoodColor(entry.mood),
            };
          }
        });
        setMoodHistory(historyMap);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  };

  const saveLog = async () => {
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const response = await authenticatedFetch(`${BACKEND_URL}/api/emotional/log`, {
        method: 'POST',
        body: JSON.stringify({
          mood: selectedMood,
          emotions: selectedTags,
          note: note,
          date: dateStr,
        }),
      });

      if (response.ok) {
        setSelectedMood(5);
        setSelectedTags([]);
        setNote('');
        setModalVisible(false);
        loadLogs();
        loadHistory();
      }
    } catch (error) {
      console.error('Failed to save log:', error);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  // Get today's log if exists
  const todayKey = selectedDate.toISOString().split('T')[0];
  const todayLog = logs.find(log => {
    const logDate = log.created_at?.split('T')[0];
    return logDate === todayKey;
  });

  // Calculate average mood for the week
  const weekAverage = logs.length > 0 
    ? Math.round(logs.reduce((acc, log) => acc + log.mood, 0) / logs.length * 10) / 10
    : 0;

  const formatDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    
    if (compareDate.getTime() === today.getTime()) return 'Hoy';
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (compareDate.getTime() === yesterday.getTime()) return 'Ayer';
    
    return `${date.getDate()} ${['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][date.getMonth()]}`;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  const filteredLogs = logs.filter(log => {
    if (moodFilter === 'high' && log.mood < 7) return false;
    if (moodFilter === 'medium' && (log.mood < 4 || log.mood > 6)) return false;
    if (moodFilter === 'low' && log.mood > 3) return false;
    return true;
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Emociones</Text>
          <Text style={styles.headerSubtitle}>{formatDate(selectedDate)}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.calendarButton}
            onPress={() => setShowCalendar(!showCalendar)}
          >
            <Ionicons name="calendar-outline" size={22} color={theme.text.primary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="add" size={24} color={theme.text.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={() => { setRefreshing(true); loadLogs(); loadHistory(); }}
            tintColor={theme.accent.primary}
          />
        }
      >
        {/* Week Selector */}
        <WeekSelector
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          markedDates={moodHistory}
        />

        {/* Calendar (expandable) */}
        {showCalendar && (
          <MonthCalendar
            selectedDate={selectedDate}
            onDateSelect={(date) => {
              setSelectedDate(date);
              setShowCalendar(false);
            }}
            markedDates={moodHistory}
          />
        )}

        {/* Today's Mood Card */}
        <View style={styles.todayCard}>
          <View style={styles.todayHeader}>
            <Text style={styles.todayTitle}>Estado de hoy</Text>
            {todayLog && (
              <View style={[styles.moodBadge, { backgroundColor: getMoodColor(todayLog.mood) }]}>
                <Text style={styles.moodBadgeText}>{todayLog.mood}/10</Text>
              </View>
            )}
          </View>
          
          {todayLog ? (
            <View style={styles.todayContent}>
              <Text style={styles.todayEmoji}>{getMoodEmoji(todayLog.mood)}</Text>
              <View style={styles.todayInfo}>
                <Text style={styles.todayMoodLabel}>
                  {MOOD_EMOJIS.find(m => m.value === todayLog.mood)?.label || 'Neutral'}
                </Text>
                {todayLog.emotions?.length > 0 && (
                  <View style={styles.todayTags}>
                    {todayLog.emotions.slice(0, 3).map((tag: string) => (
                      <View key={tag} style={styles.todayTag}>
                        <Text style={styles.todayTagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.addMoodButton}
              onPress={() => setModalVisible(true)}
            >
              <Ionicons name="add-circle-outline" size={24} color={theme.accent.primary} />
              <Text style={styles.addMoodText}>Registrar estado de ánimo</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Stats Card */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{weekAverage || '-'}</Text>
            <Text style={styles.statLabel}>Promedio</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{logs.length}</Text>
            <Text style={styles.statLabel}>Registros</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{Object.keys(moodHistory).length}</Text>
            <Text style={styles.statLabel}>Días</Text>
          </View>
        </View>

        {/* Filters */}
        <View style={styles.filtersSection}>
          <Text style={styles.filterLabel}>Filtrar por nivel</Text>
          <FilterChips
            filters={MOOD_FILTERS}
            selected={moodFilter}
            onSelect={setMoodFilter}
            accentColor={theme.accent.purple}
          />
        </View>

        {/* History */}
        <Text style={styles.sectionTitle}>Historial Reciente</Text>
        <View style={styles.logsList}>
          {filteredLogs.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="heart-outline" size={48} color={theme.accent.purple} />
              </View>
              <Text style={styles.emptyTitle}>Sin registros</Text>
              <Text style={styles.emptyText}>
                Toca "+" para registrar cómo te sientes
              </Text>
            </View>
          ) : (
            filteredLogs.slice(0, 10).map((log, index) => (
              <View key={log.log_id || index} style={styles.logCard}>
                <View style={styles.logLeft}>
                  <Text style={styles.logEmoji}>{getMoodEmoji(log.mood)}</Text>
                  <View style={styles.logInfo}>
                    <Text style={styles.logMood}>
                      {MOOD_EMOJIS.find(m => m.value === log.mood)?.label}
                    </Text>
                    <Text style={styles.logTime}>
                      {log.created_at ? formatTime(log.created_at) : 'Hoy'}
                    </Text>
                  </View>
                </View>
                <View style={[styles.moodIndicator, { backgroundColor: getMoodColor(log.mood) }]}>
                  <Text style={styles.moodIndicatorText}>{log.mood}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

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
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>¿Cómo te sientes?</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={24} color={theme.text.secondary} />
                </TouchableOpacity>
              </View>

              {/* Mood Slider */}
              <View style={styles.moodSelector}>
                <Text style={styles.selectedMoodEmoji}>{getMoodEmoji(selectedMood)}</Text>
                <Text style={styles.selectedMoodLabel}>
                  {MOOD_EMOJIS.find(m => m.value === selectedMood)?.label}
                </Text>
                <Text style={styles.selectedMoodValue}>{selectedMood}/10</Text>
              </View>

              <View style={styles.moodGrid}>
                {MOOD_EMOJIS.map((mood) => (
                  <TouchableOpacity
                    key={mood.value}
                    style={[
                      styles.moodOption,
                      selectedMood === mood.value && styles.moodOptionSelected,
                    ]}
                    onPress={() => setSelectedMood(mood.value)}
                  >
                    <Text style={styles.moodOptionEmoji}>{mood.emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Tags */}
              <Text style={styles.sectionLabel}>Emociones (opcional)</Text>
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
                    <Text style={[
                      styles.tagText,
                      selectedTags.includes(tag) && styles.tagTextSelected,
                    ]}>
                      {tag}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Note */}
              <Text style={styles.sectionLabel}>Nota (opcional)</Text>
              <TextInput
                style={styles.noteInput}
                placeholder="¿Qué sucedió? ¿Qué lo gatilló?"
                placeholderTextColor={theme.text.muted}
                value={note}
                onChangeText={setNote}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              <TouchableOpacity style={styles.saveButton} onPress={saveLog}>
                <Text style={styles.saveButtonText}>Guardar Registro</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.text.primary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: theme.text.secondary,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  calendarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.accent.purple,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  todayCard: {
    backgroundColor: theme.background.secondary,
    borderRadius: theme.radius.lg,
    padding: 20,
    marginBottom: 16,
  },
  todayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  todayTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text.primary,
  },
  moodBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  moodBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text.primary,
  },
  todayContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  todayEmoji: {
    fontSize: 48,
    marginRight: 16,
  },
  todayInfo: {
    flex: 1,
  },
  todayMoodLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text.primary,
    marginBottom: 8,
  },
  todayTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  todayTag: {
    backgroundColor: theme.background.tertiary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  todayTagText: {
    fontSize: 12,
    color: theme.text.secondary,
  },
  addMoodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  addMoodText: {
    fontSize: 15,
    color: theme.accent.primary,
    fontWeight: '500',
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: theme.background.secondary,
    borderRadius: theme.radius.lg,
    padding: 20,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.text.primary,
  },
  statLabel: {
    fontSize: 12,
    color: theme.text.secondary,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: theme.border.primary,
    marginHorizontal: 16,
  },
  filtersSection: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.text.secondary,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text.primary,
    marginBottom: 12,
    marginLeft: 4,
  },
  logsList: {
    gap: 8,
  },
  logCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.background.secondary,
    borderRadius: theme.radius.md,
    padding: 16,
  },
  logLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  logInfo: {
    gap: 2,
  },
  logMood: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.text.primary,
  },
  logTime: {
    fontSize: 12,
    color: theme.text.muted,
  },
  moodIndicator: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moodIndicatorText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text.primary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text.primary,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: theme.text.secondary,
    textAlign: 'center',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalScroll: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.background.secondary,
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
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.text.primary,
  },
  moodSelector: {
    alignItems: 'center',
    marginBottom: 20,
  },
  selectedMoodEmoji: {
    fontSize: 64,
    marginBottom: 8,
  },
  selectedMoodLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text.primary,
    marginBottom: 4,
  },
  selectedMoodValue: {
    fontSize: 14,
    color: theme.text.secondary,
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  moodOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moodOptionSelected: {
    backgroundColor: theme.accent.purple,
  },
  moodOptionEmoji: {
    fontSize: 24,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text.secondary,
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  tagOption: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: theme.background.tertiary,
    borderWidth: 1,
    borderColor: theme.border.primary,
  },
  tagSelected: {
    backgroundColor: theme.accent.purple,
    borderColor: theme.accent.purple,
  },
  tagText: {
    fontSize: 13,
    color: theme.text.secondary,
  },
  tagTextSelected: {
    color: theme.text.primary,
    fontWeight: '500',
  },
  noteInput: {
    backgroundColor: theme.background.tertiary,
    borderRadius: theme.radius.md,
    padding: 16,
    fontSize: 15,
    color: theme.text.primary,
    minHeight: 80,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.border.primary,
  },
  saveButton: {
    backgroundColor: theme.accent.purple,
    borderRadius: theme.radius.md,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text.primary,
  },
});
