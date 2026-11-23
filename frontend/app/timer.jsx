import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Platform, ScrollView, AppState } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import * as Notifications from 'expo-notifications';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { setAudioModeAsync, createAudioPlayer } from 'expo-audio';
import api from '../src/utils/api';
import { useAuth } from '../src/contexts/AuthContext';

// In the foreground the app plays its own sounds, so hide system notifications.
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: false,
      shouldShowList: false,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

// iOS keeps only the 64 soonest pending local notifications per app
const MAX_SCHEDULED = 60;

let notifQueue = Promise.resolve();
const enqueue = (fn) => {
  notifQueue = notifQueue.then(fn).catch(() => {});
};

const cancelAllNotifs = async () => {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (e) {}
};

const ensureNotifPermission = async () => {
  if (Platform.OS === 'web') return false;
  try {
    const cur = await Notifications.getPermissionsAsync();
    if (cur.granted) return true;
    const req = await Notifications.requestPermissionsAsync();
    return !!req.granted;
  } catch (e) {
    return false;
  }
};

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

// Flatten the workout into an ordered list of timed segments
const buildSegments = (w) => {
  const iv = w.intervals;
  const segs = [];
  const wu = Number(w.warmUp) || 0;
  const cd = Number(w.coolDown) || 0;

  if (wu > 0) {
    segs.push({ phase: 'warmup', display: 'Warm Up', seconds: wu, cue: 'Warm up', sound: 'ding', round: 1, interval: 0 });
  }

  if (w.mode === 'simple') {
    const name = iv[0].name || w.name;
    segs.push({ phase: 'work', display: name, seconds: Number(iv[0].workSeconds), cue: name, sound: 'ding', round: 1, interval: 0 });
    if (cd > 0) {
      segs.push({ phase: 'cooldown', display: 'Cool Down', seconds: cd, cue: 'Cool down', sound: 'beep', round: 1, interval: 0 });
    }
    return segs;
  }

  const rounds = Math.max(Number(w.rounds) || 1, 1);
  const perCycle = rounds * iv.length * 2;
  const cycles = w.repeat ? Math.max(Math.ceil(400 / perCycle), 1) : 1;

  for (let c = 0; c < cycles; c++) {
    for (let r = 1; r <= rounds; r++) {
      for (let i = 0; i < iv.length; i++) {
        const it = iv[i];
        let cue = it.name;
        if (i === 0) {
          if (c > 0 && r === 1) cue = `Repeating. ${it.name}`;
          else if (r > 1) cue = `Round ${r}. ${it.name}`;
        }
        segs.push({ phase: 'work', display: it.name, seconds: Number(it.workSeconds), cue, sound: 'ding', round: r, interval: i });
        const rest = Number(it.restSeconds) || 0;
        if (rest > 0) {
          segs.push({ phase: 'rest', display: it.name, seconds: rest, cue: 'Rest', sound: 'beep', round: r, interval: i });
        }
      }
    }
  }

  if (!w.repeat && cd > 0) {
    segs.push({ phase: 'cooldown', display: 'Cool Down', seconds: cd, cue: 'Cool down', sound: 'beep', round: rounds, interval: iv.length - 1 });
  }
  return segs;
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
  const [segments, setSegments] = useState([]);
  const [segIdx, setSegIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [notifOff, setNotifOff] = useState(false);

  const dingSound = useRef(null);
  const beepSound = useRef(null);
  const chimeSound = useRef(null);

  const segmentsRef = useRef([]);
  const workoutRef = useRef(null);
  const userRef = useRef(null);
  const selectedVoiceRef = useRef(null);
  const idxRef = useRef(0);
  const endAtRef = useRef(0);
  const pausedLeftRef = useRef(0);
  const runningRef = useRef(false);
  const appActiveRef = useRef(AppState.currentState === 'active');
  const skipCueRef = useRef(false);
  const lastSpokenRef = useRef('');
  const notifOkRef = useRef(false);
  const scheduledThroughRef = useRef(-1);
  const tickRef = useRef(null);

  userRef.current = user;
  selectedVoiceRef.current = selectedVoice;

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

  const playSound = (name) => {
    if (name === 'beep') playBeep();
    else if (name === 'chime') playChime();
    else playDing();
  };

  const speak = (text) => speakWithVoice(text, selectedVoiceRef.current);

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

    const id = setInterval(() => {
      if (tickRef.current) tickRef.current();
    }, 250);

    const sub = AppState.addEventListener('change', (state) => {
      appActiveRef.current = state === 'active';
      if (state === 'active' && tickRef.current) {
        // catch up silently, the notification already buzzed
        skipCueRef.current = true;
        tickRef.current();
        skipCueRef.current = false;
      }
    });

    return () => {
      clearInterval(id);
      sub.remove();
      runningRef.current = false;
      enqueue(cancelAllNotifs);
    };
  }, []);

  const fetchWorkout = async () => {
    try {
      const res = await api.get(`/workouts/${workoutId}`);
      const w = res.data;
      const segs = buildSegments(w);
      workoutRef.current = w;
      segmentsRef.current = segs;
      idxRef.current = 0;
      pausedLeftRef.current = (segs[0]?.seconds || 0) * 1000;
      setWorkout(w);
      setSegments(segs);
      setSegIdx(0);
      setTimeLeft(segs[0]?.seconds || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (running) {
      activateKeepAwakeAsync();
    } else {
      deactivateKeepAwake();
    }
    return () => deactivateKeepAwake();
  }, [running]);

  const scheduleUpcoming = async () => {
    if (Platform.OS === 'web') return;
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      if (!runningRef.current || !notifOkRef.current) return;
      const segs = segmentsRef.current;
      const start = idxRef.current;
      const last = Math.min(start + MAX_SCHEDULED - 1, segs.length - 1);
      let t = endAtRef.current;
      const jobs = [];
      for (let i = start; i <= last; i++) {
        if (i > start) t += segs[i].seconds * 1000;
        if (t <= Date.now() + 500) continue;
        const next = segs[i + 1];
        const title = !next
          ? 'Workout complete'
          : next.phase === 'rest' ? 'Rest'
          : next.phase === 'cooldown' ? 'Cool down'
          : next.phase === 'warmup' ? 'Warm up'
          : next.display;
        jobs.push(
          Notifications.scheduleNotificationAsync({
            content: { title, body: workoutRef.current?.name || 'Workout', sound: true },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(t) },
          })
        );
      }
      await Promise.all(jobs);
      scheduledThroughRef.current = last;
    } catch (e) {
      console.error(e);
    }
  };

  const finishWorkout = (live) => {
    runningRef.current = false;
    setRunning(false);
    enqueue(cancelAllNotifs);
    setDone(true);
    if (live) {
      playChime();
      speak('Workout complete. Great job!');
    }
    const w = workoutRef.current;
    const u = userRef.current;
    if (w && u?.currentWeight) {
      setCaloriesBurned(calculateCalories(w, u.currentWeight).toString());
    }
  };

  const tick = () => {
    if (!runningRef.current || !appActiveRef.current) return;
    const segs = segmentsRef.current;
    const now = Date.now();
    let idx = idxRef.current;
    let boundary = 0;
    let advanced = false;

    while (now >= endAtRef.current) {
      boundary = endAtRef.current;
      if (idx >= segs.length - 1) {
        finishWorkout(!skipCueRef.current && now - boundary < 2000);
        return;
      }
      idx += 1;
      advanced = true;
      endAtRef.current += segs[idx].seconds * 1000;
    }

    if (advanced) {
      idxRef.current = idx;
      setSegIdx(idx);
      lastSpokenRef.current = '';
      if (!skipCueRef.current && now - boundary < 2000) {
        playSound(segs[idx].sound);
        speak(segs[idx].cue);
      }
      if (notifOkRef.current && scheduledThroughRef.current < segs.length - 1) {
        enqueue(scheduleUpcoming);
      }
    }

    const left = Math.ceil((endAtRef.current - now) / 1000);
    setTimeLeft(left);

    const seg = segs[idx];
    if (left >= 1 && left <= 3 && seg.seconds > 4) {
      const key = `${idx}-${left}`;
      if (lastSpokenRef.current !== key) {
        lastSpokenRef.current = key;
        speak(String(left));
      }
    }
  };
  tickRef.current = tick;

  const pause = () => {
    if (!runningRef.current) return;
    pausedLeftRef.current = Math.max(endAtRef.current - Date.now(), 0);
    runningRef.current = false;
    setRunning(false);
    setTimeLeft(Math.ceil(pausedLeftRef.current / 1000));
    enqueue(cancelAllNotifs);
  };

  const resume = () => {
    const seg = segmentsRef.current[idxRef.current];
    if (!seg) return;
    endAtRef.current = Date.now() + pausedLeftRef.current;
    lastSpokenRef.current = '';
    runningRef.current = true;
    setRunning(true);
    speak(seg.cue);
    enqueue(scheduleUpcoming);
  };

  const handleStart = () => {
    if (runningRef.current) pause();
    else resume();
  };

  const startWorkout = async () => {
    const ok = await ensureNotifPermission();
    notifOkRef.current = ok;
    setNotifOff(Platform.OS !== 'web' && !ok);
    setScreen('timer');
  };

  const resetTimer = () => {
    runningRef.current = false;
    setRunning(false);
    enqueue(cancelAllNotifs);
    idxRef.current = 0;
    setSegIdx(0);
    const s = segmentsRef.current[0];
    pausedLeftRef.current = s.seconds * 1000;
    setTimeLeft(s.seconds);
    setDone(false);
  };

  const skipNext = () => {
    const segs = segmentsRef.current;
    runningRef.current = false;
    setRunning(false);
    enqueue(cancelAllNotifs);
    if (idxRef.current >= segs.length - 1) {
      finishWorkout(true);
      return;
    }
    const idx = idxRef.current + 1;
    idxRef.current = idx;
    setSegIdx(idx);
    pausedLeftRef.current = segs[idx].seconds * 1000;
    setTimeLeft(segs[idx].seconds);
    playSound(segs[idx].sound);
    speak(segs[idx].cue);
  };

  const stopWorkout = () => finishWorkout(false);

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
    const wasRunning = runningRef.current;
    pause();
    if (Platform.OS === 'web') {
      if (window.confirm('Quit workout? Your progress will be lost.')) {
        router.back();
      } else if (wasRunning) {
        resume();
      }
    } else {
      router.back();
    }
  };

  if (loading || !workout || !segments.length) return (
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

      <TouchableOpacity style={styles.startWorkoutBtn} onPress={startWorkout}>
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

  const seg = segments[segIdx];

  if (workout.mode === 'simple') {
    const totalTime = segments.reduce((a, s) => a + s.seconds, 0);
    const before = segments.slice(0, segIdx).reduce((a, s) => a + s.seconds, 0);
    const elapsed = before + (seg.seconds - timeLeft);
    const progress = totalTime > 0 ? Math.min(Math.max(elapsed / totalTime, 0), 1) : 0;
    return (
      <View style={[styles.container, { backgroundColor: '#1A1A1A' }]}>
        <TouchableOpacity style={styles.closeBtn} onPress={handleQuit}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.simpleWorkoutName}>
          {seg.phase === 'warmup' ? 'Warm Up' : seg.phase === 'cooldown' ? 'Cool Down' : workout.name}
        </Text>
        <Text style={styles.phase}>
          {seg.phase === 'warmup' ? 'WARM UP' : seg.phase === 'cooldown' ? 'COOL DOWN' : 'WORK'}
        </Text>
        <Text style={styles.timer}>{formatTime(timeLeft)}</Text>
        <View style={styles.simpleProgressBar}>
          <View style={[styles.simpleProgressFill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.simpleRemaining}>
          {Math.round(progress * 100)}% remaining
        </Text>
        <View style={styles.controls}>
          <TouchableOpacity style={styles.controlBtn} onPress={resetTimer}>
            <Text style={styles.controlBtnText}>↺</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.playBtn} onPress={handleStart}>
            <Text style={styles.playBtnText}>{running ? '⏸' : '▶'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlBtn} onPress={stopWorkout}>
            <Text style={styles.controlBtnText}>⏹</Text>
          </TouchableOpacity>
        </View>
        {notifOff && (
          <Text style={styles.notifHint}>Notifications are off, so no buzz when the app is in the background.</Text>
        )}
      </View>
    );
  }

  const isWork = seg.phase === 'work';
  const isWarmup = seg.phase === 'warmup';
  const isCooldown = seg.phase === 'cooldown';

  const bgColor = isWarmup ? '#1A3A4A' : isCooldown ? '#2A2A4A' : isWork ? '#1A1A1A' : '#2C4A2E';
  const phaseLabel = isWarmup ? 'WARM UP' : isCooldown ? 'COOL DOWN' : isWork ? 'WORK' : 'REST';
  const exerciseLabel = isWarmup ? 'Warm Up' : isCooldown ? 'Cool Down' : seg.display;

  const next = segments[segIdx + 1];
  let upNextText = 'Finish';
  if (next) {
    if (next.phase === 'rest') upNextText = `Rest ${next.seconds}s`;
    else if (next.phase === 'cooldown') upNextText = 'Cool Down';
    else if (next.interval === 0 && seg.phase !== 'warmup') upNextText = next.round === 1 ? 'Repeat' : `Round ${next.round}`;
    else upNextText = next.display;
  }

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <TouchableOpacity style={styles.closeBtn} onPress={handleQuit}>
        <Text style={styles.closeBtnText}>✕</Text>
      </TouchableOpacity>
      <View style={styles.meta}>
        <Text style={styles.metaText}>Round {seg.round} / {workout.rounds}</Text>
        <Text style={styles.metaText}>Interval {seg.interval + 1} / {workout.intervals.length}</Text>
      </View>
      <Text style={styles.phase}>{phaseLabel}</Text>
      <Text style={styles.exerciseName}>{exerciseLabel}</Text>
      <Text style={styles.timer}>{formatTime(timeLeft)}</Text>
      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlBtn} onPress={resetTimer}>
          <Text style={styles.controlBtnText}>↺</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.playBtn} onPress={handleStart}>
          <Text style={styles.playBtnText}>{running ? '⏸' : '▶'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlBtn} onPress={skipNext}>
          <Text style={styles.controlBtnText}>⏭</Text>
        </TouchableOpacity>
      </View>
      {notifOff && (
        <Text style={styles.notifHint}>Notifications are off, so no buzz when the app is in the background.</Text>
      )}
      {workout.intervals.length > 1 && (
        <View style={styles.upNext}>
          <Text style={styles.upNextLabel}>Up Next</Text>
          <Text style={styles.upNextText}>{upNextText}</Text>
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
  notifHint: { color: 'rgba(255,255,255,0.5)', fontSize: 12, textAlign: 'center', marginTop: -24, marginBottom: 24 },
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