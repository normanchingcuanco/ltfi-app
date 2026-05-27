import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import api from '../src/utils/api';

export default function CustomFoodScreen() {
  const { mealType, date } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', calories: '', protein: '', carbs: '',
    fat: '', fiber: '', sodium: '', sugar: '',
    servingSize: '100', servingUnit: 'g'
  });

  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSubmit = async () => {
    if (!form.name || !form.calories) return;
    setLoading(true);
    try {
      const food = await api.post('/food', {
        name: form.name,
        calories: Number(form.calories),
        protein: Number(form.protein) || 0,
        carbs: Number(form.carbs) || 0,
        fat: Number(form.fat) || 0,
        fiber: Number(form.fiber) || 0,
        sodium: Number(form.sodium) || 0,
        sugar: Number(form.sugar) || 0,
        servingSize: Number(form.servingSize) || 100,
        servingUnit: form.servingUnit || 'g'
      });

      await api.post('/meals', {
        date,
        mealType,
        food: {
          foodId: food.data._id,
          name: food.data.name,
          quantity: Number(form.servingSize) || 100,
          unit: form.servingUnit || 'g',
          calories: food.data.calories,
          protein: food.data.protein,
          carbs: food.data.carbs,
          fat: food.data.fat,
          fiber: food.data.fiber,
          sodium: food.data.sodium,
          sugar: food.data.sugar
        }
      });

      router.replace('/(tabs)/diary');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Custom Food</Text>
      </View>

      <TextInput style={styles.input} placeholder="Food name *" placeholderTextColor="#999" value={form.name} onChangeText={v => update('name', v)} />
      <TextInput style={styles.input} placeholder="Calories *" placeholderTextColor="#999" value={form.calories} onChangeText={v => update('calories', v)} keyboardType="numeric" />
      <TextInput style={styles.input} placeholder="Protein (g)" placeholderTextColor="#999" value={form.protein} onChangeText={v => update('protein', v)} keyboardType="numeric" />
      <TextInput style={styles.input} placeholder="Carbs (g)" placeholderTextColor="#999" value={form.carbs} onChangeText={v => update('carbs', v)} keyboardType="numeric" />
      <TextInput style={styles.input} placeholder="Fat (g)" placeholderTextColor="#999" value={form.fat} onChangeText={v => update('fat', v)} keyboardType="numeric" />
      <TextInput style={styles.input} placeholder="Fiber (g)" placeholderTextColor="#999" value={form.fiber} onChangeText={v => update('fiber', v)} keyboardType="numeric" />
      <TextInput style={styles.input} placeholder="Sodium (mg)" placeholderTextColor="#999" value={form.sodium} onChangeText={v => update('sodium', v)} keyboardType="numeric" />
      <TextInput style={styles.input} placeholder="Sugar (g)" placeholderTextColor="#999" value={form.sugar} onChangeText={v => update('sugar', v)} keyboardType="numeric" />
      <TextInput style={styles.input} placeholder="Serving size (default 100)" placeholderTextColor="#999" value={form.servingSize} onChangeText={v => update('servingSize', v)} keyboardType="numeric" />
      <TextInput style={styles.input} placeholder="Serving unit (default g)" placeholderTextColor="#999" value={form.servingUnit} onChangeText={v => update('servingUnit', v)} />

      <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Save & Add to Meal</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EDE8DF' },
  content: { padding: 24, paddingTop: 60 },
  header: { marginBottom: 24 },
  back: { color: '#F77E2D', fontSize: 14, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '900', color: '#1A1A1A' },
  input: { backgroundColor: '#D9D3C8', borderRadius: 12, padding: 14, marginBottom: 12, fontSize: 15, color: '#1A1A1A' },
  button: { backgroundColor: '#F77E2D', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 }
});