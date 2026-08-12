import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Platform, KeyboardAvoidingView, Keyboard } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import api from '../src/utils/api';

const UNITS = ['g', 'oz', 'ml', 'cup', 'tbsp', 'tsp'];

const TO_GRAMS = {
  g: 1,
  oz: 28.3495,
  ml: 1,
  cup: 240,
  tbsp: 15,
  tsp: 5,
};

const showAlert = (title, message) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}: ${message}`);
  } else {
    const { Alert } = require('react-native');
    Alert.alert(title, message);
  }
};

const scaleMacros = (base, quantityStr, unit) => {
  const qty = parseFloat(quantityStr) || 0;
  const grams = qty * (TO_GRAMS[unit] || 1);
  const factor = grams / 100;
  return {
    calories: base.calories !== '' ? (parseFloat(base.calories) * factor).toFixed(1) : '',
    protein: base.protein !== '' ? (parseFloat(base.protein) * factor).toFixed(1) : '',
    carbs: base.carbs !== '' ? (parseFloat(base.carbs) * factor).toFixed(1) : '',
    fat: base.fat !== '' ? (parseFloat(base.fat) * factor).toFixed(1) : '',
  };
};

export default function EditRecipeScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [servings, setServings] = useState('1');
  const [notes, setNotes] = useState('');
  const [ingredients, setIngredients] = useState([]);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchingIdx, setSearchingIdx] = useState(null);
  const [searching, setSearching] = useState(false);
  const [numericFocused, setNumericFocused] = useState(false);

  useEffect(() => {
    fetchRecipe();
  }, [id]);

  const fetchRecipe = async () => {
    try {
      const res = await api.get(`/recipes/${id}`);
      const r = res.data;
      setName(r.name);
      setServings(String(r.servings || 1));
      setNotes(r.notes || '');
      setIngredients(r.ingredients.map(ing => {
        const isMassOrVolume = ['g', 'ml'].includes(ing.unit) || TO_GRAMS[ing.unit];
        const grams = isMassOrVolume ? ing.quantity * (TO_GRAMS[ing.unit] || 1) : 100;
        const factor = grams / 100 || 1;
        const base = {
          calories: (ing.calories / factor).toFixed(2),
          protein: (ing.protein / factor).toFixed(2),
          carbs: (ing.carbs / factor).toFixed(2),
          fat: (ing.fat / factor).toFixed(2),
        };
        return {
          name: ing.name,
          quantity: String(ing.quantity),
          unit: ing.unit || 'g',
          calories: String(ing.calories),
          protein: String(ing.protein),
          carbs: String(ing.carbs),
          fat: String(ing.fat),
          base
        };
      }));
    } catch (err) {
      showAlert('Error', 'Failed to load recipe.');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const addIngredient = () => {
    setIngredients(prev => [...prev, { name: '', quantity: '100', unit: 'g', calories: '', protein: '', carbs: '', fat: '', base: null }]);
  };

  const removeIngredient = (idx) => {
    setIngredients(prev => prev.filter((_, i) => i !== idx));
  };

  const updateIngredient = (idx, key, val) => {
    setIngredients(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [key]: val };

      if ((key === 'quantity' || key === 'unit') && item.base) {
        if (key === 'unit') {
          const gramsNow = parseFloat(item.quantity) * (TO_GRAMS[item.unit] || 1);
          const newQtyConverted = (gramsNow / (TO_GRAMS[val] || 1)).toFixed(2);
          const scaled = scaleMacros(item.base, newQtyConverted, val);
          return { ...updated, unit: val, quantity: newQtyConverted, ...scaled };
        }
        const scaled = scaleMacros(item.base, val, item.unit);
        return { ...updated, ...scaled };
      }

      return updated;
    }));
  };

  const searchFood = async (idx) => {
    if (!search.trim()) return;
    setSearchingIdx(idx);
    setSearching(true);
    try {
      const res = await api.get(`/food/search?q=${search}`);
      setSearchResults(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const selectFood = (idx, food) => {
    const base = {
      calories: food.calories.toString(),
      protein: food.protein.toString(),
      carbs: food.carbs.toString(),
      fat: food.fat.toString(),
    };
    const ingredient = ingredients[idx];
    const scaled = scaleMacros(base, ingredient.quantity, ingredient.unit);
    setIngredients(prev => prev.map((item, i) => i === idx ? {
      ...item,
      name: food.name,
      base,
      ...scaled,
    } : item));
    setSearchResults([]);
    setSearch('');
    setSearchingIdx(null);
  };

  const confirmManualName = (idx) => {
    setSearchResults([]);
    setSearchingIdx(null);
    Keyboard.dismiss();
  };

  const handleSave = async () => {
    if (!name.trim()) return showAlert('Error', 'Recipe name is required');
    if (ingredients.some(i => !i.name.trim())) return showAlert('Error', 'All ingredients need a name');

    setSaving(true);
    try {
      await api.put(`/recipes/${id}`, {
        name,
        servings: parseInt(servings) || 1,
        notes,
        ingredients: ingredients.map(i => ({
          name: i.name,
          quantity: parseFloat(i.quantity) || 100,
          unit: i.unit || 'g',
          calories: parseFloat(i.calories) || 0,
          protein: parseFloat(i.protein) || 0,
          carbs: parseFloat(i.carbs) || 0,
          fat: parseFloat(i.fat) || 0,
        }))
      });
      router.replace('/(tabs)/recipes');
    } catch (err) {
      showAlert('Error', 'Failed to save recipe.');
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
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Edit Recipe</Text>

        <Text style={styles.label}>Name</Text>
        <TextInput style={styles.input} placeholder="e.g. Chicken Rice Bowl" placeholderTextColor="#999" value={name} onChangeText={setName} />

        <Text style={styles.label}>Servings</Text>
        <TextInput
          style={styles.input}
          placeholder="1"
          placeholderTextColor="#999"
          keyboardType="numeric"
          value={servings}
          onChangeText={setServings}
          onFocus={() => setNumericFocused(true)}
          onBlur={() => setNumericFocused(false)}
        />

        <Text style={styles.label}>Notes (optional)</Text>
        <TextInput style={[styles.input, { height: 80 }]} placeholder="Cooking instructions..." placeholderTextColor="#999" value={notes} onChangeText={setNotes} multiline />

        <Text style={styles.label}>Ingredients</Text>

        {ingredients.map((ingredient, idx) => (
          <View key={idx} style={styles.ingredientCard}>
            <View style={styles.ingredientHeader}>
              <Text style={styles.ingredientNum}>Ingredient {idx + 1}</Text>
              {ingredients.length > 1 && (
                <TouchableOpacity onPress={() => removeIngredient(idx)}>
                  <Text style={styles.removeText}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.searchRow}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search food or enter manually..."
                placeholderTextColor="#999"
                value={searchingIdx === idx ? search : ingredient.name}
                onChangeText={val => {
                  setSearchingIdx(idx);
                  setSearch(val);
                  updateIngredient(idx, 'name', val);
                }}
                onSubmitEditing={() => searchFood(idx)}
                returnKeyType="search"
              />
              <TouchableOpacity style={styles.searchBtn} onPress={() => searchFood(idx)}>
                {searching && searchingIdx === idx
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.searchBtnText}>Search</Text>
                }
              </TouchableOpacity>
            </View>

            {searchingIdx === idx && searchResults.length > 0 && (
              <View style={styles.dropdown}>
                {searchResults.slice(0, 5).map((food, fidx) => (
                  <TouchableOpacity key={fidx} style={styles.dropdownItem} onPress={() => selectFood(idx, food)}>
                    <Text style={styles.dropdownName}>{food.name}</Text>
                    <Text style={styles.dropdownMacros}>{food.calories} kcal · {food.protein}g P · {food.carbs}g C · {food.fat}g F</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={styles.manualConfirmBtn} onPress={() => confirmManualName(idx)}>
                  <Text style={styles.manualConfirmText}>Use "{ingredient.name}"</Text>
                </TouchableOpacity>
              </View>
            )}

            {searchingIdx === idx && searchResults.length === 0 && ingredient.name.trim().length > 0 && !searching && (
              <TouchableOpacity style={styles.manualConfirmBtn} onPress={() => confirmManualName(idx)}>
                <Text style={styles.manualConfirmText}>Use "{ingredient.name}"</Text>
              </TouchableOpacity>
            )}

            <View style={styles.qtyUnitRow}>
              <View style={styles.qtyField}>
                <Text style={styles.macroLabel}>QTY</Text>
                <TextInput
                  style={styles.macroInput}
                  keyboardType="numeric"
                  value={ingredient.quantity}
                  onChangeText={val => updateIngredient(idx, 'quantity', val)}
                  placeholderTextColor="#999"
                  onFocus={() => setNumericFocused(true)}
                  onBlur={() => setNumericFocused(false)}
                />
              </View>
              <View style={styles.unitField}>
                <Text style={styles.macroLabel}>UNIT</Text>
                <View style={styles.unitPicker}>
                  {UNITS.map(u => (
                    <TouchableOpacity
                      key={u}
                      style={[styles.unitBtn, ingredient.unit === u && styles.unitBtnActive]}
                      onPress={() => updateIngredient(idx, 'unit', u)}
                    >
                      <Text style={[styles.unitBtnText, ingredient.unit === u && styles.unitBtnTextActive]}>{u}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.macroRow}>
              {[
                { label: 'KCAL', key: 'calories' },
                { label: 'PROTEIN', key: 'protein' },
                { label: 'CARBS', key: 'carbs' },
                { label: 'FAT', key: 'fat' },
              ].map(field => (
                <View key={field.key} style={styles.macroField}>
                  <Text style={styles.macroLabel}>{field.label}</Text>
                  <TextInput
                    style={styles.macroInput}
                    keyboardType="numeric"
                    value={ingredient[field.key]}
                    onChangeText={val => updateIngredient(idx, field.key, val)}
                    placeholderTextColor="#999"
                    onFocus={() => setNumericFocused(true)}
                    onBlur={() => setNumericFocused(false)}
                  />
                </View>
              ))}
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.addIngredientBtn} onPress={addIngredient}>
          <Text style={styles.addIngredientText}>+ Add Ingredient</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#EDE8DF' },
  back: { color: '#F77E2D', fontSize: 14, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '900', color: '#1A1A1A', marginBottom: 24 },
  label: { fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  input: { backgroundColor: '#D9D3C8', borderRadius: 12, padding: 14, fontSize: 15, color: '#1A1A1A', marginBottom: 16 },
  ingredientCard: { backgroundColor: '#D9D3C8', borderRadius: 16, padding: 16, marginBottom: 12 },
  ingredientHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  ingredientNum: { fontSize: 13, fontWeight: '700', color: '#1A1A1A' },
  removeText: { fontSize: 12, color: '#F77E2D', fontWeight: '700' },
  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  searchInput: { flex: 1, backgroundColor: '#EDE8DF', borderRadius: 10, padding: 12, fontSize: 14, color: '#1A1A1A' },
  searchBtn: { backgroundColor: '#F77E2D', borderRadius: 10, paddingHorizontal: 14, justifyContent: 'center', minWidth: 64, alignItems: 'center' },
  searchBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  dropdown: { backgroundColor: '#EDE8DF', borderRadius: 10, marginBottom: 8 },
  dropdownItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#D9D3C8' },
  dropdownName: { fontSize: 13, fontWeight: '600', color: '#1A1A1A' },
  dropdownMacros: { fontSize: 11, color: '#888', marginTop: 2 },
  manualConfirmBtn: { padding: 12, alignItems: 'center' },
  manualConfirmText: { fontSize: 13, color: '#F77E2D', fontWeight: '700' },
  qtyUnitRow: { flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'flex-start' },
  qtyField: { width: 80 },
  unitField: { flex: 1 },
  unitPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  unitBtn: { backgroundColor: '#EDE8DF', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 6 },
  unitBtnActive: { backgroundColor: '#F77E2D' },
  unitBtnText: { fontSize: 11, color: '#888', fontWeight: '600' },
  unitBtnTextActive: { color: '#fff' },
  macroRow: { flexDirection: 'row', gap: 8 },
  macroField: { flex: 1 },
  macroLabel: { fontSize: 10, color: '#888', textTransform: 'uppercase', marginBottom: 4 },
  macroInput: { backgroundColor: '#EDE8DF', borderRadius: 8, padding: 10, fontSize: 13, color: '#1A1A1A', textAlign: 'center' },
  addIngredientBtn: { borderWidth: 1.5, borderColor: '#F77E2D', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 16 },
  addIngredientText: { color: '#F77E2D', fontWeight: '700' },
  saveBtn: { backgroundColor: '#F77E2D', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 40 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  floatingDone: { backgroundColor: '#D9D3C8', padding: 12, alignItems: 'flex-end', borderTopWidth: 1, borderTopColor: '#C4BEB4' },
  floatingDoneText: { color: '#F77E2D', fontWeight: '700', fontSize: 16, paddingRight: 16 },
});