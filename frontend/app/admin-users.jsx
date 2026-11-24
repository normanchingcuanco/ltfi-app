import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';
import api from '../src/utils/api';

export default function AdminUsersScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmId, setConfirmId] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/auth/admin/users');
      setUsers(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id) => {
    setBusyId(id);
    setError('');
    try {
      await api.delete(`/auth/admin/users/${id}`);
      setUsers(prev => prev.filter(u => u._id !== id));
      setConfirmId(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete user');
    } finally {
      setBusyId(null);
    }
  };

  const formatDate = (d) => {
    if (!d) return '';
    try {
      return new Date(d).toLocaleDateString();
    } catch {
      return '';
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backText}>‹ Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Users</Text>
      <Text style={styles.subtitle}>{users.length} accounts</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading && <ActivityIndicator color="#F77E2D" style={{ marginTop: 24 }} />}

      {!loading && users.map(u => {
        const isMe = u._id === user?._id;
        return (
          <View key={u._id} style={styles.row}>
            <View style={styles.info}>
              <Text style={styles.userName}>
                {u.name}{u.isAdmin ? '  (admin)' : ''}{isMe && !u.isAdmin ? '  (you)' : ''}
              </Text>
              <Text style={styles.userEmail}>{u.email}</Text>
              {u.createdAt ? <Text style={styles.userDate}>Joined {formatDate(u.createdAt)}</Text> : null}
            </View>

            {!u.isAdmin && confirmId !== u._id && (
              <TouchableOpacity style={styles.deleteBtn} onPress={() => setConfirmId(u._id)}>
                <Text style={styles.deleteBtnText}>Delete</Text>
              </TouchableOpacity>
            )}

            {!u.isAdmin && confirmId === u._id && (
              <View style={styles.confirmCol}>
                <TouchableOpacity
                  style={styles.confirmBtn}
                  onPress={() => handleDelete(u._id)}
                  disabled={busyId === u._id}
                >
                  <Text style={styles.confirmBtnText}>{busyId === u._id ? 'Deleting...' : 'Confirm'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setConfirmId(null)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EDE8DF' },
  content: { padding: 24, paddingTop: 60, paddingBottom: 60 },
  backBtn: { marginBottom: 12 },
  backText: { color: '#F77E2D', fontWeight: '700', fontSize: 15 },
  title: { fontSize: 32, fontWeight: '900', color: '#1A1A1A' },
  subtitle: { fontSize: 13, color: '#999', marginBottom: 20, marginTop: 4 },
  error: { color: '#FF2D2D', fontSize: 13, fontWeight: '600', marginBottom: 12 },
  row: { backgroundColor: '#D9D3C8', borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  info: { flex: 1 },
  userName: { fontSize: 16, fontWeight: '800', color: '#1A1A1A' },
  userEmail: { fontSize: 13, color: '#666', marginTop: 2 },
  userDate: { fontSize: 11, color: '#999', marginTop: 4 },
  deleteBtn: { backgroundColor: '#EDE8DF', borderRadius: 99, paddingVertical: 8, paddingHorizontal: 16 },
  deleteBtnText: { color: '#FF2D2D', fontWeight: '700', fontSize: 12 },
  confirmCol: { gap: 6 },
  confirmBtn: { backgroundColor: '#FF2D2D', borderRadius: 99, paddingVertical: 8, paddingHorizontal: 16, alignItems: 'center' },
  confirmBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  cancelBtn: { borderWidth: 1.5, borderColor: '#C4BDB2', borderRadius: 99, paddingVertical: 6, paddingHorizontal: 16, alignItems: 'center' },
  cancelBtnText: { color: '#888', fontWeight: '600', fontSize: 12 }
});