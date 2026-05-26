import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import { useRouter, useFocusEffect } from 'expo-router';
import api from '../../src/utils/api';

export default function DashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [summary, setSummary] = useState(null);
  const [caloriesBurned, setCaloriesBurned] = useState(0);
  const today = new Date().toISOString().split('T')[0];

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const fetchData = async () => {
    try {
      const [mealRes, workoutRes] = await Promise.all([
        api.get(`/meals/summary?date=${today}`),
        api.get('/workouts')
      ]);
      setSummary(mealRes.data);
      const todayWorkouts = workoutRes.data.filter(w => {
        if (!w.completedAt) return false;
        return w.completedAt.split('T')[0] === today;
      });
      const burned = todayWorkouts.reduce((sum, w) => sum + (w.caloriesBurned || 0), 0);
      setCaloriesBurned(burned);
    } catch (err) {
      console.error(err);
    }
  };

  const consumed = summary?.totalCalories || 0;
  const goal = user?.dailyCalorieGoal || 0;
  const remaining = Math.max(goal - consumed + caloriesBurned, 0);
  const progress = goal > 0 ? Math.min(consumed / (goal + caloriesBurned), 1) : 0;

  const proteinConsumed = summary?.totalProtein || 0;
  const carbsConsumed = summary?.totalCarbs || 0;
  const fatConsumed = summary?.totalFat || 0;
  const proteinGoal = user?.macroGoals?.protein || 0;
  const carbsGoal = user?.macroGoals?.carbs || 0;
  const fatGoal = user?.macroGoals?.fat || 0;

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

      <View style={styles.calorieCard}>
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
        {caloriesBurned > 0 && (
          <Text style={styles.burnedText}>🔥 {caloriesBurned} kcal burned from workouts today</Text>
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
        <Text style={styles.diaryBtnText}>+ Log Food</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EDE8DF' },
  content: { padding: 24, paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  greeting: { fontSize: 26, fontWeight: '800', color: '#1A1A1A' },
  date: { fontSize: 13, color: '#999', marginTop: 2 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F77E2D', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  calorieCard: { backgroundColor: '#D9D3C8', borderRadius: 16, padding: 20, marginBottom: 16 },
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
});import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import { useRouter, useFocusEffect } from 'expo-router';
import api from '../../src/utils/api';

export default function DashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [summary, setSummary] = useState(null);
  const [caloriesBurned, setCaloriesBurned] = useState(0);
  const today = new Date().toISOString().split('T')[0];

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const fetchData = async () => {
    try {
      const [mealRes, workoutRes] = await Promise.all([
        api.get(`/meals/summary?date=${today}`),
        api.get('/workouts')
      ]);
      setSummary(mealRes.data);
      const todayWorkouts = workoutRes.data.filter(w => {
        if (!w.completedAt) return false;
        return w.completedAt.split('T')[0] === today;
      });
      const burned = todayWorkouts.reduce((sum, w) => sum + (w.caloriesBurned || 0), 0);
      setCaloriesBurned(burned);
    } catch (err) {
      console.error(err);
    }
  };

  const consumed = summary?.totalCalories || 0;
  const goal = user?.dailyCalorieGoal || 0;
  const remaining = Math.max(goal - consumed + caloriesBurned, 0);
  const progress = goal > 0 ? Math.min(consumed / (goal + caloriesBurned), 1) : 0;

  const proteinConsumed = summary?.totalProtein || 0;
  const carbsConsumed = summary?.totalCarbs || 0;
  const fatConsumed = summary?.totalFat || 0;
  const proteinGoal = user?.macroGoals?.protein || 0;
  const carbsGoal = user?.macroGoals?.carbs || 0;
  const fatGoal = user?.macroGoals?.fat || 0;

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

      <View style={styles.calorieCard}>
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
        {caloriesBurned > 0 && (
          <Text style={styles.burnedText}>🔥 {caloriesBurned} kcal burned from workouts today</Text>
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
        <Text style={styles.diaryBtnText}>+ Log Food</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EDE8DF' },
  content: { padding: 24, paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  greeting: { fontSize: 26, fontWeight: '800', color: '#1A1A1A' },
  date: { fontSize: 13, color: '#999', marginTop: 2 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F77E2D', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  calorieCard: { backgroundColor: '#D9D3C8', borderRadius: 16, padding: 20, marginBottom: 16 },
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
});