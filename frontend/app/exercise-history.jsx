import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import api from '../src/utils/api';

const confirmDelete = (onConfirm) => {
  if (Platform.OS === 'web') {
    if (window.confirm('Delete this log entry?')) onConfirm();
  } else {
    Alert.alert('Delete', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onConfirm }
    ]);
  }
};

const formatDate = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

export default function ExerciseHistoryScreen() {
  const { exercise } = useLocalSearchParams();
  const router = useRouter();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      const res = await api.get(`/exercises/${encodeURIComponent(exercise)}`);
      setLogs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchLogs();
    }, [exercise])
  );

  const deleteLog = (id) => {
    confirmDelete(async () => {
      try {
        await api.delete(`/exercises/${id}`);
        setLogs(prev => prev.filter(l => l._id !== id));
      } catch (err) {
        console.error(err);
      }
    });
  };

  const volumeOf = (sets) => (sets || []).reduce((sum, s) => sum + (s.weight || 0) * (s.reps || 0), 0);
  const bestWeightOf = (sets) => (sets || []).reduce((max, s) => Math.max(max, s.weight || 0), 0);

  const overallBest = logs.reduce((max, l) => Math.max(max, bestWeightOf(l.sets)), 0);

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#F77E2D" />
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.back}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.title}>{exercise}</Text>

      {overallBest > 0 && (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>All-Time Best</Text>
          <Text style={styles.summaryValue}>{overallBest}kg</Text>
        </View>
      )}

      {logs.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>No history yet for this exercise.</Text>
        </View>
      ) : (
        logs.map((log, idx) => {
          const volume = volumeOf(log.sets);
          const bestWeight = bestWeightOf(log.sets);
          const isPR = bestWeight === overallBest && bestWeight > 0;

          return (
            <View key={log._id} style={styles.logCard}>
              <View style={styles.logHeader}>
                <Text style={styles.logDate}>{formatDate(log.date)}</Text>
                <View style={styles.logHeaderRight}>
                  {isPR && (
                    <View style={styles.prBadge}>
                      <Text style={styles.prBadgeText}>PR</Text>
                    </View>
                  )}
                  <TouchableOpacity onPress={() => deleteLog(log._id)}>
                    <Text style={styles.deleteText}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {log.sets?.length > 0 ? (
                <>
                  <View style={styles.setsHeader}>
                    <Text style={styles.setsHeaderText}>Set</Text>
                    <Text style={styles.setsHeaderText}>Weight</Text>
                    <Text style={styles.setsHeaderText}>Reps</Text>
                  </View>
                  {log.sets.map((set, sidx) => (
                    <View key={sidx} style={styles.setRow}>
                      <Text style={styles.setNum}>{set.setNumber}</Text>
                      <Text style={styles.setVal}>{set.weight}kg</Text>
                      <Text style={styles.setVal}>{set.reps}</Text>
                    </View>
                  ))}
                  <Text style={styles.volumeText}>Volume: {volume}kg</Text>
                </>
              ) : (
                <Text style={styles.noSets}>No sets logged</Text>
              )}

              {log.notes ? <Text style={styles.notes}>{log.notes}</Text> : null}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EDE8DF' },
  content: { padding: 24, paddingTop: 60, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#EDE8DF' },
  back: { color: '#F77E2D', fontSize: 15, fontWeight: '600', marginBottom: 16 },
  title: { fontSize: 26, fontWeight: '900', color: '#1A1A1A', marginBottom: 16 },
  summaryCard: { backgroundColor: '#D9D3C8', borderRadius: 16, padding: 16, marginBottom: 20, alignItems: 'center' },
  summaryLabel: { fontSize: 12, color: '#888', textTransform: 'uppercase', marginBottom: 4 },
  summaryValue: { fontSize: 28, fontWeight: '900', color: '#F77E2D' },
  emptyBox: { backgroundColor: '#D9D3C8', borderRadius: 16, padding: 24, alignItems: 'center' },
  emptyText: { color: '#888', textAlign: 'center', fontSize: 14 },
  logCard: { backgroundColor: '#D9D3C8', borderRadius: 16, padding: 16, marginBottom: 12 },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  logHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logDate: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  prBadge: { backgroundColor: '#E8F5E9', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 3 },
  prBadgeText: { fontSize: 11, fontWeight: '700', color: '#388E3C' },
  deleteText: { color: '#888', fontSize: 14 },
  setsHeader: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  setsHeaderText: { flex: 1, fontSize: 11, color: '#888', textTransform: 'uppercase' },
  setRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  setNum: { flex: 1, fontSize: 13, color: '#888' },
  setVal: { flex: 1, fontSize: 13, color: '#1A1A1A', fontWeight: '600' },
  volumeText: { fontSize: 12, color: '#888', marginTop: 4, fontWeight: '600' },
  noSets: { fontSize: 13, color: '#888', fontStyle: 'italic' },
  notes: { fontSize: 13, color: '#1A1A1A', marginTop: 10, borderTopWidth: 1, borderTopColor: '#C5BFB4', paddingTop: 10 }
});