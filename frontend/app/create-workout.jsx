import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import api from '../src/utils/api';

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
  const [rounds, setRounds] = useState('1');
  const [intervals, setIntervals] = useState([{ name: '', workSeconds: '30', restSeconds: '10' }]);
  const [saving, setSaving] = useState(false);

  const addInterval = () => {
    setIntervals(prev => [...prev, { name: '', workSeconds: '30', restSeconds: '10' }]);
  };

  const removeInterval = (idx) => {
    setIntervals(prev => prev.filter((_, i) => i !== idx));
  };

  const updateInterval = (idx, key, val) => {
    setIntervals(prev => prev.map((item, i) => i === idx ? { ...item, [key]: val } : item));
  };

  const handleSave = async () => {
    if (!name.trim()) return showAlert('Error', 'Workout name is required');
    if (intervals.some(i => !i.name.trim())) return showAlert('Error', 'All intervals need a name');

    setSaving(true);
    try {
      await api.post('/workouts', {
        name,
        type,
        rounds: parseInt(rounds) || 1,
        intervals: intervals.map(i => ({
          name: i.name,
          workSeconds: parseInt(i.workSeconds) || 30,
          restSeconds: parseInt(i.restSeconds) || 10
        }))
      });
      router.back();
    } catch (err) {
      showAlert('Error', 'Failed to save workout.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.back}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Create Workout</Text>

      <Text style={styles.label}>Name</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Morning HIIT"
        placeholderTextColor="#999"
        value={name}
        onChangeText={setName}
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

      <Text style={styles.label}>Rounds</Text>
      <TextInput
        style={styles.input}
        placeholder="1"
        placeholderTextColor="#999"
        keyboardType="numeric"
        value={rounds}
        onChangeText={setRounds}
      />

      <Text style={styles.label}>Intervals</Text>
      {intervals.map((interval, idx) => (
        <View key={idx} style={styles.intervalCard}>
          <View style={styles.intervalHeader}>
            <Text style={styles.intervalNum}>Interval {idx + 1}</Text>
            {intervals.length > 1 && (
              <TouchableOpacity onPress={() => removeInterval(idx)}>
                <Text style={styles.removeText}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>
          <TextInput
            style={styles.input}
            placeholder="Exercise name"
            placeholderTextColor="#999"
            value={interval.name}
            onChangeText={val => updateInterval(idx, 'name', val)}
          />
          <View style={styles.timeRow}>
            <View style={styles.timeField}>
              <Text style={styles.timeLabel}>Work (sec)</Text>
              <TextInput
                style={styles.timeInput}
                keyboardType="numeric"
                value={interval.workSeconds}
                onChangeText={val => updateInterval(idx, 'workSeconds', val)}
              />
            </View>
            <View style={styles.timeField}>
              <Text style={styles.timeLabel}>Rest (sec)</Text>
              <TextInput
                style={styles.timeInput}
                keyboardType="numeric"
                value={interval.restSeconds}
                onChangeText={val => updateInterval(idx, 'restSeconds', val)}
              />
            </View>
          </View>
        </View>
      ))}

      <TouchableOpacity style={styles.addIntervalBtn} onPress={addInterval}>
        <Text style={styles.addIntervalText}>+ Add Interval</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
        <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Workout'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EDE8DF' },
  content: { padding: 24, paddingTop: 60 },
  back: { color: '#F77E2D', fontSize: 14, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '900', color: '#1A1A1A', marginBottom: 24 },
  label: { fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  input: { backgroundColor: '#D9D3C8', borderRadius: 12, padding: 14, fontSize: 15, color: '#1A1A1A', marginBottom: 16 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  pill: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 99, backgroundColor: '#D9D3C8' },
  pillActive: { backgroundColor: '#F77E2D' },
  pillText: { fontSize: 12, color: '#666', textTransform: 'capitalize' },
  pillTextActive: { color: '#fff', fontWeight: '700' },
  intervalCard: { backgroundColor: '#D9D3C8', borderRadius: 16, padding: 16, marginBottom: 12 },
  intervalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  intervalNum: { fontSize: 13, fontWeight: '700', color: '#1A1A1A' },
  removeText: { fontSize: 12, color: '#F77E2D', fontWeight: '700' },
  timeRow: { flexDirection: 'row', gap: 12 },
  timeField: { flex: 1 },
  timeLabel: { fontSize: 11, color: '#888', marginBottom: 6, textTransform: 'uppercase' },
  timeInput: { backgroundColor: '#EDE8DF', borderRadius: 10, padding: 12, fontSize: 15, color: '#1A1A1A', textAlign: 'center' },
  addIntervalBtn: { borderWidth: 1.5, borderColor: '#F77E2D', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 16 },
  addIntervalText: { color: '#F77E2D', fontWeight: '700' },
  saveBtn: { backgroundColor: '#F77E2D', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 40 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 }
});