import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Platform, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import api from '../src/utils/api';

const MET_VALUES = { HIIT: 8, Tabata: 8, circuit: 6, custom: 5 };

const speakWithVoice = (text, voiceURI) => {
  if (Platform.OS === 'web') {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.1;
      if (voiceURI) {
        const voices = window.speechSynthesis.getVoices();
        const voice = voices.find(v => v.voiceURI === voiceURI);
        if (voice) utterance.voice = voice;
      }
      window.speechSynthesis.speak(utterance);
    }
  } else {
    Speech.stop();
    Speech.speak(text, { rate: 1.1, voice: voiceURI });
  }
};

const calculateCalories = (workout, weightKg) => {
  const met = MET_VALUES[workout.type] || 5;
  let totalSeconds = 0;
  workout.intervals.forEach(i => {
    totalSeconds += i.workSeconds + i.restSeconds;
  });
  totalSeconds *= workout.rounds;
  const hours = totalSeconds / 3600;
  return Math.round(met * weightKg * hours);
};

export default function TimerScreen() {
  const { workoutId } = useLocalSearchParams();
  const router = useRouter();
  const [workout, setWorkout] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState('settings');
  const [currentRound, setCurrentRound] = useState(1);
  const [currentInterval, setCurrentInterval] = useState(0);
  const [phase, setPhase] = useState('work');
  const [timeLeft, setTimeLeft] = useState(0);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [caloriesBurned, setCaloriesBurned] = useState('');
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    fetchData();
    if (Platform.OS === 'web' && 'speechSynthesis' in window) {
      const loadVoices = () => {
        const v = window.speechSynthesis.getVoices();
        if (v.length) setVoices(v);
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    return () => clearInterval(intervalRef.current);
  }, []);

  const fetchData = async () => {
    try {
      const [workoutRes, userRes] = await Promise.all([
        api.get(`/workouts/${workoutId}`),
        api.get('/auth/me')
      ]);
      setWorkout(workoutRes.data);
      setUser(userRes.data);
      setTimeLeft(workoutRes.data.intervals[0].workSeconds);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const speak = (text) => speakWithVoice(text, selectedVoice);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) { advance(); return 0; }
          if (prev === 4) speak('3');
          if (prev === 3) speak('2');
          if (prev === 2) speak('1');
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, currentInterval, currentRound, phase, selectedVoice]);

  const advance = () => {
    if (!workout) return;
    const intervals = workout.intervals;
    if (phase === 'work') {
      const restTime = intervals[currentInterval].restSeconds;
      if (restTime > 0) {
        setPhase('rest');
        setTimeLeft(restTime);
        speak('Rest');
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
      const next = intervals[currentInterval + 1];
      setCurrentInterval(prev => prev + 1);
      setPhase('work');
      setTimeLeft(next.workSeconds);
      speak(next.name);
    } else if (currentRound < workout.rounds) {
      const nextRound = currentRound + 1;
      setCurrentRound(nextRound);
      setCurrentInterval(0);
      setPhase('work');
      setTimeLeft(intervals[0].workSeconds);
      speak(`Round ${nextRound}. ${intervals[0].name}`);
    } else {
      setRunning(false);
      setDone(true);
      speak('Workout complete. Great job!');
      if (user?.currentWeight) {
        const estimated = calculateCalories(workout, user.currentWeight);
        setCaloriesBurned(estimated.toString());
      }
    }
  };

  const handleStart = () => {
    if (!running && workout) speak(workout.intervals[currentInterval].name);
    setRunning(!running);
  };

  const handleFinish = async () => {
    try {
      await api.post(`/workouts/${workoutId}/log`, {
        caloriesBurned: parseInt(caloriesBurned) || 0
      });
    } catch (err) {
      console.error(err);
    }
    router.back();
  };

  const handleQuit = () => {
    setRunning(false);
    if (Platform.OS === 'web') {
      if (window.confirm('Quit workout? Your progress will be lost.')) {
        router.back();
      } else {
        setRunning(true);
      }
    }
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

  if (screen === 'settings') return (
    <ScrollView style={styles.settingsContainer} contentContainerStyle={styles.settingsContent}>
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.back}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.settingsTitle}>{workout.name}</Text>
      <Text style={styles.settingsMeta}>{workout.type} · {workout.rounds} round{workout.rounds > 1 ? 's' : ''} · {workout.intervals.length} interval{workout.intervals.length !== 1 ? 's' : ''}</Text>

      {voices.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>Voice</Text>
          <View style={styles.voiceList}>
            {voices.filter(v => v.lang.startsWith('en')).slice(0, 8).map(v => (
              <TouchableOpacity
                key={v.voiceURI}
                style={[styles.voicePill, selectedVoice === v.voiceURI && styles.voicePillActive]}
                onPress={() => {
                  setSelectedVoice(v.voiceURI);
                  speakWithVoice('Hello, I am your workout coach.', v.voiceURI);
                }}
              >
                <Text style={[styles.voicePillText, selectedVoice === v.voiceURI && styles.voicePillTextActive]}>
                  {v.name.replace(/\s*\(.*?\)/, '').trim()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      <Text style={styles.sectionLabel}>Intervals</Text>
      {workout.intervals.map((interval, idx) => (
        <View key={idx} style={styles.intervalPreview}>
          <Text style={styles.intervalPreviewName}>{interval.name}</Text>
          <Text style={styles.intervalPreviewTime}>{interval.workSeconds}s work / {interval.restSeconds}s rest</Text>
        </View>
      ))}

      <TouchableOpacity style={styles.startWorkoutBtn} onPress={() => setScreen('timer')}>
        <Text style={styles.startWorkoutBtnText}>Start Workout</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  if (done) return (
    <View style={styles.center}>
      <Text style={styles.doneTitle}>Workout Complete! 🎉</Text>
      <Text style={styles.doneSub}>{workout.name}</Text>
      <Text style={styles.calsLabel}>Calories Burned</Text>
      <TextInput
        style={styles.calsInput}
        placeholder="e.g. 250"
        placeholderTextColor="#999"
        keyboardType="numeric"
        value={caloriesBurned}
        onChangeText={setCaloriesBurned}
      />
      <Text style={styles.calsHint}>Auto-estimated based on your weight and workout type. Edit if needed.</Text>
      <TouchableOpacity style={styles.finishBtn} onPress={handleFinish}>
        <Text style={styles.finishBtnText}>Finish</Text>
      </TouchableOpacity>
    </View>
  );

  const interval = workout.intervals[currentInterval];
  const isWork = phase === 'work';

  return (
    <View style={[styles.container, { backgroundColor: isWork ? '#1A1A1A' : '#2C4A2E' }]}>
      <TouchableOpacity style={styles.closeBtn} onPress={handleQuit}>
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
        <TouchableOpacity style={styles.playBtn} onPress={handleStart}>
          <Text style={styles.playBtnText}>{running ? '⏸' : '▶'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlBtn} onPress={() => { setRunning(false); advance(); }}>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#EDE8DF', padding: 24 },
  loadingText: { color: '#888', fontSize: 16 },
  settingsContainer: { flex: 1, backgroundColor: '#EDE8DF' },
  settingsContent: { padding: 24, paddingTop: 60 },
  back: { color: '#F77E2D', fontSize: 14, marginBottom: 8 },
  settingsTitle: { fontSize: 28, fontWeight: '900', color: '#1A1A1A', marginBottom: 4 },
  settingsMeta: { fontSize: 13, color: '#888', marginBottom: 32, textTransform: 'capitalize' },
  sectionLabel: { fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  voiceList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  voicePill: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 99, backgroundColor: '#D9D3C8' },
  voicePillActive: { backgroundColor: '#F77E2D' },
  voicePillText: { fontSize: 12, color: '#666' },
  voicePillTextActive: { color: '#fff', fontWeight: '700' },
  intervalPreview: { backgroundColor: '#D9D3C8', borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between' },
  intervalPreviewName: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  intervalPreviewTime: { fontSize: 12, color: '#888' },
  startWorkoutBtn: { backgroundColor: '#F77E2D', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24, marginBottom: 40 },
  startWorkoutBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
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
  doneTitle: { fontSize: 32, fontWeight: '900', color: '#1A1A1A', marginBottom: 8, textAlign: 'center' },
  doneSub: { fontSize: 16, color: '#888', marginBottom: 24 },
  calsLabel: { fontSize: 13, color: '#888', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  calsInput: { backgroundColor: '#D9D3C8', borderRadius: 12, padding: 14, fontSize: 18, color: '#1A1A1A', textAlign: 'center', width: 200, marginBottom: 8 },
  calsHint: { fontSize: 11, color: '#aaa', textAlign: 'center', marginBottom: 24 },
  finishBtn: { backgroundColor: '#F77E2D', borderRadius: 12, padding: 16, paddingHorizontal: 48 },
  finishBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 }
});