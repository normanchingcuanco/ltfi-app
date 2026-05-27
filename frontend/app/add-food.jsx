import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import api from '../src/utils/api';

const showAlert = (title, message, buttons) => {
  if (Platform.OS === 'web') {
    if (buttons) {
      if (window.confirm(`${title}: ${message}`)) {
        buttons.find(b => b.style === 'destructive')?.onPress();
      }
    } else {
      window.alert(`${title}: ${message}`);
    }
  } else {
    Alert.alert(title, message, buttons);
  }
};

export default function AddFoodScreen() {
  const { mealType, date, prefillFood } = useLocalSearchParams();
  const router = useRouter();
  const [tab, setTab] = useState('search');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [myFoods, setMyFoods] = useState([]);
  const [myFoodsLoading, setMyFoodsLoading] = useState(false);

  // Quantity picker
  const [selectedFood, setSelectedFood] = useState(null);
  const [quantity, setQuantity] = useState('100');
  const [showQuantityPicker, setShowQuantityPicker] = useState(false);

  useEffect(() => {
    if (prefillFood) {
      setResults([JSON.parse(prefillFood)]);
    }
  }, [prefillFood]);

  useEffect(() => {
    if (tab === 'myfoods') fetchMyFoods();
  }, [tab]);

  const fetchMyFoods = async () => {
    setMyFoodsLoading(true);
    try {
      const res = await api.get('/food/my');
      setMyFoods(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setMyFoodsLoading(false);
    }
  };

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

  const handleAddPress = (food) => {
    setSelectedFood(food);
    setQuantity('100');
    setShowQuantityPicker(true);
  };

  const confirmAdd = async () => {
    if (!selectedFood) return;
    setAdding(true);
    setShowQuantityPicker(false);

    const qty = parseFloat(quantity) || 100;
    const ratio = qty / 100;

    try {
      await api.post('/meals', {
        date,
        mealType,
        food: {
          foodId: selectedFood._id,
          name: selectedFood.name,
          quantity: qty,
          unit: selectedFood.servingUnit || 'g',
          calories: Math.round(selectedFood.calories * ratio),
          protein: Math.round(selectedFood.protein * ratio),
          carbs: Math.round(selectedFood.carbs * ratio),
          fat: Math.round(selectedFood.fat * ratio),
          fiber: Math.round((selectedFood.fiber || 0) * ratio),
          sodium: Math.round((selectedFood.sodium || 0) * ratio),
          sugar: Math.round((selectedFood.sugar || 0) * ratio)
        }
      });
      router.replace('/(tabs)/diary');
    } catch (err) {
      console.error(err);
    } finally {
      setAdding(false);
    }
  };

  const deleteFood = (food) => {
    showAlert('Delete Food', `Delete "${food.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await api.delete(`/food/${food._id}`);
            setMyFoods(prev => prev.filter(f => f._id !== food._id));
          } catch (err) {
            showAlert('Error', 'Could not delete food.');
          }
        }
      }
    ]);
  };

  const calculatedCalories = selectedFood
    ? Math.round(selectedFood.calories * (parseFloat(quantity) || 100) / (selectedFood.servingSize || 100))
    : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Add Food</Text>
        <Text style={styles.mealLabel}>{mealType}</Text>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tabBtn, tab === 'search' && styles.tabBtnActive]} onPress={() => setTab('search')}>
          <Text style={[styles.tabText, tab === 'search' && styles.tabTextActive]}>Search</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, tab === 'myfoods' && styles.tabBtnActive]} onPress={() => setTab('myfoods')}>
          <Text style={[styles.tabText, tab === 'myfoods' && styles.tabTextActive]}>My Foods</Text>
        </TouchableOpacity>
      </View>

      {tab === 'search' && (
        <>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.input}
              placeholder="Search food..."
              placeholderTextColor="#999"
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={searchFood}
              returnKeyType="search"
            />
            <TouchableOpacity style={styles.searchBtn} onPress={searchFood}>
              {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.searchBtnText}>Search</Text>}
            </TouchableOpacity>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => router.push({ pathname: '/barcode-scanner', params: { mealType, date } })}>
              <Text style={styles.actionBtnText}>📷 Scan Barcode</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => router.push({ pathname: '/ai-food-scan', params: { mealType, date } })}>
              <Text style={styles.actionBtnText}>🤖 AI Scan</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => router.push({ pathname: '/custom-food', params: { mealType, date } })}>
              <Text style={styles.actionBtnText}>+ Custom</Text>
            </TouchableOpacity>
          </View>

          {results.map((food, idx) => (
            <View key={idx} style={styles.resultItem}>
              <View style={styles.resultInfo}>
                <Text style={styles.resultName}>{food.name}</Text>
                <Text style={styles.resultMacros}>{food.calories} kcal · {food.protein}g P · {food.carbs}g C · {food.fat}g F per 100g</Text>
              </View>
              <TouchableOpacity style={styles.addBtn} onPress={() => handleAddPress(food)} disabled={adding}>
                <Text style={styles.addBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}

      {tab === 'myfoods' && (
        <>
          {myFoodsLoading ? (
            <ActivityIndicator color="#F77E2D" style={{ marginTop: 20 }} />
          ) : myFoods.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No custom foods yet.</Text>
            </View>
          ) : (
            myFoods.map((food, idx) => (
              <View key={idx} style={styles.resultItem}>
                <View style={styles.resultInfo}>
                  <Text style={styles.resultName}>{food.name}</Text>
                  <Text style={styles.resultMacros}>{food.calories} kcal · {food.protein}g P · {food.carbs}g C · {food.fat}g F</Text>
                </View>
                <View style={styles.myFoodActions}>
                  <TouchableOpacity style={styles.addBtn} onPress={() => handleAddPress(food)} disabled={adding}>
                    <Text style={styles.addBtnText}>Add</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteFood(food)}>
                    <Text style={styles.deleteBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </>
      )}

      {showQuantityPicker && selectedFood && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{selectedFood.name}</Text>
            <Text style={styles.modalSub}>How much are you logging?</Text>

            <View style={styles.quantityRow}>
              <TextInput
                style={styles.quantityInput}
                keyboardType="numeric"
                value={quantity}
                onChangeText={setQuantity}
                autoFocus
              />
              <Text style={styles.quantityUnit}>{selectedFood.servingUnit || 'g'}</Text>
            </View>

            <Text style={styles.caloriePreview}>{calculatedCalories} kcal</Text>

            <View style={styles.quickBtns}>
              {['50', '100', '150', '200'].map(q => (
                <TouchableOpacity key={q} style={[styles.quickBtn, quantity === q && styles.quickBtnActive]} onPress={() => setQuantity(q)}>
                  <Text style={[styles.quickBtnText, quantity === q && styles.quickBtnTextActive]}>{q}g</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.confirmBtn} onPress={confirmAdd} disabled={adding}>
              {adding ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmBtnText}>Add to {mealType}</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowQuantityPicker(false)}>
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
  header: { marginBottom: 24 },
  back: { color: '#F77E2D', fontSize: 14, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '900', color: '#1A1A1A' },
  mealLabel: { fontSize: 13, color: '#999', textTransform: 'capitalize', marginTop: 2 },
  tabs: { flexDirection: 'row', backgroundColor: '#D9D3C8', borderRadius: 12, padding: 4, marginBottom: 20 },
  tabBtn: { flex: 1, padding: 10, borderRadius: 10, alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#F77E2D' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#888' },
  tabTextActive: { color: '#fff' },
  searchRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  input: { flex: 1, backgroundColor: '#D9D3C8', borderRadius: 12, padding: 14, fontSize: 15, color: '#1A1A1A' },
  searchBtn: { backgroundColor: '#F77E2D', borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center', minWidth: 72, alignItems: 'center' },
  searchBtnText: { color: '#fff', fontWeight: '700' },
  actionRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  actionBtn: { flex: 1, borderWidth: 1.5, borderColor: '#F77E2D', borderRadius: 12, padding: 12, alignItems: 'center' },
  actionBtnText: { color: '#F77E2D', fontWeight: '700', fontSize: 12 },
  resultItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#D9D3C8', borderRadius: 12, padding: 14, marginBottom: 10 },
  resultInfo: { flex: 1 },
  resultName: { fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginBottom: 2 },
  resultMacros: { fontSize: 12, color: '#888' },
  addBtn: { backgroundColor: '#F77E2D', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, marginLeft: 10 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  myFoodActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  deleteBtn: { backgroundColor: '#E8E2D8', width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  deleteBtnText: { color: '#888', fontSize: 12, fontWeight: '700' },
  emptyBox: { backgroundColor: '#D9D3C8', borderRadius: 16, padding: 24, alignItems: 'center' },
  emptyText: { color: '#888', fontSize: 14 },
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
  confirmBtn: { backgroundColor: '#F77E2D', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 8 },
  confirmBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  cancelBtn: { padding: 12, alignItems: 'center' },
  cancelBtnText: { color: '#888', fontSize: 14 }
});