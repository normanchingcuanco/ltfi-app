import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Platform, Keyboard, KeyboardAvoidingView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import api from '../src/utils/api';

const UNITS = ['g', 'oz', 'ml', 'cup', 'tbsp', 'tsp', 'pc', 'serving'];

const showAlert = (title, message) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}: ${message}`);
  } else {
    const { Alert } = require('react-native');
    Alert.alert(title, message);
  }
};

export default function CustomFoodScreen() {
  const { mealType, date } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [numericFocused, setNumericFocused] = useState(false);
  const [form, setForm] = useState({
    name: '', calories: '', protein: '', carbs: '',
    fat: '', fiber: '', sodium: '', sugar: '',
    servingSize: '100', servingUnit: 'g'
  });

  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSubmit = async () => {
    if (!form.name || !form.calories) return showAlert('Error', 'Name and calories are required');
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
      showAlert('Error', 'Failed to save food.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Custom Food</Text>

        <TextInput
          style={styles.input}
          placeholder="Food name *"
          placeholderTextColor="#999"
          value={form.name}
          onChangeText={v => update('name', v)}
        />

        {[
          { key: 'calories', label: 'Calories *' },
          { key: 'protein', label: 'Protein (g)' },
          { key: 'carbs', label: 'Carbs (g)' },
          { key: 'fat', label: 'Fat (g)' },
          { key: 'fiber', label: 'Fiber (g)' },
          { key: 'sodium', label: 'Sodium (mg)' },
          { key: 'sugar', label: 'Sugar (g)' },
        ].map(field => (
          <TextInput
            key={field.key}
            style={styles.input}
            placeholder={field.label}
            placeholderTextColor="#999"
            value={form[field.key]}
            onChangeText={v => update(field.key, v)}
            keyboardType="numeric"
            onFocus={() => setNumericFocused(true)}
            onBlur={() => setNumericFocused(false)}
          />
        ))}

        <Text style={styles.label}>Serving Size</Text>
        <TextInput
          style={styles.input}
          placeholder="100"
          placeholderTextColor="#999"
          value={form.servingSize}
          onChangeText={v => update('servingSize', v)}
          keyboardType="numeric"
          onFocus={() => setNumericFocused(true)}
          onBlur={() => setNumericFocused(false)}
        />

        <Text style={styles.label}>Serving Unit</Text>
        <View style={styles.unitPicker}>
          {UNITS.map(u => (
            <TouchableOpacity
              key={u}
              style={[styles.unitBtn, form.servingUnit === u && styles.unitBtnActive]}
              onPress={() => update('servingUnit', u)}
            >
              <Text style={[styles.unitBtnText, form.servingUnit === u && styles.unitBtnTextActive]}>{u}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Save & Add to Meal</Text>}
        </TouchableOpacity>
      </ScrollView>

      {numericFocused && Platform.OS === 'ios' && (
        <TouchableOpacity
          style={styles.floatingDone}
          onPress={() => { Keyboard.dismiss(); setNumericFocused(false); }}
        >
          <Text style={styles.floatingDoneText}>Done</Text>
        </TouchableOpacity>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EDE8DF' },
  content: { padding: 24, paddingTop: 60 },
  back: { color: '#F77E2D', fontSize: 14, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '900', color: '#1A1A1A', marginBottom: 24 },
  label: { fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  input: { backgroundColor: '#D9D3C8', borderRadius: 12, padding: 14, marginBottom: 12, fontSize: 15, color: '#1A1A1A' },
  unitPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  unitBtn: { backgroundColor: '#D9D3C8', borderRadius: 99, paddingHorizontal: 16, paddingVertical: 10 },
  unitBtnActive: { backgroundColor: '#F77E2D' },
  unitBtnText: { fontSize: 13, color: '#888', fontWeight: '600' },
  unitBtnTextActive: { color: '#fff' },
  button: { backgroundColor: '#F77E2D', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8, marginBottom: 40 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  floatingDone: { backgroundColor: '#D9D3C8', padding: 12, alignItems: 'flex-end', borderTopWidth: 1, borderTopColor: '#C4BEB4' },
  floatingDoneText: { color: '#F77E2D', fontWeight: '700', fontSize: 16, paddingRight: 16 },
});