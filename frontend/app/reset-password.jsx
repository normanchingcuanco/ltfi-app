import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import api from '../src/utils/api';

export default function ResetPasswordScreen() {
  const { token } = useLocalSearchParams();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleReset = async () => {
    if (!password || !confirm) return setError('All fields required');
    if (password !== confirm) return setError('Passwords do not match');
    if (password.length < 6) return setError('Password must be at least 6 characters');
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/reset-password', { token, password });
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.inner}>
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>Enter your new password below.</Text>

        {done ? (
          <View style={styles.successBox}>
            <Text style={styles.successText}>Password reset successfully.</Text>
            <TouchableOpacity style={styles.button} onPress={() => router.replace('/(auth)/login')}>
              <Text style={styles.buttonText}>Log In</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <View style={styles.passwordRow}>
              <TextInput
                style={styles.passwordInput}
                placeholder="New Password"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁'}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.passwordRow}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Confirm Password"
                placeholderTextColor="#999"
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry={!showConfirm}
              />
              <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeBtn}>
                <Text style={styles.eyeText}>{showConfirm ? '🙈' : '👁'}</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.button} onPress={handleReset} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Reset Password</Text>}
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EDE8DF' },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  title: { fontSize: 32, fontWeight: '900', color: '#1A1A1A', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#888', marginBottom: 32 },
  error: { color: '#FF2D2D', marginBottom: 12, textAlign: 'center', fontSize: 13 },
  passwordRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#D9D3C8', borderRadius: 12, marginBottom: 12 },
  passwordInput: { flex: 1, padding: 14, fontSize: 15, color: '#1A1A1A' },
  eyeBtn: { paddingHorizontal: 14 },
  eyeText: { fontSize: 18 },
  button: { backgroundColor: '#F77E2D', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8, marginBottom: 20 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  successBox: { gap: 16 },
  successText: { fontSize: 15, color: '#1A1A1A', textAlign: 'center' }
});