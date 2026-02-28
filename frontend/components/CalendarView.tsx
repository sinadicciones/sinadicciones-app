import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DayData {
  date: string;
  value?: number;
  emoji?: string;
  completed?: boolean;
  completionRate?: number;
}

interface CalendarViewProps {
  data: DayData[];
  type: 'habits' | 'emotional';
  accentColor: string;
  onDayPress?: (date: string) => void;
}

const DAYS_ES = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const MOOD_EMOJIS: Record<number, string> = {
  1: '😢', 2: '😞', 3: '😔', 4: '😕', 5: '😐',
  6: '🙂', 7: '😊', 8: '😄', 9: '🤩', 10: '🥳'
};

export default function CalendarView({ data, type, accentColor, onDayPress }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month'>('month');

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    return firstDay === 0 ? 6 : firstDay - 1; // Convert Sunday=0 to Monday=0
  };

  const formatDateKey = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const getDataForDate = (dateKey: string): DayData | undefined => {
    return data.find(d => d.date === dateKey);
  };

  const navigateMonth = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const navigateWeek = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + (direction * 7));
    setCurrentDate(newDate);
  };

  const getWeekDays = () => {
    const days = [];
    const start = new Date(currentDate);
    const dayOfWeek = start.getDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    start.setDate(start.getDate() - diff);
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const getWeekRange = () => {
    const days = getWeekDays();
    const start = days[0];
    const end = days[6];
    return `${String(start.getMonth() + 1).padStart(2, '0')}.${String(start.getDate()).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
  };

  const renderDayContent = (dayData: DayData | undefined, isToday: boolean) => {
    if (!dayData) return null;

    if (type === 'emotional' && dayData.value) {
      const emoji = MOOD_EMOJIS[Math.round(dayData.value)] || '😐';
      return (
        <View style={[styles.dayIndicator, { backgroundColor: accentColor }]}>
          <Text style={styles.dayEmoji}>{emoji}</Text>
        </View>
      );
    }

    if (type === 'habits' && dayData.completionRate !== undefined) {
      const rate = dayData.completionRate;
      let bgColor = '#EF4444'; // red
      if (rate >= 80) bgColor = '#10B981'; // green
      else if (rate >= 50) bgColor = '#F59E0B'; // yellow
      else if (rate >= 25) bgColor = '#FB923C'; // orange
      
      return (
        <View style={[styles.habitDot, { backgroundColor: bgColor }]} />
      );
    }

    return null;
  };

  const renderMonthView = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const today = new Date();
    const todayKey = formatDateKey(today.getFullYear(), today.getMonth(), today.getDate());

    const days = [];
    
    // Previous month days
    const prevMonthDays = getDaysInMonth(new Date(year, month - 1));
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({ day: prevMonthDays - i, isCurrentMonth: false, key: '' });
    }
    
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const dateKey = formatDateKey(year, month, i);
      days.push({ day: i, isCurrentMonth: true, key: dateKey });
    }
    
    // Next month days
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ day: i, isCurrentMonth: false, key: '' });
    }

    return (
      <View style={styles.monthGrid}>
        {/* Day headers */}
        <View style={styles.dayHeaders}>
          {DAYS_ES.map((day, index) => (
            <View key={index} style={styles.dayHeaderCell}>
              <Text style={styles.dayHeaderText}>{day}</Text>
            </View>
          ))}
        </View>
        
        {/* Calendar grid */}
        <View style={styles.daysGrid}>
          {days.map((dayObj, index) => {
            const isToday = dayObj.key === todayKey;
            const dayData = dayObj.key ? getDataForDate(dayObj.key) : undefined;
            
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dayCell,
                  isToday && styles.todayCell,
                ]}
                onPress={() => dayObj.key && onDayPress?.(dayObj.key)}
                disabled={!dayObj.isCurrentMonth}
              >
                <Text style={[
                  styles.dayNumber,
                  !dayObj.isCurrentMonth && styles.otherMonthDay,
                  isToday && styles.todayText,
                ]}>
                  {dayObj.day}
                </Text>
                {dayObj.isCurrentMonth && renderDayContent(dayData, isToday)}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const renderWeekView = () => {
    const weekDays = getWeekDays();
    const today = new Date();
    const todayKey = formatDateKey(today.getFullYear(), today.getMonth(), today.getDate());

    return (
      <View style={styles.weekView}>
        <View style={styles.weekDaysRow}>
          {weekDays.map((day, index) => {
            const dateKey = formatDateKey(day.getFullYear(), day.getMonth(), day.getDate());
            const isToday = dateKey === todayKey;
            const dayData = getDataForDate(dateKey);

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.weekDayCell,
                  isToday && [styles.todayCell, { borderColor: accentColor }],
                ]}
                onPress={() => onDayPress?.(dateKey)}
              >
                <Text style={[styles.weekDayLabel, isToday && { color: accentColor }]}>
                  {DAYS_ES[index]}
                </Text>
                <Text style={[styles.weekDayNumber, isToday && { color: accentColor }]}>
                  {day.getDate()}
                </Text>
                {renderDayContent(dayData, isToday)}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header with navigation */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => viewMode === 'month' ? navigateMonth(-1) : navigateWeek(-1)}
          style={styles.navButton}
        >
          <Ionicons name="chevron-back" size={24} color="#A1A1AA" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>
          {viewMode === 'month' 
            ? `${MONTHS_ES[currentDate.getMonth()]} ${currentDate.getFullYear()}`
            : getWeekRange()
          }
        </Text>
        
        <TouchableOpacity 
          onPress={() => viewMode === 'month' ? navigateMonth(1) : navigateWeek(1)}
          style={styles.navButton}
        >
          <Ionicons name="chevron-forward" size={24} color="#A1A1AA" />
        </TouchableOpacity>
      </View>

      {/* View mode toggle */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity 
          style={[styles.toggleButton, viewMode === 'week' && [styles.toggleActive, { backgroundColor: accentColor }]]}
          onPress={() => setViewMode('week')}
        >
          <Text style={[styles.toggleText, viewMode === 'week' && styles.toggleTextActive]}>Semana</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.toggleButton, viewMode === 'month' && [styles.toggleActive, { backgroundColor: accentColor }]]}
          onPress={() => setViewMode('month')}
        >
          <Text style={[styles.toggleText, viewMode === 'month' && styles.toggleTextActive]}>Mes</Text>
        </TouchableOpacity>
      </View>

      {/* Calendar view */}
      {viewMode === 'month' ? renderMonthView() : renderWeekView()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  navButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#2D2D2D',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  toggleActive: {
    backgroundColor: '#10B981',
  },
  toggleText: {
    fontSize: 14,
    color: '#A1A1AA',
    fontWeight: '500',
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },
  monthGrid: {
    marginTop: 8,
  },
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayHeaderCell: {
    flex: 1,
    alignItems: 'center',
  },
  dayHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#A1A1AA',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  todayCell: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 8,
  },
  dayNumber: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  otherMonthDay: {
    color: '#4B5563',
  },
  todayText: {
    fontWeight: 'bold',
  },
  dayIndicator: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  dayEmoji: {
    fontSize: 12,
  },
  habitDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 4,
  },
  weekView: {
    marginTop: 8,
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weekDayCell: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#2D2D2D',
    minWidth: 44,
  },
  weekDayLabel: {
    fontSize: 12,
    color: '#A1A1AA',
    marginBottom: 4,
  },
  weekDayNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
});
