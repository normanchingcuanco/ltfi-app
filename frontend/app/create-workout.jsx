import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Switch, Platform, KeyboardAvoidingView, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import api from '../src/utils/api';
import { searchMET } from '../src/utils/metValues';

const WORKOUT_TYPES = ['HIIT', 'Tabata', 'circuit', 'custom'];

const showAlert = (title, message) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}: ${message}`);
  } else {
    const { Alert } = require('react-native');
    Alert.alert(title, message);
  }
};

export default function CreateWorkoutScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [type, setType] = useState('custom');
  const [mode, setMode] = useState('simple');
  const [rounds, setRounds] = useState('1');
  const [saving, setSaving] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [warmUpMins, setWarmUpMins] = useState('');
  const [warmUpSecs, setWarmUpSecs] = useState('00');
  const [coolDownMins, setCoolDownMins] = useState('');
  const [coolDownSecs, setCoolDownSecs] = useState('00');
  const [numericFocused, setNumericFocused] = useState(false);

  const [simpleDurationMins, setSimpleDurationMins] = useState('');
  const [simpleDurationSecs, setSimpleDurationSecs] = useState('00');
  const [simpleExercise, setSimpleExercise] = useState('');
  const [simpleMet, setSimpleMet] = useState(5.0);
  const [simpleSearchResults, setSimpleSearchResults] = useState([]);
  const [simpleSearching, setSimpleSearching] = useState(false);

  const [intervals, setIntervals] = useState([{ name: '', workSeconds: '30', restSeconds: '0', met: 5.0 }]);
  const [searchingIdx, setSearchingIdx] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  const addInterval = () => {
    setIntervals(prev => [...prev, { name: '', workSeconds: '30', restSeconds: '0', met: 5.0 }]);
  };

  const removeInterval = (idx) => {
    setIntervals(prev => prev.filter((_, i) => i !== idx));
  };

  const moveInterval = (idx, direction) => {
    setIntervals(prev => {
      const arr = [...prev];
      const target = idx + direction;
      if (target < 0 || target >= arr.length) return arr;
      [arr[idx], arr[target]] = [arr[target], arr[idx]];
      return arr;
    });
  };

  const updateInterval = (idx, key, val) => {
    setIntervals(prev => prev.map((item, i) => i === idx ? { ...item, [key]: val } : item));
  };

  const handleExerciseSearch = (idx, query) => {
    setSearchingIdx(idx);
    setSearchQuery(query);
    updateInterval(idx, 'name', query);
    setSearchResults(searchMET(query).slice(0, 6));
  };

  const selectExercise = (idx, exercise) => {
    setIntervals(prev => prev.map((item, i) => i === idx ? {
      ...item,
      name: exercise.name,
      met: exercise.met
    } : item));
    setSearchingIdx(null);
    setSearchQuery('');
    setSearchResults([]);
  };

  const confirmCustomName = (idx) => {
    setSearchingIdx(null);
    setSearchResults([]);
  };

  const handleSimpleSearch = (query) => {
    setSimpleExercise(query);
    setSimpleSearching(true);
    setSimpleSearchResults(searchMET(query).slice(0, 6));
  };

  const selectSimpleExercise = (exercise) => {
    setSimpleExercise(exercise.name);
    setSimpleMet(exercise.met);
    setSimpleSearching(false);
    setSimpleSearchResults([]);
  };

  const handleSave = async () => {
    if (!name.trim()) return showAlert('Error', 'Workout name is required');

    const warmUpSeconds = (parseInt(warmUpMins) || 0) * 60 + (parseInt(warmUpSecs) || 0);
    const coolDownSeconds = (parseInt(coolDownMins) || 0) * 60 + (parseInt(coolDownSecs) || 0);

    let payload;

    if (mode === 'simple') {
      if (!simpleDurationMins) return showAlert('Error', 'Duration is required');
      const totalSeconds = (parseInt(simpleDurationMins) || 0) * 60 + (parseInt(simpleDurationSecs) || 0);
      if (totalSeconds <= 0) return showAlert('Error', 'Duration must be greater than 0');

      payload = {
        name, type, mode: 'simple', rounds: 1, repeat,
        warmUp: warmUpSeconds, coolDown: coolDownSeconds,
        intervals: [{
          name: simpleExercise || name,
          workSeconds: totalSeconds,
          restSeconds: 0,
          met: simpleMet
        }]
      };
    } else {
      payload = {
        name, type, mode: 'complex',
        rounds: parseInt(rounds) || 1,
        repeat,
        warmUp: warmUpSeconds,
        coolDown: coolDownSeconds,
        intervals: intervals.map(i => ({
          name: i.name.trim() || 'Interval',
          workSeconds: parseInt(i.workSeconds) || 30,
          restSeconds: parseInt(i.restSeconds) || 0,
          met: i.met || 5.0
        }))
      };
    }

    setSaving(true);
    try {
      await api.post('/workouts', payload);
      router.replace('/(tabs)/workout');
    } catch (err) {
      showAlert('Error', 'Failed to save workout.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Create Workout</Text>

        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Morning Run"
          placeholderTextColor="#999"
          value={name}
          onChangeText={setName}
          returnKeyType="done"
          blurOnSubmit={true}
        />

        <Text style={styles.label}>Type</Text>
        <View style={styles.pills}>
          {WORKOUT_TYPES.map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.pill, type === t && styles.pillActive]}
              onPress={() => setType(t)}
            >
              <Text style={[styles.pillText, type === t && styles.pillTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Mode</Text>
        <View style={styles.modeTabs}>
          <TouchableOpacity
            style={[styles.modeTab, mode === 'simple' && styles.modeTabActive]}
            onPress={() => setMode('simple')}
          >
            <Text style={[styles.modeTabText, mode === 'simple' && styles.modeTabTextActive]}>Simple</Text>
            <Text style={[styles.modeTabSub, mode === 'simple' && styles.modeTabTextActive]}>Single countdown</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeTab, mode === 'complex' && styles.modeTabActive]}
            onPress={() => setMode('complex')}
          >
            <Text style={[styles.modeTabText, mode === 'complex' && styles.modeTabTextActive]}>Complex</Text>
            <Text style={[styles.modeTabSub, mode === 'complex' && styles.modeTabTextActive]}>Work / Rest intervals</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.label}>Warm Up</Text>
          <View style={styles.durationRow}>
            <View style={styles.durationField}>
              <TextInput
                style={styles.durationInput}
                placeholder="0"
                placeholderTextColor="#999"
                keyboardType="number-pad"
                value={warmUpMins}
                onChangeText={setWarmUpMins}
                onFocus={() => setNumericFocused(true)}
                onBlur={() => setNumericFocused(false)}
              />
              <Text style={styles.durationUnit}>min</Text>
            </View>
            <View style={styles.durationField}>
              <TextInput
                style={styles.durationInput}
                placeholder="00"
                placeholderTextColor="#999"
                keyboardType="number-pad"
                value={warmUpSecs}
                onChangeText={setWarmUpSecs}
                onFocus={() => setNumericFocused(true)}
                onBlur={() => setNumericFocused(false)}
              />
              <Text style={styles.durationUnit}>sec</Text>
            </View>
          </View>
        </View>

        {mode === 'simple' && (
          <View style={styles.simpleCard}>
            <Text style={styles.label}>Exercise (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Search exercise..."
              placeholderTextColor="#999"
              value={simpleExercise}
              onChangeText={handleSimpleSearch}
              returnKeyType="done"
              blurOnSubmit={true}
              onFocus={() => {
                setSimpleSearching(true);
                setSimpleSearchResults(searchMET('').slice(0, 6));
              }}
            />
            {simpleSearching && simpleSearchResults.length > 0 && (
              <View style={styles.dropdown}>
                {simpleSearchResults.map((exercise, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.dropdownItem}
                    onPress={() => selectSimpleExercise(exercise)}
                  >
                    <Text style={styles.dropdownName}>{exercise.name}</Text>
                    <Text style={styles.dropdownMeta}>{exercise.category} · MET {exercise.met}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {simpleExercise && simpleMet ? (
              <Text style={styles.metBadge}>MET: {simpleMet}</Text>
            ) : null}

            <Text style={styles.label}>Duration</Text>
            <View style={styles.durationRow}>
              <View style={styles.durationField}>
                <TextInput
                  style={styles.durationInput}
                  placeholder="0"
                  placeholderTextColor="#999"
                  keyboardType="number-pad"
                  value={simpleDurationMins}
                  onChangeText={setSimpleDurationMins}
                  onFocus={() => setNumericFocused(true)}
                  onBlur={() => setNumericFocused(false)}
                />
                <Text style={styles.durationUnit}>min</Text>
              </View>
              <View style={styles.durationField}>
                <TextInput
                  style={styles.durationInput}
                  placeholder="00"
                  placeholderTextColor="#999"
                  keyboardType="number-pad"
                  value={simpleDurationSecs}
                  onChangeText={setSimpleDurationSecs}
                  onFocus={() => setNumericFocused(true)}
                  onBlur={() => setNumericFocused(false)}
                />
                <Text style={styles.durationUnit}>sec</Text>
              </View>
            </View>
          </View>
        )}

        {mode === 'complex' && (
          <>
            <Text style={styles.label}>Rounds</Text>
            <TextInput
              style={styles.input}
              placeholder="1"
              placeholderTextColor="#999"
              keyboardType="number-pad"
              value={rounds}
              onChangeText={setRounds}
              onFocus={() => setNumericFocused(true)}
              onBlur={() => setNumericFocused(false)}
            />

            <Text style={styles.label}>Intervals</Text>
            {intervals.map((interval, idx) => (
              <View key={idx} style={styles.intervalCard}>
                <View style={styles.intervalHeader}>
                  <Text style={styles.intervalNum}>Interval {idx + 1}</Text>
                  <View style={styles.intervalActions}>
                    {idx > 0 && (
                      <TouchableOpacity onPress={() => moveInterval(idx, -1)} style={styles.moveBtn}>
                        <Text style={styles.moveBtnText}>↑</Text>
                      </TouchableOpacity>
                    )}
                    {idx < intervals.length - 1 && (
                      <TouchableOpacity onPress={() => moveInterval(idx, 1)} style={styles.moveBtn}>
                        <Text style={styles.moveBtnText}>↓</Text>
                      </TouchableOpacity>
                    )}
                    {intervals.length > 1 && (
                      <TouchableOpacity onPress={() => removeInterval(idx)}>
                        <Text style={styles.removeText}>Remove</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                <Text style={styles.fieldLabel}>Exercise</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Search or type exercise name..."
                  placeholderTextColor="#999"
                  value={searchingIdx === idx ? searchQuery : interval.name}
                  onChangeText={val => handleExerciseSearch(idx, val)}
                  onFocus={() => {
                    setSearchingIdx(idx);
                    setSearchResults(searchMET('').slice(0, 6));
                  }}
                  returnKeyType="done"
                  onSubmitEditing={() => confirmCustomName(idx)}
                />

                {searchingIdx === idx && searchResults.length > 0 && (
                  <View style={styles.dropdown}>
                    {searchResults.map((exercise, eidx) => (
                      <TouchableOpacity
                        key={eidx}
                        style={styles.dropdownItem}
                        onPress={() => selectExercise(idx, exercise)}
                      >
                        <Text style={styles.dropdownName}>{exercise.name}</Text>
                        <Text style={styles.dropdownMeta}>{exercise.category} · MET {exercise.met}</Text>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                      style={styles.useCustomBtn}
                      onPress={() => confirmCustomName(idx)}
                    >
                      <Text style={styles.useCustomText}>
                        {interval.name ? `Use "${interval.name}"` : 'Use custom name'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {interval.met && interval.name && searchingIdx !== idx ? (
                  <Text style={styles.metBadge}>MET: {interval.met}</Text>
                ) : null}

                <View style={styles.timeRow}>
                  <View style={styles.timeField}>
                    <Text style={styles.timeLabel}>Work (sec)</Text>
                    <TextInput
                      style={styles.timeInput}
                      keyboardType="number-pad"
                      value={interval.workSeconds}
                      onChangeText={val => updateInterval(idx, 'workSeconds', val)}
                      onFocus={() => setNumericFocused(true)}
                      onBlur={() => setNumericFocused(false)}
                    />
                  </View>
                  <View style={styles.timeField}>
                    <Text style={styles.timeLabel}>Rest (sec)</Text>
                    <TextInput
                      style={styles.timeInput}
                      keyboardType="number-pad"
                      value={interval.restSeconds}
                      onChangeText={val => updateInterval(idx, 'restSeconds', val)}
                      onFocus={() => setNumericFocused(true)}
                      onBlur={() => setNumericFocused(false)}
                    />
                  </View>
                </View>
              </View>
            ))}

            <TouchableOpacity style={styles.addIntervalBtn} onPress={addInterval}>
              <Text style={styles.addIntervalText}>+ Add Interval</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={styles.sectionCard}>
          <View style={styles.repeatRow}>
            <Text style={styles.repeatLabel}>Repeat</Text>
            <Switch
              value={repeat}
              onValueChange={setRepeat}
              trackColor={{ false: '#D9D3C8', true: '#F77E2D' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.label}>Cool Down</Text>
          <View style={styles.durationRow}>
            <View style={styles.durationField}>
              <TextInput
                style={styles.durationInput}
                placeholder="0"
                placeholderTextColor="#999"
                keyboardType="number-pad"
                value={coolDownMins}
                onChangeText={setCoolDownMins}
                onFocus={() => setNumericFocused(true)}
                onBlur={() => setNumericFocused(false)}
              />
              <Text style={styles.durationUnit}>min</Text>
            </View>
            <View style={styles.durationField}>
              <TextInput
                style={styles.durationInput}
                placeholder="00"
                placeholderTextColor="#999"
                keyboardType="number-pad"
                value={coolDownSecs}
                onChangeText={setCoolDownSecs}
                onFocus={() => setNumericFocused(true)}
                onBlur={() => setNumericFocused(false)}
              />
              <Text style={styles.durationUnit}>sec</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Workout'}</Text>
        </TouchableOpacity>
      </ScrollView>

      {numericFocused && Platform.OS === 'ios' && (
        <TouchableOpacity
          style={styles.floatingDone}
          onPress={() => { Keyboard.dismiss(); setNumericFocused(false); }}
        >
          <Text style={styles.floatingDoneText}>Done</Text>
        </TouchableOpacity>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EDE8DF' },
  content: { padding: 24, paddingTop: 60, paddingBottom: 40 },
  back: { color: '#F77E2D', fontSize: 14, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '900', color: '#1A1A1A', marginBottom: 24 },
  label: { fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  input: { backgroundColor: '#D9D3C8', borderRadius: 12, padding: 14, fontSize: 15, color: '#1A1A1A', marginBottom: 8 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  pill: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 99, backgroundColor: '#D9D3C8' },
  pillActive: { backgroundColor: '#F77E2D' },
  pillText: { fontSize: 12, color: '#666', textTransform: 'capitalize' },
  pillTextActive: { color: '#fff', fontWeight: '700' },
  modeTabs: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  modeTab: { flex: 1, backgroundColor: '#D9D3C8', borderRadius: 16, padding: 16, alignItems: 'center' },
  modeTabActive: { backgroundColor: '#F77E2D' },
  modeTabText: { fontSize: 15, fontWeight: '700', color: '#888' },
  modeTabTextActive: { color: '#fff' },
  modeTabSub: { fontSize: 11, color: '#aaa', marginTop: 4 },
  sectionCard: { backgroundColor: '#D9D3C8', borderRadius: 16, padding: 16, marginBottom: 16 },
  simpleCard: { backgroundColor: '#D9D3C8', borderRadius: 16, padding: 16, marginBottom: 16 },
  durationRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  durationField: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#EDE8DF', borderRadius: 12, paddingHorizontal: 14, overflow: 'hidden' },
  durationInput: { flex: 1, fontSize: 24, fontWeight: '900', color: '#1A1A1A', padding: 12, textAlign: 'center', minWidth: 0 },
  durationUnit: { fontSize: 13, color: '#888', fontWeight: '600' },
  repeatRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  repeatLabel: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  dropdown: { backgroundColor: '#EDE8DF', borderRadius: 10, marginBottom: 8 },
  dropdownItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#D9D3C8' },
  dropdownName: { fontSize: 13, fontWeight: '600', color: '#1A1A1A' },
  dropdownMeta: { fontSize: 11, color: '#888', marginTop: 2 },
  useCustomBtn: { padding: 12, alignItems: 'center' },
  useCustomText: { fontSize: 13, color: '#F77E2D', fontWeight: '700' },
  metBadge: { fontSize: 11, color: '#F77E2D', fontWeight: '600', marginBottom: 10 },
  intervalCard: { backgroundColor: '#D9D3C8', borderRadius: 16, padding: 16, marginBottom: 12 },
  intervalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  intervalNum: { fontSize: 13, fontWeight: '700', color: '#1A1A1A' },
  intervalActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  moveBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#EDE8DF', justifyContent: 'center', alignItems: 'center' },
  moveBtnText: { fontSize: 14, color: '#888', fontWeight: '700' },
  removeText: { fontSize: 12, color: '#F77E2D', fontWeight: '700' },
  fieldLabel: { fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  timeRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  timeField: { flex: 1 },
  timeLabel: { fontSize: 11, color: '#888', marginBottom: 6, textTransform: 'uppercase' },
  timeInput: { backgroundColor: '#EDE8DF', borderRadius: 10, padding: 12, fontSize: 15, color: '#1A1A1A', textAlign: 'center' },
  addIntervalBtn: { borderWidth: 1.5, borderColor: '#F77E2D', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 16 },
  addIntervalText: { color: '#F77E2D', fontWeight: '700' },
  saveBtn: { backgroundColor: '#F77E2D', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 40 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  floatingDone: { backgroundColor: '#D9D3C8', padding: 12, alignItems: 'flex-end', borderTopWidth: 1, borderTopColor: '#C4BEB4' },
  floatingDoneText: { color: '#F77E2D', fontWeight: '700', fontSize: 16, paddingRight: 16 },
});