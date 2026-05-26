import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';

export default function RegisterScreen() {
  const [form, setForm] = useState({
    name: '', email: '', password: '',
    age: '', height: '', currentWeight: '',
    goalWeight: '', activityLevel: 'moderate', dietPreference: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleRegister = async () => {
    if (!form.name || !form.email || !form.password || !form.age || !form.height || !form.currentWeight || !form.goalWeight) {
      return setError('Please fill in all required fields');
    }
    setLoading(true);
    setError('');
    try {
      await register({
        ...form,
        age: Number(form.age),
        height: Number(form.height),
        currentWeight: Number(form.currentWeight),
        goalWeight: Number(form.goalWeight)
      });
      router.replace('/(tabs)/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const activityLevels = ['sedentary', 'light', 'moderate', 'active', 'very active'];

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
        <Text style={styles.logo}>LTFI</Text>
        <Text style={styles.tagline}>Create your account</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TextInput style={styles.input} placeholder="Full Name" placeholderTextColor="#999" value={form.name} onChangeText={v => update('name', v)} />
        <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#999" value={form.email} onChangeText={v => update('email', v)} autoCapitalize="none" keyboardType="email-address" />

        <View style={styles.passwordRow}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Password"
            placeholderTextColor="#999"
            value={form.password}
            onChangeText={v => update('password', v)}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
            <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁'}</Text>
          </TouchableOpacity>
        </View>

        <TextInput style={styles.input} placeholder="Age" placeholderTextColor="#999" value={form.age} onChangeText={v => update('age', v)} keyboardType="numeric" />
        <TextInput style={styles.input} placeholder="Height (cm)" placeholderTextColor="#999" value={form.height} onChangeText={v => update('height', v)} keyboardType="numeric" />
        <TextInput style={styles.input} placeholder="Current Weight (kg)" placeholderTextColor="#999" value={form.currentWeight} onChangeText={v => update('currentWeight', v)} keyboardType="numeric" />
        <TextInput style={styles.input} placeholder="Goal Weight (kg)" placeholderTextColor="#999" value={form.goalWeight} onChangeText={v => update('goalWeight', v)} keyboardType="numeric" />
        <TextInput style={styles.input} placeholder="Diet Preference (optional)" placeholderTextColor="#999" value={form.dietPreference} onChangeText={v => update('dietPreference', v)} />

        <Text style={styles.label}>Activity Level</Text>
        <View style={styles.pills}>
          {activityLevels.map(level => (
            <TouchableOpacity
              key={level}
              style={[styles.pill, form.activityLevel === level && styles.pillActive]}
              onPress={() => update('activityLevel', level)}
            >
              <Text style={[styles.pillText, form.activityLevel === level && styles.pillTextActive]}>
                {level}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create Account</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.link}>Already have an account? <Text style={styles.linkBold}>Log in</Text></Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.createimport { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';

export default function RegisterScreen() {
  const [form, setForm] = useState({
    name: '', email: '', password: '',
    age: '', height: '', currentWeight: '',
    goalWeight: '', activityLevel: 'moderate',
    dietPreference: '', gender: 'male'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleRegister = async () => {
    if (!form.name || !form.email || !form.password || !form.age || !form.height || !form.currentWeight || !form.goalWeight) {
      return setError('Please fill in all required fields');
    }
    setLoading(true);
    setError('');
    try {
      await register({
        ...form,
        age: Number(form.age),
        height: Number(form.height),
        currentWeight: Number(form.currentWeight),
        goalWeight: Number(form.goalWeight)
      });
      router.replace('/(tabs)/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const activityLevels = ['sedentary', 'light', 'moderate', 'active', 'very active'];

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
        <Text style={styles.logo}>LTFI</Text>
        <Text style={styles.tagline}>Create your account</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TextInput style={styles.input} placeholder="Full Name" placeholderTextColor="#999" value={form.name} onChangeText={v => update('name', v)} />
        <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#999" value={form.email} onChangeText={v => update('email', v)} autoCapitalize="none" keyboardType="email-address" />

        <View style={styles.passwordRow}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Password"
            placeholderTextColor="#999"
            value={form.password}
            onChangeText={v => update('password', v)}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
            <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁'}</Text>
          </TouchableOpacity>
        </View>

        <TextInput style={styles.input} placeholder="Age" placeholderTextColor="#999" value={form.age} onChangeText={v => update('age', v)} keyboardType="numeric" />
        <TextInput style={styles.input} placeholder="Height (cm)" placeholderTextColor="#999" value={form.height} onChangeText={v => update('height', v)} keyboardType="numeric" />
        <TextInput style={styles.input} placeholder="Current Weight (kg)" placeholderTextColor="#999" value={form.currentWeight} onChangeText={v => update('currentWeight', v)} keyboardType="numeric" />
        <TextInput style={styles.input} placeholder="Goal Weight (kg)" placeholderTextColor="#999" value={form.goalWeight} onChangeText={v => update('goalWeight', v)} keyboardType="numeric" />
        <TextInput style={styles.input} placeholder="Diet Preference (optional)" placeholderTextColor="#999" value={form.dietPreference} onChangeText={v => update('dietPreference', v)} />

        <Text style={styles.label}>Gender</Text>
        <View style={styles.pills}>
          {['male', 'female'].map(g => (
            <TouchableOpacity
              key={g}
              style={[styles.pill, form.gender === g && styles.pillActive]}
              onPress={() => update('gender', g)}
            >
              <Text style={[styles.pillText, form.gender === g && styles.pillTextActive]}>
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Activity Level</Text>
        <View style={styles.pills}>
          {activityLevels.map(level => (
            <TouchableOpacity
              key={level}
              style={[styles.pill, form.activityLevel === level && styles.pillActive]}
              onPress={() => update('activityLevel', level)}
            >
              <Text style={[styles.pillText, form.activityLevel === level && styles.pillTextActive]}>
                {level}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create Account</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.link}>Already have an account? <Text style={styles.linkBold}>Log in</Text></Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EDE8DF' },
  inner: { paddingHorizontal: 28, paddingTop: 60, paddingBottom: 40 },
  logo: { fontSize: 52, fontWeight: '900', color: '#1A1A1A', letterSpacing: 4, textAlign: 'center' },
  tagline: { fontSize: 13, color: '#999', textAlign: 'center', marginBottom: 32, letterSpacing: 2 },
  error: { color: '#FF2D2D', marginBottom: 12, textAlign: 'center', fontSize: 13 },
  input: { backgroundColor: '#D9D3C8', borderRadius: 12, padding: 14, marginBottom: 12, fontSize: 15, color: '#1A1A1A' },
  passwordRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#D9D3C8', borderRadius: 12, marginBottom: 12 },
  passwordInput: { flex: 1, padding: 14, fontSize: 15, color: '#1A1A1A' },
  eyeBtn: { paddingHorizontal: 14 },
  eyeText: { fontSize: 18 },
  label: { fontSize: 13, color: '#888', marginBottom: 10, letterSpacing: 1 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  pill: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 99, backgroundColor: '#D9D3C8' },
  pillActive: { backgroundColor: '#F77E2D' },
  pillText: { fontSize: 12, color: '#666', textTransform: 'capitalize' },
  pillTextActive: { color: '#fff', fontWeight: '700' },
  button: { backgroundColor: '#F77E2D', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 20 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  link: { textAlign: 'center', color: '#888', fontSize: 13 },
  linkBold: { color: '#F77E2D', fontWeight: '700' }
});