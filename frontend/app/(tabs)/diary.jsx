import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import api from '../../src/utils/api';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snacks'];

export default function DiaryScreen() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      const res = await api.get(`/meals/summary?date=${today}`);
      setSummary(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#F77E2D" />
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Food Diary</Text>
      <Text style={styles.date}>{new Date().toDateString()}</Text>

      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{summary?.totalCalories || 0}</Text>
            <Text style={styles.summaryLabel}>Calories</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{summary?.totalProtein || 0}g</Text>
            <Text style={styles.summaryLabel}>Protein</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{summary?.totalCarbs || 0}g</Text>
            <Text style={styles.summaryLabel}>Carbs</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{summary?.totalFat || 0}g</Text>
            <Text style={styles.summaryLabel}>Fat</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.microValue}>{summary?.totalFiber || 0}g</Text>
            <Text style={styles.summaryLabel}>Fiber</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.microValue}>{summary?.totalSugar || 0}g</Text>
            <Text style={styles.summaryLabel}>Sugar</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.microValue}>{summary?.totalSodium || 0}mg</Text>
            <Text style={styles.summaryLabel}>Sodium</Text>
          </View>
        </View>
      </View>

      {MEAL_TYPES.map(mealType => {
        const meal = summary?.meals?.find(m => m.mealType === mealType);
        return (
          <View key={mealType} style={styles.mealSection}>
            <View style={styles.mealHeader}>
              <Text style={styles.mealTitle}>{mealType.charAt(0).toUpperCase() + mealType.slice(1)}</Text>
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => router.push({ pathname: '/add-food', params: { mealType, date: today } })}
              >
                <Text style={styles.addBtnText}>+ Add</Text>
              </TouchableOpacity>
            </View>
            {meal?.foods?.length > 0 ? (
              meal.foods.map((food, idx) => (
                <View key={idx} style={styles.foodItem}>
                  <Text style={styles.foodName}>{food.name}</Text>
                  <Text style={styles.foodCals}>{food.calories} kcal</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>Nothing logged yet</Text>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EDE8DF' },
  content: { padding: 24, paddingTop: 60 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#EDE8DF' },
  title: { fontSize: 28, fontWeight: '900', color: '#1A1A1A', marginBottom: 4 },
  date: { fontSize: 13, color: '#999', marginBottom: 24 },
  summaryCard: { backgroundColor: '#D9D3C8', borderRadius: 16, padding: 20, marginBottom: 24 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  divider: { height: 1, backgroundColor: '#C5BFB4', marginVertical: 16 },
  summaryItem: { alignItems: 'center' },
  summaryValue: { fontSize: 20, fontWeight: '800', color: '#F77E2D' },
  microValue: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  summaryLabel: { fontSize: 11, color: '#888', marginTop: 2, textTransform: 'uppercase', letterSpacing: 1 },
  mealSection: { marginBottom: 24 },
  mealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  mealTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', textTransform: 'capitalize' },
  addBtn: { backgroundColor: '#F77E2D', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 99 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  foodItem: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#D9D3C8', borderRadius: 10, padding: 12, marginBottom: 6 },
  foodName: { fontSize: 14, color: '#1A1A1A', fontWeight: '500' },
  foodCals: { fontSize: 14, color: '#F77E2D', fontWeight: '700' },
  emptyText: { fontSize: 13, color: '#bbb', fontStyle: 'italic' }
});