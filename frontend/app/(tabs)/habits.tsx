import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authenticatedFetch, getBackendURL } from '../../utils/api';
import { theme, STATUS_FILTERS, TIME_FILTERS, DAYS_SHORT } from '../../utils/theme';
import { WeekSelector, MonthCalendar, FilterChips } from '../../components/Calendar';
import HabitsInsights from '../../components/HabitsInsights';

const BACKEND_URL = getBackendURL();

const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899'];

const TIME_OPTIONS = [
  { key: 'anytime', label: 'Cualquier momento', icon: 'time-outline' },
  { key: 'morning', label: 'Mañana', icon: 'sunny-outline' },
  { key: 'afternoon', label: 'Tarde', icon: 'partly-sunny-outline' },
  { key: 'evening', label: 'Noche', icon: 'moon-outline' },
];

export default function HabitsScreen() {
  const [habits, setHabits] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [habitName, setHabitName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [selectedTime, setSelectedTime] = useState('anytime');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all');
  const [showCalendar, setShowCalendar] = useState(false);
  const [habitHistory, setHabitHistory] = useState<any>({});

  useEffect(() => {
    loadHabits();
    loadHistory();
  }, [selectedDate]);

  const loadHabits = async () => {
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const response = await authenticatedFetch(`${BACKEND_URL}/api/habits?date=${dateStr}`);
      if (response.ok) {
        const data = await response.json();
        setHabits(data);
      }
    } catch (error) {
      console.error('Failed to load habits:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const loadHistory = async () => {
    try {
      const response = await authenticatedFetch(`${BACKEND_URL}/api/habits/history`);
      if (response.ok) {
        const data = await response.json();
        const historyMap: any = {};
        data.forEach((entry: any) => {
          historyMap[entry.date] = { completed: entry.completed_count > 0, color: theme.accent.primary };
        });
        setHabitHistory(historyMap);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  };

  const createHabit = async () => {
    if (!habitName.trim()) {
      Alert.alert('Error', 'Por favor ingresa un nombre para el hábito');
      return;
    }

    try {
      const response = await authenticatedFetch(`${BACKEND_URL}/api/habits`, {
        method: 'POST',
        body: JSON.stringify({
          name: habitName,
          color: selectedColor,
          frequency: 'daily',
          time_of_day: selectedTime,
        }),
      });

      if (response.ok) {
        setHabitName('');
        setSelectedColor(COLORS[0]);
        setSelectedTime('anytime');
        setModalVisible(false);
        loadHabits();
      }
    } catch (error) {
      console.error('Failed to create habit:', error);
      Alert.alert('Error', 'No se pudo crear el hábito');
    }
  };

  const toggleHabit = async (habitId: string, currentStatus: boolean) => {
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      await authenticatedFetch(`${BACKEND_URL}/api/habits/${habitId}/log`, {
        method: 'POST',
        body: JSON.stringify({ completed: !currentStatus, date: dateStr }),
      });
      loadHabits();
      loadHistory();
    } catch (error) {
      console.error('Failed to toggle habit:', error);
    }
  };

  const deleteHabit = async (habitId: string, habitName: string) => {
    Alert.alert(
      'Eliminar hábito',
      `¿Estás seguro de eliminar "${habitName}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await authenticatedFetch(`${BACKEND_URL}/api/habits/${habitId}`, {
                method: 'DELETE',
              });
              loadHabits();
            } catch (error) {
              console.error('Failed to delete habit:', error);
            }
          },
        },
      ]
    );
  };

  const filteredHabits = habits.filter(habit => {
    if (statusFilter === 'completed' && !habit.completed_today) return false;
    if (statusFilter === 'pending' && habit.completed_today) return false;
    if (timeFilter !== 'all' && habit.time_of_day !== timeFilter) return false;
    return true;
  });

  const completedCount = habits.filter(h => h.completed_today).length;
  const totalCount = habits.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Mis Hábitos</Text>
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
            onRefresh={() => { setRefreshing(true); loadHabits(); }}
            tintColor={theme.accent.primary}
          />
        }
      >
        {/* Week Selector */}
        <WeekSelector
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          markedDates={habitHistory}
        />

        {/* Calendar (expandable) */}
        {showCalendar && (
          <MonthCalendar
            selectedDate={selectedDate}
            onDateSelect={(date) => {
              setSelectedDate(date);
              setShowCalendar(false);
            }}
            markedDates={habitHistory}
          />
        )}

        {/* Progress Card */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Progreso del día</Text>
            <Text style={styles.progressPercent}>{Math.round(progressPercent)}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {completedCount} de {totalCount} completados
          </Text>
        </View>

        {/* Filters */}
        <View style={styles.filtersSection}>
          <Text style={styles.filterLabel}>Estado</Text>
          <FilterChips
            filters={STATUS_FILTERS}
            selected={statusFilter}
            onSelect={setStatusFilter}
            accentColor={theme.accent.primary}
          />
          
          <Text style={styles.filterLabel}>Momento del día</Text>
          <FilterChips
            filters={TIME_FILTERS}
            selected={timeFilter}
            onSelect={setTimeFilter}
            accentColor={theme.accent.secondary}
          />
        </View>

        {/* Habits List */}
        <View style={styles.habitsList}>
          {filteredHabits.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="leaf-outline" size={48} color={theme.accent.primary} />
              </View>
              <Text style={styles.emptyTitle}>No hay hábitos</Text>
              <Text style={styles.emptyText}>
                Toca "+" para agregar tu primer hábito
              </Text>
            </View>
          ) : (
            filteredHabits.map((habit) => (
              <TouchableOpacity
                key={habit.habit_id}
                style={styles.habitCard}
                onPress={() => toggleHabit(habit.habit_id, habit.completed_today)}
                onLongPress={() => deleteHabit(habit.habit_id, habit.name)}
              >
                <View style={styles.habitLeft}>
                  <View style={[
                    styles.habitCheck,
                    habit.completed_today && { backgroundColor: habit.color || theme.accent.primary }
                  ]}>
                    {habit.completed_today && (
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    )}
                  </View>
                  <View style={styles.habitInfo}>
                    <Text style={[
                      styles.habitName,
                      habit.completed_today && styles.habitNameCompleted
                    ]}>
                      {habit.name}
                    </Text>
                    {habit.streak > 0 && (
                      <View style={styles.streakBadge}>
                        <Text style={styles.streakText}>🔥 {habit.streak} días</Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={styles.habitRight}>
                  {habit.time_of_day && habit.time_of_day !== 'anytime' && (
                    <Ionicons 
                      name={
                        habit.time_of_day === 'morning' ? 'sunny-outline' :
                        habit.time_of_day === 'afternoon' ? 'partly-sunny-outline' : 'moon-outline'
                      } 
                      size={16} 
                      color={theme.text.muted} 
                    />
                  )}
                  <Ionicons name="chevron-forward" size={20} color={theme.text.muted} />
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Add Habit Modal */}
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
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nuevo Hábito</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.text.secondary} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Nombre del hábito"
              placeholderTextColor={theme.text.muted}
              value={habitName}
              onChangeText={setHabitName}
              autoFocus
            />

            <Text style={styles.sectionLabel}>Color</Text>
            <View style={styles.colorPicker}>
              {COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    selectedColor === color && styles.colorSelected,
                  ]}
                  onPress={() => setSelectedColor(color)}
                >
                  {selectedColor === color && (
                    <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionLabel}>Momento del día</Text>
            <View style={styles.timeOptions}>
              {TIME_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.timeOption,
                    selectedTime === option.key && styles.timeOptionSelected,
                  ]}
                  onPress={() => setSelectedTime(option.key)}
                >
                  <Ionicons 
                    name={option.icon as any} 
                    size={20} 
                    color={selectedTime === option.key ? theme.text.primary : theme.text.muted} 
                  />
                  <Text style={[
                    styles.timeOptionText,
                    selectedTime === option.key && styles.timeOptionTextSelected,
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.createButton} onPress={createHabit}>
              <Text style={styles.createButtonText}>Crear Hábito</Text>
            </TouchableOpacity>
          </View>
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
    backgroundColor: theme.accent.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  progressCard: {
    backgroundColor: theme.background.secondary,
    borderRadius: theme.radius.lg,
    padding: 20,
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text.primary,
  },
  progressPercent: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.accent.primary,
  },
  progressBar: {
    height: 8,
    backgroundColor: theme.background.tertiary,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.accent.primary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 13,
    color: theme.text.secondary,
    marginTop: 8,
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
  habitsList: {
    gap: 8,
  },
  habitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.background.secondary,
    borderRadius: theme.radius.md,
    padding: 16,
  },
  habitLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  habitCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: theme.border.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  habitInfo: {
    flex: 1,
  },
  habitName: {
    fontSize: 16,
    color: theme.text.primary,
    fontWeight: '500',
  },
  habitNameCompleted: {
    textDecorationLine: 'line-through',
    color: theme.text.muted,
  },
  streakBadge: {
    marginTop: 4,
  },
  streakText: {
    fontSize: 12,
    color: theme.accent.warning,
  },
  habitRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
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
  modalContent: {
    backgroundColor: theme.background.secondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'android' ? 40 : 24,
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
  input: {
    backgroundColor: theme.background.tertiary,
    borderRadius: theme.radius.md,
    padding: 16,
    fontSize: 16,
    color: theme.text.primary,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.border.primary,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text.secondary,
    marginBottom: 12,
  },
  colorPicker: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  timeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  timeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: theme.radius.md,
    backgroundColor: theme.background.tertiary,
    borderWidth: 1,
    borderColor: theme.border.primary,
  },
  timeOptionSelected: {
    backgroundColor: theme.accent.primary,
    borderColor: theme.accent.primary,
  },
  timeOptionText: {
    fontSize: 13,
    color: theme.text.muted,
  },
  timeOptionTextSelected: {
    color: theme.text.primary,
    fontWeight: '500',
  },
  createButton: {
    backgroundColor: theme.accent.primary,
    borderRadius: theme.radius.md,
    padding: 16,
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text.primary,
  },
});
