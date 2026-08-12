require('dotenv').config();
const mongoose = require('mongoose');
const Meal = require('../models/Meal');
const Food = require('../models/Food');

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const meals = await Meal.find({});
  const seenPerUser = new Map();

  for (const meal of meals) {
    const userId = meal.user.toString();
    if (!seenPerUser.has(userId)) seenPerUser.set(userId, new Map());
    const userFoods = seenPerUser.get(userId);

    for (const food of meal.foods) {
      const key = food.name.trim().toLowerCase();
      if (!userFoods.has(key)) {
        userFoods.set(key, food);
      }
    }
  }

  let totalCreated = 0;

  for (const [userId, foodsMap] of seenPerUser) {
    for (const [key, food] of foodsMap) {
      const exists = await Food.findOne({
        createdBy: userId,
        name: { $regex: `^${food.name.trim()}$`, $options: 'i' }
      });
      if (exists) continue;

      const isMassOrVolume = ['g', 'ml'].includes(food.unit);
      const factor = isMassOrVolume && food.quantity > 0 ? 100 / food.quantity : 1;

      await Food.create({
        name: food.name,
        calories: Math.round(food.calories * factor),
        protein: Math.round((food.protein || 0) * factor),
        carbs: Math.round((food.carbs || 0) * factor),
        fat: Math.round((food.fat || 0) * factor),
        fiber: Math.round((food.fiber || 0) * factor),
        sodium: Math.round((food.sodium || 0) * factor),
        sugar: Math.round((food.sugar || 0) * factor),
        servingSize: isMassOrVolume ? 100 : food.quantity,
        servingUnit: food.unit,
        source: 'ai_scan',
        createdBy: userId
      });

      totalCreated++;
      console.log(`Created: ${food.name} for user ${userId}`);
    }
  }

  console.log(`Done. Created ${totalCreated} food entries.`);
  await mongoose.disconnect();
};

run().catch(err => {
  console.error(err);
  process.exit(1);
});