import { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Platform, TextInput, Linking } from 'react-native';
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

const localDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const getCurrentWeek = () => {
  const start = new Date('2025-01-01');
  const now = new Date();
  const diff = Math.floor((now - start) / (7 * 24 * 60 * 60 * 1000));
  return diff + 1;
};

export default function WorkoutScreen() {
  const [tab, setTab] = useState('timer');
  const [workouts, setWorkouts] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exercisesLoading, setExercisesLoading] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [showNewExercise, setShowNewExercise] = useState(false);
  const [expandedExercise, setExpandedExercise] = useState(null);
  const [exerciseLogs, setExerciseLogs] = useState({});
  const [pendingSets, setPendingSets] = useState({});
  const [exerciseNotes, setExerciseNotes] = useState({});
  const [notesEditing, setNotesEditing] = useState({});
  const notesTimers = useRef({});
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      fetchWorkouts();
      fetchExercises();
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

  const fetchExercises = async () => {
    setExercisesLoading(true);
    try {
      const res = await api.get('/exercises');
      setExercises(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setExercisesLoading(false);
    }
  };

  const fetchExerciseLogs = async (exercise) => {
    try {
      const res = await api.get(`/exercises/${encodeURIComponent(exercise)}`);
      setExerciseLogs(prev => ({ ...prev, [exercise]: res.data }));
    } catch (err) {
      console.error(err);
    }
  };

  const toggleExercise = (exercise) => {
    if (expandedExercise === exercise) {
      setExpandedExercise(null);
    } else {
      setExpandedExercise(exercise);
      if (!exerciseLogs[exercise]) fetchExerciseLogs(exercise);
    }
  };

  const persistNotes = async (exercise, value) => {
    const logs = exerciseLogs[exercise] || [];
    const todayLog = logs.find(l => l.date === localDate());
    try {
      await api.post('/exercises', {
        exercise,
        date: localDate(),
        week: getCurrentWeek(),
        sets: todayLog?.sets || [],
        notes: value
      });
      fetchExerciseLogs(exercise);
      fetchExercises();
    } catch (err) {
      console.error(err);
    }
  };

  const scheduleNotesSave = (exercise, value) => {
    setExerciseNotes(prev => ({ ...prev, [exercise]: value }));
    if (notesTimers.current[exercise]) clearTimeout(notesTimers.current[exercise]);
    notesTimers.current[exercise] = setTimeout(() => {
      persistNotes(exercise, value);
    }, 800);
  };

  const flushNotesSave = (exercise) => {
    if (notesTimers.current[exercise]) {
      clearTimeout(notesTimers.current[exercise]);
      notesTimers.current[exercise] = null;
    }
    const value = exerciseNotes[exercise];
    if (value !== undefined) persistNotes(exercise, value);
    setNotesEditing(prev => ({ ...prev, [exercise]: false }));
  };

  const renderNotesWithLinks = (text) => {
    const parts = text.split(/(https?:\/\/[^\s]+)/g);
    return parts.map((part, i) =>
      /^https?:\/\//.test(part) ? (
        <Text key={i} style={styles.linkText} onPress={() => Linking.openURL(part)}>
          {part}
        </Text>
      ) : (
        <Text key={i}>{part}</Text>
      )
    );
  };

  const addRow = (exercise) => {
    setPendingSets(prev => ({
      ...prev,
      [exercise]: [...(prev[exercise] || []), { weight: '', reps: '' }]
    }));
  };

  const updateRow = (exercise, idx, field, value) => {
    setPendingSets(prev => ({
      ...prev,
      [exercise]: prev[exercise].map((row, i) => i === idx ? { ...row, [field]: value } : row)
    }));
  };

  const removeRow = (exercise, idx) => {
    setPendingSets(prev => ({
      ...prev,
      [exercise]: prev[exercise].filter((_, i) => i !== idx)
    }));
  };

  const saveSets = async (exercise) => {
    const rows = pendingSets[exercise] || [];
    if (rows.length === 0) return;
    const logs = exerciseLogs[exercise] || [];
    const todayLog = logs.find(l => l.date === localDate());
    const existingSets = todayLog?.sets || [];
    const addedSets = rows.map((row, i) => ({
      setNumber: existingSets.length + i + 1,
      weight: parseFloat(row.weight) || 0,
      reps: parseInt(row.reps) || 0
    }));
    const newSets = [...existingSets, ...addedSets];
    try {
      await api.post('/exercises', {
        exercise,
        date: localDate(),
        week: getCurrentWeek(),
        sets: newSets,
        notes: exerciseNotes[exercise] || ''
      });
      setPendingSets(prev => ({ ...prev, [exercise]: [] }));
      fetchExerciseLogs(exercise);
      fetchExercises();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteExercise = (exercise) => {
      confirmDelete(async () => {
        try {
          await api.delete(`/exercises/by-name/${encodeURIComponent(exercise)}`);
          setExercises(prev => prev.filter(e => e.exercise !== exercise));
        } catch (err) {
          console.error(err);
        }
      });
    };

    const deleteExercise = (exercise) => {
        confirmDelete(async () => {
          try {
            await api.delete(`/exercises/by-name/${encodeURIComponent(exercise)}`);
            setExercises(prev => prev.filter(e => e.exercise !== exercise));
          } catch (err) {
            console.error(err);
          }
        });
      };

      const createExercise = async () => {
    if (!newExerciseName.trim()) return;
    try {
      await api.post('/exercises', {
        exercise: newExerciseName.trim(),
        date: localDate(),
        week: getCurrentWeek(),
        sets: []
      });
      setNewExerciseName('');
      setShowNewExercise(false);
      fetchExercises();
    } catch (err) {
      console.error(err);
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

      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tabBtn, tab === 'timer' && styles.tabBtnActive]} onPress={() => setTab('timer')}>
          <Text style={[styles.tabText, tab === 'timer' && styles.tabTextActive]}>Timer</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, tab === 'tracker' && styles.tabBtnActive]} onPress={() => setTab('tracker')}>
          <Text style={[styles.tabText, tab === 'tracker' && styles.tabTextActive]}>Tracker</Text>
        </TouchableOpacity>
      </View>

      {tab === 'timer' && (
        <>
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
                  <Text style={styles.workoutDuration}>
                    {(() => {
                      const intervalTime = workout.intervals.reduce((sum, i) => sum + (i.workSeconds || 0) + (i.restSeconds || 0), 0);
                      const totalSecs = (intervalTime * (workout.rounds || 1)) + (workout.warmUp || 0) + (workout.coolDown || 0);
                      const m = Math.floor(totalSecs / 60);
                      const s = totalSecs % 60;
                      return `${m}:${s.toString().padStart(2, '0')} total`;
                    })()}
                  </Text>
                </View>
                <View style={styles.workoutActions}>
                  <TouchableOpacity style={styles.startBtn} onPress={() => router.push({ pathname: '/timer', params: { workoutId: workout._id } })}>
                    <Text style={styles.startBtnText}>▶</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.editBtn} onPress={() => router.push({ pathname: '/edit-workout', params: { workoutId: workout._id } })}>
                    <Text style={styles.editBtnText}>✎</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteWorkout(workout._id)}>
                    <Text style={styles.deleteBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </>
      )}

      {tab === 'tracker' && (
        <>
          <TouchableOpacity style={styles.createBtn} onPress={() => setShowNewExercise(!showNewExercise)}>
            <Text style={styles.createBtnText}>{showNewExercise ? 'Cancel' : '+ New Exercise'}</Text>
          </TouchableOpacity>

          {showNewExercise && (
            <View style={styles.newExerciseCard}>
              <TextInput
                style={styles.input}
                placeholder="Exercise name (e.g. Bench Press)"
                placeholderTextColor="#999"
                value={newExerciseName}
                onChangeText={setNewExerciseName}
                onSubmitEditing={createExercise}
                returnKeyType="done"
                autoFocus
              />
              <TouchableOpacity style={styles.saveBtn} onPress={createExercise}>
                <Text style={styles.saveBtnText}>Add Exercise</Text>
              </TouchableOpacity>
            </View>
          )}

          {exercisesLoading ? (
            <ActivityIndicator color="#F77E2D" style={{ marginTop: 20 }} />
          ) : exercises.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No exercises yet. Add one to start tracking.</Text>
            </View>
          ) : (
            exercises.map((ex, idx) => {
              const logs = exerciseLogs[ex.exercise] || [];
              const todayLog = logs.find(l => l.date === localDate());
              const allSets = logs.flatMap(l => l.sets || []);
              const bestWeight = allSets.length > 0 ? Math.max(...allSets.map(s => s.weight || 0)) : 0;
              const isExpanded = expandedExercise === ex.exercise;

              return (
                <View key={idx} style={styles.exerciseCard}>
                  <TouchableOpacity onPress={() => toggleExercise(ex.exercise)}>
                    <View style={styles.exerciseHeader}>
                      <Text style={styles.exerciseName}>{ex.exercise}</Text>
                      <View style={styles.exerciseHeaderRight}>
                        <Text style={styles.exerciseDate}>Week {ex.week || getCurrentWeek()}</Text>
                        <TouchableOpacity onPress={() => deleteExercise(ex.exercise)}>
                          <Text style={styles.deleteExerciseText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={styles.exerciseBadges}>
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{todayLog?.sets?.length || 0} sets today</Text>
                      </View>
                      {bestWeight > 0 && (
                        <View style={[styles.badge, styles.badgeGreen]}>
                          <Text style={[styles.badgeText, styles.badgeTextGreen]}>{bestWeight}kg best</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.setsSection}>
                      {todayLog?.sets?.length > 0 && (
                        <>
                          <View style={styles.setsHeader}>
                            <Text style={styles.setsHeaderText}>Set</Text>
                            <Text style={styles.setsHeaderText}>Weight</Text>
                            <Text style={styles.setsHeaderText}>Reps</Text>
                          </View>
                          {todayLog.sets.map((set, sidx) => (
                            <View key={sidx} style={styles.setRow}>
                              <Text style={styles.setNum}>{set.setNumber}</Text>
                              <Text style={styles.setVal}>{set.weight}kg</Text>
                              <Text style={styles.setVal}>{set.reps}</Text>
                            </View>
                          ))}
                        </>
                      )}
                      {(pendingSets[ex.exercise] || []).map((row, ridx) => (
                        <View key={ridx} style={styles.addSetRow}>
                          <TextInput
                            style={styles.setInput}
                            placeholder="kg"
                            placeholderTextColor="#999"
                            keyboardType="numeric"
                            value={row.weight}
                            onChangeText={v => updateRow(ex.exercise, ridx, 'weight', v)}
                          />
                          <TextInput
                            style={styles.setInput}
                            placeholder="reps"
                            placeholderTextColor="#999"
                            keyboardType="numeric"
                            value={row.reps}
                            onChangeText={v => updateRow(ex.exercise, ridx, 'reps', v)}
                          />
                          <TouchableOpacity onPress={() => removeRow(ex.exercise, ridx)}>
                            <Text style={styles.removeRowText}>✕</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                      <View style={styles.rowActions}>
                        <TouchableOpacity style={styles.addRowBtn} onPress={() => addRow(ex.exercise)}>
                          <Text style={styles.addRowBtnText}>+ Add Row</Text>
                        </TouchableOpacity>
                        {(pendingSets[ex.exercise] || []).length > 0 && (
                          <TouchableOpacity style={styles.saveSetsBtn} onPress={() => saveSets(ex.exercise)}>
                            <Text style={styles.saveSetsBtnText}>Save Sets</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      {(() => {
                        const currentNote = exerciseNotes[ex.exercise] !== undefined
                          ? exerciseNotes[ex.exercise]
                          : (todayLog?.notes || '');
                        const isEditing = notesEditing[ex.exercise] ?? currentNote === '';

                        if (isEditing) {
                          return (
                            <TextInput
                              style={styles.notesInput}
                              placeholder="Notes, links, video URLs..."
                              placeholderTextColor="#999"
                              multiline
                              autoFocus
                              value={currentNote}
                              onChangeText={v => scheduleNotesSave(ex.exercise, v)}
                              onBlur={() => flushNotesSave(ex.exercise)}
                            />
                          );
                        }
                        return (
                          <TouchableOpacity
                            style={styles.notesDisplay}
                            onPress={() => setNotesEditing(prev => ({ ...prev, [ex.exercise]: true }))}
                          >
                            <Text style={styles.notesDisplayText}>
                              {renderNotesWithLinks(currentNote)}
                            </Text>
                          </TouchableOpacity>
                        );
                      })()}
                      <TouchableOpacity style={styles.historyBtn} onPress={() => router.push({ pathname: '/exercise-history', params: { exercise: ex.exercise } })}>
                        <Text style={styles.historyBtnText}>View History</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EDE8DF' },
  content: { padding: 24, paddingTop: 60, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#EDE8DF' },
  title: { fontSize: 28, fontWeight: '900', color: '#1A1A1A', marginBottom: 24 },
  tabs: { flexDirection: 'row', backgroundColor: '#D9D3C8', borderRadius: 12, padding: 4, marginBottom: 20, gap: 4 },
  tabBtn: { flex: 1, padding: 10, borderRadius: 10, alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#F77E2D' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#888' },
  tabTextActive: { color: '#fff' },
  createBtn: { backgroundColor: '#F77E2D', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 16 },
  createBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  emptyBox: { backgroundColor: '#D9D3C8', borderRadius: 16, padding: 24, alignItems: 'center' },
  emptyText: { color: '#888', textAlign: 'center', fontSize: 14 },
  workoutCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#D9D3C8', borderRadius: 16, padding: 16, marginBottom: 12 },
  workoutInfo: { flex: 1 },
  workoutName: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  workoutMeta: { fontSize: 12, color: '#888' },
  workoutDuration: { fontSize: 11, color: '#F77E2D', marginTop: 2, fontWeight: '600' },
  workoutActions: { flexDirection: 'row', gap: 8 },
  startBtn: { backgroundColor: '#F77E2D', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  startBtnText: { color: '#fff', fontSize: 14 },
  editBtn: { backgroundColor: '#D9D3C8', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#C4BEB4' },
  editBtnText: { color: '#888', fontSize: 16 },
  deleteBtn: { backgroundColor: '#E8E2D8', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  deleteBtnText: { color: '#888', fontSize: 14 },
  newExerciseCard: { backgroundColor: '#D9D3C8', borderRadius: 16, padding: 16, marginBottom: 16, gap: 12 },
  input: { backgroundColor: '#EDE8DF', borderRadius: 10, padding: 14, fontSize: 15, color: '#1A1A1A' },
  saveBtn: { backgroundColor: '#F77E2D', borderRadius: 10, padding: 12, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700' },
  exerciseCard: { backgroundColor: '#D9D3C8', borderRadius: 16, padding: 16, marginBottom: 12 },
  exerciseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  exerciseName: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  exerciseDate: { fontSize: 12, color: '#888' },
  exerciseHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  deleteExerciseText: { color: '#888', fontSize: 14, fontWeight: '700' },
  exerciseHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  deleteExerciseText: { color: '#888', fontSize: 14, fontWeight: '700' },  exerciseBadges: { flexDirection: 'row', gap: 8 },
  badge: { backgroundColor: '#EDE8DF', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, color: '#888', fontWeight: '600' },
  badgeGreen: { backgroundColor: '#E8F5E9' },
  badgeTextGreen: { color: '#388E3C' },
  setsSection: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#C5BFB4', paddingTop: 12 },
  setsHeader: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  setsHeaderText: { flex: 1, fontSize: 11, color: '#888', textTransform: 'uppercase' },
  setRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  setNum: { flex: 1, fontSize: 13, color: '#888' },
  setVal: { flex: 1, fontSize: 13, color: '#1A1A1A', fontWeight: '600' },
  addSetRow: { flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'center' },
  setInput: { flex: 1, backgroundColor: '#EDE8DF', borderRadius: 8, padding: 10, fontSize: 14, color: '#1A1A1A', textAlign: 'center' },
  removeRowText: { color: '#888', fontSize: 16, paddingHorizontal: 6 },
  rowActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  addRowBtn: { flex: 1, backgroundColor: '#EDE8DF', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  addRowBtnText: { color: '#1A1A1A', fontWeight: '700', fontSize: 13 },
  saveSetsBtn: { flex: 1, backgroundColor: '#F77E2D', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  saveSetsBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  historyBtn: { marginTop: 10, borderWidth: 1, borderColor: '#F77E2D', borderRadius: 8, padding: 10, alignItems: 'center' },
  historyBtnText: { color: '#F77E2D', fontWeight: '600', fontSize: 13 },
  notesInput: { backgroundColor: '#EDE8DF', borderRadius: 8, padding: 10, fontSize: 13, color: '#1A1A1A', marginTop: 10, minHeight: 60, textAlignVertical: 'top' },
  notesDisplay: { backgroundColor: '#EDE8DF', borderRadius: 8, padding: 10, marginTop: 10, minHeight: 60 },
  notesDisplayText: { fontSize: 13, color: '#1A1A1A', lineHeight: 18 },
  linkText: { color: '#F77E2D', textDecorationLine: 'underline', fontWeight: '600' }
});