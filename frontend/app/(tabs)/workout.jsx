import { useState, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
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

const KG_TO_LBS = 2.20462;

const displayWeight = (kg, unit) => {
  if (kg === undefined || kg === null) return '';
  const val = unit === 'lbs' ? kg * KG_TO_LBS : kg;
  return Math.round(val * 10) / 10;
};

const toKg = (value, unit) => {
  const num = parseFloat(value) || 0;
  return unit === 'lbs' ? num / KG_TO_LBS : num;
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

const ExerciseNotesEditor = forwardRef(function ExerciseNotesEditor({ initialValue }, ref) {
  const [value, setValue] = useState(initialValue || '');
  const [isEditing, setIsEditing] = useState(!initialValue);
  const valueRef = useRef(initialValue || '');
  const hasFocusedRef = useRef(false);

  useImperativeHandle(ref, () => ({
    getValue: () => valueRef.current
  }));

  const handleChange = (v) => {
    setValue(v);
    valueRef.current = v;
  };

  const handleBlur = () => {
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <TextInput
        ref={(node) => {
          if (node && !hasFocusedRef.current) {
            hasFocusedRef.current = true;
            node.focus();
          }
        }}
        style={styles.notesInput}
        placeholder="Notes, links, video URLs..."
        placeholderTextColor="#999"
        multiline
        value={value}
        onChangeText={handleChange}
        onBlur={handleBlur}
      />
    );
  }

  return (
    <TouchableOpacity style={styles.notesDisplay} onPress={() => setIsEditing(true)}>
      <Text style={styles.notesDisplayText}>{renderNotesWithLinks(value)}</Text>
    </TouchableOpacity>
  );
});

function WeekEditor({ week, onSave }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(week ?? ''));

  const confirm = () => {
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed)) onSave(parsed);
    setEditing(false);
  };

  if (editing) {
    return (
      <View style={styles.weekEditRow}>
        <TextInput
          style={styles.weekInput}
          keyboardType="numeric"
          value={value}
          onChangeText={setValue}
          onBlur={confirm}
          onSubmitEditing={confirm}
          autoFocus
        />
      </View>
    );
  }

  return (
    <TouchableOpacity onPress={() => { setValue(String(week ?? '')); setEditing(true); }}>
      <Text style={styles.exerciseDate}>Week {week ?? '-'}</Text>
    </TouchableOpacity>
  );
}

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
  const [exercisesPage, setExercisesPage] = useState(0);
  const [weightUnit, setWeightUnit] = useState('kg');
  const [editingExercise, setEditingExercise] = useState(null);
  const [editName, setEditName] = useState('');
  const [editSetsToday, setEditSetsToday] = useState([]);
  const [editNotesValue, setEditNotesValue] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [savingExercise, setSavingExercise] = useState(null);
  const notesRefs = useRef({});
  const EXERCISES_PER_PAGE = 10;
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      fetchWorkouts();
      fetchExercises();
      fetchWeightUnit();
      return () => setExpandedExercise(null);
    }, [])
  );

  const fetchWeightUnit = async () => {
    try {
      const res = await api.get('/auth/me');
      setWeightUnit(res.data.weightUnit || 'kg');
    } catch (err) {
      console.error(err);
    }
  };

  const changeWeightUnit = async (unit) => {
    setWeightUnit(unit);
    try {
      await api.put('/auth/profile', { weightUnit: unit });
    } catch (err) {
      console.error(err);
    }
  };

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
      const logResults = await Promise.all(
        res.data.map(ex =>
          api.get(`/exercises/${encodeURIComponent(ex.exercise)}`)
            .then(r => ({ exercise: ex.exercise, logs: r.data }))
            .catch(() => ({ exercise: ex.exercise, logs: [] }))
        )
      );
      setExerciseLogs(prev => {
        const updated = { ...prev };
        logResults.forEach(({ exercise, logs }) => { updated[exercise] = logs; });
        return updated;
      });
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

  const getFreshTodayLog = async (exercise) => {
    try {
      const res = await api.get(`/exercises/${encodeURIComponent(exercise)}`);
      setExerciseLogs(prev => ({ ...prev, [exercise]: res.data }));
      return res.data.find(l => l.date === localDate()) || null;
    } catch (err) {
      console.error(err);
      const logs = exerciseLogs[exercise] || [];
      return logs.find(l => l.date === localDate()) || null;
    }
  };

  const saveWeek = async (exercise, newWeek) => {
    const todayLog = await getFreshTodayLog(exercise);
    try {
      await api.post('/exercises', {
        exercise,
        date: localDate(),
        sets: todayLog?.sets || [],
        notes: todayLog?.notes || '',
        weekOverride: newWeek
      });
      fetchExerciseLogs(exercise);
      fetchExercises();
    } catch (err) {
      console.error(err);
    }
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

  const saveAll = async (exercise) => {
    const capturedNotes = notesRefs.current[exercise]?.getValue();
    setSavingExercise(exercise);
    try {
      const todayLog = await getFreshTodayLog(exercise);
      const existingSets = todayLog?.sets || [];
      const rows = pendingSets[exercise] || [];
      const addedSets = rows
        .filter(row => row.weight !== '' || row.reps !== '')
        .map((row, i) => ({
          setNumber: existingSets.length + i + 1,
          weight: toKg(row.weight, weightUnit),
          reps: parseInt(row.reps) || 0
        }));
      const newSets = [...existingSets, ...addedSets];
      const notesValue = capturedNotes ?? (todayLog?.notes || '');

      await api.post('/exercises', {
        exercise,
        date: localDate(),
        sets: newSets,
        notes: notesValue
      });
      setPendingSets(prev => ({ ...prev, [exercise]: [] }));
      await fetchExerciseLogs(exercise);
      await fetchExercises();
      setExpandedExercise(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingExercise(null);
    }
  };

  const startEditExercise = async (exercise) => {
    setEditingExercise(exercise);
    setEditName(exercise);
    const todayLog = await getFreshTodayLog(exercise);
    setEditSetsToday((todayLog?.sets || []).map(s => ({ weight: String(displayWeight(s.weight, weightUnit) ?? ''), reps: String(s.reps ?? '') })));
    setEditNotesValue(todayLog?.notes || '');
  };

  const cancelEditExercise = () => {
    setEditingExercise(null);
    setEditName('');
    setEditSetsToday([]);
    setEditNotesValue('');
  };

  const updateEditSet = (idx, field, value) => {
    setEditSetsToday(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const addEditSet = () => {
    setEditSetsToday(prev => [...prev, { weight: '', reps: '' }]);
  };

  const removeEditSet = (idx) => {
    setEditSetsToday(prev => prev.filter((_, i) => i !== idx));
  };

  const confirmEditExercise = async () => {
    const trimmedName = editName.trim();
    if (!trimmedName) return;
    setSavingEdit(true);
    try {
      if (trimmedName !== editingExercise) {
        await api.put(`/exercises/by-name/${encodeURIComponent(editingExercise)}/rename`, { newName: trimmedName });
      }
      const sets = editSetsToday.map((s, i) => ({
        setNumber: i + 1,
        weight: toKg(s.weight, weightUnit),
        reps: parseInt(s.reps) || 0
      }));
      await api.post('/exercises', {
        exercise: trimmedName,
        date: localDate(),
        sets,
        notes: editNotesValue
      });
      if (expandedExercise === editingExercise) setExpandedExercise(trimmedName);
      cancelEditExercise();
      fetchExercises();
      fetchExerciseLogs(trimmedName);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingEdit(false);
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

  const createExercise = async () => {
    if (!newExerciseName.trim()) return;
    try {
      await api.post('/exercises', {
        exercise: newExerciseName.trim(),
        date: localDate(),
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

  const pagedExercises = exercises.slice(exercisesPage * EXERCISES_PER_PAGE, exercisesPage * EXERCISES_PER_PAGE + EXERCISES_PER_PAGE);

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

          <View style={styles.unitToggleRow}>
            <Text style={styles.unitToggleLabel}>Weight Unit</Text>
            <View style={styles.unitToggle}>
              <TouchableOpacity
                style={[styles.unitBtn, weightUnit === 'kg' && styles.unitBtnActive]}
                onPress={() => changeWeightUnit('kg')}
              >
                <Text style={[styles.unitBtnText, weightUnit === 'kg' && styles.unitBtnTextActive]}>kg</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.unitBtn, weightUnit === 'lbs' && styles.unitBtnActive]}
                onPress={() => changeWeightUnit('lbs')}
              >
                <Text style={[styles.unitBtnText, weightUnit === 'lbs' && styles.unitBtnTextActive]}>lbs</Text>
              </TouchableOpacity>
            </View>
          </View>

          {exercisesLoading ? (
            <ActivityIndicator color="#F77E2D" style={{ marginTop: 20 }} />
          ) : exercises.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No exercises yet. Add one to start tracking.</Text>
            </View>
          ) : (
            <>
              {pagedExercises.map((ex, idx) => {
                const logs = exerciseLogs[ex.exercise] || [];
                const todayLog = logs.find(l => l.date === localDate());
                const allSets = logs.flatMap(l => l.sets || []);
                const bestWeight = allSets.length > 0 ? Math.max(...allSets.map(s => s.weight || 0)) : 0;
                const bestReps = allSets.length > 0 ? Math.max(...allSets.map(s => s.reps || 0)) : 0;
                const isBodyweight = bestWeight === 0 && bestReps > 0;
                const isExpanded = expandedExercise === ex.exercise;
                const isEditingThis = editingExercise === ex.exercise;

                if (isEditingThis) {
                  return (
                    <View key={ex.exercise} style={styles.exerciseCard}>
                      <TextInput
                        style={styles.renameInput}
                        value={editName}
                        onChangeText={setEditName}
                        autoFocus
                      />

                      <Text style={styles.editSectionLabel}>Today's Sets</Text>
                      {editSetsToday.map((s, sidx) => (
                        <View key={sidx} style={styles.addSetRow}>
                          <TextInput
                            style={styles.setInput}
                            placeholder={weightUnit}
                            placeholderTextColor="#999"
                            keyboardType="numeric"
                            value={s.weight}
                            onChangeText={v => updateEditSet(sidx, 'weight', v)}
                          />
                          <TextInput
                            style={styles.setInput}
                            placeholder="reps"
                            placeholderTextColor="#999"
                            keyboardType="numeric"
                            value={s.reps}
                            onChangeText={v => updateEditSet(sidx, 'reps', v)}
                          />
                          <TouchableOpacity onPress={() => removeEditSet(sidx)}>
                            <Text style={styles.removeRowText}>✕</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                      <TouchableOpacity style={styles.addRowBtn} onPress={addEditSet}>
                        <Text style={styles.addRowBtnText}>+ Add Set</Text>
                      </TouchableOpacity>

                      <Text style={styles.editSectionLabel}>Notes</Text>
                      <TextInput
                        style={styles.notesInput}
                        placeholder="Notes, links, video URLs..."
                        placeholderTextColor="#999"
                        multiline
                        value={editNotesValue}
                        onChangeText={setEditNotesValue}
                      />

                      <View style={styles.renameRow}>
                        <TouchableOpacity style={styles.renameCancelBtn} onPress={cancelEditExercise}>
                          <Text style={styles.renameCancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.renameSaveBtn} onPress={confirmEditExercise} disabled={savingEdit}>
                          {savingEdit ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.renameSaveBtnText}>Save</Text>}
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                }

                return (
                  <View key={ex.exercise} style={styles.exerciseCard}>
                    <View style={styles.exerciseHeader}>
                      <TouchableOpacity style={{ flex: 1 }} onPress={() => toggleExercise(ex.exercise)}>
                        <Text style={styles.exerciseName}>{ex.exercise}</Text>
                      </TouchableOpacity>
                      <View style={styles.exerciseHeaderRight}>
                        <WeekEditor week={ex.week} onSave={(w) => saveWeek(ex.exercise, w)} />
                        {isExpanded && (
                          <TouchableOpacity onPress={() => setExpandedExercise(null)}>
                            <Text style={styles.minimizeText}>⌃</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity onPress={() => startEditExercise(ex.exercise)}>
                          <Text style={styles.renameExerciseText}>✎</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => deleteExercise(ex.exercise)}>
                          <Text style={styles.deleteExerciseText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => toggleExercise(ex.exercise)}>
                      <View style={styles.exerciseBadges}>
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>{todayLog?.sets?.length || 0} sets today</Text>
                        </View>
                        {bestWeight > 0 ? (
                          <View style={[styles.badge, styles.badgeGreen]}>
                            <Text style={[styles.badgeText, styles.badgeTextGreen]}>{displayWeight(bestWeight, weightUnit)}{weightUnit} best</Text>
                          </View>
                        ) : isBodyweight ? (
                          <View style={[styles.badge, styles.badgeGreen]}>
                            <Text style={[styles.badgeText, styles.badgeTextGreen]}>{bestReps} reps best</Text>
                          </View>
                        ) : null}
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
                                <Text style={styles.setVal}>{displayWeight(set.weight, weightUnit)}{weightUnit}</Text>
                                <Text style={styles.setVal}>{set.reps}</Text>
                              </View>
                            ))}
                          </>
                        )}
                        {(pendingSets[ex.exercise] || []).map((row, ridx) => (
                          <View key={ridx} style={styles.addSetRow}>
                            <TextInput
                              style={styles.setInput}
                              placeholder={weightUnit}
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
                        <TouchableOpacity style={styles.addRowBtn} onPress={() => addRow(ex.exercise)}>
                          <Text style={styles.addRowBtnText}>+ Add Row</Text>
                        </TouchableOpacity>
                        <ExerciseNotesEditor
                          ref={(el) => { notesRefs.current[ex.exercise] = el; }}
                          key={`${ex.exercise}-notes`}
                          initialValue={todayLog?.notes || ''}
                        />
                        <TouchableOpacity
                          style={styles.saveSetsBtn}
                          onPress={() => saveAll(ex.exercise)}
                          disabled={savingExercise === ex.exercise}
                        >
                          {savingExercise === ex.exercise
                            ? <ActivityIndicator size="small" color="#fff" />
                            : <Text style={styles.saveSetsBtnText}>Save</Text>
                          }
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.historyBtn} onPress={() => router.push({ pathname: '/exercise-history', params: { exercise: ex.exercise } })}>
                          <Text style={styles.historyBtnText}>View History</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}

              {exercises.length > EXERCISES_PER_PAGE && (
                <View style={styles.paginationRow}>
                  <TouchableOpacity
                    style={[styles.pageBtn, exercisesPage === 0 && styles.pageBtnDisabled]}
                    disabled={exercisesPage === 0}
                    onPress={() => setExercisesPage(p => p - 1)}
                  >
                    <Text style={[styles.pageBtnText, exercisesPage === 0 && styles.pageBtnTextDisabled]}>‹ Prev</Text>
                  </TouchableOpacity>
                  <Text style={styles.pageIndicator}>
                    Page {exercisesPage + 1} of {Math.ceil(exercises.length / EXERCISES_PER_PAGE)}
                  </Text>
                  <TouchableOpacity
                    style={[styles.pageBtn, (exercisesPage + 1) * EXERCISES_PER_PAGE >= exercises.length && styles.pageBtnDisabled]}
                    disabled={(exercisesPage + 1) * EXERCISES_PER_PAGE >= exercises.length}
                    onPress={() => setExercisesPage(p => p + 1)}
                  >
                    <Text style={[styles.pageBtnText, (exercisesPage + 1) * EXERCISES_PER_PAGE >= exercises.length && styles.pageBtnTextDisabled]}>Next ›</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
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
  unitToggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  unitToggleLabel: { fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 1 },
  unitToggle: { flexDirection: 'row', backgroundColor: '#D9D3C8', borderRadius: 10, padding: 3, gap: 3 },
  unitBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 8 },
  unitBtnActive: { backgroundColor: '#F77E2D' },
  unitBtnText: { fontSize: 12, fontWeight: '700', color: '#888' },
  unitBtnTextActive: { color: '#fff' },
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
  renameExerciseText: { color: '#888', fontSize: 14 },
  renameRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  renameInput: { flex: 1, backgroundColor: '#EDE8DF', borderRadius: 10, padding: 12, fontSize: 15, color: '#1A1A1A', fontWeight: '700' },
  renameCancelBtn: { backgroundColor: '#EDE8DF', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12 },
  renameCancelBtnText: { color: '#888', fontWeight: '700', fontSize: 13 },
  renameSaveBtn: { backgroundColor: '#F77E2D', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12 },
  renameSaveBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  editSectionLabel: { fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginTop: 14, marginBottom: 8 },
  minimizeText: { color: '#F77E2D', fontSize: 16, fontWeight: '900' },
  weekEditRow: { flexDirection: 'row', alignItems: 'center' },
  weekInput: { backgroundColor: '#EDE8DF', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, fontSize: 12, color: '#1A1A1A', width: 50, textAlign: 'center' },
  exerciseBadges: { flexDirection: 'row', gap: 8 },
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
  addRowBtn: { backgroundColor: '#EDE8DF', borderRadius: 8, paddingVertical: 10, alignItems: 'center', marginTop: 8 },
  addRowBtnText: { color: '#1A1A1A', fontWeight: '700', fontSize: 13 },
  saveSetsBtn: { backgroundColor: '#F77E2D', borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: 10 },
  saveSetsBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  historyBtn: { marginTop: 10, borderWidth: 1, borderColor: '#F77E2D', borderRadius: 8, padding: 10, alignItems: 'center' },
  historyBtnText: { color: '#F77E2D', fontWeight: '600', fontSize: 13 },
  notesInput: { backgroundColor: '#EDE8DF', borderRadius: 8, padding: 10, fontSize: 13, color: '#1A1A1A', marginTop: 10, minHeight: 80, textAlignVertical: 'top' },
  notesDisplay: { backgroundColor: '#EDE8DF', borderRadius: 8, padding: 10, marginTop: 10, minHeight: 60 },
  notesDisplayText: { fontSize: 13, color: '#1A1A1A', lineHeight: 18 },
  linkText: { color: '#F77E2D', textDecorationLine: 'underline', fontWeight: '600' },
  paginationRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 },
  pageBtn: { paddingVertical: 8, paddingHorizontal: 14, backgroundColor: '#D9D3C8', borderRadius: 8 },
  pageBtnDisabled: { opacity: 0.4 },
  pageBtnText: { color: '#F77E2D', fontWeight: '700', fontSize: 13 },
  pageBtnTextDisabled: { color: '#888' },
  pageIndicator: { fontSize: 12, color: '#888' }
});