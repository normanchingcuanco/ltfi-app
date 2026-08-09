import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import api from '../src/utils/api';

const UNITS = ['g', 'kg', 'ml', 'L', 'cup', 'tbsp', 'tsp', 'oz', 'pc', 'serving'];

const UNIT_TO_GRAMS = {
  g: 1, kg: 1000, ml: 1, L: 1000,
  cup: 240, tbsp: 15, tsp: 5,
  oz: 28.35
};

const CUSTOM_UNITS = ['pc', 'serving', 'cup', 'tbsp', 'tsp'];

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
  const [myFoodMatches, setMyFoodMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [myFoods, setMyFoods] = useState([]);
  const [myFoodsLoading, setMyFoodsLoading] = useState(false);

  const [selectedFood, setSelectedFood] = useState(null);
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('pc');
  const [unitGrams, setUnitGrams] = useState('100');
  const [showQuantityPicker, setShowQuantityPicker] = useState(false);

  useEffect(() => {
    if (prefillFood) {
      setResults([JSON.parse(prefillFood)]);
    }
  }, [prefillFood]);

  useEffect(() => {
    if (tab === 'myfoods') fetchMyFoods();
  }, [tab]);

  const [myFoodsSearch, setMyFoodsSearch] = useState('');
    const [myFoodsPage, setMyFoodsPage] = useState(1);
    const [myFoodsTotal, setMyFoodsTotal] = useState(0);
    const [myFoodsLoadingMore, setMyFoodsLoadingMore] = useState(false);

    const fetchMyFoods = async (page = 1, search = '', append = false) => {
      if (page === 1) setMyFoodsLoading(true);
      else setMyFoodsLoadingMore(true);
      try {
        const res = await api.get(`/food/my?page=${page}&limit=20${search ? `&q=${encodeURIComponent(search)}` : ''}`);
        const { foods, total } = res.data;
        if (append) {
          setMyFoods(prev => [...prev, ...foods]);
        } else {
          setMyFoods(foods);
        }
        setMyFoodsTotal(total);
        setMyFoodsPage(page);
      } catch (err) {
        console.error(err);
      } finally {
        setMyFoodsLoading(false);
        setMyFoodsLoadingMore(false);
      }
    };

    const handleMyFoodsSearch = () => {
      fetchMyFoods(1, myFoodsSearch);
    };

    const loadMoreMyFoods = () => {
      fetchMyFoods(myFoodsPage + 1, myFoodsSearch, true);
    };

  const searchFood = async () => {
    if (!search.trim()) return;
    setLoading(true);
    setMyFoodMatches([]);
    try {
      const [searchRes, myRes] = await Promise.all([
            api.get(`/food/search?q=${encodeURIComponent(search)}`),
            api.get(`/food/my?q=${encodeURIComponent(search)}&limit=5`)
          ]);

          const q = search.toLowerCase();
          const myFoodsData = myRes.data.foods || myRes.data || [];
          const matched = myFoodsData.filter(f =>
            f.name.toLowerCase().includes(q)
          );

    const matchedIds = new Set(matched.map(f => f._id?.toString()));
    const external = (searchRes.data || []).filter(f =>
      !f._id || !matchedIds.has(f._id.toString())
    );

      setMyFoodMatches(matched);
      setResults(external);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPress = (food) => {
    setSelectedFood(food);
    setQuantity('1');
    setUnit(food.servingUnit || 'pc');
    setUnitGrams(food.servingSize?.toString() || '100');
    setShowQuantityPicker(true);
  };

  const getTotalGrams = () => {
    const qty = parseFloat(quantity) || 0;
    if (UNIT_TO_GRAMS[unit] !== undefined) {
      return qty * UNIT_TO_GRAMS[unit];
    }
    return qty * (parseFloat(unitGrams) || 100);
  };

  const confirmAdd = async () => {
    if (!selectedFood) return;
    setAdding(true);
    setShowQuantityPicker(false);

    const totalGrams = getTotalGrams();
    const ratio = totalGrams / 100;
    const qty = parseFloat(quantity) || 1;

    try {
      await api.post('/meals', {
        date,
        mealType,
        food: {
          foodId: selectedFood._id,
          name: selectedFood.name,
          quantity: qty,
          unit,
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
            setMyFoodMatches(prev => prev.filter(f => f._id !== food._id));
          } catch (err) {
            showAlert('Error', 'Could not delete food.');
          }
        }
      }
    ]);
  };

  const totalGrams = getTotalGrams();
  const calculatedCalories = selectedFood ? Math.round(selectedFood.calories * totalGrams / 100) : 0;
  const needsGramEquivalent = CUSTOM_UNITS.includes(unit) && !UNIT_TO_GRAMS[unit];

  const renderFoodItem = (food, idx, showActions = false) => (
    <View key={idx} style={[styles.resultItem, food.source === 'custom' && styles.resultItemCustom]}>
      <View style={styles.resultInfo}>
        <View style={styles.resultNameRow}>
          <Text style={styles.resultName}>{food.name}</Text>
          {food.source === 'custom' && (
            <View style={styles.myFoodBadge}>
              <Text style={styles.myFoodBadgeText}>My Food</Text>
            </View>
          )}
        </View>
        <Text style={styles.resultMacros}>
          {food.calories} kcal · {food.protein}g P · {food.carbs}g C · {food.fat}g F
          {food.servingSize && food.source !== 'usda' && food.source !== 'open_food_facts' && food.servingSize !== 100
            ? ` per ${food.servingSize}${food.servingUnit || 'g'}`
            : ''}
        </Text>
      </View>
      <View style={styles.itemActions}>
        <TouchableOpacity style={styles.addBtn} onPress={() => handleAddPress(food)} disabled={adding}>
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
        {showActions && (
          <>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => router.push({ pathname: '/edit-food', params: { foodId: food._id, mealType, date } })}
            >
              <Text style={styles.editBtnText}>✎</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteFood(food)}>
              <Text style={styles.deleteBtnText}>✕</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );

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

          {myFoodMatches.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>My Foods</Text>
              {myFoodMatches.map((food, idx) => renderFoodItem(food, idx, true))}
              {results.length > 0 && <Text style={styles.sectionLabel}>All Results</Text>}
            </>
          )}

          {results.map((food, idx) => renderFoodItem(food, idx, false))}
        </>
      )}

      {tab === 'myfoods' && (
        <>
          <TouchableOpacity
            style={styles.addToMyFoodsBtn}
            onPress={() => router.push('/add-to-my-foods')}
          >
            <Text style={styles.addToMyFoodsBtnText}>+ Add to My Foods</Text>
          </TouchableOpacity>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.input}
              placeholder="Search my foods..."
              placeholderTextColor="#999"
              value={myFoodsSearch}
              onChangeText={setMyFoodsSearch}
              onSubmitEditing={handleMyFoodsSearch}
              returnKeyType="search"
            />
            <TouchableOpacity style={styles.searchBtn} onPress={handleMyFoodsSearch}>
              <Text style={styles.searchBtnText}>Search</Text>
            </TouchableOpacity>
          </View>
          {myFoodsLoading ? (
            <ActivityIndicator color="#F77E2D" style={{ marginTop: 20 }} />
          ) : myFoods.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No foods found.</Text>
            </View>
          ) : (
            <>
              {myFoods.map((food, idx) => renderFoodItem(food, idx, true))}
              {myFoods.length < myFoodsTotal && (
                <TouchableOpacity style={styles.loadMoreBtn} onPress={loadMoreMyFoods} disabled={myFoodsLoadingMore}>
                  {myFoodsLoadingMore
                    ? <ActivityIndicator color="#F77E2D" />
                    : <Text style={styles.loadMoreBtnText}>Load More</Text>
                  }
                </TouchableOpacity>
              )}
            </>
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
                onChangeText={(val) => {
                  setQuantity(val);
                  if (unit === 'g' || unit === 'ml') {
                    const grams = parseFloat(val) || 0;
                    const ratio = grams / 100;
                    setUnitGrams(val);
                  }
                }}
                autoFocus
              />
              <Text style={styles.quantityUnit}>{unit}</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.unitScroll} contentContainerStyle={styles.unitScrollContent}>
              {UNITS.map(u => (
                <TouchableOpacity
                  key={u}
                  style={[styles.unitBtn, unit === u && styles.unitBtnActive]}
                  onPress={() => setUnit(u)}
                >
                  <Text style={[styles.unitBtnText, unit === u && styles.unitBtnTextActive]}>{u}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {needsGramEquivalent && (
              <View style={styles.gramEquivRow}>
                <Text style={styles.gramEquivLabel}>1 {unit} =</Text>
                <TextInput
                  style={styles.gramEquivInput}
                  keyboardType="numeric"
                  value={unitGrams}
                  onChangeText={setUnitGrams}
                  placeholder="100"
                  placeholderTextColor="#999"
                />
                <Text style={styles.gramEquivLabel}>g</Text>
              </View>
            )}

            <Text style={styles.caloriePreview}>
              {calculatedCalories} kcal
              {totalGrams > 0 && <Text style={styles.gramsHint}> ({Math.round(totalGrams)}g)</Text>}
            </Text>

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
  sectionLabel: { fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginTop: 4 },
  resultItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#D9D3C8', borderRadius: 12, padding: 14, marginBottom: 10 },
  resultItemCustom: { borderWidth: 1.5, borderColor: '#F77E2D' },
  resultInfo: { flex: 1 },
  resultNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' },
  resultName: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  myFoodBadge: { backgroundColor: '#F77E2D', borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2 },
  myFoodBadgeText: { fontSize: 10, color: '#fff', fontWeight: '700' },
  resultMacros: { fontSize: 12, color: '#888' },
  itemActions: { flexDirection: 'row', gap: 6, alignItems: 'center', marginLeft: 8 },
  addBtn: { backgroundColor: '#F77E2D', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  editBtn: { backgroundColor: '#E8E2D8', width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  editBtnText: { color: '#1A1A1A', fontSize: 15 },
  deleteBtn: { backgroundColor: '#E8E2D8', width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  deleteBtnText: { color: '#888', fontSize: 12, fontWeight: '700' },
  addToMyFoodsBtn: { backgroundColor: '#F77E2D', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 16 },
  addToMyFoodsBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  loadMoreBtn: { borderWidth: 1.5, borderColor: '#F77E2D', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 16 },
  loadMoreBtnText: { color: '#F77E2D', fontWeight: '700' },
  emptyBox: { backgroundColor: '#D9D3C8', borderRadius: 16, padding: 24, alignItems: 'center' },
  emptyText: { color: '#888', fontSize: 14 },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { backgroundColor: '#EDE8DF', borderRadius: 20, padding: 24, width: '100%' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A1A', marginBottom: 4, textAlign: 'center' },
  modalSub: { fontSize: 13, color: '#888', textAlign: 'center', marginBottom: 20 },
  quantityRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#D9D3C8', borderRadius: 12, paddingHorizontal: 16, marginBottom: 12 },
  quantityInput: { flex: 1, fontSize: 32, fontWeight: '900', color: '#1A1A1A', padding: 14, textAlign: 'center' },
  quantityUnit: { fontSize: 16, color: '#888', fontWeight: '600' },
  unitScroll: { marginBottom: 12 },
  unitScrollContent: { gap: 8, paddingHorizontal: 4 },
  unitBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 99, backgroundColor: '#D9D3C8' },
  unitBtnActive: { backgroundColor: '#F77E2D' },
  unitBtnText: { fontSize: 13, color: '#888', fontWeight: '600' },
  unitBtnTextActive: { color: '#fff' },
  gramEquivRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, backgroundColor: '#D9D3C8', borderRadius: 12, padding: 12 },
  gramEquivLabel: { fontSize: 14, color: '#888', fontWeight: '600' },
  gramEquivInput: { flex: 1, fontSize: 18, fontWeight: '700', color: '#1A1A1A', textAlign: 'center', backgroundColor: '#EDE8DF', borderRadius: 8, padding: 8 },
  caloriePreview: { fontSize: 14, color: '#F77E2D', fontWeight: '700', textAlign: 'center', marginBottom: 16 },
  gramsHint: { fontSize: 12, color: '#aaa' },
  confirmBtn: { backgroundColor: '#F77E2D', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 8 },
  confirmBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  cancelBtn: { padding: 12, alignItems: 'center' },
  cancelBtnText: { color: '#888', fontSize: 14 }
});