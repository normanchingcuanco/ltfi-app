import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import api from '../../src/utils/api';

const confirmDelete = (onConfirm) => {
  if (Platform.OS === 'web') {
    if (window.confirm('Delete this workout?')) onConfirm();
  } else {
    Alert.alert('Delete', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onConfirm }
    ]);
  }
};

export default function WorkoutScreen() {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      fetchWorkouts();
    }, [])
  );

  const fetchWorkouts = async () => {
    try {
      const res = await api.get('/workouts');
      setWorkouts(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const deleteWorkout = (id) => {
    confirmDelete(async () => {
      try {
        await api.delete(`/workouts/${id}`);
        setWorkouts(prev => prev.filter(w => w._id !== id));
      } catch (err) {
        console.error(err);
      }
    });
  };

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#F77E2D" />
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Workout</Text>

      <TouchableOpacity style={styles.createBtn} onPress={() => router.push('/create-workout')}>
        <Text style={styles.createBtnText}>+ Create Workout</Text>
      </TouchableOpacity>

      {workouts.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>No workouts yet. Create one to get started.</Text>
        </View>
      ) : (
        workouts.map(workout => (
          <View key={workout._id} style={styles.workoutCard}>
            <View style={styles.workoutInfo}>
              <Text style={styles.workoutName}>{workout.name}</Text>
              <Text style={styles.workoutMeta}>
                {workout.type} · {workout.rounds} round{workout.rounds > 1 ? 's' : ''} · {workout.intervals.length} interval{workout.intervals.length !== 1 ? 's' : ''}
                {workout.repeat ? ' · Repeat' : ''}
              </Text>
            </View>
            <View style={styles.workoutActions}>
              <TouchableOpacity
                style={styles.startBtn}
                onPress={() => router.push({ pathname: '/timer', params: { workoutId: workout._id } })}
              >
                <Text style={styles.startBtnText}>▶</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => router.push({ pathname: '/edit-workout', params: { workoutId: workout._id } })}
              >
                <Text style={styles.editBtnText}>✎</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => deleteWorkout(workout._id)}
              >
                <Text style={styles.deleteBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EDE8DF' },
  content: { padding: 24, paddingTop: 60, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#EDE8DF' },
  title: { fontSize: 28, fontWeight: '900', color: '#1A1A1A', marginBottom: 24 },
  createBtn: { backgroundColor: '#F77E2D', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 24 },
  createBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  emptyBox: { backgroundColor: '#D9D3C8', borderRadius: 16, padding: 24, alignItems: 'center' },
  emptyText: { color: '#888', textAlign: 'center', fontSize: 14 },
  workoutCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#D9D3C8', borderRadius: 16, padding: 16, marginBottom: 12 },
  workoutInfo: { flex: 1 },
  workoutName: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  workoutMeta: { fontSize: 12, color: '#888', textTransform: 'capitalize' },
  workoutActions: { flexDirection: 'row', gap: 8 },
  startBtn: { backgroundColor: '#F77E2D', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  startBtnText: { color: '#fff', fontSize: 14 },
  editBtn: { backgroundColor: '#D9D3C8', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#C4BEB4' },
  editBtnText: { color: '#888', fontSize: 16 },
  deleteBtn: { backgroundColor: '#E8E2D8', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  deleteBtnText: { color: '#888', fontSize: 14 }
});