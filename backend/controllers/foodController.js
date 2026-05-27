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

const fetchWithTimeout = async (url, options = {}, ms = 8000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

const searchUSDA = async (q) => {
  try {
    const res = await fetchWithTimeout(
      `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(q)}&pageSize=10&dataType=Foundation,SR%20Legacy,Branded&api_key=${process.env.USDA_API_KEY}`,
      { headers: { 'User-Agent': 'LTFI/1.0' } },
      8000
    );
    const data = await res.json();
    if (data.foods && data.foods[0]) {
      console.log('USDA sample nutrients:', JSON.stringify(data.foods[0].foodNutrients.slice(0, 3)));
    }
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
      .filter(p => p.product_name && p.nutriments && p.product_name.toLowerCase().includes(q.toLowerCase()))
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

const searchFood = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ message: 'Search query required' });

    const localFoods = await Food.find({
      name: { $regex: q, $options: 'i' },
      $or: [{ createdBy: null }, { createdBy: req.user._id }]
    }).limit(10);

    const [usdaFoods, offFoods] = await Promise.all([
      searchUSDA(q),
      searchOFF(q)
    ]);

    const combined = [...localFoods, ...usdaFoods, ...offFoods].slice(0, 20);
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
    if (!contentType || !contentType.includes('application/json')) {
      return res.status(404).json({ message: 'Product not found' });
    }
    const data = await response.json();
    if (data.status !== 1) return res.status(404).json({ message: 'Product not found' });

    const p = data.product.nutriments;
    food = await Food.create({
      name: data.product.product_name || 'Unknown Product',
      barcode,
      calories: Math.round(p['energy-kcal_100g'] || 0),
      protein: Math.round(p.proteins_100g || 0),
      carbs: Math.round(p.carbohydrates_100g || 0),
      fat: Math.round(p.fat_100g || 0),
      fiber: Math.round(p.fiber_100g || 0),
      sodium: Math.round(p.sodium_100g || 0),
      sugar: Math.round(p.sugars_100g || 0),
      source: 'open_food_facts',
      createdBy: null
    });
    res.json(food);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getUserFoods = async (req, res) => {
  try {
    const foods = await Food.find({ createdBy: req.user._id });
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

module.exports = { createFood, searchFood, getFoodByBarcode, getUserFoods, deleteFood };