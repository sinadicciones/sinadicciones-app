import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authenticatedFetch, getBackendURL } from '../utils/api';

const BACKEND_URL = getBackendURL();

const TABS = [
  { id: 'overview', label: 'Resumen', icon: 'stats-chart' },
  { id: 'tasks', label: 'Tareas', icon: 'checkbox' },
  { id: 'notes', label: 'Notas', icon: 'document-text' },
];

const TASK_CATEGORIES = [
  { id: 'general', label: 'General', icon: 'list' },
  { id: 'mindfulness', label: 'Mindfulness', icon: 'leaf' },
  { id: 'journal', label: 'Diario', icon: 'book' },
  { id: 'reading', label: 'Lectura', icon: 'reader' },
  { id: 'exercise', label: 'Ejercicio', icon: 'fitness' },
];

export default function PatientDetailScreen() {
  const router = useRouter();
  const { patientId, patientName } = useLocalSearchParams();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [report, setReport] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    category: 'general',
    priority: 'medium',
    due_date: '',
  });
  
  const [newNote, setNewNote] = useState({
    session_date: new Date().toISOString().split('T')[0],
    private_notes: '',
    session_summary: '',
    goals_discussed: [] as string[],
    next_session_focus: '',
    mood_rating: 5,
  });
  const [goalInput, setGoalInput] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [reportRes, tasksRes, notesRes] = await Promise.all([
        authenticatedFetch(`${BACKEND_URL}/api/professional/report/${patientId}?days=7`),
        authenticatedFetch(`${BACKEND_URL}/api/professional/tasks/${patientId}`),
        authenticatedFetch(`${BACKEND_URL}/api/professional/notes/${patientId}`),
      ]);

      if (reportRes.ok) setReport(await reportRes.json());
      if (tasksRes.ok) setTasks(await tasksRes.json());
      if (notesRes.ok) setNotes(await notesRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleCreateTask = async () => {
    if (!newTask.title.trim()) {
      Alert.alert('Error', 'Por favor ingresa un título');
      return;
    }
    try {
      const response = await authenticatedFetch(`${BACKEND_URL}/api/professional/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: patientId, ...newTask }),
      });
      if (response.ok) {
        Alert.alert('Éxito', 'Tarea creada');
        setShowTaskModal(false);
        setNewTask({ title: '', description: '', category: 'general', priority: 'medium', due_date: '' });
        fetchData();
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo crear la tarea');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    Alert.alert('Eliminar', '¿Eliminar esta tarea?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await authenticatedFetch(`${BACKEND_URL}/api/professional/tasks/${taskId}`, { method: 'DELETE' });
          fetchData();
        },
      },
    ]);
  };

  const handleCreateNote = async () => {
    if (!newNote.private_notes.trim()) {
      Alert.alert('Error', 'Ingresa las notas de sesión');
      return;
    }
    try {
      const response = await authenticatedFetch(`${BACKEND_URL}/api/professional/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: patientId, ...newNote }),
      });
      if (response.ok) {
        Alert.alert('Éxito', 'Nota guardada');
        setShowNoteModal(false);
        setNewNote({ session_date: new Date().toISOString().split('T')[0], private_notes: '', session_summary: '', goals_discussed: [], next_session_focus: '', mood_rating: 5 });
        fetchData();
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar');
    }
  };

  const addGoal = () => {
    if (goalInput.trim()) {
      setNewNote({ ...newNote, goals_discussed: [...newNote.goals_discussed, goalInput.trim()] });
      setGoalInput('');
    }
  };

  const getStatusColor = (s: string) => s === 'completed' ? '#10B981' : s === 'in_progress' ? '#F59E0B' : '#6B7280';
  const getPriorityColor = (p: string) => p === 'high' ? '#EF4444' : p === 'medium' ? '#F59E0B' : '#6B7280';

  if (loading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#3B82F6" /></View>;
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1E3A8A', '#3B82F6']} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerInfo}>
              <Text style={styles.headerTitle}>{patientName}</Text>
              <Text style={styles.headerSubtitle}>{report?.patient?.days_clean || 0} días en recuperación</Text>
            </View>
          </View>
          <View style={styles.tabsContainer}>
            {TABS.map((tab) => (
              <TouchableOpacity key={tab.id} style={[styles.tab, activeTab === tab.id && styles.tabActive]} onPress={() => setActiveTab(tab.id)}>
                <Ionicons name={tab.icon as any} size={18} color={activeTab === tab.id ? '#3B82F6' : 'rgba(255,255,255,0.7)'} />
                <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>{tab.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {activeTab === 'overview' && report && (
          <View style={styles.tabContent}>
            {report.alerts?.length > 0 && (
              <View style={styles.alertsSection}>
                {report.alerts.map((a: any, i: number) => (
                  <View key={i} style={[styles.alertCard, a.type === 'critical' && styles.alertCritical]}>
                    <Ionicons name={a.type === 'critical' ? 'alert-circle' : 'warning'} size={20} color={a.type === 'critical' ? '#DC2626' : '#F59E0B'} />
                    <Text style={styles.alertText}>{a.message}</Text>
                  </View>
                ))}
              </View>
            )}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}><Text style={styles.statNumber}>{report.emotional?.average_mood?.toFixed(1) || '-'}</Text><Text style={styles.statLabel}>Ánimo promedio</Text></View>
              <View style={styles.statCard}><Text style={styles.statNumber}>{report.emotional?.total_logs || 0}</Text><Text style={styles.statLabel}>Registros</Text></View>
              <View style={styles.statCard}><Text style={styles.statNumber}>{report.habits?.overall_completion_rate || 0}%</Text><Text style={styles.statLabel}>Hábitos</Text></View>
              <View style={styles.statCard}><Text style={styles.statNumber}>{report.tasks?.completion_rate || 0}%</Text><Text style={styles.statLabel}>Tareas</Text></View>
            </View>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Estado Emocional (7 días)</Text>
              <View style={styles.row}><Text style={styles.rowLabel}>Craving intenso:</Text><Text style={[styles.rowValue, report.emotional?.high_craving_episodes > 0 && { color: '#F59E0B' }]}>{report.emotional?.high_craving_episodes || 0}</Text></View>
              <View style={styles.row}><Text style={styles.rowLabel}>Recaídas:</Text><Text style={[styles.rowValue, report.emotional?.relapses > 0 && { color: '#EF4444' }]}>{report.emotional?.relapses || 0}</Text></View>
            </View>
          </View>
        )}

        {activeTab === 'tasks' && (
          <View style={styles.tabContent}>
            <TouchableOpacity style={styles.addButton} onPress={() => setShowTaskModal(true)}>
              <Ionicons name="add" size={24} color="#FFFFFF" /><Text style={styles.addButtonText}>Nueva Tarea</Text>
            </TouchableOpacity>
            {tasks.length === 0 ? (
              <View style={styles.emptyState}><Ionicons name="checkbox-outline" size={48} color="#D1D5DB" /><Text style={styles.emptyText}>No hay tareas</Text></View>
            ) : tasks.map((t: any) => (
              <View key={t.task_id} style={styles.taskCard}>
                <View style={styles.taskHeader}>
                  <View style={[styles.taskDot, { backgroundColor: getStatusColor(t.status) }]} />
                  <Text style={styles.taskTitle}>{t.title}</Text>
                  <TouchableOpacity onPress={() => handleDeleteTask(t.task_id)}><Ionicons name="trash-outline" size={20} color="#EF4444" /></TouchableOpacity>
                </View>
                {t.description && <Text style={styles.taskDesc}>{t.description}</Text>}
                <View style={styles.taskMeta}>
                  <View style={[styles.badge, { backgroundColor: getPriorityColor(t.priority) + '20' }]}><Text style={[styles.badgeText, { color: getPriorityColor(t.priority) }]}>{t.priority === 'high' ? 'Alta' : t.priority === 'medium' ? 'Media' : 'Baja'}</Text></View>
                  <Text style={styles.taskStatus}>{t.status === 'completed' ? '✓ Completada' : t.status === 'in_progress' ? 'En progreso' : 'Pendiente'}</Text>
                </View>
                {t.patient_notes && <View style={styles.patientNote}><Text style={styles.patientNoteLabel}>Nota del paciente:</Text><Text style={styles.patientNoteText}>{t.patient_notes}</Text></View>}
              </View>
            ))}
          </View>
        )}

        {activeTab === 'notes' && (
          <View style={styles.tabContent}>
            <TouchableOpacity style={styles.addButton} onPress={() => setShowNoteModal(true)}>
              <Ionicons name="add" size={24} color="#FFFFFF" /><Text style={styles.addButtonText}>Nueva Nota</Text>
            </TouchableOpacity>
            {notes.length === 0 ? (
              <View style={styles.emptyState}><Ionicons name="document-text-outline" size={48} color="#D1D5DB" /><Text style={styles.emptyText}>No hay notas</Text></View>
            ) : notes.map((n: any) => (
              <View key={n.note_id} style={styles.noteCard}>
                <View style={styles.noteHeader}><Ionicons name="calendar" size={18} color="#3B82F6" /><Text style={styles.noteDate}>{n.session_date}</Text>{n.mood_rating && <View style={styles.moodBadge}><Text style={styles.moodBadgeText}>Ánimo: {n.mood_rating}/10</Text></View>}</View>
                <Text style={styles.noteLabel}>Notas privadas:</Text>
                <Text style={styles.notePrivate}>{n.private_notes}</Text>
                {n.session_summary && <><Text style={styles.noteLabel}>Resumen:</Text><Text style={styles.noteSummary}>{n.session_summary}</Text></>}
                {n.goals_discussed?.length > 0 && <><Text style={styles.noteLabel}>Objetivos:</Text>{n.goals_discussed.map((g: string, i: number) => <View key={i} style={styles.goalRow}><Ionicons name="checkmark-circle" size={16} color="#10B981" /><Text style={styles.goalText}>{g}</Text></View>)}</>}
              </View>
            ))}
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Task Modal */}
      <Modal visible={showTaskModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>Nueva Tarea</Text><TouchableOpacity onPress={() => setShowTaskModal(false)}><Ionicons name="close" size={24} color="#6B7280" /></TouchableOpacity></View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Título *</Text>
              <TextInput style={styles.input} value={newTask.title} onChangeText={(t) => setNewTask({ ...newTask, title: t })} placeholder="Ej: Ejercicio de respiración" />
              <Text style={styles.inputLabel}>Descripción</Text>
              <TextInput style={[styles.input, styles.textArea]} value={newTask.description} onChangeText={(t) => setNewTask({ ...newTask, description: t })} placeholder="Instrucciones..." multiline />
              <Text style={styles.inputLabel}>Categoría</Text>
              <View style={styles.catGrid}>
                {TASK_CATEGORIES.map((c) => (
                  <TouchableOpacity key={c.id} style={[styles.catBtn, newTask.category === c.id && styles.catBtnActive]} onPress={() => setNewTask({ ...newTask, category: c.id })}>
                    <Ionicons name={c.icon as any} size={16} color={newTask.category === c.id ? '#FFF' : '#6B7280'} /><Text style={[styles.catText, newTask.category === c.id && styles.catTextActive]}>{c.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.inputLabel}>Prioridad</Text>
              <View style={styles.prioRow}>
                {['low', 'medium', 'high'].map((p) => (
                  <TouchableOpacity key={p} style={[styles.prioBtn, newTask.priority === p && { borderColor: getPriorityColor(p), backgroundColor: getPriorityColor(p) + '20' }]} onPress={() => setNewTask({ ...newTask, priority: p })}>
                    <Text style={[styles.prioText, newTask.priority === p && { color: getPriorityColor(p) }]}>{p === 'high' ? 'Alta' : p === 'medium' ? 'Media' : 'Baja'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={styles.submitBtn} onPress={handleCreateTask}><Text style={styles.submitBtnText}>Crear Tarea</Text></TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Note Modal */}
      <Modal visible={showNoteModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>Nota de Sesión</Text><TouchableOpacity onPress={() => setShowNoteModal(false)}><Ionicons name="close" size={24} color="#6B7280" /></TouchableOpacity></View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Fecha</Text>
              <TextInput style={styles.input} value={newNote.session_date} onChangeText={(t) => setNewNote({ ...newNote, session_date: t })} placeholder="YYYY-MM-DD" />
              <Text style={styles.inputLabel}>Notas privadas *</Text>
              <TextInput style={[styles.input, styles.textArea]} value={newNote.private_notes} onChangeText={(t) => setNewNote({ ...newNote, private_notes: t })} placeholder="Observaciones clínicas..." multiline />
              <Text style={styles.inputLabel}>Resumen para paciente</Text>
              <TextInput style={[styles.input, styles.textArea]} value={newNote.session_summary} onChangeText={(t) => setNewNote({ ...newNote, session_summary: t })} placeholder="Lo que el paciente verá..." multiline />
              <Text style={styles.inputLabel}>Objetivos</Text>
              <View style={styles.goalInputRow}><TextInput style={[styles.input, { flex: 1 }]} value={goalInput} onChangeText={setGoalInput} placeholder="Agregar objetivo..." /><TouchableOpacity style={styles.addGoalBtn} onPress={addGoal}><Ionicons name="add" size={20} color="#FFF" /></TouchableOpacity></View>
              {newNote.goals_discussed.map((g, i) => <View key={i} style={styles.goalChip}><Text style={styles.goalChipText}>{g}</Text><TouchableOpacity onPress={() => setNewNote({ ...newNote, goals_discussed: newNote.goals_discussed.filter((_, idx) => idx !== i) })}><Ionicons name="close-circle" size={18} color="#6B7280" /></TouchableOpacity></View>)}
              <Text style={styles.inputLabel}>Ánimo observado: {newNote.mood_rating}/10</Text>
              <View style={styles.moodRow}>{[1,2,3,4,5,6,7,8,9,10].map((n) => <TouchableOpacity key={n} style={[styles.moodDot, newNote.mood_rating === n && styles.moodDotActive]} onPress={() => setNewNote({ ...newNote, mood_rating: n })}><Text style={styles.moodDotText}>{n}</Text></TouchableOpacity>)}</View>
              <TouchableOpacity style={styles.submitBtn} onPress={handleCreateNote}><Text style={styles.submitBtnText}>Guardar Nota</Text></TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' },
  header: { paddingBottom: 16 },
  headerContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  tabsContainer: { flexDirection: 'row', marginTop: 16, marginHorizontal: 16, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: 4 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, gap: 6 },
  tabActive: { backgroundColor: '#FFFFFF' },
  tabText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
  tabTextActive: { color: '#3B82F6' },
  content: { flex: 1 },
  tabContent: { padding: 16 },
  alertsSection: { marginBottom: 16 },
  alertCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', padding: 12, borderRadius: 10, marginBottom: 8, gap: 10 },
  alertCritical: { backgroundColor: '#FEE2E2' },
  alertText: { flex: 1, fontSize: 14, color: '#1F2937' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  statCard: { width: '47%', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16 },
  statNumber: { fontSize: 28, fontWeight: 'bold', color: '#1F2937' },
  statLabel: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  section: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  rowLabel: { fontSize: 14, color: '#6B7280' },
  rowValue: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#3B82F6', padding: 14, borderRadius: 10, marginBottom: 16, gap: 8 },
  addButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 16, color: '#6B7280', marginTop: 12 },
  taskCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12 },
  taskHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  taskDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  taskTitle: { flex: 1, fontSize: 16, fontWeight: '600', color: '#1F2937' },
  taskDesc: { fontSize: 14, color: '#6B7280', marginBottom: 12 },
  taskMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 12 },
  taskStatus: { fontSize: 12, color: '#6B7280', marginLeft: 'auto' },
  patientNote: { backgroundColor: '#F0FDF4', padding: 12, borderRadius: 8, marginTop: 12 },
  patientNoteLabel: { fontSize: 12, color: '#065F46', fontWeight: '600' },
  patientNoteText: { fontSize: 13, color: '#065F46', marginTop: 4 },
  noteCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12 },
  noteHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  noteDate: { fontSize: 15, fontWeight: '600', color: '#1F2937', flex: 1 },
  moodBadge: { backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  moodBadgeText: { fontSize: 12, color: '#3B82F6', fontWeight: '500' },
  noteLabel: { fontSize: 12, color: '#6B7280', fontWeight: '600', marginTop: 12, marginBottom: 4 },
  notePrivate: { fontSize: 14, color: '#1F2937', backgroundColor: '#FEF3C7', padding: 10, borderRadius: 8 },
  noteSummary: { fontSize: 14, color: '#374151', lineHeight: 20 },
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  goalText: { fontSize: 14, color: '#374151' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  modalBody: { padding: 16 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#F3F4F6', borderRadius: 10, padding: 14, fontSize: 15, color: '#1F2937' },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, gap: 6 },
  catBtnActive: { backgroundColor: '#3B82F6' },
  catText: { fontSize: 13, color: '#6B7280' },
  catTextActive: { color: '#FFFFFF' },
  prioRow: { flexDirection: 'row', gap: 10 },
  prioBtn: { flex: 1, padding: 12, borderRadius: 8, borderWidth: 2, borderColor: '#E5E7EB', alignItems: 'center' },
  prioText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  submitBtn: { backgroundColor: '#3B82F6', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 20, marginBottom: 30 },
  submitBtnText: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' },
  goalInputRow: { flexDirection: 'row', gap: 10 },
  addGoalBtn: { backgroundColor: '#10B981', width: 44, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  goalChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#D1FAE5', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, marginTop: 8, gap: 8 },
  goalChipText: { flex: 1, fontSize: 13, color: '#065F46' },
  moodRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  moodDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' },
  moodDotActive: { backgroundColor: '#3B82F6' },
  moodDotText: { fontSize: 11, fontWeight: '600', color: '#6B7280' },
});
