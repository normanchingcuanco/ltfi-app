import { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import api from '../src/utils/api';

const UNITS = ['g', 'kg', 'ml', 'L', 'cup', 'tbsp', 'tsp', 'oz', 'pc', 'pack', 'serving'];

const MEALS = ['breakfast', 'lunch', 'dinner', 'snacks'];

const UNIT_TO_GRAMS = {
  g: 1, kg: 1000, ml: 1, L: 1000,
  cup: 240, tbsp: 15, tsp: 5,
  oz: 28.35
};

const gramsOf = (u, n) => (UNIT_TO_GRAMS[u] !== undefined ? n * UNIT_TO_GRAMS[u] : null);

// A whole serving or a whole pack always counts as one of the food's servings.
const isWhole = (u) => u === 'serving' || u === 'pack';

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
  const { mealType, date, prefillFood, defaultTab, productNotFound } = useLocalSearchParams();
  const router = useRouter();
  const [meal, setMeal] = useState(MEALS.includes(mealType) ? mealType : 'breakfast');
  const [showMealMenu, setShowMealMenu] = useState(false);
  const [tab, setTab] = useState(defaultTab || 'search');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [myFoodMatches, setMyFoodMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [myFoods, setMyFoods] = useState([]);
  const [myFoodsLoading, setMyFoodsLoading] = useState(false);

  const [selectedFood, setSelectedFood] = useState(null);
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('serving');
  const [unitGrams, setUnitGrams] = useState('');
  const [showQuantityPicker, setShowQuantityPicker] = useState(false);

  const typeaheadReq = useRef(0);
  const myFoodsReq = useRef(0);

  useEffect(() => {
    if (prefillFood) {
      setResults([JSON.parse(prefillFood)]);
    }
  }, [prefillFood]);

  useEffect(() => {
    if (productNotFound === 'true') {
      showAlert('Product Not Found', 'This barcode is not in our database yet. You can search manually or add it as a custom food.');
    }
  }, [productNotFound]);

  const [myFoodsSearch, setMyFoodsSearch] = useState('');
    const [myFoodsPage, setMyFoodsPage] = useState(1);
    const [myFoodsTotal, setMyFoodsTotal] = useState(0);
    const [myFoodsLoadingMore, setMyFoodsLoadingMore] = useState(false);

    const fetchMyFoods = async (page = 1, search = '', append = false) => {
      const reqId = ++myFoodsReq.current;
      if (page === 1) setMyFoodsLoading(true);
      else setMyFoodsLoadingMore(true);
      try {
        const res = await api.get(`/food/my?page=${page}&limit=20${search ? `&q=${encodeURIComponent(search)}` : ''}`);
        if (reqId !== myFoodsReq.current) return;
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
        if (reqId === myFoodsReq.current) {
          setMyFoodsLoading(false);
          setMyFoodsLoadingMore(false);
        }
      }
    };

    const handleMyFoodsSearch = () => {
      fetchMyFoods(1, myFoodsSearch.trim());
    };

    const loadMoreMyFoods = () => {
      fetchMyFoods(myFoodsPage + 1, myFoodsSearch.trim(), true);
    };

  // My Foods tab: filter the list as you type
  useEffect(() => {
    if (tab !== 'myfoods') return;
    const t = setTimeout(() => fetchMyFoods(1, myFoodsSearch.trim()), myFoodsSearch ? 250 : 0);
    return () => clearTimeout(t);
  }, [tab, myFoodsSearch]);

  // Search tab: show your saved foods as you type (after 2 letters)
  useEffect(() => {
    if (tab !== 'search') return;
    const q = search.trim();
    if (q.length < 2) {
      setMyFoodMatches([]);
      return;
    }
    const id = ++typeaheadReq.current;
    const t = setTimeout(async () => {
      try {
        const res = await api.get(`/food/my?q=${encodeURIComponent(q)}&limit=8`);
        if (id !== typeaheadReq.current) return;
        setMyFoodMatches(res.data.foods || []);
      } catch (err) {
        console.error(err);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [search, tab]);

  const searchFood = async () => {
    if (!search.trim()) return;
    setLoading(true);
    try {
      const [searchRes, myRes] = await Promise.all([
            api.get(`/food/search?q=${encodeURIComponent(search.trim())}`),
            api.get(`/food/my?q=${encodeURIComponent(search.trim())}&limit=8`)
          ]);

          const matched = myRes.data.foods || myRes.data || [];

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

  // Calories and macros on every food are per its own serving size + serving unit.
  const handleAddPress = (food) => {
    setSelectedFood(food);
    setUnit(food.servingUnit || 'serving');
    setQuantity(food.servingSize ? String(food.servingSize) : '1');
    setUnitGrams('');
    setShowQuantityPicker(true);
  };

  // How many of the food's servings the logged amount equals.
  // Returns null while a needed equivalent (grams or pieces) is still empty.
  const getRatio = () => {
    if (!selectedFood) return 0;
    const qty = parseFloat(quantity) || 0;
    const foodSize = parseFloat(selectedFood.servingSize) || 1;
    const foodUnit = selectedFood.servingUnit || 'serving';

    if (unit === foodUnit) return qty / foodSize;

    const logGrams = gramsOf(unit, qty);
    const foodGrams = gramsOf(foodUnit, foodSize);

    if (logGrams !== null && foodGrams !== null) return logGrams / foodGrams;
    if (isWhole(unit)) return qty;

    if (unit === 'pc') {
      if (foodGrams !== null) return qty;
      const e = parseFloat(unitGrams);
      return e > 0 ? qty / e : null;
    }

    const g = parseFloat(unitGrams);
    return g > 0 ? logGrams / g : null;
  };

  const confirmAdd = async () => {
    if (!selectedFood) return;
    const ratio = getRatio();
    if (ratio === null) return;

    setAdding(true);

    const qty = parseFloat(quantity) || 1;

    try {
      await api.post('/meals', {
        date,
        mealType: meal,
        food: {
          foodId: selectedFood._id || null,
          name: selectedFood.name,
          quantity: qty,
          unit,
          calories: Math.round(selectedFood.calories * ratio),
          protein: Math.round((selectedFood.protein || 0) * ratio),
          carbs: Math.round((selectedFood.carbs || 0) * ratio),
          fat: Math.round((selectedFood.fat || 0) * ratio),
          fiber: Math.round((selectedFood.fiber || 0) * ratio),
          sodium: Math.round((selectedFood.sodium || 0) * ratio),
          sugar: Math.round((selectedFood.sugar || 0) * ratio)
        }
      });
      setShowQuantityPicker(false);
      router.replace('/(tabs)/diary');
    } catch (err) {
      console.error(err);
      showAlert('Error', err?.response?.data?.message || err?.message || 'Could not add food. Please try again.');
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
            setMyFoods(prev => prev.filter(f => f._id?.toString() !== food._id?.toString()));
            setMyFoodMatches(prev => prev.filter(f => f._id?.toString() !== food._id?.toString()));
          } catch (err) {
            showAlert('Error', 'Could not delete food.');
          }
        }
      }
    ]);
  };

  const ratio = selectedFood ? getRatio() : 0;
  const calculatedCalories = selectedFood && ratio !== null ? Math.round(selectedFood.calories * ratio) : null;
  const foodSizeLabel = selectedFood ? (parseFloat(selectedFood.servingSize) || 1) : 1;
  const foodUnitLabel = selectedFood ? (selectedFood.servingUnit || 'serving') : 'serving';
  const foodGramsOK = UNIT_TO_GRAMS[foodUnitLabel] !== undefined;

  // When the app can't convert, ask for the equivalent: grams, or pieces per serving/pack.
  let equivUnit = null;
  if (selectedFood && unit !== foodUnitLabel && !isWhole(unit) && !foodGramsOK) {
    equivUnit = unit === 'pc' ? 'pc' : 'g';
  }

  const renderFoodItem = (food, idx, showActions = false) => (
    <View key={idx} style={[styles.resultItem, (food.source === 'custom' || food.source === 'open_food_facts' || food.createdBy) && styles.resultItemCustom]}>
      <View style={styles.resultInfo}>
        <View style={styles.resultNameRow}>
          <Text style={styles.resultName}>{food.name}</Text>
          {(food.source === 'custom' || food.createdBy) && (
            <View style={styles.myFoodBadge}>
              <Text style={styles.myFoodBadgeText}>My Food</Text>
            </View>
          )}
        </View>
        <Text style={styles.resultMacros}>
          {food.calories} kcal · {food.protein}g P · {food.carbs}g C · {food.fat}g F
          {food.servingSize ? ` per ${food.servingSize} ${food.servingUnit || 'g'}` : ''}
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
              onPress={() => router.push({ pathname: '/edit-food', params: { foodId: food._id, mealType: meal, date } })}
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Add Food</Text>

        <TouchableOpacity style={styles.mealPicker} onPress={() => setShowMealMenu(!showMealMenu)}>
          <Text style={styles.mealPickerLabel}>Meal</Text>
          <Text style={styles.mealPickerValue}>{meal} {showMealMenu ? '▴' : '▾'}</Text>
        </TouchableOpacity>
        {showMealMenu && (
          <View style={styles.mealMenu}>
            {MEALS.map(m => (
              <TouchableOpacity
                key={m}
                style={[styles.mealOption, meal === m && styles.mealOptionActive]}
                onPress={() => { setMeal(m); setShowMealMenu(false); }}
              >
                <Text style={[styles.mealOptionText, meal === m && styles.mealOptionTextActive]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
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
            <TouchableOpacity style={styles.actionBtn} onPress={() => router.push({ pathname: '/barcode-scanner', params: { mealType: meal, date } })}>
              <Text style={styles.actionBtnText}>📷 Scan Barcode</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => router.push({ pathname: '/ai-food-scan', params: { mealType: meal, date } })}>
              <Text style={styles.actionBtnText}>🤖 AI Scan</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => router.push({ pathname: '/custom-food', params: { mealType: meal, date } })}>
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
                onChangeText={setQuantity}
                autoFocus
              />
              <Text style={styles.quantityUnit}>{unit}</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.unitScroll} contentContainerStyle={styles.unitScrollContent}>
              {UNITS.map(u => (
                <TouchableOpacity
                  key={u}
                  style={[styles.unitBtn, unit === u && styles.unitBtnActive]}
                  onPress={() => { setUnit(u); setUnitGrams(''); }}
                >
                  <Text style={[styles.unitBtnText, unit === u && styles.unitBtnTextActive]}>{u}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {equivUnit && (
              <View style={styles.gramEquivRow}>
                <Text style={styles.gramEquivLabel}>{foodSizeLabel} {foodUnitLabel} =</Text>
                <TextInput
                  style={styles.gramEquivInput}
                  keyboardType="numeric"
                  value={unitGrams}
                  onChangeText={setUnitGrams}
                  placeholder={equivUnit === 'pc' ? 'pieces' : 'grams'}
                  placeholderTextColor="#999"
                />
                <Text style={styles.gramEquivLabel}>{equivUnit}</Text>
              </View>
            )}

            <Text style={styles.caloriePreview}>
              {calculatedCalories === null ? 'Enter the amount above' : `${calculatedCalories} kcal`}
            </Text>

            <TouchableOpacity style={styles.confirmBtn} onPress={confirmAdd} disabled={adding || ratio === null}>
              {adding ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmBtnText}>Add to {meal}</Text>}
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
  mealPicker: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#D9D3C8', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, marginTop: 12 },
  mealPickerLabel: { fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 1 },
  mealPickerValue: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', textTransform: 'capitalize' },
  mealMenu: { backgroundColor: '#D9D3C8', borderRadius: 12, marginTop: 6, padding: 6, gap: 4 },
  mealOption: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8 },
  mealOptionActive: { backgroundColor: '#F77E2D' },
  mealOptionText: { fontSize: 14, fontWeight: '600', color: '#1A1A1A', textTransform: 'capitalize' },
  mealOptionTextActive: { color: '#fff', fontWeight: '700' },
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