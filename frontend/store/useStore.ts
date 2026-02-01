import { create } from 'zustand';

interface Habit {
  habit_id: string;
  name: string;
  frequency: string;
  color: string;
  streak: number;
  completed_today: boolean;
}

interface EmotionalLog {
  log_id: string;
  mood_scale: number;
  note?: string;
  tags: string[];
  date: string;
}

interface StoreState {
  habits: Habit[];
  emotionalLogs: EmotionalLog[];
  setHabits: (habits: Habit[]) => void;
  setEmotionalLogs: (logs: EmotionalLog[]) => void;
  addHabit: (habit: Habit) => void;
  updateHabit: (habitId: string, data: Partial<Habit>) => void;
  addEmotionalLog: (log: EmotionalLog) => void;
}

export const useStore = create<StoreState>((set) => ({
  habits: [],
  emotionalLogs: [],
  setHabits: (habits) => set({ habits }),
  setEmotionalLogs: (logs) => set({ emotionalLogs: logs }),
  addHabit: (habit) => set((state) => ({ habits: [...state.habits, habit] })),
  updateHabit: (habitId, data) =>
    set((state) => ({
      habits: state.habits.map((h) => (h.habit_id === habitId ? { ...h, ...data } : h)),
    })),
  addEmotionalLog: (log) => set((state) => ({ emotionalLogs: [log, ...state.emotionalLogs] })),
}));