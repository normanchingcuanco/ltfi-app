const Meal = require('../models/Meal');

const getMeals = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ message: 'Date required' });

    const meals = await Meal.find({ user: req.user._id, date });
    res.json(meals);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const addFoodToMeal = async (req, res) => {
  try {
    const { date, mealType, food } = req.body;

    let meal = await Meal.findOne({ user: req.user._id, date, mealType });

    if (!meal) {
      meal = await Meal.create({
        user: req.user._id,
        date,
        mealType,
        foods: [food]
      });
    } else {
      meal.foods.push(food);
      await meal.save();
    }

    res.status(201).json(meal);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const removeFoodFromMeal = async (req, res) => {
  try {
    const { mealId, foodId } = req.params;

    const meal = await Meal.findOne({ _id: mealId, user: req.user._id });
    if (!meal) return res.status(404).json({ message: 'Meal not found' });

    meal.foods = meal.foods.filter(f => f._id.toString() !== foodId);
    await meal.save();

    res.json(meal);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getDailySummary = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ message: 'Date required' });

    const meals = await Meal.find({ user: req.user._id, date });

    const summary = {
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0,
      totalFiber: 0,
      totalSodium: 0,
      totalSugar: 0,
      meals
    };

    meals.forEach(meal => {
      meal.foods.forEach(food => {
        summary.totalCalories += food.calories;
        summary.totalProtein += food.protein;
        summary.totalCarbs += food.carbs;
        summary.totalFat += food.fat;
        summary.totalFiber += food.fiber;
        summary.totalSodium += food.sodium;
        summary.totalSugar += food.sugar;
      });
    });

    res.json(summary);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getMeals, addFoodToMeal, removeFoodFromMeal, getDailySummary };