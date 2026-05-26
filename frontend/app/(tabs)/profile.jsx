import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import api from '../../src/utils/api';

const ACTIVITY_LEVELS = ['sedentary', 'light', 'moderate', 'active', 'very active'];

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    currentWeight: '',
    goalWeight: '',
    height: '',
    age: '',
    activityLevel: 'sedentary',
    dietPreference: ''
  });

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        currentWeight: user.currentWeight?.toString() || '',
        goalWeight: user.goalWeight?.toString() || '',
        height: user.height?.toString() || '',
        age: user.age?.toString() || '',
        activityLevel: user.activityLevel || 'sedentary',
        dietPreference: user.dietPreference || ''
      });
    }
  }, [user]);

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.put('/auth/profile', {
        name: form.name,
        currentWeight: parseFloat(form.currentWeight),
        goalWeight: parseFloat(form.goalWeight),
        height: parseFloat(form.height),
        age: parseInt(form.age),
        activityLevel: form.activityLevel,
        dietPreference: form.dietPreference
      });
      setEditing(false);
      Alert.alert('Saved', 'Profile updated.');
    } catch (err) {
      Alert.alert('Error', 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.avatarInitials}</Text>
        </View>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Daily Calorie Goal</Text>
        <Text style={styles.cardValue}>{user?.dailyCalorieGoal} kcal</Text>
      </View>

      <View style={styles.macrosRow}>
        <View style={styles.macroCard}>
          <Text style={styles.macroValue}>{user?.macroGoals?.protein}g</Text>
          <Text style={styles.macroLabel}>Protein</Text>
        </View>
        <View style={styles.macroCard}>
          <Text style={styles.macroValue}>{user?.macroGoals?.carbs}g</Text>
          <Text style={styles.macroLabel}>Carbs</Text>
        </View>
        <View style={styles.macroCard}>
          <Text style={styles.macroValue}>{user?.macroGoals?.fat}g</Text>
          <Text style={styles.macroLabel}>Fat</Text>
        </View>
      </View>

      {!editing && (
        <>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{user?.currentWeight} kg</Text>
              <Text style={styles.statLabel}>Current Weight</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{user?.goalWeight} kg</Text>
              <Text style={styles.statLabel}>Goal Weight</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{user?.height} cm</Text>
              <Text style={styles.statLabel}>Height</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{user?.age}</Text>
              <Text style={styles.statLabel}>Age</Text>
            </View>
          </View>

          <View style={styles.activityCard}>
            <Text style={styles.cardLabel}>Activity Level</Text>
            <Text style={styles.activityValue}>{user?.activityLevel}</Text>
          </View>

          {user?.dietPreference ? (
            <View style={styles.activityCard}>
              <Text style={styles.cardLabel}>Diet Preference</Text>
              <Text style={styles.activityValue}>{user?.dietPreference}</Text>
            </View>
          ) : null}

          <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)}>
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </TouchableOpacity>
        </>
      )}

      {editing && (
        <View style={styles.formCard}>
          {[
            { label: 'Name', key: 'name' },
            { label: 'Current Weight (kg)', key: 'currentWeight', numeric: true },
            { label: 'Goal Weight (kg)', key: 'goalWeight', numeric: true },
            { label: 'Height (cm)', key: 'height', numeric: true },
            { label: 'Age', key: 'age', numeric: true },
            { label: 'Diet Preference', key: 'dietPreference' }
          ].map(field => (
            <View key={field.key} style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{field.label}</Text>
              <TextInput
                style={styles.input}
                value={form[field.key]}
                onChangeText={val => setForm({ ...form, [field.key]: val })}
                keyboardType={field.numeric ? 'decimal-pad' : 'default'}
                placeholderTextColor="#999"
              />
            </View>
          ))}

          <Text style={styles.fieldLabel}>Activity Level</Text>
          <View style={styles.pills}>
            {ACTIVITY_LEVELS.map(level => (
              <TouchableOpacity
                key={level}
                style={[styles.pill, form.activityLevel === level && styles.pillActive]}
                onPress={() => setForm({ ...form, activityLevel: level })}
              >
                <Text style={[styles.pillText, form.activityLevel === level && styles.pillTextActive]}>{level}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
            <Text style={styles.saveBtnText}>{loading ? 'Saving...' : 'Save Changes'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(false)}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EDE8DF' },
  content: { padding: 24, paddingTop: 60 },
  header: { alignItems: 'center', marginBottom: 32 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#F77E2D', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { color: '#fff', fontWeight: '900', fontSize: 26 },
  name: { fontSize: 22, fontWeight: '800', color: '#1A1A1A' },
  email: { fontSize: 13, color: '#999', marginTop: 4 },
  card: { backgroundColor: '#D9D3C8', borderRadius: 16, padding: 20, marginBottom: 16 },
  cardLabel: { fontSize: 12, color: '#888', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  cardValue: { fontSize: 36, fontWeight: '900', color: '#F77E2D' },
  macrosRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  macroCard: { flex: 1, backgroundColor: '#D9D3C8', borderRadius: 16, padding: 16, alignItems: 'center' },
  macroValue: { fontSize: 22, fontWeight: '800', color: '#1A1A1A' },
  macroLabel: { fontSize: 11, color: '#888', marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  statItem: { width: '47%', backgroundColor: '#D9D3C8', borderRadius: 16, padding: 16, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: '#1A1A1A' },
  statLabel: { fontSize: 11, color: '#888', marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 },
  activityCard: { backgroundColor: '#D9D3C8', borderRadius: 16, padding: 16, marginBottom: 12 },
  activityValue: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', textTransform: 'capitalize', marginTop: 4 },
  formCard: { backgroundColor: '#D9D3C8', borderRadius: 16, padding: 20, marginBottom: 16, gap: 12 },
  fieldGroup: { gap: 4 },
  fieldLabel: { fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  input: { backgroundColor: '#EDE8DF', borderRadius: 10, padding: 14, fontSize: 15, color: '#1A1A1A' },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  pill: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 99, backgroundColor: '#EDE8DF' },
  pillActive: { backgroundColor: '#F77E2D' },
  pillText: { fontSize: 12, color: '#666', textTransform: 'capitalize' },
  pillTextActive: { color: '#fff', fontWeight: '700' },
  saveBtn: { backgroundColor: '#F77E2D', borderRadius: 12, padding: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700' },
  cancelBtn: { borderWidth: 1.5, borderColor: '#C4BDB2', borderRadius: 12, padding: 14, alignItems: 'center' },
  cancelBtnText: { color: '#888', fontWeight: '600' },
  editBtn: { backgroundColor: '#F77E2D', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 16 },
  editBtnText: { color: '#fff', fontWeight: '700' },
  logoutBtn: { padding: 16, borderRadius: 12, borderWidth: 1.5, borderColor: '#C4BDB2', alignItems: 'center', marginTop: 8 },
  logoutText: { color: '#888', fontWeight: '600' }
});