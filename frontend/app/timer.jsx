import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Platform, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { setAudioModeAsync, createAudioPlayer } from 'expo-audio';
import api from '../src/utils/api';
import { useAuth } from '../src/contexts/AuthContext';

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
  let totalKcal = 0;
  workout.intervals.forEach(interval => {
    const met = interval.met || 5.0;
    const workHours = interval.workSeconds / 3600;
    totalKcal += met * weightKg * workHours;
  });
  totalKcal *= workout.rounds;
  return Math.round(totalKcal);
};

const formatTime = (s) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

export default function TimerScreen() {
  const { workoutId } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [workout, setWorkout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState('settings');
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [caloriesBurned, setCaloriesBurned] = useState('');
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const intervalRef = useRef(null);
    const dingSound = useRef(null);
    const beepSound = useRef(null);
    const chimeSound = useRef(null);

    useEffect(() => {
      const loadSounds = async () => {
        await setAudioModeAsync({
          playsInSilentMode: true,
          shouldPlayInBackground: false,
          interruptionMode: 'duckOthers',
          interruptionModeAndroid: 'duckOthers',
          allowsRecording: false,
        });
        dingSound.current = createAudioPlayer(require('../assets/ding.mp3'));
        beepSound.current = createAudioPlayer(require('../assets/beep.mp3'));
        chimeSound.current = createAudioPlayer(require('../assets/chime.mp3'));
      };
      loadSounds();
      return () => {
        dingSound.current?.remove();
        beepSound.current?.remove();
        chimeSound.current?.remove();
      };
    }, []);

    const playDing = async () => {
      try {
        await dingSound.current?.seekTo(0);
        dingSound.current?.play();
      } catch (e) { console.error(e); }
    };

    const playBeep = async () => {
      try {
        await beepSound.current?.seekTo(0);
        beepSound.current?.play();
      } catch (e) { console.error(e); }
    };

    const playChime = async () => {
      try {
        await chimeSound.current?.seekTo(0);
        chimeSound.current?.play();
      } catch (e) { console.error(e); }
    };

  const [simpleTimeLeft, setSimpleTimeLeft] = useState(0);
  const [simpleTotalTime, setSimpleTotalTime] = useState(0);
  const [simplePhase, setSimplePhase] = useState('warmup');

  const [currentRound, setCurrentRound] = useState(1);
  const [currentInterval, setCurrentInterval] = useState(0);
  const [phase, setPhase] = useState('warmup');
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    fetchWorkout();
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

  const fetchWorkout = async () => {
    try {
      const res = await api.get(`/workouts/${workoutId}`);
      const w = res.data;
      setWorkout(w);
      if (w.mode === 'simple') {
        const workSecs = w.intervals[0].workSeconds;
        const totalSecs = workSecs + (w.warmUp || 0) + (w.coolDown || 0);
        setSimpleTotalTime(totalSecs);
        if (w.warmUp > 0) {
          setSimplePhase('warmup');
          setSimpleTimeLeft(w.warmUp);
        } else {
          setSimplePhase('work');
          setSimpleTimeLeft(workSecs);
        }
      } else {
        if (w.warmUp > 0) {
          setPhase('warmup');
          setTimeLeft(w.warmUp);
        } else {
          setPhase('work');
          setTimeLeft(w.intervals[0].workSeconds);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const speak = (text) => speakWithVoice(text, selectedVoice);

  useEffect(() => {
    if (!workout || workout.mode !== 'simple') return;
    if (running) {
      intervalRef.current = setInterval(() => {
        setSimpleTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            if (simplePhase === 'warmup') {
              playDing();
              setSimplePhase('work');
              setSimpleTimeLeft(workout.intervals[0].workSeconds);
              speak(workout.intervals[0].name || workout.name);
              return workout.intervals[0].workSeconds;
            } else if (simplePhase === 'work' && workout.coolDown > 0) {
              playBeep();
              setSimplePhase('cooldown');
              setSimpleTimeLeft(workout.coolDown);
              speak('Cool down');
              return workout.coolDown;
            } else {
              playChime();
              setRunning(false);
              setDone(true);
              speak('Workout complete. Great job!');
              if (user?.currentWeight) {
                setCaloriesBurned(calculateCalories(workout, user.currentWeight).toString());
              }
              return 0;
            }
          }
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
  }, [running, workout, simplePhase]);

  useEffect(() => {
    if (!workout || workout.mode !== 'complex') return;
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
  }, [running, currentInterval, currentRound, phase, selectedVoice, workout]);

    useEffect(() => {
      if (running) {
        activateKeepAwakeAsync();
      } else {
        deactivateKeepAwake();
      }
      return () => deactivateKeepAwake();
    }, [running]);

    const advance = () => {
    if (!workout) return;
    const intervals = workout.intervals;
    if (phase === 'warmup') {
      playDing();
      setPhase('work');
      setTimeLeft(intervals[0].workSeconds);
      speak(intervals[0].name);
      return;
    }
    if (phase === 'cooldown') {
      playChime();
      setRunning(false);
      setDone(true);
      speak('Workout complete. Great job!');
      if (user?.currentWeight) {
        setCaloriesBurned(calculateCalories(workout, user.currentWeight).toString());
      }
      return;
    }
    if (phase === 'work') {
      const restTime = intervals[currentInterval].restSeconds;
      if (restTime > 0) {
        playBeep();
        setPhase('rest');
        setTimeLeft(restTime);
        speak('Rest');
      } else {
        playDing();
        nextInterval();
      }
    } else {
      playDing();
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
    } else if (workout.repeat) {
      setCurrentRound(1);
      setCurrentInterval(0);
      setPhase('work');
      setTimeLeft(intervals[0].workSeconds);
      speak(`Repeating. ${intervals[0].name}`);
    } else {
      if (workout.coolDown > 0) {
        playBeep();
        setPhase('cooldown');
        setTimeLeft(workout.coolDown);
        speak('Cool down');
      } else {
        playChime();
        setRunning(false);
        setDone(true);
        speak('Workout complete. Great job!');
        if (user?.currentWeight) {
          setCaloriesBurned(calculateCalories(workout, user.currentWeight).toString());
        }
      }
    }
  };
  const handleStart = () => {
    if (!running && workout) {
      if (workout.mode === 'simple') {
        speak(workout.name);
      } else if (phase === 'warmup') {
        speak('Warm up');
      } else if (phase === 'cooldown') {
        speak('Cool down');
      } else {
        speak(workout.intervals[currentInterval].name);
      }
    }
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
    } else {
      router.back();
    }
  };

  const resetSimple = () => {
    setRunning(false);
    setDone(false);
    if (workout.warmUp > 0) {
      setSimplePhase('warmup');
      setSimpleTimeLeft(workout.warmUp);
    } else {
      setSimplePhase('work');
      setSimpleTimeLeft(workout.intervals[0].workSeconds);
    }
  };
  
  const resetComplex = () => {
    setRunning(false);
    setCurrentRound(1);
    setCurrentInterval(0);
    if (workout.warmUp > 0) {
      setPhase('warmup');
      setTimeLeft(workout.warmUp);
    } else {
      setPhase('work');
      setTimeLeft(workout.intervals[0].workSeconds);
    }
    setDone(false);
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
      <Text style={styles.settingsMeta}>
        {workout.type} · {workout.mode === 'simple'
          ? formatTime(workout.intervals[0].workSeconds)
          : `${workout.rounds} round${workout.rounds > 1 ? 's' : ''} · ${workout.intervals.length} interval${workout.intervals.length !== 1 ? 's' : ''}`
        }
        {workout.repeat ? ' · Repeat ON' : ''}
      </Text>

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

      {workout.warmUp > 0 && (
        <>
          <Text style={styles.sectionLabel}>Warm Up</Text>
          <View style={styles.intervalPreview}>
            <Text style={styles.intervalPreviewName}>Warm Up</Text>
            <Text style={styles.intervalPreviewTime}>{formatTime(workout.warmUp)}</Text>
          </View>
        </>
      )}

      {workout.mode === 'complex' && (
        <>
          <Text style={styles.sectionLabel}>Intervals</Text>
          {workout.intervals.map((interval, idx) => (
            <View key={idx} style={styles.intervalPreview}>
              <Text style={styles.intervalPreviewName}>{interval.name}</Text>
              <Text style={styles.intervalPreviewTime}>{interval.workSeconds}s work / {interval.restSeconds}s rest</Text>
            </View>
          ))}
        </>
      )}

      {workout.mode === 'simple' && (
        <>
          <Text style={styles.sectionLabel}>Duration</Text>
          <View style={styles.intervalPreview}>
            <Text style={styles.intervalPreviewName}>{workout.intervals[0].name}</Text>
            <Text style={styles.intervalPreviewTime}>{formatTime(workout.intervals[0].workSeconds)}</Text>
          </View>
        </>
      )}

      {workout.coolDown > 0 && (
        <>
          <Text style={styles.sectionLabel}>Cool Down</Text>
          <View style={styles.intervalPreview}>
            <Text style={styles.intervalPreviewName}>Cool Down</Text>
            <Text style={styles.intervalPreviewTime}>{formatTime(workout.coolDown)}</Text>
          </View>
        </>
      )}

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
      <Text style={styles.calsHint}>Auto-estimated based on your weight. Edit if needed.</Text>
      <TouchableOpacity style={styles.finishBtn} onPress={handleFinish}>
        <Text style={styles.finishBtnText}>Finish</Text>
      </TouchableOpacity>
    </View>
  );

  if (workout.mode === 'simple') {
    const workSecs = workout.intervals[0].workSeconds;
      const elapsed =
        simplePhase === 'warmup' ? (workout.warmUp - simpleTimeLeft) :
        simplePhase === 'work' ? (workout.warmUp || 0) + (workSecs - simpleTimeLeft) :
        (workout.warmUp || 0) + workSecs + ((workout.coolDown || 0) - simpleTimeLeft);
      const progress = simpleTotalTime > 0 ? elapsed / simpleTotalTime : 0;
    return (
      <View style={[styles.container, { backgroundColor: '#1A1A1A' }]}>
        <TouchableOpacity style={styles.closeBtn} onPress={handleQuit}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.simpleWorkoutName}>
          {simplePhase === 'warmup' ? 'Warm Up' : simplePhase === 'cooldown' ? 'Cool Down' : workout.name}
        </Text>
        <Text style={styles.phase}>
          {simplePhase === 'warmup' ? 'WARM UP' : simplePhase === 'cooldown' ? 'COOL DOWN' : 'WORK'}
        </Text>
        <Text style={styles.timer}>{formatTime(simpleTimeLeft)}</Text>
        <View style={styles.simpleProgressBar}>
          <View style={[styles.simpleProgressFill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.simpleRemaining}>
          {Math.round(progress * 100)}% remaining
        </Text>
        <View style={styles.controls}>
          <TouchableOpacity style={styles.controlBtn} onPress={resetSimple}>
            <Text style={styles.controlBtnText}>↺</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.playBtn} onPress={handleStart}>
            <Text style={styles.playBtnText}>{running ? '⏸' : '▶'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlBtn} onPress={() => {
            setRunning(false);
            setDone(true);
            if (user?.currentWeight) {
              setCaloriesBurned(calculateCalories(workout, user.currentWeight).toString());
            }
          }}>
            <Text style={styles.controlBtnText}>⏹</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const interval = workout.intervals[currentInterval];
    const isWork = phase === 'work';
    const isWarmup = phase === 'warmup';
    const isCooldown = phase === 'cooldown';

    const bgColor = isWarmup ? '#1A3A4A' : isCooldown ? '#2A2A4A' : isWork ? '#1A1A1A' : '#2C4A2E';
    const phaseLabel = isWarmup ? 'WARM UP' : isCooldown ? 'COOL DOWN' : isWork ? 'WORK' : 'REST';
    const exerciseLabel = isWarmup ? 'Warm Up' : isCooldown ? 'Cool Down' : interval.name;

    return (
      <View style={[styles.container, { backgroundColor: bgColor }]}>
        <TouchableOpacity style={styles.closeBtn} onPress={handleQuit}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
        <View style={styles.meta}>
          <Text style={styles.metaText}>Round {currentRound} / {workout.rounds}</Text>
          <Text style={styles.metaText}>Interval {currentInterval + 1} / {workout.intervals.length}</Text>
        </View>
        <Text style={styles.phase}>{phaseLabel}</Text>
        <Text style={styles.exerciseName}>{exerciseLabel}</Text>
      <Text style={styles.timer}>{formatTime(timeLeft)}</Text>
      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlBtn} onPress={resetComplex}>
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
                  : workout.repeat ? 'Repeat' : 'Finish'}
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
  simpleWorkoutName: { fontSize: 24, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 24 },
  timer: { fontSize: 88, fontWeight: '900', color: '#fff', marginBottom: 24 },
  simpleProgressBar: { width: '80%', height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, overflow: 'hidden', marginBottom: 12 },
  simpleProgressFill: { height: 6, backgroundColor: '#F77E2D', borderRadius: 3 },
  simpleRemaining: { color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 48 },
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