import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import api from '../src/utils/api';

export default function AddFoodScreen() {
  const { mealType, date } = useLocalSearchParams();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);

  const searchFood = async () => {
    if (!search.trim()) return;
    setLoading(true);
    try {
      const res = await api.get(`/food/search?q=${search}`);
      setResults(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addFood = async (food) => {
    setAdding(true);
    try {
      await api.post('/meals', {
        date,
        mealType,
        food: {
          foodId: food._id,
          name: food.name,
          quantity: 100,
          unit: food.servingUnit || 'g',
          calories: food.calories,
          protein: food.protein,
          carbs: food.carbs,
          fat: food.fat,
          fiber: food.fiber,
          sodium: food.sodium,
          sugar: food.sugar
        }
      });
      router.back();
    } catch (err) {
      console.error(err);
    } finally {
      setAdding(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Add Food</Text>
        <Text style={styles.mealLabel}>{mealType}</Text>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          placeholder="Search food..."
          placeholderTextColor="#999"
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={searchFood}
        />
        <TouchableOpacity style={styles.searchBtn} onPress={searchFood}>
          <Text style={styles.searchBtnText}>Search</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.customBtn} onPress={() => router.push({ pathname: '/custom-food', params: { mealType, date } })}>
        <Text style={styles.customBtnText}>+ Add Custom Food</Text>
      </TouchableOpacity>

      {loading && <ActivityIndicator color="#F77E2D" style={{ marginTop: 20 }} />}

      {results.map((food, idx) => (
        <View key={idx} style={styles.resultItem}>
          <View style={styles.resultInfo}>
            <Text style={styles.resultName}>{food.name}</Text>
            <Text style={styles.resultMacros}>{food.calories} kcal · {food.protein}g P · {food.carbs}g C · {food.fat}g F</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={() => addFood(food)} disabled={adding}>
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EDE8DF' },
  content: { padding: 24, paddingTop: 60 },
  header: { marginBottom: 24 },
  back: { color: '#F77E2D', fontSize: 14, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '900', color: '#1A1A1A' },
  mealLabel: { fontSize: 13, color: '#999', textTransform: 'capitalize', marginTop: 2 },
  searchRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  input: { flex: 1, backgroundColor: '#D9D3C8', borderRadius: 12, padding: 14, fontSize: 15, color: '#1A1A1A' },
  searchBtn: { backgroundColor: '#F77E2D', borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center' },
  searchBtnText: { color: '#fff', fontWeight: '700' },
  customBtn: { borderWidth: 1.5, borderColor: '#F77E2D', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 24 },
  customBtnText: { color: '#F77E2D', fontWeight: '700' },
  resultItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#D9D3C8', borderRadius: 12, padding: 14, marginBottom: 10 },
  resultInfo: { flex: 1 },
  resultName: { fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginBottom: 2 },
  resultMacros: { fontSize: 12, color: '#888' },
  addBtn: { backgroundColor: '#F77E2D', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, marginLeft: 10 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 }
});