import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme, DAYS_SHORT, MONTHS } from '../../utils/theme';

interface WeekSelectorProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  markedDates?: { [key: string]: { completed?: boolean; mood?: number; color?: string } };
}

export const WeekSelector: React.FC<WeekSelectorProps> = ({
  selectedDate,
  onDateSelect,
  markedDates = {},
}) => {
  const getWeekDates = (date: Date) => {
    const week = [];
    const current = new Date(date);
    const day = current.getDay();
    current.setDate(current.getDate() - day);

    for (let i = 0; i < 7; i++) {
      week.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return week;
  };

  const weekDates = getWeekDates(selectedDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const formatDateKey = (date: Date) => date.toISOString().split('T')[0];

  return (
    <View style={styles.weekContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weekScroll}>
        {weekDates.map((date, index) => {
          const dateKey = formatDateKey(date);
          const isSelected = formatDateKey(selectedDate) === dateKey;
          const isToday = formatDateKey(today) === dateKey;
          const marked = markedDates[dateKey];

          return (
            <TouchableOpacity
              key={dateKey}
              style={[
                styles.dayItem,
                isSelected && styles.dayItemSelected,
                isToday && !isSelected && styles.dayItemToday,
              ]}
              onPress={() => onDateSelect(date)}
            >
              <Text style={[styles.dayName, isSelected && styles.dayNameSelected]}>
                {DAYS_SHORT[index]}
              </Text>
              <Text style={[styles.dayNumber, isSelected && styles.dayNumberSelected]}>
                {date.getDate()}
              </Text>
              {marked && (
                <View style={[styles.dayDot, { backgroundColor: marked.color || theme.accent.primary }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

interface MonthCalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onMonthChange?: (date: Date) => void;
  markedDates?: { [key: string]: { completed?: boolean; mood?: number; emoji?: string; color?: string } };
}

export const MonthCalendar: React.FC<MonthCalendarProps> = ({
  selectedDate,
  onDateSelect,
  onMonthChange,
  markedDates = {},
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate));

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    // Add empty days for alignment
    const startDay = firstDay.getDay();
    for (let i = 0; i < startDay; i++) {
      const prevDate = new Date(year, month, -startDay + i + 1);
      days.push({ date: prevDate, isCurrentMonth: false });
    }

    // Add days of current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }

    // Add remaining days to complete grid
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }

    return days;
  };

  const changeMonth = (delta: number) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + delta);
    setCurrentMonth(newMonth);
    onMonthChange?.(newMonth);
  };

  const days = getDaysInMonth(currentMonth);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const formatDateKey = (date: Date) => date.toISOString().split('T')[0];

  return (
    <View style={styles.calendarContainer}>
      <View style={styles.calendarHeader}>
        <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthButton}>
          <Ionicons name="chevron-back" size={24} color={theme.text.secondary} />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>
          {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </Text>
        <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthButton}>
          <Ionicons name="chevron-forward" size={24} color={theme.text.secondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.weekDaysRow}>
        {DAYS_SHORT.map((day) => (
          <Text key={day} style={styles.weekDayLabel}>{day}</Text>
        ))}
      </View>

      <View style={styles.daysGrid}>
        {days.map(({ date, isCurrentMonth }, index) => {
          const dateKey = formatDateKey(date);
          const isSelected = formatDateKey(selectedDate) === dateKey;
          const isToday = formatDateKey(today) === dateKey;
          const marked = markedDates[dateKey];

          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.calendarDay,
                isSelected && styles.calendarDaySelected,
                isToday && !isSelected && styles.calendarDayToday,
              ]}
              onPress={() => onDateSelect(date)}
              disabled={!isCurrentMonth}
            >
              {marked?.emoji ? (
                <Text style={styles.dayEmoji}>{marked.emoji}</Text>
              ) : (
                <Text style={[
                  styles.calendarDayText,
                  !isCurrentMonth && styles.calendarDayTextMuted,
                  isSelected && styles.calendarDayTextSelected,
                ]}>
                  {date.getDate()}
                </Text>
              )}
              {marked && !marked.emoji && (
                <View style={[styles.calendarDot, { backgroundColor: marked.color || theme.accent.primary }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

interface FilterChipsProps {
  filters: { key: string; label: string }[];
  selected: string;
  onSelect: (key: string) => void;
  accentColor?: string;
}

export const FilterChips: React.FC<FilterChipsProps> = ({
  filters,
  selected,
  onSelect,
  accentColor = theme.accent.primary,
}) => {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContainer}>
      {filters.map((filter) => (
        <TouchableOpacity
          key={filter.key}
          style={[
            styles.filterChip,
            selected === filter.key && [styles.filterChipSelected, { backgroundColor: accentColor }],
          ]}
          onPress={() => onSelect(filter.key)}
        >
          <Text style={[
            styles.filterChipText,
            selected === filter.key && styles.filterChipTextSelected,
          ]}>
            {filter.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  // Week Selector
  weekContainer: {
    backgroundColor: theme.background.secondary,
    paddingVertical: 12,
    borderRadius: theme.radius.lg,
    marginBottom: 16,
  },
  weekScroll: {
    paddingHorizontal: 8,
    gap: 8,
  },
  dayItem: {
    width: 48,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.md,
    backgroundColor: 'transparent',
  },
  dayItemSelected: {
    backgroundColor: theme.accent.primary,
  },
  dayItemToday: {
    borderWidth: 1,
    borderColor: theme.accent.primary,
  },
  dayName: {
    fontSize: 12,
    color: theme.text.muted,
    marginBottom: 4,
  },
  dayNameSelected: {
    color: theme.text.primary,
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text.primary,
  },
  dayNumberSelected: {
    color: theme.text.primary,
  },
  dayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 4,
  },

  // Month Calendar
  calendarContainer: {
    backgroundColor: theme.background.secondary,
    borderRadius: theme.radius.lg,
    padding: 16,
    marginBottom: 16,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  monthButton: {
    padding: 8,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text.primary,
  },
  weekDaysRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekDayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    color: theme.text.muted,
    fontWeight: '500',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.full,
  },
  calendarDaySelected: {
    backgroundColor: theme.accent.primary,
  },
  calendarDayToday: {
    borderWidth: 1,
    borderColor: theme.accent.primary,
  },
  calendarDayText: {
    fontSize: 14,
    color: theme.text.primary,
  },
  calendarDayTextMuted: {
    color: theme.text.muted,
  },
  calendarDayTextSelected: {
    color: theme.text.primary,
    fontWeight: '600',
  },
  dayEmoji: {
    fontSize: 18,
  },
  calendarDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
  },

  // Filter Chips
  filterContainer: {
    paddingHorizontal: 4,
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: theme.radius.full,
    backgroundColor: theme.background.tertiary,
    borderWidth: 1,
    borderColor: theme.border.primary,
  },
  filterChipSelected: {
    borderColor: 'transparent',
  },
  filterChipText: {
    fontSize: 13,
    color: theme.text.secondary,
    fontWeight: '500',
  },
  filterChipTextSelected: {
    color: theme.text.primary,
  },
});
