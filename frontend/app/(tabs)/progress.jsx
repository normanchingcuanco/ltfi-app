import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Dimensions, TouchableOpacity, TextInput, Alert } from 'react-native';
import api from '../../src/utils/api';

const screenWidth = Dimensions.get('window').width - 48;

export default function ProgressScreen() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [logging, setLogging] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await api.get('/weight');
      setHistory(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const logWeight = async () => {
    if (!weight) return;
    setLogging(true);
    try {
      await api.post('/weight', { weight: parseFloat(weight), notes });
      setWeight('');
      setNotes('');
      setShowForm(false);
      await fetchHistory();
    } catch (err) {
      Alert.alert('Error', 'Failed to log weight.');
    } finally {
      setLogging(false);
    }
  };

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#F77E2D" />
    </View>
  );

  const latest = history[history.length - 1];
  const first = history[0];
  const change = latest && first ? (latest.weight - first.weight).toFixed(1) : null;
  const maxWeight = history.length ? Math.max(...history.map(e => e.weight)) : 0;
  const minWeight = history.length ? Math.min(...history.map(e => e.weight)) : 0;
  const range = maxWeight - minWeight || 1;
  const chartHeight = 160;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Progress</Text>

      <TouchableOpacity style={styles.logBtn} onPress={() => setShowForm(!showForm)}>
        <Text style={styles.logBtnText}>{showForm ? 'Cancel' : '+ Log Weight'}</Text>
      </TouchableOpacity>

      {showForm && (
        <View style={styles.formCard}>
          <TextInput
            style={styles.input}
            placeholder="Weight (kg)"
            placeholderTextColor="#999"
            keyboardType="decimal-pad"
            value={weight}
            onChangeText={setWeight}
          />
          <TextInput
            style={styles.input}
            placeholder="Notes (optional)"
            placeholderTextColor="#999"
            value={notes}
            onChangeText={setNotes}
          />
          <TouchableOpacity style={styles.submitBtn} onPress={logWeight} disabled={logging}>
            <Text style={styles.submitBtnText}>{logging ? 'Saving...' : 'Save'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {history.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>No weight entries yet. Log your first entry above.</Text>
        </View>
      ) : (
        <>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{latest?.weight} kg</Text>
              <Text style={styles.statLabel}>Current</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{first?.weight} kg</Text>
              <Text style={styles.statLabel}>Starting</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: change > 0 ? '#E05A2B' : '#4CAF50' }]}>
                {change > 0 ? '+' : ''}{change} kg
              </Text>
              <Text style={styles.statLabel}>Change</Text>
            </View>
          </View>

          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Weight Trend</Text>
            <View style={styles.chart}>
              {history.map((entry, idx) => {
                const x = (idx / Math.max(history.length - 1, 1)) * screenWidth;
                const y = chartHeight - ((entry.weight - minWeight) / range) * chartHeight;
                return <View key={idx} style={[styles.dot, { left: x - 5, top: y - 5 }]} />;
              })}
              {history.length > 1 && history.map((entry, idx) => {
                if (idx === 0) return null;
                const prev = history[idx - 1];
                const x1 = ((idx - 1) / Math.max(history.length - 1, 1)) * screenWidth;
                const y1 = chartHeight - ((prev.weight - minWeight) / range) * chartHeight;
                const x2 = (idx / Math.max(history.length - 1, 1)) * screenWidth;
                const y2 = chartHeight - ((entry.weight - minWeight) / range) * chartHeight;
                const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
                const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
                return <View key={`line-${idx}`} style={[styles.line, { left: x1, top: y1, width: length, transform: [{ rotate: `${angle}deg` }] }]} />;
              })}
            </View>
            <View style={styles.chartLabels}>
              <Text style={styles.chartLabel}>{minWeight} kg</Text>
              <Text style={styles.chartLabel}>{maxWeight} kg</Text>
            </View>
          </View>

          <View style={styles.logList}>
            <Text style={styles.logTitle}>Recent Entries</Text>
            {[...history].reverse().slice(0, 10).map((entry, idx) => (
              <View key={idx} style={styles.logItem}>
                <Text style={styles.logDate}>{new Date(entry.loggedAt).toDateString()}</Text>
                <Text style={styles.logWeight}>{entry.weight} kg</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EDE8DF' },
  content: { padding: 24, paddingTop: 60 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#EDE8DF' },
  title: { fontSize: 28, fontWeight: '900', color: '#1A1A1A', marginBottom: 24 },
  logBtn: { backgroundColor: '#F77E2D', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 16 },
  logBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  formCard: { backgroundColor: '#D9D3C8', borderRadius: 16, padding: 20, marginBottom: 24, gap: 12 },
  input: { backgroundColor: '#EDE8DF', borderRadius: 10, padding: 14, fontSize: 15, color: '#1A1A1A' },
  submitBtn: { backgroundColor: '#F77E2D', borderRadius: 10, padding: 14, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontWeight: '700' },
  emptyBox: { backgroundColor: '#D9D3C8', borderRadius: 16, padding: 24, alignItems: 'center' },
  emptyText: { color: '#888', textAlign: 'center', fontSize: 14 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: '#D9D3C8', borderRadius: 16, padding: 16, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800', color: '#F77E2D' },
  statLabel: { fontSize: 11, color: '#888', marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 },
  chartCard: { backgroundColor: '#D9D3C8', borderRadius: 16, padding: 20, marginBottom: 24 },
  chartTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginBottom: 16 },
  chart: { height: 160, position: 'relative', marginBottom: 8 },
  dot: { position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: '#F77E2D' },
  line: { position: 'absolute', height: 2, backgroundColor: '#F77E2D', opacity: 0.4, transformOrigin: 'left center' },
  chartLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  chartLabel: { fontSize: 11, color: '#888' },
  logList: { backgroundColor: '#D9D3C8', borderRadius: 16, padding: 20 },
  logTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 },
  logItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#C5BFB4' },
  logDate: { fontSize: 13, color: '#555' },
  logWeight: { fontSize: 13, fontWeight: '700', color: '#F77E2D' }
});