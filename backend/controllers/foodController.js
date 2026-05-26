const fetch = require('node-fetch');
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

const searchFood = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ message: 'Search query required' });

    const localFoods = await Food.find({
      name: { $regex: q, $options: 'i' },
      $or: [{ createdBy: null }, { createdBy: req.user._id }]
    }).limit(10);

    const offRes = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=10`);
    const offData = await offRes.json();

    const offFoods = (offData.products || [])
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

    const combined = [...localFoods, ...offFoods].slice(0, 20);
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

    const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
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