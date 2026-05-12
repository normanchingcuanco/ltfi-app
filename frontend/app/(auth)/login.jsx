import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) return setError('All fields required');
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      router.replace('/(tabs)/dashboard');
    } catch (err) {
      setError('Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.inner}>
        <Text style={styles.logo}>LTFI</Text>
        <Text style={styles.tagline}>Lock The F*ck In</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#999"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <View style={styles.passwordRow}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Password"
            placeholderTextColor="#999"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
            <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁'}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Log In</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')}>
          <Text style={styles.link}>Forgot password? <Text style={styles.linkBold}>Reset it</Text></Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ marginTop: 12 }} onPress={() => router.push('/(auth)/register')}>
          <Text style={styles.link}>Don't have an account? <Text style={styles.linkBold}>Sign up</Text></Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EDE8DF' },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  logo: { fontSize: 52, fontWeight: '900', color: '#1A1A1A', letterSpacing: 4, textAlign: 'center' },
  tagline: { fontSize: 13, color: '#999', textAlign: 'center', marginBottom: 40, letterSpacing: 2 },
  error: { color: '#FF2D2D', marginBottom: 12, textAlign: 'center', fontSize: 13 },
  input: { backgroundColor: '#D9D3C8', borderRadius: 12, padding: 14, marginBottom: 12, fontSize: 15, color: '#1A1A1A' },
  passwordRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#D9D3C8', borderRadius: 12, marginBottom: 12 },
  passwordInput: { flex: 1, padding: 14, fontSize: 15, color: '#1A1A1A' },
  eyeBtn: { paddingHorizontal: 14 },
  eyeText: { fontSize: 18 },
  button: { backgroundColor: '#F77E2D', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8, marginBottom: 20 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  link: { textAlign: 'center', color: '#888', fontSize: 13 },
  linkBold: { color: '#F77E2D', fontWeight: '700' }
});