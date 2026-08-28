import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Platform } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import api from '../src/utils/api';

const LOGS_PER_PAGE = 10;

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
  const [page, setPage] = useState(0);
  const [editingLogId, setEditingLogId] = useState(null);
  const [editSets, setEditSets] = useState([]);
  const [saving, setSaving] = useState(false);

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
      setPage(0);
      setEditingLogId(null);
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

  const startEdit = (log) => {
    setEditingLogId(log._id);
    setEditSets((log.sets || []).map(s => ({ weight: String(s.weight ?? ''), reps: String(s.reps ?? '') })));
  };

  const cancelEdit = () => {
    setEditingLogId(null);
    setEditSets([]);
  };

  const updateEditSet = (idx, field, value) => {
    setEditSets(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const addEditSet = () => {
    setEditSets(prev => [...prev, { weight: '', reps: '' }]);
  };

  const removeEditSet = (idx) => {
    setEditSets(prev => prev.filter((_, i) => i !== idx));
  };

  const saveEdit = async (logId) => {
    setSaving(true);
    try {
      const sets = editSets.map((s, i) => ({
        setNumber: i + 1,
        weight: parseFloat(s.weight) || 0,
        reps: parseInt(s.reps) || 0
      }));
      const res = await api.put(`/exercises/${logId}`, { sets });
      setLogs(prev => prev.map(l => l._id === logId ? res.data : l));
      setEditingLogId(null);
      setEditSets([]);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const volumeOf = (sets) => (sets || []).reduce((sum, s) => sum + (s.weight || 0) * (s.reps || 0), 0);
  const bestWeightOf = (sets) => (sets || []).reduce((max, s) => Math.max(max, s.weight || 0), 0);

  const overallBest = logs.reduce((max, l) => Math.max(max, bestWeightOf(l.sets)), 0);
  const pagedLogs = logs.slice(page * LOGS_PER_PAGE, page * LOGS_PER_PAGE + LOGS_PER_PAGE);
  const totalPages = Math.ceil(logs.length / LOGS_PER_PAGE);

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
        <>
          {pagedLogs.map((log) => {
            const volume = volumeOf(log.sets);
            const bestWeight = bestWeightOf(log.sets);
            const isPR = bestWeight === overallBest && bestWeight > 0;
            const isEditing = editingLogId === log._id;

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
                    {!isEditing && (
                      <TouchableOpacity onPress={() => startEdit(log)}>
                        <Text style={styles.editText}>✎</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => deleteLog(log._id)}>
                      <Text style={styles.deleteText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {isEditing ? (
                  <View>
                    {editSets.map((s, sidx) => (
                      <View key={sidx} style={styles.editRow}>
                        <Text style={styles.editSetNum}>{sidx + 1}</Text>
                        <TextInput
                          style={styles.editInput}
                          placeholder="kg"
                          placeholderTextColor="#999"
                          keyboardType="numeric"
                          value={s.weight}
                          onChangeText={v => updateEditSet(sidx, 'weight', v)}
                        />
                        <TextInput
                          style={styles.editInput}
                          placeholder="reps"
                          placeholderTextColor="#999"
                          keyboardType="numeric"
                          value={s.reps}
                          onChangeText={v => updateEditSet(sidx, 'reps', v)}
                        />
                        <TouchableOpacity onPress={() => removeEditSet(sidx)}>
                          <Text style={styles.removeText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                    <View style={styles.editActionsRow}>
                      <TouchableOpacity style={styles.addSetBtn} onPress={addEditSet}>
                        <Text style={styles.addSetBtnText}>+ Add Set</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.cancelBtn} onPress={cancelEdit}>
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.saveEditBtn} onPress={() => saveEdit(log._id)} disabled={saving}>
                        {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveEditBtnText}>Save</Text>}
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <>
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
                  </>
                )}
              </View>
            );
          })}

          {totalPages > 1 && (
            <View style={styles.paginationRow}>
              <TouchableOpacity
                style={[styles.pageBtn, page === 0 && styles.pageBtnDisabled]}
                disabled={page === 0}
                onPress={() => setPage(p => p - 1)}
              >
                <Text style={[styles.pageBtnText, page === 0 && styles.pageBtnTextDisabled]}>‹ Prev</Text>
              </TouchableOpacity>
              <Text style={styles.pageIndicator}>Page {page + 1} of {totalPages}</Text>
              <TouchableOpacity
                style={[styles.pageBtn, page + 1 >= totalPages && styles.pageBtnDisabled]}
                disabled={page + 1 >= totalPages}
                onPress={() => setPage(p => p + 1)}
              >
                <Text style={[styles.pageBtnText, page + 1 >= totalPages && styles.pageBtnTextDisabled]}>Next ›</Text>
              </TouchableOpacity>
            </View>
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
  back: { color: '#F77E2D', fontSize: 15, fontWeight: '600', marginBottom: 16 },
  title: { fontSize: 26, fontWeight: '900', color: '#1A1A1A', marginBottom: 16 },
  summaryCard: { backgroundColor: '#D9D3C8', borderRadius: 16, padding: 16, marginBottom: 20, alignItems: 'center' },
  summaryLabel: { fontSize: 12, color: '#888', textTransform: 'uppercase', marginBottom: 4 },
  summaryValue: { fontSize: 28, fontWeight: '900', color: '#F77E2D' },
  emptyBox: { backgroundColor: '#D9D3C8', borderRadius: 16, padding: 24, alignItems: 'center' },
  emptyText: { color: '#888', textAlign: 'center', fontSize: 14 },
  logCard: { backgroundColor: '#D9D3C8', borderRadius: 16, padding: 16, marginBottom: 12 },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  logHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logDate: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  prBadge: { backgroundColor: '#E8F5E9', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 3 },
  prBadgeText: { fontSize: 11, fontWeight: '700', color: '#388E3C' },
  editText: { color: '#F77E2D', fontSize: 15 },
  deleteText: { color: '#888', fontSize: 14 },
  setsHeader: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  setsHeaderText: { flex: 1, fontSize: 11, color: '#888', textTransform: 'uppercase' },
  setRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  setNum: { flex: 1, fontSize: 13, color: '#888' },
  setVal: { flex: 1, fontSize: 13, color: '#1A1A1A', fontWeight: '600' },
  volumeText: { fontSize: 12, color: '#888', marginTop: 4, fontWeight: '600' },
  noSets: { fontSize: 13, color: '#888', fontStyle: 'italic' },
  notes: { fontSize: 13, color: '#1A1A1A', marginTop: 10, borderTopWidth: 1, borderTopColor: '#C5BFB4', paddingTop: 10 },
  editRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 8 },
  editSetNum: { width: 20, fontSize: 13, color: '#888' },
  editInput: { flex: 1, backgroundColor: '#EDE8DF', borderRadius: 8, padding: 10, fontSize: 14, color: '#1A1A1A', textAlign: 'center' },
  removeText: { color: '#888', fontSize: 16, paddingHorizontal: 6 },
  editActionsRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  addSetBtn: { flex: 1, backgroundColor: '#EDE8DF', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  addSetBtnText: { color: '#1A1A1A', fontWeight: '700', fontSize: 12 },
  cancelBtn: { flex: 1, backgroundColor: '#EDE8DF', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  cancelBtnText: { color: '#888', fontWeight: '700', fontSize: 12 },
  saveEditBtn: { flex: 1, backgroundColor: '#F77E2D', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  saveEditBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  paginationRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 20 },
  pageBtn: { paddingVertical: 8, paddingHorizontal: 14, backgroundColor: '#D9D3C8', borderRadius: 8 },
  pageBtnDisabled: { opacity: 0.4 },
  pageBtnText: { color: '#F77E2D', fontWeight: '700', fontSize: 13 },
  pageBtnTextDisabled: { color: '#888' },
  pageIndicator: { fontSize: 12, color: '#888' }
});