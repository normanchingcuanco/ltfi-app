import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Dimensions, TouchableOpacity, TextInput, Alert, Platform, Image } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import api from '../../src/utils/api';
import { useAuth } from '../../src/contexts/AuthContext';

const CLOUDINARY_CLOUD_NAME = 'de6cwgvio';
const CLOUDINARY_UPLOAD_PRESET = 'ltfi_progress';

const compressImageWeb = (uri) => {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxWidth = 800;
      const scale = Math.min(1, maxWidth / img.width);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.6));
    };
    img.src = uri;
  });
};

const screenWidth = Dimensions.get('window').width - 88;

const confirmDelete = (onConfirm) => {
  if (Platform.OS === 'web') {
    if (window.confirm('Delete this entry?')) onConfirm();
  } else {
    Alert.alert('Delete', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onConfirm }
    ]);
  }
};

const localDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getWeekDays = (weekOffset = 0) => {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diffToMonday = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday + weekOffset * 7);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(localDate(d));
  }
  return days;
};

export default function ProgressScreen() {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [logging, setLogging] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [photoUri, setPhotoUri] = useState(null);
  const [photoDataUrl, setPhotoDataUrl] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [weeklyCalories, setWeeklyCalories] = useState([]);
  const [weeklyLoading, setWeeklyLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [entriesPage, setEntriesPage] = useState(0);
  const [showPhotos, setShowPhotos] = useState(false);
  const ENTRIES_PER_PAGE = 10;

  useFocusEffect(
    useCallback(() => {
      fetchHistory();
      fetchWeeklyCalories();
    }, [])
  );

  useEffect(() => {
    fetchWeeklyCalories();
    setSelectedDay(null);
  }, [weekOffset]);

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

  const fetchWeeklyCalories = async () => {
    setWeeklyLoading(true);
    try {
      const days = getWeekDays(weekOffset);
      const results = await Promise.all(
        days.map(date => api.get(`/meals/summary?date=${date}`).catch(() => ({ data: { totalCalories: 0 } })))
      );
      setWeeklyCalories(days.map((date, idx) => ({
        date,
        calories: results[idx].data?.totalCalories || 0,
        protein: results[idx].data?.totalProtein || 0,
        carbs: results[idx].data?.totalCarbs || 0,
        fat: results[idx].data?.totalFat || 0,
      })));
    } catch (err) {
      console.error(err);
    } finally {
      setWeeklyLoading(false);
    }
  };

  const pickPhoto = async (useCamera) => {
    const options = { base64: true, quality: 0.5, allowsEditing: true, aspect: [3, 4] };
    const source = useCamera
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);

    if (!source.canceled) {
      const asset = source.assets[0];
      setPhotoUri(asset.uri);
      if (Platform.OS === 'web') {
        const dataUrl = await compressImageWeb(asset.uri);
        setPhotoDataUrl(dataUrl);
      } else {
        setPhotoDataUrl(`data:image/jpeg;base64,${asset.base64}`);
      }
    }
  };

  const uploadPhotoToCloudinary = async () => {
    if (!photoDataUrl) return null;
    setUploadingPhoto(true);
    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file: photoDataUrl,
          upload_preset: CLOUDINARY_UPLOAD_PRESET
        })
      });
      const data = await res.json();
      return data.secure_url || null;
    } catch (err) {
      console.error(err);
      return null;
    } finally {
      setUploadingPhoto(false);
    }
  };

  const logWeight = async () => {
    if (!weight) return;
    setLogging(true);
    try {
      const photoUrl = await uploadPhotoToCloudinary();
      await api.post('/weight', { weight: parseFloat(weight), notes, photoUrl });
      setWeight('');
      setNotes('');
      setPhotoUri(null);
      setPhotoDataUrl(null);
      setShowForm(false);
      setEntriesPage(0);
      await fetchHistory();
    } catch (err) {
      console.error(err);
    } finally {
      setLogging(false);
    }
  };

  const deleteEntry = (id) => {
    confirmDelete(async () => {
      try {
        await api.delete(`/weight/${id}`);
        setHistory(prev => prev.filter(e => e._id !== id));
      } catch (err) {
        console.error(err);
      }
    });
  };

  const goal = user?.dailyCalorieGoal || 2000;
  const maxCalories = Math.max(...weeklyCalories.map(d => d.calories), goal);
  const barChartHeight = 120;

  const latest = history[history.length - 1];
  const first = history[0];
  const change = latest && first ? (latest.weight - first.weight).toFixed(1) : null;
  const maxWeight = history.length ? Math.max(...history.map(e => e.weight)) : 0;
  const minWeight = history.length ? Math.min(...history.map(e => e.weight)) : 0;
  const range = maxWeight - minWeight || 1;
  const chartHeight = 160;
  const dotRadius = 5;

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#F77E2D" />
    </View>
  );

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
          {photoUri ? (
            <View style={styles.photoPreviewWrap}>
              <Image source={{ uri: photoUri }} style={styles.photoPreview} />
              <TouchableOpacity style={styles.removePhotoBtn} onPress={() => { setPhotoUri(null); setPhotoDataUrl(null); }}>
                <Text style={styles.removePhotoBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.photoButtonsRow}>
              {Platform.OS !== 'web' && (
                <TouchableOpacity style={styles.photoBtn} onPress={() => pickPhoto(true)}>
                  <Text style={styles.photoBtnText}>📷 Camera</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.photoBtn} onPress={() => pickPhoto(false)}>
                <Text style={styles.photoBtnText}>🖼️ Add Photo</Text>
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity style={styles.submitBtn} onPress={logWeight} disabled={logging}>
            <Text style={styles.submitBtnText}>{uploadingPhoto ? 'Uploading photo...' : logging ? 'Saving...' : 'Save'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Weekly Calorie History */}
      <Text style={styles.sectionTitle}>Weekly Calorie Intake</Text>
      <View style={styles.chartCard}>
        <View style={styles.weekNav}>
            <TouchableOpacity onPress={() => setWeekOffset(prev => prev - 1)} style={styles.weekNavBtn}>
              <Text style={styles.weekNavText}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.chartTitle}>
              {(() => {
                const days = getWeekDays(weekOffset);
                const start = new Date(days[0] + 'T12:00:00');
                const end = new Date(days[6] + 'T12:00:00');
                return weekOffset === 0 ? 'This Week' :
                  `${start.toLocaleDateString('en', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en', { month: 'short', day: 'numeric' })}`;
              })()}
            </Text>
            <TouchableOpacity
              onPress={() => setWeekOffset(prev => Math.min(prev + 1, 0))}
              style={[styles.weekNavBtn, weekOffset === 0 && styles.weekNavBtnDisabled]}
              disabled={weekOffset === 0}
            >
              <Text style={[styles.weekNavText, weekOffset === 0 && { color: '#ccc' }]}>›</Text>
            </TouchableOpacity>
          </View>
        {weeklyLoading ? (
          <ActivityIndicator color="#F77E2D" />
        ) : (
          <>
            <View style={styles.barChart}>
              {weeklyCalories.map((day, idx) => {
                const barHeight = maxCalories > 0 ? (day.calories / maxCalories) * barChartHeight : 0;
                const goalHeight = (goal / maxCalories) * barChartHeight;
                const isSelected = selectedDay?.date === day.date;
                const dayLabel = new Date(day.date + 'T12:00:00').toLocaleDateString('en', { weekday: 'short' });
                return (
                  <TouchableOpacity key={idx} style={styles.barCol} onPress={() => setSelectedDay(isSelected ? null : day)}>
                    <View style={styles.barWrapper}>
                      <View style={[styles.goalLine, { bottom: goalHeight }]} />
                      <View style={[styles.bar, {
                        height: Math.max(barHeight, 2),
                        backgroundColor: isSelected ? '#E05A2B' : day.calories >= goal ? '#E05A2B' : '#F77E2D',
                        opacity: day.calories === 0 ? 0.3 : 1
                      }]} />
                    </View>
                    <Text style={styles.barLabel}>{dayLabel}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.barLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#F77E2D' }]} />
                <Text style={styles.legendText}>Calories</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#888' }]} />
                <Text style={styles.legendText}>Goal ({goal})</Text>
              </View>
            </View>
            {selectedDay && (
              <View style={styles.dayDetail}>
                <Text style={styles.dayDetailDate}>{new Date(selectedDay.date + 'T12:00:00').toDateString()}</Text>
                <View style={styles.dayDetailRow}>
                  <Text style={styles.dayDetailCal}>{selectedDay.calories} kcal</Text>
                  <Text style={styles.dayDetailMacros}>{selectedDay.protein}g P · {selectedDay.carbs}g C · {selectedDay.fat}g F</Text>
                </View>
              </View>
            )}
          </>
        )}
      </View>

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
            <View style={[styles.chart, { overflow: 'hidden' }]}>
              {history.length > 1 && history.map((entry, idx) => {
                if (idx === 0) return null;
                const prev = history[idx - 1];
                const x1 = ((idx - 1) / Math.max(history.length - 1, 1)) * screenWidth;
                const y1 = chartHeight - ((prev.weight - minWeight) / range) * (chartHeight - dotRadius * 2) - dotRadius;
                const x2 = (idx / Math.max(history.length - 1, 1)) * screenWidth;
                const y2 = chartHeight - ((entry.weight - minWeight) / range) * (chartHeight - dotRadius * 2) - dotRadius;
                const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
                const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
                return <View key={`line-${idx}`} style={[styles.line, { left: x1, top: y1, width: length, transform: [{ rotate: `${angle}deg` }] }]} />;
              })}
              {history.map((entry, idx) => {
                const x = (idx / Math.max(history.length - 1, 1)) * screenWidth;
                const y = chartHeight - ((entry.weight - minWeight) / range) * (chartHeight - dotRadius * 2) - dotRadius;
                return <View key={idx} style={[styles.dot, { left: x - dotRadius, top: y - dotRadius }]} />;
              })}
            </View>
            <View style={styles.chartLabels}>
              <Text style={styles.chartLabel}>{minWeight} kg</Text>
              <Text style={styles.chartLabel}>{maxWeight} kg</Text>
            </View>
          </View>

          <View style={styles.logList}>
            <View style={styles.logListHeader}>
              <Text style={styles.logTitle}>Recent Entries</Text>
              <TouchableOpacity onPress={() => setShowPhotos(prev => !prev)}>
                <Text style={styles.togglePhotosText}>{showPhotos ? 'Hide Photos' : 'Show Photos'}</Text>
              </TouchableOpacity>
            </View>
            {[...history].reverse().slice(entriesPage * ENTRIES_PER_PAGE, entriesPage * ENTRIES_PER_PAGE + ENTRIES_PER_PAGE).map((entry, idx) => (
              <View key={idx} style={styles.logItem}>
                {showPhotos ? (
                  entry.photoUrl ? (
                    <Image source={{ uri: entry.photoUrl }} style={styles.logThumb} />
                  ) : (
                    <View style={styles.logThumbPlaceholder} />
                  )
                ) : (
                  <View style={styles.logThumbHidden}>
                    <Text style={styles.logThumbHiddenIcon}>🔒</Text>
                  </View>
                )}
                <Text style={styles.logDate}>{new Date(entry.loggedAt).toDateString()}</Text>
                <Text style={styles.logWeight}>{entry.weight} kg</Text>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteEntry(entry._id)}>
                  <Text style={styles.deleteBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
            {history.length > ENTRIES_PER_PAGE && (
              <View style={styles.paginationRow}>
                <TouchableOpacity
                  style={[styles.pageBtn, entriesPage === 0 && styles.pageBtnDisabled]}
                  disabled={entriesPage === 0}
                  onPress={() => setEntriesPage(p => p - 1)}
                >
                  <Text style={[styles.pageBtnText, entriesPage === 0 && styles.pageBtnTextDisabled]}>‹ Prev</Text>
                </TouchableOpacity>
                <Text style={styles.pageIndicator}>
                  Page {entriesPage + 1} of {Math.ceil(history.length / ENTRIES_PER_PAGE)}
                </Text>
                <TouchableOpacity
                  style={[styles.pageBtn, (entriesPage + 1) * ENTRIES_PER_PAGE >= history.length && styles.pageBtnDisabled]}
                  disabled={(entriesPage + 1) * ENTRIES_PER_PAGE >= history.length}
                  onPress={() => setEntriesPage(p => p + 1)}
                >
                  <Text style={[styles.pageBtnText, (entriesPage + 1) * ENTRIES_PER_PAGE >= history.length && styles.pageBtnTextDisabled]}>Next ›</Text>
                </TouchableOpacity>
              </View>
            )}
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
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
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
  chartTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  weekNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  weekNavBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  weekNavBtnDisabled: { opacity: 0.3 },
  weekNavText: { fontSize: 24, color: '#F77E2D', fontWeight: '700' },
  barChart: { flexDirection: 'row', alignItems: 'flex-end', height: 140, marginBottom: 8, gap: 4 },
  barCol: { flex: 1, alignItems: 'center' },
  barWrapper: { width: '100%', height: 120, justifyContent: 'flex-end', position: 'relative' },
  bar: { width: '100%', borderRadius: 4, minHeight: 2 },
  goalLine: { position: 'absolute', left: 0, right: 0, height: 1.5, backgroundColor: '#888', opacity: 0.5 },
  barLabel: { fontSize: 9, color: '#888', marginTop: 4 },
  barLegend: { flexDirection: 'row', gap: 16, marginTop: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: '#888' },
  dayDetail: { backgroundColor: '#EDE8DF', borderRadius: 12, padding: 14, marginTop: 12 },
  dayDetailDate: { fontSize: 12, color: '#888', marginBottom: 4 },
  dayDetailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dayDetailCal: { fontSize: 18, fontWeight: '800', color: '#F77E2D' },
  dayDetailMacros: { fontSize: 12, color: '#888' },
  chart: { height: 160, position: 'relative', marginBottom: 8 },
  dot: { position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: '#F77E2D' },
  line: { position: 'absolute', height: 2, backgroundColor: '#F77E2D', opacity: 0.4, transformOrigin: 'left center' },
  chartLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  chartLabel: { fontSize: 11, color: '#888' },
  logList: { backgroundColor: '#D9D3C8', borderRadius: 16, padding: 20 },
  logListHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  logTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  togglePhotosText: { fontSize: 12, color: '#F77E2D', fontWeight: '700' },
  logItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#C5BFB4', gap: 10 },
  logThumb: { width: 36, height: 36, borderRadius: 8 },
  logThumbPlaceholder: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#EDE8DF' },
  logThumbHidden: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#EDE8DF', justifyContent: 'center', alignItems: 'center' },
  logThumbHiddenIcon: { fontSize: 14 },
  logDate: { fontSize: 13, color: '#555', flex: 1 },
  logWeight: { fontSize: 13, fontWeight: '700', color: '#F77E2D', marginRight: 12 },
  deleteBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#C5BFB4', justifyContent: 'center', alignItems: 'center' },
  deleteBtnText: { color: '#888', fontSize: 11, fontWeight: '700' },
  photoButtonsRow: { flexDirection: 'row', gap: 12 },
  photoBtn: { flex: 1, backgroundColor: '#EDE8DF', borderRadius: 10, padding: 12, alignItems: 'center' },
  photoBtnText: { color: '#1A1A1A', fontWeight: '600', fontSize: 13 },
  photoPreviewWrap: { position: 'relative', alignSelf: 'flex-start' },
  photoPreview: { width: 100, height: 130, borderRadius: 10 },
  removePhotoBtn: { position: 'absolute', top: -8, right: -8, width: 24, height: 24, borderRadius: 12, backgroundColor: '#1A1A1A', justifyContent: 'center', alignItems: 'center' },
  removePhotoBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  paginationRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 },
  pageBtn: { paddingVertical: 8, paddingHorizontal: 14, backgroundColor: '#EDE8DF', borderRadius: 8 },
  pageBtnDisabled: { opacity: 0.4 },
  pageBtnText: { color: '#F77E2D', fontWeight: '700', fontSize: 13 },
  pageBtnTextDisabled: { color: '#888' },
  pageIndicator: { fontSize: 12, color: '#888' }
});