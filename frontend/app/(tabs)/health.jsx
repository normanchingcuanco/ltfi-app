import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import api from '../../src/utils/api';

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
  const [data, setData] = useState({ steps: null, sleepMinutes: null, syncedAt: null });

  useFocusEffect(
    useCallback(() => {
      loadHealthData();
    }, [])
  );

  const loadHealthData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/health');
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

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#F77E2D" />
    </View>
  );

  if (error) return (
    <View style={styles.center}>
      <Text style={styles.unavailableTitle}>Could not load</Text>
      <Text style={styles.unavailableText}>{error}</Text>
      <TouchableOpacity style={styles.retryBtn} onPress={loadHealthData}>
        <Text style={styles.retryBtnText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  const synced = formatSynced(data.syncedAt);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Health</Text>
      <Text style={styles.subtitle}>{new Date().toDateString()}</Text>

      <View style={styles.card}>
        <Text style={styles.cardIcon}>👟</Text>
        <Text style={styles.cardValue}>{data.steps !== null ? data.steps.toLocaleString() : '--'}</Text>
        <Text style={styles.cardLabel}>Steps today</Text>
      </View>

      <View style={styles.sleepCard}>
        <Text style={styles.sleepIcon}>🌙</Text>
        <View>
          <Text style={styles.sleepValue}>{formatSleep(data.sleepMinutes)}</Text>
          <Text style={styles.sleepLabel}>Sleep Last Night</Text>
        </View>
      </View>

      <Text style={styles.syncText}>
        {synced ? `Last synced ${synced}` : 'Not synced yet. Run the Sync QRing Steps shortcut.'}
      </Text>

      <TouchableOpacity style={styles.refreshBtn} onPress={loadHealthData}>
        <Text style={styles.refreshBtnText}>Refresh</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EDE8DF' },
  content: { padding: 24, paddingTop: 60 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#EDE8DF', padding: 24 },
  title: { fontSize: 28, fontWeight: '900', color: '#1A1A1A', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#999', marginBottom: 24 },
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
  refreshBtnText: { color: '#F77E2D', fontWeight: '700' }
});