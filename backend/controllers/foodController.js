const fetch = require('node-fetch');
const { AbortController } = require('abort-controller');
const Food = require('../models/Food');

const createFood = async (req, res) => {
  try {
    const { name, calories, protein, carbs, fat, fiber, sodium, sugar, servingSize, servingUnit, barcode } = req.body;
    const food = await Food.create({
      name, calories, protein, carbs, fat,
      fiber, sodium, sugar, servingSize, servingUnit,
      barcode, source: 'custom', createdBy: req.user._id
    });
    res.status(201).json(food);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateFood = async (req, res) => {
  try {
    const food = await Food.findById(req.params.id);
    if (!food) return res.status(404).json({ message: 'Food not found' });
    if (food.createdBy?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    const { name, calories, protein, carbs, fat, fiber, sodium, sugar, servingSize, servingUnit } = req.body;
    if (name !== undefined) food.name = name;
    if (calories !== undefined) food.calories = calories;
    if (protein !== undefined) food.protein = protein;
    if (carbs !== undefined) food.carbs = carbs;
    if (fat !== undefined) food.fat = fat;
    if (fiber !== undefined) food.fiber = fiber;
    if (sodium !== undefined) food.sodium = sodium;
    if (sugar !== undefined) food.sugar = sugar;
    if (servingSize !== undefined) food.servingSize = servingSize;
    if (servingUnit !== undefined) food.servingUnit = servingUnit;
    await food.save();
    res.json(food);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const fetchWithTimeout = async (url, options = {}, ms = 8000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

const rankScore = (name, q) => {
  const n = name.toLowerCase();
  const query = q.toLowerCase();
  if (n === query) return 3;
  if (n.startsWith(query)) return 2;
  if (n.includes(query)) return 1;
  return 0;
};

const deduplicateResults = (results) => {
  const seen = new Set();
  return results.filter(f => {
    const key = f.name.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const searchUSDA = async (q) => {
  try {
    const res = await fetchWithTimeout(
      `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${process.env.USDA_API_KEY}`,
      {
        method: 'POST',
        headers: { 'User-Agent': 'LTFI/1.0', 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, pageSize: 10 })
      },
      8000
    );
    const data = await res.json();
    return (data.foods || []).map(f => {
      const nutrients = f.foodNutrients || [];
      const getByNumber = (num) => {
        const n = nutrients.find(n => String(n.nutrientNumber) === String(num));
        return n ? Math.round(n.value || 0) : 0;
      };
      const getByName = (name) => {
        const n = nutrients.find(n => n.nutrientName && n.nutrientName.toLowerCase().includes(name.toLowerCase()));
        return n ? Math.round(n.value || 0) : 0;
      };
      return {
        _id: null,
        name: f.description,
        calories: getByNumber(208) || getByName('energy'),
        protein: getByNumber(203) || getByName('protein'),
        carbs: getByNumber(205) || getByName('carbohydrate'),
        fat: getByNumber(204) || getByName('lipid'),
        fiber: getByNumber(291) || getByName('fiber'),
        sodium: getByNumber(307) || getByName('sodium'),
        sugar: getByNumber(269) || getByName('sugar'),
        servingSize: 100,
        servingUnit: 'g',
        source: 'usda'
      };
    }).filter(f => f.name);
  } catch (err) {
    console.error('USDA error:', err.message);
    return [];
  }
};

const searchOFF = async (q) => {
  try {
    const offRes = await fetchWithTimeout(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=10&fields=product_name,nutriments`,
      { headers: { 'User-Agent': 'LTFI/1.0' } },
      5000
    );
    const contentType = offRes.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Invalid response from Open Food Facts');
    }
    const offData = await offRes.json();
    return (offData.products || [])
      .filter(p => p.product_name && p.nutriments)
      .map(p => ({
        _id: null,
        name: p.product_name,
        calories: Math.round(p.nutriments['energy-kcal_100g'] || 0),
        protein: Math.round(p.nutriments['proteins_100g'] || 0),
        carbs: Math.round(p.nutriments['carbohydrates_100g'] || 0),
        fat: Math.round(p.nutriments['fat_100g'] || 0),
        fiber: Math.round(p.nutriments['fiber_100g'] || 0),
        sodium: Math.round(p.nutriments['sodium_100g'] || 0),
        sugar: Math.round(p.nutriments['sugars_100g'] || 0),
        servingSize: 100,
        servingUnit: 'g',
        source: 'open_food_facts'
      }));
  } catch (err) {
    console.error('Open Food Facts error:', err.message);
    return [];
  }
};

const searchCalorieAPI = async (q) => {
  try {
    const res = await fetchWithTimeout(
      `https://api.calorieapi.com/api/v1/search/foods?q=${encodeURIComponent(q)}&page_size=10`,
      { headers: { 'X-API-Key': process.env.CALORIE_API_KEY, 'User-Agent': 'LTFI/1.0' } },
      8000
    );
    const data = await res.json();
    return (data.foods || data.results || []).map(f => ({
      _id: null,
      name: f.name || f.food_name,
      calories: Math.round(f.calories || f.nf_calories || 0),
      protein: Math.round(f.protein || f.nf_protein || 0),
      carbs: Math.round(f.carbs || f.nf_total_carbohydrate || 0),
      fat: Math.round(f.fat || f.nf_total_fat || 0),
      fiber: Math.round(f.fiber || f.nf_dietary_fiber || 0),
      sodium: Math.round(f.sodium || f.nf_sodium || 0),
      sugar: Math.round(f.sugar || f.nf_sugars || 0),
      servingSize: f.serving_size || 100,
      servingUnit: f.serving_unit || 'g',
      source: 'calorie_api'
    })).filter(f => f.name);
  } catch (err) {
    console.error('Calorie API error:', err.message);
    return [];
  }
};

const searchAPINinjas = async (q) => {
  try {
    const res = await fetchWithTimeout(
      `https://api.api-ninjas.com/v1/nutrition?query=${encodeURIComponent(q)}`,
      { headers: { 'X-Api-Key': process.env.API_NINJAS_KEY, 'User-Agent': 'LTFI/1.0' } },
      8000
    );
    const data = await res.json();
    return (Array.isArray(data) ? data : []).map(f => ({
      _id: null,
      name: f.name,
      calories: Math.round(f.calories || 0),
      protein: Math.round(f.protein_g || 0),
      carbs: Math.round(f.carbohydrates_total_g || 0),
      fat: Math.round(f.fat_total_g || 0),
      fiber: Math.round(f.fiber_g || 0),
      sodium: Math.round(f.sodium_mg || 0),
      sugar: Math.round(f.sugar_g || 0),
      servingSize: f.serving_size_g || 100,
      servingUnit: 'g',
      source: 'api_ninjas'
    })).filter(f => f.name);
  } catch (err) {
    console.error('API Ninjas error:', err.message);
    return [];
  }
};

const searchFood = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ message: 'Search query required' });

    const localFoods = await Food.find({
      name: { $regex: q, $options: 'i' },
      $or: [{ createdBy: null }, { createdBy: req.user._id }]
    }).limit(10);

    const [usdaFoods, offFoods, calorieApiFoods, apinFoods] = await Promise.all([
      searchUSDA(q),
      searchOFF(q),
      searchCalorieAPI(q),
      searchAPINinjas(q)
    ]);

    const external = [...usdaFoods, ...offFoods, ...calorieApiFoods, ...apinFoods]
      .sort((a, b) => rankScore(b.name, q) - rankScore(a.name, q));

    const combined = deduplicateResults([...localFoods, ...external]).slice(0, 25);
    res.json(combined);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getFoodByBarcode = async (req, res) => {
  try {
    const { barcode } = req.params;
    let food = await Food.findOne({ barcode });
    if (food) return res.json(food);

    const response = await fetchWithTimeout(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
      { headers: { 'User-Agent': 'LTFI/1.0' } },
      8000
    );
    const contentType = response.headers.get('content-type');

    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      if (data.status === 1 && data.product) {
        const p = data.product.nutriments;
        const productName = data.product.product_name || data.product.product_name_en || 'Unknown Product';
        food = await Food.create({
          name: productName,
          barcode,
          calories: Math.round(p['energy-kcal_100g'] || 0),
          protein: Math.round(p.proteins_100g || 0),
          carbs: Math.round(p.carbohydrates_100g || 0),
          fat: Math.round(p.fat_100g || 0),
          fiber: Math.round(p.fiber_100g || 0),
          sodium: Math.round(p.sodium_100g || 0),
          sugar: Math.round(p.sugars_100g || 0),
          source: 'open_food_facts',
          createdBy: req.user._id
        });
        return res.json(food);
      }
    }

    const [usdaFoods, offFoods, calorieApiFoods, apinFoods] = await Promise.all([
      searchUSDA(barcode),
      searchOFF(barcode),
      searchCalorieAPI(barcode),
      searchAPINinjas(barcode)
    ]);

    const allResults = deduplicateResults([...usdaFoods, ...offFoods, ...calorieApiFoods, ...apinFoods]);

    if (allResults.length > 0) {
      return res.json(allResults[0]);
    }

    res.status(404).json({ message: 'Product not found' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getUserFoods = async (req, res) => {
  try {
    const foods = await Food.find({
      $or: [
        { createdBy: req.user._id },
        { source: 'custom', createdBy: req.user._id }
      ]
    });
    res.json(foods);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deleteFood = async (req, res) => {
  try {
    const food = await Food.findById(req.params.id);
    if (!food) return res.status(404).json({ message: 'Food not found' });
    if (food.createdBy?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    await food.deleteOne();
    res.json({ message: 'Food deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { createFood, updateFood, searchFood, getFoodByBarcode, getUserFoods, deleteFood };