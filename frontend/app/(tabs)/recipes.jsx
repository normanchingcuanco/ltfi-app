import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Platform, Modal } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import api from '../../src/utils/api';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snacks'];

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

export default function RecipesScreen() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [showMealPicker, setShowMealPicker] = useState(false);
  const router = useRouter();
  const today = new Date().toISOString().split('T')[0];

  useFocusEffect(
    useCallback(() => {
      fetchRecipes();
    }, [])
  );

  const fetchRecipes = async () => {
    try {
      const res = await api.get('/recipes');
      setRecipes(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const deleteRecipe = async (id) => {
    showAlert('Delete', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await api.delete(`/recipes/${id}`);
            setRecipes(prev => prev.filter(r => r._id !== id));
          } catch (err) {
            console.error(err);
          }
        }
      }
    ]);
  };

  const handleAddToDiary = (recipe) => {
    setSelectedRecipe(recipe);
    setShowMealPicker(true);
  };

  const addRecipeToDiary = async (mealType) => {
    if (!selectedRecipe) return;
    setAdding(true);
    setShowMealPicker(false);
    try {
      const servingCalories = Math.round(selectedRecipe.totalCalories / selectedRecipe.servings);
      const servingProtein = Math.round(selectedRecipe.totalProtein / selectedRecipe.servings);
      const servingCarbs = Math.round(selectedRecipe.totalCarbs / selectedRecipe.servings);
      const servingFat = Math.round(selectedRecipe.totalFat / selectedRecipe.servings);

      await api.post('/meals', {
        date: today,
        mealType,
        food: {
          name: `${selectedRecipe.name} (1 serving)`,
          quantity: 1,
          unit: 'serving',
          calories: servingCalories,
          protein: servingProtein,
          carbs: servingCarbs,
          fat: servingFat,
          fiber: 0,
          sodium: 0,
          sugar: 0
        }
      });
      showAlert('Added', `${selectedRecipe.name} added to ${mealType}.`);
    } catch (err) {
      showAlert('Error', 'Failed to add recipe to diary.');
    } finally {
      setAdding(false);
      setSelectedRecipe(null);
    }
  };

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#F77E2D" />
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Recipes</Text>

      <TouchableOpacity style={styles.createBtn} onPress={() => router.push('/create-recipe')}>
        <Text style={styles.createBtnText}>+ Create Recipe</Text>
      </TouchableOpacity>

      {recipes.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>No recipes yet. Create one to get started.</Text>
        </View>
      ) : (
        recipes.map(recipe => (
          <View key={recipe._id} style={styles.recipeCard}>
            <View style={styles.recipeInfo}>
              <Text style={styles.recipeName}>{recipe.name}</Text>
              <Text style={styles.recipeMeta}>
                {recipe.servings} serving{recipe.servings > 1 ? 's' : ''} · {recipe.totalCalories} kcal total · {Math.round(recipe.totalCalories / recipe.servings)} kcal/serving
              </Text>
              <Text style={styles.recipeMacros}>
                {Math.round(recipe.totalProtein / recipe.servings)}g P · {Math.round(recipe.totalCarbs / recipe.servings)}g C · {Math.round(recipe.totalFat / recipe.servings)}g F per serving
              </Text>
            </View>
            <View style={styles.recipeActions}>
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => handleAddToDiary(recipe)}
                disabled={adding}
              >
                <Text style={styles.addBtnText}>+ Diary</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteRecipe(recipe._id)}>
                <Text style={styles.deleteBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      {showMealPicker && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add to which meal?</Text>
            <Text style={styles.modalSub}>{selectedRecipe?.name} · 1 serving</Text>
            {MEAL_TYPES.map(meal => (
              <TouchableOpacity
                key={meal}
                style={styles.mealOption}
                onPress={() => addRecipeToDiary(meal)}
              >
                <Text style={styles.mealOptionText}>{meal.charAt(0).toUpperCase() + meal.slice(1)}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.cancelOption} onPress={() => {
              setShowMealPicker(false);
              setSelectedRecipe(null);
            }}>
              <Text style={styles.cancelOptionText}>Cancel</Text>
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
  title: { fontSize: 28, fontWeight: '900', color: '#1A1A1A', marginBottom: 24 },
  createBtn: { backgroundColor: '#F77E2D', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 24 },
  createBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  emptyBox: { backgroundColor: '#D9D3C8', borderRadius: 16, padding: 24, alignItems: 'center' },
  emptyText: { color: '#888', textAlign: 'center', fontSize: 14 },
  recipeCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#D9D3C8', borderRadius: 16, padding: 16, marginBottom: 12 },
  recipeInfo: { flex: 1 },
  recipeName: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  recipeMeta: { fontSize: 12, color: '#888', marginBottom: 2 },
  recipeMacros: { fontSize: 12, color: '#F77E2D' },
  recipeActions: { flexDirection: 'row', gap: 8, alignItems: 'center', marginLeft: 12 },
  addBtn: { backgroundColor: '#F77E2D', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 99 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  deleteBtn: { backgroundColor: '#E8E2D8', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  deleteBtnText: { color: '#888', fontSize: 14 },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { backgroundColor: '#EDE8DF', borderRadius: 20, padding: 24, width: '100%' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A1A', marginBottom: 4, textAlign: 'center' },
  modalSub: { fontSize: 13, color: '#888', textAlign: 'center', marginBottom: 20 },
  mealOption: { backgroundColor: '#D9D3C8', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 8 },
  mealOptionText: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  cancelOption: { padding: 16, alignItems: 'center' },
  cancelOptionText: { fontSize: 14, color: '#888', fontWeight: '600' }
});