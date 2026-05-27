import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Platform } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import api from '../../src/utils/api';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snacks'];

export default function DiaryScreen() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingFood, setEditingFood] = useState(null);
  const [editQuantity, setEditQuantity] = useState('');
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const today = new Date().toISOString().split('T')[0];

  useFocusEffect(
    useCallback(() => {
      fetchSummary();
    }, [])
  );

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

  const deleteFood = async (mealId, foodId) => {
    try {
      await api.delete(`/meals/${mealId}/food/${foodId}`);
      fetchSummary();
    } catch (err) {
      console.error(err);
    }
  };

  const openEdit = (meal, food) => {
    setEditingFood({ mealId: meal._id, foodId: food._id, food });
    setEditQuantity(food.quantity?.toString() || '100');
  };

  const saveEdit = async () => {
    if (!editingFood) return;
    setSaving(true);
    try {
      const qty = parseFloat(editQuantity) || 100;
      const originalQty = editingFood.food.quantity || 100;
      const ratio = qty / originalQty;
      await api.put(`/meals/${editingFood.mealId}/food/${editingFood.foodId}`, {
        quantity: qty,
        calories: Math.round(editingFood.food.calories * ratio),
        protein: Math.round(editingFood.food.protein * ratio),
        carbs: Math.round(editingFood.food.carbs * ratio),
        fat: Math.round(editingFood.food.fat * ratio),
        fiber: Math.round((editingFood.food.fiber || 0) * ratio),
        sodium: Math.round((editingFood.food.sodium || 0) * ratio),
        sugar: Math.round((editingFood.food.sugar || 0) * ratio)
      });
      setEditingFood(null);
      fetchSummary();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
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
                <TouchableOpacity key={idx} style={styles.foodItem} onPress={() => openEdit(meal, food)}>
                  <View style={styles.foodInfo}>
                    <View>
                      <Text style={styles.foodName}>{food.name}</Text>
                      <Text style={styles.foodQty}>{food.quantity || 100}{food.unit || 'g'}</Text>
                    </View>
                    <Text style={styles.foodCals}>{food.calories} kcal</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => deleteFood(meal._id, food._id)}
                  >
                    <Text style={styles.deleteBtnText}>✕</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.emptyText}>Nothing logged yet</Text>
            )}
          </View>
        );
      })}

      {editingFood && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editingFood.food.name}</Text>
            <Text style={styles.modalSub}>Edit quantity</Text>
            <View style={styles.quantityRow}>
              <TextInput
                style={styles.quantityInput}
                keyboardType="numeric"
                value={editQuantity}
                onChangeText={setEditQuantity}
                autoFocus
              />
              <Text style={styles.quantityUnit}>{editingFood.food.unit || 'g'}</Text>
            </View>
            <Text style={styles.caloriePreview}>
              {Math.round(editingFood.food.calories * (parseFloat(editQuantity) || 100) / (editingFood.food.quantity || 100))} kcal
            </Text>
            <View style={styles.quickBtns}>
              {['50', '100', '150', '200'].map(q => (
                <TouchableOpacity
                  key={q}
                  style={[styles.quickBtn, editQuantity === q && styles.quickBtnActive]}
                  onPress={() => setEditQuantity(q)}
                >
                  <Text style={[styles.quickBtnText, editQuantity === q && styles.quickBtnTextActive]}>{q}g</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.saveBtn} onPress={saveEdit} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditingFood(null)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
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
  foodItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#D9D3C8', borderRadius: 10, padding: 12, marginBottom: 6 },
  foodInfo: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  foodName: { fontSize: 14, color: '#1A1A1A', fontWeight: '500' },
  foodQty: { fontSize: 11, color: '#888', marginTop: 2 },
  foodCals: { fontSize: 14, color: '#F77E2D', fontWeight: '700' },
  deleteBtn: { marginLeft: 12, width: 28, height: 28, borderRadius: 14, backgroundColor: '#C5BFB4', justifyContent: 'center', alignItems: 'center' },
  deleteBtnText: { color: '#888', fontSize: 12, fontWeight: '700' },
  emptyText: { fontSize: 13, color: '#bbb', fontStyle: 'italic' },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { backgroundColor: '#EDE8DF', borderRadius: 20, padding: 24, width: '100%' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A1A', marginBottom: 4, textAlign: 'center' },
  modalSub: { fontSize: 13, color: '#888', textAlign: 'center', marginBottom: 20 },
  quantityRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#D9D3C8', borderRadius: 12, paddingHorizontal: 16, marginBottom: 8 },
  quantityInput: { flex: 1, fontSize: 32, fontWeight: '900', color: '#1A1A1A', padding: 14, textAlign: 'center' },
  quantityUnit: { fontSize: 16, color: '#888', fontWeight: '600' },
  caloriePreview: { fontSize: 14, color: '#F77E2D', fontWeight: '700', textAlign: 'center', marginBottom: 16 },
  quickBtns: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  quickBtn: { flex: 1, backgroundColor: '#D9D3C8', borderRadius: 10, padding: 10, alignItems: 'center' },
  quickBtnActive: { backgroundColor: '#F77E2D' },
  quickBtnText: { fontSize: 13, color: '#888', fontWeight: '600' },
  quickBtnTextActive: { color: '#fff' },
  saveBtn: { backgroundColor: '#F77E2D', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 8 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  cancelBtn: { padding: 12, alignItems: 'center' },
  cancelBtnText: { color: '#888', fontSize: 14 }
});