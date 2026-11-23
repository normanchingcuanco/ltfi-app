import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '../../src/utils/api';

const pad = (n) => String(n).padStart(2, '0');

const toDateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const formatSleep = (mins) => {
  if (mins === null || mins === undefined) return '--';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
};

const formatSynced = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

export default function HealthScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [data, setData] = useState({ steps: null, sleepMinutes: null, syncedAt: null });

  const dateStr = toDateStr(selectedDate);
  const isToday = dateStr === toDateStr(new Date());

  const loadHealthData = async (str) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/health', { params: { date: str } });
      setData({
        steps: res.data.steps,
        sleepMinutes: res.data.sleepMinutes,
        syncedAt: res.data.syncedAt
      });
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Could not load health data.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadHealthData(dateStr);
    }, [dateStr])
  );

  const onPick = (event, picked) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (event?.type === 'dismissed') return;
    if (picked) {
      setSelectedDate(picked);
      setShowPicker(false);
    }
  };

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#F77E2D" />
    </View>
  );

  if (error) return (
    <View style={styles.center}>
      <Text style={styles.unavailableTitle}>Could not load</Text>
      <Text style={styles.unavailableText}>{error}</Text>
      <TouchableOpacity style={styles.retryBtn} onPress={() => loadHealthData(dateStr)}>
        <Text style={styles.retryBtnText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  const synced = formatSynced(data.syncedAt);
  const emptyText = isToday ? 'Not synced yet. Run the Sync QRing Steps shortcut.' : 'No data for this day.';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Health</Text>

      <View style={styles.dateRow}>
        <TouchableOpacity style={styles.datePill} onPress={() => setShowPicker(true)}>
          <Text style={styles.datePillText}>📅  {selectedDate.toDateString()}</Text>
        </TouchableOpacity>
        {!isToday && (
          <TouchableOpacity style={styles.todayBtn} onPress={() => setSelectedDate(new Date())}>
            <Text style={styles.todayBtnText}>Today</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardIcon}>👟</Text>
        <Text style={styles.cardValue}>{data.steps !== null ? data.steps.toLocaleString() : '--'}</Text>
        <Text style={styles.cardLabel}>{isToday ? 'Steps today' : 'Steps'}</Text>
      </View>

      <View style={styles.sleepCard}>
        <Text style={styles.sleepIcon}>🌙</Text>
        <View>
          <Text style={styles.sleepValue}>{formatSleep(data.sleepMinutes)}</Text>
          <Text style={styles.sleepLabel}>{isToday ? 'Sleep Last Night' : 'Sleep'}</Text>
        </View>
      </View>

      <Text style={styles.syncText}>
        {synced ? `Last synced ${synced}` : emptyText}
      </Text>

      <TouchableOpacity style={styles.refreshBtn} onPress={() => loadHealthData(dateStr)}>
        <Text style={styles.refreshBtnText}>Refresh</Text>
      </TouchableOpacity>

      {Platform.OS === 'ios' ? (
        <Modal visible={showPicker} transparent animationType="fade" onRequestClose={() => setShowPicker(false)}>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setShowPicker(false)}>
            <View style={styles.pickerCard} onStartShouldSetResponder={() => true}>
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="inline"
                maximumDate={new Date()}
                onChange={onPick}
                themeVariant="light"
                accentColor="#F77E2D"
              />
            </View>
          </TouchableOpacity>
        </Modal>
      ) : (
        showPicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="calendar"
            maximumDate={new Date()}
            onChange={onPick}
          />
        )
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EDE8DF' },
  content: { padding: 24, paddingTop: 60 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#EDE8DF', padding: 24 },
  title: { fontSize: 28, fontWeight: '900', color: '#1A1A1A', marginBottom: 8 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 24 },
  datePill: { backgroundColor: '#D9D3C8', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14 },
  datePillText: { fontSize: 13, color: '#1A1A1A', fontWeight: '600' },
  todayBtn: { borderWidth: 1.5, borderColor: '#F77E2D', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 14 },
  todayBtnText: { fontSize: 13, color: '#F77E2D', fontWeight: '700' },
  unavailableTitle: { fontSize: 22, fontWeight: '800', color: '#1A1A1A', marginBottom: 8, textAlign: 'center' },
  unavailableText: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 24 },
  retryBtn: { backgroundColor: '#F77E2D', borderRadius: 12, padding: 14, paddingHorizontal: 32 },
  retryBtnText: { color: '#fff', fontWeight: '700' },
  card: { backgroundColor: '#D9D3C8', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 12 },
  cardIcon: { fontSize: 32, marginBottom: 8 },
  cardValue: { fontSize: 36, fontWeight: '900', color: '#1A1A1A', marginBottom: 4 },
  cardLabel: { fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 1 },
  sleepCard: { backgroundColor: '#D9D3C8', borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 12 },
  sleepIcon: { fontSize: 36 },
  sleepValue: { fontSize: 28, fontWeight: '900', color: '#1A1A1A' },
  sleepLabel: { fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 },
  syncText: { fontSize: 12, color: '#999', textAlign: 'center', marginBottom: 16 },
  refreshBtn: { borderWidth: 1.5, borderColor: '#F77E2D', borderRadius: 12, padding: 14, alignItems: 'center' },
  refreshBtnText: { color: '#F77E2D', fontWeight: '700' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 },
  pickerCard: { backgroundColor: '#fff', borderRadius: 20, padding: 12 }
});