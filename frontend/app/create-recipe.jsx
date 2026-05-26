import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import api from '../src/utils/api';

const showAlert = (title, message) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}: ${message}`);
  } else {
    const { Alert } = require('react-native');
    Alert.alert(title, message);
  }
};

export default function CreateRecipeScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [servings, setServings] = useState('1');
  const [notes, setNotes] = useState('');
  const [ingredients, setIngredients] = useState([{ name: '', quantity: '100', unit: 'g', calories: '', protein: '', carbs: '', fat: '' }]);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchingIdx, setSearchingIdx] = useState(null);
  const [searching, setSearching] = useState(false);

  const addIngredient = () => {
    setIngredients(prev => [...prev, { name: '', quantity: '100', unit: 'g', calories: '', protein: '', carbs: '', fat: '' }]);
  };

  const removeIngredient = (idx) => {
    setIngredients(prev => prev.filter((_, i) => i !== idx));
  };

  const updateIngredient = (idx, key, val) => {
    setIngredients(prev => prev.map((item, i) => i === idx ? { ...item, [key]: val } : item));
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
    setIngredients(prev => prev.map((item, i) => i === idx ? {
      ...item,
      name: food.name,
      calories: food.calories.toString(),
      protein: food.protein.toString(),
      carbs: food.carbs.toString(),
      fat: food.fat.toString(),
      unit: food.servingUnit || 'g'
    } : item));
    setSearchResults([]);
    setSearch('');
    setSearchingIdx(null);
  };

  const handleSave = async () => {
    if (!name.trim()) return showAlert('Error', 'Recipe name is required');
    if (ingredients.some(i => !i.name.trim())) return showAlert('Error', 'All ingredients need a name');

    setSaving(true);
    try {
      await api.post('/recipes', {
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
          fat: parseFloat(i.fat) || 0
        }))
      });
      router.replace('/(tabs)/recipes');
    } catch (err) {
      showAlert('Error', 'Failed to save recipe.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.back}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Create Recipe</Text>

      <Text style={styles.label}>Name</Text>
      <TextInput style={styles.input} placeholder="e.g. Chicken Rice Bowl" placeholderTextColor="#999" value={name} onChangeText={setName} />

      <Text style={styles.label}>Servings</Text>
      <TextInput style={styles.input} placeholder="1" placeholderTextColor="#999" keyboardType="numeric" value={servings} onChangeText={setServings} />

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
              placeholder="Search food..."
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
            </View>
          )}

          <View style={styles.macroRow}>
            {[
              { label: 'Qty', key: 'quantity' },
              { label: 'kcal', key: 'calories' },
              { label: 'Protein', key: 'protein' },
              { label: 'Carbs', key: 'carbs' },
              { label: 'Fat', key: 'fat' }
            ].map(field => (
              <View key={field.key} style={styles.macroField}>
                <Text style={styles.macroLabel}>{field.label}</Text>
                <TextInput
                  style={styles.macroInput}
                  keyboardType="numeric"
                  value={ingredient[field.key]}
                  onChangeText={val => updateIngredient(idx, field.key, val)}
                  placeholderTextColor="#999"
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
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Recipe</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EDE8DF' },
  content: { padding: 24, paddingTop: 60 },
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
  macroRow: { flexDirection: 'row', gap: 8 },
  macroField: { flex: 1 },
  macroLabel: { fontSize: 10, color: '#888', textTransform: 'uppercase', marginBottom: 4 },
  macroInput: { backgroundColor: '#EDE8DF', borderRadius: 8, padding: 10, fontSize: 13, color: '#1A1A1A', textAlign: 'center' },
  addIngredientBtn: { borderWidth: 1.5, borderColor: '#F77E2D', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 16 },
  addIngredientText: { color: '#F77E2D', fontWeight: '700' },
  saveBtn: { backgroundColor: '#F77E2D', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 40 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 }
});