import { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import { useRouter, useFocusEffect } from 'expo-router';
import api from '../../src/utils/api';

const localDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getWeekDays = (weekOffset = 0) => {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diffToMonday = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday + weekOffset * 7);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(localDate(d));
  }
  return days;
};

export default function DashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [viewMode, setViewMode] = useState('daily');
  const [dayOffset, setDayOffset] = useState(0);
  const [weekOffset, setWeekOffset] = useState(0);
  const [summary, setSummary] = useState(null);
  const [caloriesBurned, setCaloriesBurned] = useState(0);
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [weeklyAvg, setWeeklyAvg] = useState(null);

  const viewedDate = new Date();
  viewedDate.setDate(viewedDate.getDate() + dayOffset);
  const viewedDateStr = localDate(viewedDate);
  const isToday = dayOffset === 0;

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [dayOffset])
  );

  useFocusEffect(
    useCallback(() => {
      fetchWeeklyAverage();
    }, [weekOffset])
  );

  const fetchData = async () => {
    try {
      const [mealRes, workoutRes] = await Promise.all([
        api.get(`/meals/summary?date=${viewedDateStr}`),
        api.get('/workouts')
      ]);
      setSummary(mealRes.data);
      const dayWorkouts = workoutRes.data.filter(w => {
        if (!w.completedAt) return false;
        return w.completedAt.split('T')[0] === viewedDateStr;
      });
      const burned = dayWorkouts.reduce((sum, w) => sum + (w.caloriesBurned || 0), 0);
      setCaloriesBurned(burned);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchWeeklyAverage = async () => {
    setWeeklyLoading(true);
    try {
      const days = getWeekDays(weekOffset);
      const results = await Promise.all(
        days.map(date => api.get(`/meals/summary?date=${date}`).catch(() => ({ data: { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 } })))
      );
      const totals = results.reduce((acc, r) => ({
        calories: acc.calories + (r.data?.totalCalories || 0),
        protein: acc.protein + (r.data?.totalProtein || 0),
        carbs: acc.carbs + (r.data?.totalCarbs || 0),
        fat: acc.fat + (r.data?.totalFat || 0),
      }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

      setWeeklyAvg({
        calories: Math.round(totals.calories / 7),
        protein: Math.round(totals.protein / 7),
        carbs: Math.round(totals.carbs / 7),
        fat: Math.round(totals.fat / 7),
      });
    } catch (err) {
      console.error(err);
    } finally {
      setWeeklyLoading(false);
    }
  };

  const isWeekly = viewMode === 'weekly';

  const consumed = isWeekly ? (weeklyAvg?.calories || 0) : (summary?.totalCalories || 0);
  const goal = user?.dailyCalorieGoal || 0;
  const remaining = isWeekly ? Math.max(goal - consumed, 0) : Math.max(goal - consumed + caloriesBurned, 0);
  const progress = goal > 0 ? Math.min(consumed / (isWeekly ? goal : (goal + caloriesBurned)), 1) : 0;

  const proteinConsumed = isWeekly ? (weeklyAvg?.protein || 0) : (summary?.totalProtein || 0);
  const carbsConsumed = isWeekly ? (weeklyAvg?.carbs || 0) : (summary?.totalCarbs || 0);
  const fatConsumed = isWeekly ? (weeklyAvg?.fat || 0) : (summary?.totalFat || 0);
  const proteinGoal = user?.macroGoals?.protein || 0;
  const carbsGoal = user?.macroGoals?.carbs || 0;
  const fatGoal = user?.macroGoals?.fat || 0;

  const dailyLabel = isToday ? 'Today' : viewedDate.toDateString();

  const weeklyLabel = (() => {
    const days = getWeekDays(weekOffset);
    if (weekOffset === 0) return 'This Week';
    const start = new Date(days[0] + 'T12:00:00');
    const end = new Date(days[6] + 'T12:00:00');
    return `${start.toLocaleDateString('en', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en', { month: 'short', day: 'numeric' })}`;
  })();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hey, {user?.name?.split(' ')[0]} 👋</Text>
          <Text style={styles.date}>{new Date().toDateString()}</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.avatarInitials}</Text>
        </View>
      </View>

      <View style={styles.toggleRow}>
        <TouchableOpacity style={[styles.toggleBtn, !isWeekly && styles.toggleBtnActive]} onPress={() => setViewMode('daily')}>
          <Text style={[styles.toggleText, !isWeekly && styles.toggleTextActive]}>Daily</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.toggleBtn, isWeekly && styles.toggleBtnActive]} onPress={() => setViewMode('weekly')}>
          <Text style={[styles.toggleText, isWeekly && styles.toggleTextActive]}>Weekly</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.dateNav}>
        <TouchableOpacity
          onPress={() => isWeekly ? setWeekOffset(p => p - 1) : setDayOffset(p => p - 1)}
          style={styles.dateNavBtn}
        >
          <Text style={styles.dateNavText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.dateNavLabel}>{isWeekly ? weeklyLabel : dailyLabel}</Text>
        <TouchableOpacity
          onPress={() => isWeekly ? setWeekOffset(p => Math.min(p + 1, 0)) : setDayOffset(p => Math.min(p + 1, 0))}
          style={[styles.dateNavBtn, (isWeekly ? weekOffset === 0 : isToday) && styles.dateNavBtnDisabled]}
          disabled={isWeekly ? weekOffset === 0 : isToday}
        >
          <Text style={[styles.dateNavText, (isWeekly ? weekOffset === 0 : isToday) && { color: '#ccc' }]}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.calorieCard}>
        {isWeekly && (
          <Text style={styles.weeklyLabel}>{weeklyLoading ? 'Loading week average...' : '7-Day Daily Average'}</Text>
        )}
        <View style={styles.calorieRow}>
          <View style={styles.calorieItem}>
            <Text style={styles.calorieValue}>{consumed}</Text>
            <Text style={styles.calorieLabel}>Eaten</Text>
          </View>
          <View style={styles.calorieCenter}>
            <Text style={styles.calorieGoalValue}>{remaining}</Text>
            <Text style={styles.calorieGoalLabel}>Remaining</Text>
          </View>
          <View style={styles.calorieItem}>
            <Text style={styles.calorieValue}>{goal}</Text>
            <Text style={styles.calorieLabel}>Goal</Text>
          </View>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: progress >= 1 ? '#E05A2B' : '#F77E2D' }]} />
        </View>
        {!isWeekly && caloriesBurned > 0 && (
          <Text style={styles.burnedText}>🔥 {caloriesBurned} kcal burned from workouts {isToday ? 'today' : 'that day'}</Text>
        )}
      </View>

      <View style={styles.macrosRow}>
        {[
          { label: 'Protein', consumed: proteinConsumed, goal: proteinGoal },
          { label: 'Carbs', consumed: carbsConsumed, goal: carbsGoal },
          { label: 'Fat', consumed: fatConsumed, goal: fatGoal }
        ].map(macro => {
          const pct = macro.goal > 0 ? Math.min(macro.consumed / macro.goal, 1) : 0;
          return (
            <View key={macro.label} style={styles.macroCard}>
              <Text style={styles.macroValue}>{macro.consumed}g</Text>
              <Text style={styles.macroLabel}>{macro.label}</Text>
              <Text style={styles.macroGoal}>/ {macro.goal}g</Text>
              <View style={styles.macroBar}>
                <View style={[styles.macroFill, { width: `${pct * 100}%`, backgroundColor: pct >= 1 ? '#E05A2B' : '#F77E2D' }]} />
              </View>
            </View>
          );
        })}
      </View>

      <TouchableOpacity style={styles.diaryBtn} onPress={() => router.push('/(tabs)/diary')}>
        <Text style={styles.diaryBtnText}>Go to Diary</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EDE8DF' },
  content: { padding: 24, paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting: { fontSize: 26, fontWeight: '800', color: '#1A1A1A' },
  date: { fontSize: 13, color: '#999', marginTop: 2 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F77E2D', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  toggleRow: { flexDirection: 'row', backgroundColor: '#D9D3C8', borderRadius: 12, padding: 4, marginBottom: 16, gap: 4 },
  toggleBtn: { flex: 1, padding: 10, borderRadius: 10, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: '#F77E2D' },
  toggleText: { fontSize: 13, fontWeight: '600', color: '#888' },
  toggleTextActive: { color: '#fff' },
  dateNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  dateNavBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  dateNavBtnDisabled: { opacity: 0.3 },
  dateNavText: { fontSize: 24, color: '#F77E2D', fontWeight: '700' },
  dateNavLabel: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  calorieCard: { backgroundColor: '#D9D3C8', borderRadius: 16, padding: 20, marginBottom: 16 },
  weeklyLabel: { fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center', marginBottom: 12 },
  calorieRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  calorieItem: { alignItems: 'center' },
  calorieValue: { fontSize: 22, fontWeight: '800', color: '#1A1A1A' },
  calorieLabel: { fontSize: 11, color: '#888', marginTop: 2, textTransform: 'uppercase', letterSpacing: 1 },
  calorieCenter: { alignItems: 'center' },
  calorieGoalValue: { fontSize: 36, fontWeight: '900', color: '#F77E2D' },
  calorieGoalLabel: { fontSize: 11, color: '#888', marginTop: 2, textTransform: 'uppercase', letterSpacing: 1 },
  progressBar: { height: 8, backgroundColor: '#C5BFB4', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4 },
  burnedText: { fontSize: 12, color: '#F77E2D', marginTop: 10, textAlign: 'center' },
  macrosRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  macroCard: { flex: 1, backgroundColor: '#D9D3C8', borderRadius: 16, padding: 16, alignItems: 'center' },
  macroValue: { fontSize: 18, fontWeight: '800', color: '#1A1A1A' },
  macroLabel: { fontSize: 11, color: '#888', marginTop: 2, textTransform: 'uppercase', letterSpacing: 1 },
  macroGoal: { fontSize: 11, color: '#bbb', marginTop: 2 },
  macroBar: { height: 4, backgroundColor: '#C5BFB4', borderRadius: 2, overflow: 'hidden', width: '100%', marginTop: 8 },
  macroFill: { height: 4, borderRadius: 2 },
  diaryBtn: { backgroundColor: '#F77E2D', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 12 },
  diaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 }
})