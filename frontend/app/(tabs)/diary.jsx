import { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Platform, Modal } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import api from '../../src/utils/api';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snacks'];

const UNITS = ['g', 'kg', 'ml', 'L', 'cup', 'tbsp', 'tsp', 'oz', 'pc', 'pack', 'serving'];

const UNIT_TO_GRAMS = {
  g: 1, kg: 1000, ml: 1, L: 1000,
  cup: 240, tbsp: 15, tsp: 5,
  oz: 28.35
};

const gramsOf = (u, n) => (UNIT_TO_GRAMS[u] !== undefined ? n * UNIT_TO_GRAMS[u] : null);

// A whole serving or a whole pack always counts as one of the food's servings.
const isWhole = (u) => u === 'serving' || u === 'pack';

const formatDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};
const displayDate = (date) => date.toDateString();
const isToday = (date) => formatDate(date) === formatDate(new Date());
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// Monday-first month grid: null = empty cell, number = day of month
const buildCalendarCells = (year, month) => {
  const startOffset = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
};

export default function DiaryScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingFood, setEditingFood] = useState(null);
  const [mode, setMode] = useState('edit'); // 'edit' or 'copy'
  const [editQuantity, setEditQuantity] = useState('');
  const [editUnit, setEditUnit] = useState('g');
  const [copyDate, setCopyDate] = useState(new Date());
  const [copyMeal, setCopyMeal] = useState('breakfast');
  const [sourceFood, setSourceFood] = useState(null);
  const [sourceLoading, setSourceLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);
  const [toast, setToast] = useState('');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calTarget, setCalTarget] = useState('view'); // 'view' or 'copy'
  const [calMonth, setCalMonth] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const router = useRouter();
  const qtyRef = useRef(null);
  const scrollRef = useRef(null);
  const sourceReq = useRef(0);
  const savingRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      fetchSummary(selectedDate);
    }, [selectedDate])
  );

  // Focus the amount box a moment after the popup opens so the number is selected.
  useEffect(() => {
    if (!editingFood) return;
    const t = setTimeout(() => qtyRef.current?.focus(), 300);
    return () => clearTimeout(t);
  }, [!!editingFood]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const fetchSummary = async (date) => {
    setLoading(true);
    try {
      const res = await api.get(`/meals/summary?date=${formatDate(date)}`);
      setSummary(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const goToPrevDay = () => {
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 1);
    setSelectedDate(prev);
    setSummary(null);
  };

  const goToNextDay = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    setSelectedDate(next);
    setSummary(null);
  };

  const goToToday = () => {
    if (calTarget === 'copy') {
      setCopyDate(new Date());
    } else {
      setSelectedDate(new Date());
      setSummary(null);
    }
    setCalendarOpen(false);
  };

  const openCalendar = (target = 'view') => {
    const base = target === 'copy' ? copyDate : selectedDate;
    setCalTarget(target);
    setCalMonth(new Date(base.getFullYear(), base.getMonth(), 1));
    setCalendarOpen(true);
  };

  const changeMonth = (delta) => {
    setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + delta, 1));
  };

  const pickDay = (day) => {
    const picked = new Date(calMonth.getFullYear(), calMonth.getMonth(), day);
    if (calTarget === 'copy') {
      setCopyDate(picked);
    } else {
      setSelectedDate(picked);
      setSummary(null);
    }
    setCalendarOpen(false);
  };

  const shiftCopyDate = (delta) => {
    const d = new Date(copyDate);
    d.setDate(d.getDate() + delta);
    setCopyDate(d);
  };

  const deleteFood = async (mealId, foodId) => {
    try {
      await api.delete(`/meals/${mealId}/food/${foodId}`);
      fetchSummary(selectedDate);
    } catch (err) {
      console.error(err);
    }
  };

  // Opens the popup in edit or copy mode. If the entry remembers its food, load that
  // food so the calories can be recalculated from it instead of from the logged entry.
  const openEdit = async (meal, food, openMode = 'edit') => {
    const reqId = ++sourceReq.current;
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    setMode(openMode);
    setCopyDate(new Date(selectedDate));
    setCopyMeal(meal.mealType);
    setEditingFood({ mealId: meal._id, foodId: food._id, food });
    setEditQuantity(food.quantity?.toString() || '100');
    setEditUnit(food.unit || 'g');
    setSourceFood(null);
    if (!food.foodId) {
      setSourceLoading(false);
      return;
    }
    setSourceLoading(true);
    try {
      const res = await api.get(`/food/${food.foodId}`);
      if (reqId !== sourceReq.current) return;
      setSourceFood(res.data);
    } catch (err) {
      if (reqId !== sourceReq.current) return;
      setSourceFood(null);
    } finally {
      if (reqId === sourceReq.current) setSourceLoading(false);
    }
  };

  const closeEdit = () => {
    sourceReq.current++;
    setEditingFood(null);
    setSourceFood(null);
    setSourceLoading(false);
  };

  // How many servings of the base the amount equals.
  // With the source food, the base is its serving size and unit.
  // Without it, the base is the logged entry and the unit stays the same.
  // Returns null when the app cannot convert the chosen unit.
  const getEditRatio = () => {
    if (!editingFood) return 0;
    const qty = parseFloat(editQuantity) || 0;

    if (!sourceFood) {
      const originalQty = parseFloat(editingFood.food.quantity) || 100;
      return qty / originalQty;
    }

    const foodSize = parseFloat(sourceFood.servingSize) || 1;
    const foodUnit = sourceFood.servingUnit || 'serving';

    if (editUnit === foodUnit) return qty / foodSize;

    const logGrams = gramsOf(editUnit, qty);
    const foodGrams = gramsOf(foodUnit, foodSize);

    if (logGrams !== null && foodGrams !== null) return logGrams / foodGrams;
    if (isWhole(editUnit)) return qty;
    if (editUnit === 'pc' && foodGrams !== null) return qty;
    return null;
  };

  const saveEdit = async () => {
    if (!editingFood || sourceLoading || savingRef.current) return;
    const ratio = getEditRatio();
    if (ratio === null) return;
    savingRef.current = true;
    setSaving(true);
    try {
      const qty = parseFloat(editQuantity) || 100;
      const base = sourceFood || editingFood.food;
      const macros = {
        calories: Math.round((base.calories || 0) * ratio),
        protein: Math.round((base.protein || 0) * ratio),
        carbs: Math.round((base.carbs || 0) * ratio),
        fat: Math.round((base.fat || 0) * ratio),
        fiber: Math.round((base.fiber || 0) * ratio),
        sodium: Math.round((base.sodium || 0) * ratio),
        sugar: Math.round((base.sugar || 0) * ratio)
      };

      if (mode === 'copy') {
        await api.post('/meals', {
          date: formatDate(copyDate),
          mealType: copyMeal,
          food: {
            foodId: editingFood.food.foodId,
            name: editingFood.food.name,
            quantity: qty,
            unit: editUnit,
            ...macros
          }
        });
        const when = isToday(copyDate) ? 'Today' : displayDate(copyDate);
        const sameDay = formatDate(copyDate) === formatDate(selectedDate);
        closeEdit();
        showToast(`Copied to ${when}, ${cap(copyMeal)}`);
        if (sameDay) fetchSummary(selectedDate);
      } else {
        await api.put(`/meals/${editingFood.mealId}/food/${editingFood.foodId}`, {
          quantity: qty,
          unit: editUnit,
          ...macros
        });
        closeEdit();
        fetchSummary(selectedDate);
      }
    } catch (err) {
      console.error(err);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const copyYesterday = async () => {
    setCopying(true);
    try {
      const prev = new Date(selectedDate);
      prev.setDate(prev.getDate() - 1);
      const res = await api.get(`/meals/summary?date=${formatDate(prev)}`);
      const prevMeals = res.data?.meals || [];
      if (prevMeals.length === 0 || prevMeals.every(m => m.foods.length === 0)) {
        if (Platform.OS === 'web') window.alert('No meals logged on that day.');
        return;
      }
      for (const meal of prevMeals) {
        for (const food of meal.foods) {
          await api.post('/meals', {
            date: formatDate(selectedDate),
            mealType: meal.mealType,
            food: {
              name: food.name,
              quantity: food.quantity,
              unit: food.unit,
              calories: food.calories,
              protein: food.protein,
              carbs: food.carbs,
              fat: food.fat,
              fiber: food.fiber || 0,
              sodium: food.sodium || 0,
              sugar: food.sugar || 0
            }
          });
        }
      }
      fetchSummary(selectedDate);
    } catch (err) {
      console.error(err);
    } finally {
      setCopying(false);
    }
  };

  const isEmpty = !summary?.meals || summary.meals.every(m => m.foods.length === 0);
  const calCells = buildCalendarCells(calMonth.getFullYear(), calMonth.getMonth());
  const calSelected = calTarget === 'copy' ? copyDate : selectedDate;

  const editRatio = editingFood ? getEditRatio() : 0;
  const editBase = sourceFood || (editingFood ? editingFood.food : null);
  const editCalories = editingFood && editRatio !== null && !sourceLoading
    ? Math.round((editBase.calories || 0) * editRatio)
    : null;
  const srcSizeLabel = sourceFood ? (parseFloat(sourceFood.servingSize) || 1) : 1;
  const srcUnitLabel = sourceFood ? (sourceFood.servingUnit || 'serving') : 'serving';
  const weightFood = UNIT_TO_GRAMS[srcUnitLabel] !== undefined;
  const availableUnits = weightFood
    ? UNITS
    : ['serving', 'pack', ...(srcUnitLabel === 'pc' ? ['pc'] : [])];
  const saveDisabled = saving || sourceLoading || editRatio === null;

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#F77E2D" />
    </View>
  );

  return (
    <ScrollView ref={scrollRef} style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Food Diary</Text>

      {toast !== '' && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

      <View style={styles.dateNav}>
        <TouchableOpacity style={styles.navBtn} onPress={goToPrevDay}>
          <Text style={styles.navBtnText}>‹</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => openCalendar('view')}>
          <Text style={styles.dateText}>
            {isToday(selectedDate) ? 'Today' : displayDate(selectedDate)}
          </Text>
          <Text style={styles.goToToday}>Tap to pick a date</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navBtn} onPress={goToNextDay}>
          <Text style={styles.navBtnText}>›</Text>
        </TouchableOpacity>
      </View>

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

      {isEmpty && (
        <TouchableOpacity style={styles.copyBtn} onPress={copyYesterday} disabled={copying}>
          {copying
            ? <ActivityIndicator color="#F77E2D" />
            : <Text style={styles.copyBtnText}>📋 Copy Previous Day's Meals</Text>
          }
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.myFoodsBtn} onPress={() => router.push({ pathname: '/add-food', params: { mealType: 'breakfast', date: formatDate(selectedDate), defaultTab: 'myfoods' } })}>
        <Text style={styles.myFoodsBtnText}>📋 My Foods</Text>
      </TouchableOpacity>

      {MEAL_TYPES.map(mealType => {
        const meal = summary?.meals?.find(m => m.mealType === mealType);
        return (
          <View key={mealType} style={styles.mealSection}>
            <View style={styles.mealHeader}>
              <Text style={styles.mealTitle}>{cap(mealType)}</Text>
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => router.push({ pathname: '/add-food', params: { mealType, date: formatDate(selectedDate) } })}
              >
                <Text style={styles.addBtnText}>+ Add</Text>
              </TouchableOpacity>
            </View>
            {meal?.foods?.length > 0 ? (
              meal.foods.map((food, idx) => (
                <TouchableOpacity key={idx} style={styles.foodItem} onPress={() => openEdit(meal, food, 'edit')}>
                  <View style={styles.foodInfo}>
                    <View style={styles.foodNameWrap}>
                      <Text style={styles.foodName}>{food.name}</Text>
                      <Text style={styles.foodQty}>{food.quantity || 100}{food.unit || 'g'}</Text>
                    </View>
                    <Text style={styles.foodCals}>{food.calories} kcal</Text>
                  </View>
                  <TouchableOpacity style={styles.copyItemBtn} onPress={() => openEdit(meal, food, 'copy')}>
                    <Text style={styles.copyItemBtnText}>Copy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteFood(meal._id, food._id)}>
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
            <Text style={styles.modalSub}>{mode === 'copy' ? 'Copy to' : 'Edit amount'}</Text>

            {mode === 'copy' && (
              <>
                <View style={styles.copyDateRow}>
                  <TouchableOpacity style={styles.navBtn} onPress={() => shiftCopyDate(-1)}>
                    <Text style={styles.navBtnText}>‹</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => openCalendar('copy')}>
                    <Text style={styles.dateText}>{isToday(copyDate) ? 'Today' : displayDate(copyDate)}</Text>
                    <Text style={styles.goToToday}>Tap to pick a date</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.navBtn} onPress={() => shiftCopyDate(1)}>
                    <Text style={styles.navBtnText}>›</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.mealChips}>
                  {MEAL_TYPES.map(m => (
                    <TouchableOpacity
                      key={m}
                      style={[styles.unitBtn, copyMeal === m && styles.unitBtnActive]}
                      onPress={() => setCopyMeal(m)}
                    >
                      <Text style={[styles.unitBtnText, copyMeal === m && styles.unitBtnTextActive]}>{cap(m)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <View style={styles.quantityRow}>
              <TextInput
                ref={qtyRef}
                style={styles.quantityInput}
                keyboardType="numeric"
                value={editQuantity}
                onChangeText={setEditQuantity}
                selectTextOnFocus
              />
            </View>

            {sourceFood ? (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.unitScroll} contentContainerStyle={styles.unitScrollContent} keyboardShouldPersistTaps="handled">
                  {availableUnits.map(u => (
                    <TouchableOpacity
                      key={u}
                      style={[styles.unitBtn, editUnit === u && styles.unitBtnActive]}
                      onPress={() => setEditUnit(u)}
                    >
                      <Text style={[styles.unitBtnText, editUnit === u && styles.unitBtnTextActive]}>{u}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {!weightFood && (
                  <Text style={styles.hint}>This food is saved per {srcSizeLabel} {srcUnitLabel}.</Text>
                )}
              </>
            ) : (
              <Text style={styles.unitFixed}>{editUnit}</Text>
            )}

            <Text style={styles.caloriePreview}>
              {sourceLoading ? '...' : (editCalories === null ? 'Pick a different unit' : `${editCalories} kcal`)}
            </Text>

            {editUnit === 'g' && (
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
            )}

            <TouchableOpacity style={[styles.saveBtn, saveDisabled && styles.saveBtnDisabled]} onPress={saveEdit} disabled={saveDisabled}>
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.saveBtnText}>{mode === 'copy' ? `Add to ${cap(copyMeal)}` : 'Save Changes'}</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={closeEdit}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Modal visible={calendarOpen} transparent animationType="fade" onRequestClose={() => setCalendarOpen(false)}>
        <View style={styles.calOverlay}>
          <View style={styles.calCard}>
            <View style={styles.calHeader}>
              <TouchableOpacity style={styles.navBtn} onPress={() => changeMonth(-1)}>
                <Text style={styles.navBtnText}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.calMonthText}>{MONTH_NAMES[calMonth.getMonth()]} {calMonth.getFullYear()}</Text>
              <TouchableOpacity style={styles.navBtn} onPress={() => changeMonth(1)}>
                <Text style={styles.navBtnText}>›</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.calWeekRow}>
              {WEEKDAYS.map((w, i) => (
                <Text key={i} style={styles.calWeekday}>{w}</Text>
              ))}
            </View>
            <View style={styles.calGrid}>
              {calCells.map((day, i) => {
                if (!day) return <View key={i} style={styles.calCell} />;
                const cellDate = new Date(calMonth.getFullYear(), calMonth.getMonth(), day);
                const isSelected = formatDate(cellDate) === formatDate(calSelected);
                const isTodayCell = isToday(cellDate);
                return (
                  <TouchableOpacity key={i} style={styles.calCell} onPress={() => pickDay(day)}>
                    <View style={[styles.calDayInner, isTodayCell && styles.calDayToday, isSelected && styles.calDaySelected]}>
                      <Text style={[styles.calDayText, isSelected && styles.calDayTextSelected]}>{day}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.calActions}>
              <TouchableOpacity style={styles.calCloseBtn} onPress={() => setCalendarOpen(false)}>
                <Text style={styles.calCloseBtnText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.calTodayBtn} onPress={goToToday}>
                <Text style={styles.calTodayBtnText}>Today</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EDE8DF' },
  content: { padding: 24, paddingTop: 60 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#EDE8DF' },
  title: { fontSize: 28, fontWeight: '900', color: '#1A1A1A', marginBottom: 16 },
  toast: { backgroundColor: '#1A1A1A', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 12 },
  toastText: { color: '#fff', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  dateNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  navBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: '#D9D3C8', borderRadius: 20 },
  navBtnText: { fontSize: 24, color: '#1A1A1A', fontWeight: '700' },
  dateText: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', textAlign: 'center' },
  goToToday: { fontSize: 11, color: '#F77E2D', textAlign: 'center', marginTop: 2 },
  summaryCard: { backgroundColor: '#D9D3C8', borderRadius: 16, padding: 20, marginBottom: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  divider: { height: 1, backgroundColor: '#C5BFB4', marginVertical: 16 },
  summaryItem: { alignItems: 'center' },
  summaryValue: { fontSize: 20, fontWeight: '800', color: '#F77E2D' },
  microValue: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  summaryLabel: { fontSize: 11, color: '#888', marginTop: 2, textTransform: 'uppercase', letterSpacing: 1 },
  copyBtn: { borderWidth: 1.5, borderColor: '#F77E2D', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 24 },
  myFoodsBtn: { backgroundColor: '#D9D3C8', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 24 },
  myFoodsBtnText: { color: '#1A1A1A', fontWeight: '700', fontSize: 14 },
  copyBtnText: { color: '#F77E2D', fontWeight: '700', fontSize: 14 },
  mealSection: { marginBottom: 24 },
  mealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  mealTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', textTransform: 'capitalize' },
  addBtn: { backgroundColor: '#F77E2D', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 99 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  foodItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#D9D3C8', borderRadius: 10, padding: 12, marginBottom: 6 },
  foodInfo: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  foodNameWrap: { flex: 1, paddingRight: 8 },
  foodName: { fontSize: 14, color: '#1A1A1A', fontWeight: '500' },
  foodQty: { fontSize: 11, color: '#888', marginTop: 2 },
  foodCals: { fontSize: 14, color: '#F77E2D', fontWeight: '700' },
  copyItemBtn: { marginLeft: 10, height: 28, paddingHorizontal: 10, borderRadius: 14, backgroundColor: '#C5BFB4', justifyContent: 'center', alignItems: 'center' },
  copyItemBtnText: { color: '#555', fontSize: 11, fontWeight: '700' },
  deleteBtn: { marginLeft: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: '#C5BFB4', justifyContent: 'center', alignItems: 'center' },
  deleteBtnText: { color: '#888', fontSize: 12, fontWeight: '700' },
  emptyText: { fontSize: 13, color: '#bbb', fontStyle: 'italic' },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-start', alignItems: 'center', padding: 24, paddingTop: 70 },
  modalCard: { backgroundColor: '#EDE8DF', borderRadius: 20, padding: 24, width: '100%' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A1A', marginBottom: 4, textAlign: 'center' },
  modalSub: { fontSize: 13, color: '#888', textAlign: 'center', marginBottom: 20 },
  copyDateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  mealChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 16 },
  quantityRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#D9D3C8', borderRadius: 12, paddingHorizontal: 16, marginBottom: 12 },
  quantityInput: { flex: 1, fontSize: 32, fontWeight: '900', color: '#1A1A1A', padding: 14, textAlign: 'center' },
  unitScroll: { marginBottom: 12 },
  unitScrollContent: { gap: 8, paddingHorizontal: 4 },
  unitBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 99, backgroundColor: '#D9D3C8' },
  unitBtnActive: { backgroundColor: '#F77E2D' },
  unitBtnText: { fontSize: 13, color: '#888', fontWeight: '600' },
  unitBtnTextActive: { color: '#fff' },
  unitFixed: { fontSize: 14, color: '#888', fontWeight: '600', textAlign: 'center', marginBottom: 12 },
  hint: { fontSize: 12, color: '#888', textAlign: 'center', marginBottom: 12 },
  caloriePreview: { fontSize: 14, color: '#F77E2D', fontWeight: '700', textAlign: 'center', marginBottom: 16 },
  quickBtns: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  quickBtn: { flex: 1, backgroundColor: '#D9D3C8', borderRadius: 10, padding: 10, alignItems: 'center' },
  quickBtnActive: { backgroundColor: '#F77E2D' },
  quickBtnText: { fontSize: 13, color: '#888', fontWeight: '600' },
  quickBtnTextActive: { color: '#fff' },
  saveBtn: { backgroundColor: '#F77E2D', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 8 },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  cancelBtn: { padding: 12, alignItems: 'center' },
  cancelBtnText: { color: '#888', fontSize: 14 },
  calOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  calCard: { backgroundColor: '#EDE8DF', borderRadius: 20, padding: 20, width: '100%', maxWidth: 360 },
  calHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  calMonthText: { fontSize: 16, fontWeight: '800', color: '#1A1A1A' },
  calWeekRow: { flexDirection: 'row' },
  calWeekday: { width: '14.2857%', textAlign: 'center', fontSize: 11, color: '#888', fontWeight: '700', paddingBottom: 6 },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: { width: '14.2857%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center' },
  calDayInner: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  calDayToday: { borderWidth: 1.5, borderColor: '#F77E2D' },
  calDaySelected: { backgroundColor: '#F77E2D' },
  calDayText: { fontSize: 14, color: '#1A1A1A', fontWeight: '600' },
  calDayTextSelected: { color: '#fff' },
  calActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  calCloseBtn: { flex: 1, backgroundColor: '#D9D3C8', borderRadius: 10, padding: 12, alignItems: 'center' },
  calCloseBtnText: { color: '#888', fontWeight: '700', fontSize: 14 },
  calTodayBtn: { flex: 1, backgroundColor: '#F77E2D', borderRadius: 10, padding: 12, alignItems: 'center' },
  calTodayBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 }
});