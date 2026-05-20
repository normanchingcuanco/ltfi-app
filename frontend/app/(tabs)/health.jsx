import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { initHealthKit, getStepsToday, getHeartRateToday, getActiveCaloriesToday, getSleepLastNight, getDistanceToday } from '../../src/utils/healthKit';

export default function HealthScreen() {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [data, setData] = useState({
    steps: 0,
    heartRate: null,
    activeCalories: 0,
    sleep: null,
    distance: 0
  });

  useFocusEffect(
    useCallback(() => {
      loadHealthData();
    }, [])
  );

  const loadHealthData = async () => {
    setLoading(true);
    try {
      if (Platform.OS !== 'ios') {
        setLoading(false);
        return;
      }
      const ok = await initHealthKit();
      setAuthorized(ok);
      if (ok) {
        const [steps, heartRate, activeCalories, sleep, distance] = await Promise.all([
          getStepsToday(),
          getHeartRateToday(),
          getActiveCaloriesToday(),
          getSleepLastNight(),
          getDistanceToday()
        ]);
        setData({ steps, heartRate, activeCalories, sleep, distance });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (Platform.OS !== 'ios') return (
    <View style={styles.center}>
      <Text style={styles.unavailableTitle}>iOS Only</Text>
      <Text style={styles.unavailableText}>Health data is only available on iPhone via Apple HealthKit.</Text>
    </View>
  );

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#F77E2D" />
    </View>
  );

  if (!authorized) return (
    <View style={styles.center}>
      <Text style={styles.unavailableTitle}>HealthKit Access Needed</Text>
      <Text style={styles.unavailableText}>Please allow LTFI to access your health data in Settings.</Text>
      <TouchableOpacity style={styles.retryBtn} onPress={loadHealthData}>
        <Text style={styles.retryBtnText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Health</Text>
      <Text style={styles.subtitle}>{new Date().toDateString()}</Text>

      <View style={styles.grid}>
        <View style={styles.card}>
          <Text style={styles.cardIcon}>👟</Text>
          <Text style={styles.cardValue}>{data.steps.toLocaleString()}</Text>
          <Text style={styles.cardLabel}>Steps</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardIcon}>🔥</Text>
          <Text style={styles.cardValue}>{data.activeCalories}</Text>
          <Text style={styles.cardLabel}>Active kcal</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardIcon}>❤️</Text>
          <Text style={styles.cardValue}>{data.heartRate ?? '--'}</Text>
          <Text style={styles.cardLabel}>Heart Rate</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardIcon}>📍</Text>
          <Text style={styles.cardValue}>{data.distance} km</Text>
          <Text style={styles.cardLabel}>Distance</Text>
        </View>
      </View>

      <View style={styles.sleepCard}>
        <Text style={styles.sleepIcon}>🌙</Text>
        <View>
          <Text style={styles.sleepValue}>{data.sleep ? `${data.sleep} hrs` : '--'}</Text>
          <Text style={styles.sleepLabel}>Sleep Last Night</Text>
        </View>
      </View>

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
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12 },
  card: { width: '47%', backgroundColor: '#D9D3C8', borderRadius: 16, padding: 20, alignItems: 'center' },
  cardIcon: { fontSize: 28, marginBottom: 8 },
  cardValue: { fontSize: 24, fontWeight: '900', color: '#1A1A1A', marginBottom: 4 },
  cardLabel: { fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 1 },
  sleepCard: { backgroundColor: '#D9D3C8', borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  sleepIcon: { fontSize: 36 },
  sleepValue: { fontSize: 28, fontWeight: '900', color: '#1A1A1A' },
  sleepLabel: { fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 },
  refreshBtn: { borderWidth: 1.5, borderColor: '#F77E2D', borderRadius: 12, padding: 14, alignItems: 'center' },
  refreshBtnText: { color: '#F77E2D', fontWeight: '700' }
});