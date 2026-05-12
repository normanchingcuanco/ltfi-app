import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import api from '../src/utils/api';

export default function TimerScreen() {
  const { workoutId } = useLocalSearchParams();
  const router = useRouter();
  const [workout, setWorkout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentRound, setCurrentRound] = useState(1);
  const [currentInterval, setCurrentInterval] = useState(0);
  const [phase, setPhase] = useState('work');
  const [timeLeft, setTimeLeft] = useState(0);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    fetchWorkout();
    return () => clearInterval(intervalRef.current);
  }, []);

  const fetchWorkout = async () => {
    try {
      const res = await api.get(`/workouts/${workoutId}`);
      setWorkout(res.data);
      setTimeLeft(res.data.intervals[0].workSeconds);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            advance();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, currentInterval, currentRound, phase]);

  const advance = () => {
    if (!workout) return;
    const intervals = workout.intervals;

    if (phase === 'work') {
      const restTime = intervals[currentInterval].restSeconds;
      if (restTime > 0) {
        setPhase('rest');
        setTimeLeft(restTime);
      } else {
        nextInterval();
      }
    } else {
      nextInterval();
    }
  };

  const nextInterval = () => {
    const intervals = workout.intervals;
    if (currentInterval + 1 < intervals.length) {
      setCurrentInterval(prev => prev + 1);
      setPhase('work');
      setTimeLeft(intervals[currentInterval + 1].workSeconds);
    } else if (currentRound < workout.rounds) {
      setCurrentRound(prev => prev + 1);
      setCurrentInterval(0);
      setPhase('work');
      setTimeLeft(intervals[0].workSeconds);
    } else {
      setRunning(false);
      setDone(true);
    }
  };

  const handleFinish = async () => {
    try {
      await api.post(`/workouts/${workoutId}/log`, { caloriesBurned: 0 });
    } catch (err) {
      console.error(err);
    }
    router.back();
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (loading || !workout) return (
    <View style={styles.center}>
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  );

  if (done) return (
    <View style={styles.center}>
      <Text style={styles.doneTitle}>Workout Complete! 🎉</Text>
      <Text style={styles.doneSub}>{workout.name}</Text>
      <TouchableOpacity style={styles.finishBtn} onPress={handleFinish}>
        <Text style={styles.finishBtnText}>Finish</Text>
      </TouchableOpacity>
    </View>
  );

  const interval = workout.intervals[currentInterval];
  const isWork = phase === 'work';

  return (
    <View style={[styles.container, { backgroundColor: isWork ? '#1A1A1A' : '#2C4A2E' }]}>
      <TouchableOpacity style={styles.closeBtn} onPress={() => {
        setRunning(false);
        Alert.alert('Quit Workout?', 'Your progress will be lost.', [
          { text: 'Keep Going', style: 'cancel', onPress: () => setRunning(true) },
          { text: 'Quit', style: 'destructive', onPress: () => router.back() }
        ]);
      }}>
        <Text style={styles.closeBtnText}>✕</Text>
      </TouchableOpacity>

      <View style={styles.meta}>
        <Text style={styles.metaText}>Round {currentRound} / {workout.rounds}</Text>
        <Text style={styles.metaText}>Interval {currentInterval + 1} / {workout.intervals.length}</Text>
      </View>

      <Text style={styles.phase}>{isWork ? 'WORK' : 'REST'}</Text>
      <Text style={styles.exerciseName}>{interval.name}</Text>
      <Text style={styles.timer}>{formatTime(timeLeft)}</Text>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlBtn} onPress={() => {
          setRunning(false);
          setCurrentRound(1);
          setCurrentInterval(0);
          setPhase('work');
          setTimeLeft(workout.intervals[0].workSeconds);
          setDone(false);
        }}>
          <Text style={styles.controlBtnText}>↺</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.playBtn} onPress={() => setRunning(!running)}>
          <Text style={styles.playBtnText}>{running ? '⏸' : '▶'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlBtn} onPress={() => {
          setRunning(false);
          advance();
        }}>
          <Text style={styles.controlBtnText}>⏭</Text>
        </TouchableOpacity>
      </View>

      {workout.intervals.length > 1 && (
        <View style={styles.upNext}>
          <Text style={styles.upNextLabel}>Up Next</Text>
          <Text style={styles.upNextText}>
            {phase === 'work' && interval.restSeconds > 0
              ? `Rest — ${interval.restSeconds}s`
              : currentInterval + 1 < workout.intervals.length
                ? workout.intervals[currentInterval + 1].name
                : currentRound < workout.rounds
                  ? `Round ${currentRound + 1}`
                  : 'Finish'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#EDE8DF' },
  loadingText: { color: '#888', fontSize: 16 },
  closeBtn: { position: 'absolute', top: 60, right: 24 },
  closeBtnText: { color: '#fff', fontSize: 20, opacity: 0.6 },
  meta: { position: 'absolute', top: 60, left: 24, gap: 4 },
  metaText: { color: '#fff', fontSize: 12, opacity: 0.6 },
  phase: { fontSize: 14, fontWeight: '800', color: '#F77E2D', letterSpacing: 4, marginBottom: 8 },
  exerciseName: { fontSize: 32, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 24 },
  timer: { fontSize: 88, fontWeight: '900', color: '#fff', marginBottom: 48 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 24, marginBottom: 48 },
  controlBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  controlBtnText: { color: '#fff', fontSize: 22 },
  playBtn: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F77E2D', justifyContent: 'center', alignItems: 'center' },
  playBtnText: { color: '#fff', fontSize: 32 },
  upNext: { position: 'absolute', bottom: 60, alignItems: 'center' },
  upNextLabel: { fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 },
  upNextText: { fontSize: 16, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  doneTitle: { fontSize: 32, fontWeight: '900', color: '#1A1A1A', marginBottom: 8 },
  doneSub: { fontSize: 16, color: '#888', marginBottom: 32 },
  finishBtn: { backgroundColor: '#F77E2D', borderRadius: 12, padding: 16, paddingHorizontal: 48 },
  finishBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 }
});