// Dark Theme Configuration for SinAdicciones App
export const theme = {
  // Background colors
  background: {
    primary: '#0D0D0D',
    secondary: '#1A1A1A',
    tertiary: '#262626',
    card: '#1F1F1F',
  },
  // Text colors
  text: {
    primary: '#FFFFFF',
    secondary: '#A1A1AA',
    muted: '#71717A',
    accent: '#10B981',
  },
  // Accent colors
  accent: {
    primary: '#10B981',    // Green - main brand
    secondary: '#3B82F6',  // Blue
    warning: '#F59E0B',    // Orange
    danger: '#EF4444',     // Red
    purple: '#8B5CF6',     // Purple
    pink: '#EC4899',       // Pink
  },
  // Border colors
  border: {
    primary: '#2D2D2D',
    secondary: '#3D3D3D',
    accent: '#10B981',
  },
  // Status colors
  status: {
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',
  },
  // Mood colors for emotional tracking
  mood: {
    excellent: '#10B981',  // 9-10
    good: '#22C55E',       // 7-8
    okay: '#F59E0B',       // 5-6
    low: '#F97316',        // 3-4
    bad: '#EF4444',        // 1-2
  },
  // Spacing
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  // Border radius
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },
};

// Day names in Spanish
export const DAYS_SHORT = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];
export const DAYS_FULL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

// Time filters
export const TIME_FILTERS = [
  { key: 'all', label: 'Todos' },
  { key: 'morning', label: 'Mañana' },
  { key: 'afternoon', label: 'Tarde' },
  { key: 'evening', label: 'Noche' },
  { key: 'anytime', label: 'Cualquier momento' },
];

// Status filters
export const STATUS_FILTERS = [
  { key: 'all', label: 'Todos' },
  { key: 'completed', label: 'Cumplido' },
  { key: 'pending', label: 'No Cumplido' },
];

// Mood emojis
export const MOOD_EMOJIS = [
  { value: 1, emoji: '😢', label: 'Muy mal' },
  { value: 2, emoji: '😞', label: 'Mal' },
  { value: 3, emoji: '😔', label: 'Bajo' },
  { value: 4, emoji: '😕', label: 'Regular' },
  { value: 5, emoji: '😐', label: 'Neutral' },
  { value: 6, emoji: '🙂', label: 'Bien' },
  { value: 7, emoji: '😊', label: 'Bastante bien' },
  { value: 8, emoji: '😄', label: 'Muy bien' },
  { value: 9, emoji: '😁', label: 'Excelente' },
  { value: 10, emoji: '🤩', label: 'Increíble' },
];

export const getMoodEmoji = (value: number) => {
  const mood = MOOD_EMOJIS.find(m => m.value === value);
  return mood?.emoji || '😐';
};

export const getMoodColor = (value: number) => {
  if (value >= 9) return theme.mood.excellent;
  if (value >= 7) return theme.mood.good;
  if (value >= 5) return theme.mood.okay;
  if (value >= 3) return theme.mood.low;
  return theme.mood.bad;
};
