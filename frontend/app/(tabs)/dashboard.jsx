import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import { useRouter } from 'expo-router';

export default function DashboardScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hey, {user?.name?.split(' ')[0]} 👋</Text>
          <Text style={styles.date}>{new Date().toDateString()}</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.avatarInitials}</Text>
        </View>
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

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EDE8DF' },
  content: { padding: 24, paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  greeting: { fontSize: 26, fontWeight: '800', color: '#1A1A1A' },
  date: { fontSize: 13, color: '#999', marginTop: 2 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F77E2D', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  card: { backgroundColor: '#D9D3C8', borderRadius: 16, padding: 20, marginBottom: 16 },
  cardLabel: { fontSize: 12, color: '#888', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  cardValue: { fontSize: 36, fontWeight: '900', color: '#F77E2D' },
  macrosRow: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  macroCard: { flex: 1, backgroundColor: '#D9D3C8', borderRadius: 16, padding: 16, alignItems: 'center' },
  macroValue: { fontSize: 22, fontWeight: '800', color: '#1A1A1A' },
  macroLabel: { fontSize: 11, color: '#888', marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 },
  logoutBtn: { padding: 16, borderRadius: 12, borderWidth: 1.5, borderColor: '#C4BDB2', alignItems: 'center' },
  logoutText: { color: '#888', fontWeight: '600' }
});