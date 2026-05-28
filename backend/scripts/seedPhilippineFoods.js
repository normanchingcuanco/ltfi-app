require('dotenv').config();
const mongoose = require('mongoose');
const Food = require('../models/Food');

const philippineFoods = [
  // JOLLIBEE
  { name: 'Jollibee Chickenjoy (1 pc - Thigh)', calories: 330, protein: 27, carbs: 5, fat: 23, fiber: 0, sodium: 680, sugar: 0, servingSize: 1, servingUnit: 'pc', source: 'custom' },
  { name: 'Jollibee Chickenjoy (1 pc - Drumstick)', calories: 220, protein: 20, carbs: 5, fat: 13, fiber: 0, sodium: 520, sugar: 0, servingSize: 1, servingUnit: 'pc', source: 'custom' },
  { name: 'Jollibee Jolly Spaghetti', calories: 320, protein: 12, carbs: 58, fat: 14, fiber: 1, sodium: 480, sugar: 18, servingSize: 1, servingUnit: 'serving', source: 'custom' },
  { name: 'Jollibee Yumburger', calories: 350, protein: 13, carbs: 30, fat: 21, fiber: 1, sodium: 560, sugar: 4, servingSize: 1, servingUnit: 'pc', source: 'custom' },
  { name: 'Jollibee Cheesy Yumburger', calories: 410, protein: 16, carbs: 32, fat: 25, fiber: 1, sodium: 720, sugar: 4, servingSize: 1, servingUnit: 'pc', source: 'custom' },
  { name: 'Jollibee Palabok Fiesta', calories: 410, protein: 20, carbs: 49, fat: 15, fiber: 1, sodium: 950, sugar: 2, servingSize: 1, servingUnit: 'serving', source: 'custom' },
  { name: 'Jollibee Burger Steak', calories: 480, protein: 22, carbs: 45, fat: 23, fiber: 2, sodium: 890, sugar: 5, servingSize: 1, servingUnit: 'serving', source: 'custom' },
  { name: 'Jollibee Peach Mango Pie', calories: 240, protein: 3, carbs: 35, fat: 11, fiber: 1, sodium: 170, sugar: 14, servingSize: 1, servingUnit: 'pc', source: 'custom' },
  { name: 'Jollibee Regular Fries', calories: 230, protein: 3, carbs: 32, fat: 11, fiber: 2, sodium: 350, sugar: 0, servingSize: 1, servingUnit: 'serving', source: 'custom' },
  { name: 'Jollibee Large Fries', calories: 380, protein: 5, carbs: 53, fat: 18, fiber: 3, sodium: 580, sugar: 0, servingSize: 1, servingUnit: 'serving', source: 'custom' },

  // McDONALD'S PH
  { name: "McDonald's Big Mac", calories: 550, protein: 25, carbs: 47, fat: 30, fiber: 3, sodium: 880, sugar: 10, servingSize: 1, servingUnit: 'pc', source: 'custom' },
  { name: "McDonald's McSpicy Chicken Sandwich", calories: 470, protein: 24, carbs: 47, fat: 20, fiber: 2, sodium: 950, sugar: 5, servingSize: 1, servingUnit: 'pc', source: 'custom' },
  { name: "McDonald's McCrispy", calories: 321, protein: 13, carbs: 41, fat: 11, fiber: 2, sodium: 780, sugar: 3, servingSize: 1, servingUnit: 'pc', source: 'custom' },
  { name: "McDonald's Cheeseburger", calories: 300, protein: 15, carbs: 33, fat: 12, fiber: 2, sodium: 680, sugar: 7, servingSize: 1, servingUnit: 'pc', source: 'custom' },
  { name: "McDonald's McChicken", calories: 400, protein: 17, carbs: 40, fat: 19, fiber: 2, sodium: 720, sugar: 5, servingSize: 1, servingUnit: 'pc', source: 'custom' },
  { name: "McDonald's Regular Fries", calories: 230, protein: 3, carbs: 30, fat: 11, fiber: 2, sodium: 320, sugar: 0, servingSize: 1, servingUnit: 'serving', source: 'custom' },
  { name: "McDonald's Large Fries", calories: 380, protein: 5, carbs: 49, fat: 18, fiber: 3, sodium: 520, sugar: 0, servingSize: 1, servingUnit: 'serving', source: 'custom' },
  { name: "McDonald's 6pc Chicken McNuggets", calories: 270, protein: 15, carbs: 17, fat: 16, fiber: 1, sodium: 540, sugar: 0, servingSize: 6, servingUnit: 'pc', source: 'custom' },
  { name: "McDonald's McFlurry Oreo", calories: 340, protein: 8, carbs: 55, fat: 10, fiber: 0, sodium: 210, sugar: 44, servingSize: 1, servingUnit: 'serving', source: 'custom' },
  { name: "McDonald's Hotcakes (3 pcs)", calories: 350, protein: 8, carbs: 58, fat: 10, fiber: 2, sodium: 580, sugar: 14, servingSize: 3, servingUnit: 'pc', source: 'custom' },
  { name: "McDonald's Longganisa McDo", calories: 380, protein: 19, carbs: 36, fat: 18, fiber: 1, sodium: 760, sugar: 5, servingSize: 1, servingUnit: 'serving', source: 'custom' },

  // COMMON FILIPINO FOODS
  { name: 'Sinangag (Garlic Fried Rice)', calories: 250, protein: 5, carbs: 45, fat: 7, fiber: 1, sodium: 320, sugar: 0, servingSize: 1, servingUnit: 'cup', source: 'custom' },
  { name: 'Adobo (Chicken)', calories: 320, protein: 28, carbs: 5, fat: 20, fiber: 0, sodium: 680, sugar: 1, servingSize: 1, servingUnit: 'serving', source: 'custom' },
  { name: 'Sinigang (Pork)', calories: 280, protein: 22, carbs: 12, fat: 16, fiber: 3, sodium: 520, sugar: 2, servingSize: 1, servingUnit: 'serving', source: 'custom' },
  { name: 'Kare-Kare', calories: 420, protein: 30, carbs: 18, fat: 25, fiber: 4, sodium: 480, sugar: 3, servingSize: 1, servingUnit: 'serving', source: 'custom' },
  { name: 'Lechon Kawali', calories: 450, protein: 28, carbs: 2, fat: 38, fiber: 0, sodium: 560, sugar: 0, servingSize: 1, servingUnit: 'serving', source: 'custom' },
  { name: 'Pancit Canton', calories: 350, protein: 14, carbs: 48, fat: 12, fiber: 3, sodium: 780, sugar: 3, servingSize: 1, servingUnit: 'serving', source: 'custom' },
  { name: 'Lugaw (Rice Porridge)', calories: 180, protein: 5, carbs: 35, fat: 2, fiber: 1, sodium: 280, sugar: 0, servingSize: 1, servingUnit: 'cup', source: 'custom' },
  { name: 'Arroz Caldo', calories: 220, protein: 12, carbs: 32, fat: 5, fiber: 1, sodium: 420, sugar: 0, servingSize: 1, servingUnit: 'serving', source: 'custom' },
  { name: 'Tinola (Chicken)', calories: 240, protein: 24, carbs: 8, fat: 12, fiber: 2, sodium: 480, sugar: 1, servingSize: 1, servingUnit: 'serving', source: 'custom' },
  { name: 'Pinakbet', calories: 180, protein: 8, carbs: 14, fat: 10, fiber: 4, sodium: 420, sugar: 3, servingSize: 1, servingUnit: 'serving', source: 'custom' },
  { name: 'Bistek Tagalog', calories: 310, protein: 26, carbs: 8, fat: 19, fiber: 1, sodium: 780, sugar: 2, servingSize: 1, servingUnit: 'serving', source: 'custom' },
  { name: 'Bulalo', calories: 380, protein: 32, carbs: 6, fat: 24, fiber: 2, sodium: 520, sugar: 1, servingSize: 1, servingUnit: 'serving', source: 'custom' },
  { name: 'Tapsilog', calories: 520, protein: 28, carbs: 48, fat: 22, fiber: 1, sodium: 680, sugar: 2, servingSize: 1, servingUnit: 'serving', source: 'custom' },
  { name: 'Longsilog', calories: 580, protein: 24, carbs: 52, fat: 30, fiber: 1, sodium: 820, sugar: 5, servingSize: 1, servingUnit: 'serving', source: 'custom' },
  { name: 'Tocilog', calories: 560, protein: 22, carbs: 54, fat: 28, fiber: 1, sodium: 720, sugar: 8, servingSize: 1, servingUnit: 'serving', source: 'custom' },
  { name: 'Daing na Bangus', calories: 290, protein: 32, carbs: 2, fat: 17, fiber: 0, sodium: 580, sugar: 0, servingSize: 1, servingUnit: 'serving', source: 'custom' },
  { name: 'Pakbet', calories: 160, protein: 6, carbs: 12, fat: 9, fiber: 3, sodium: 380, sugar: 3, servingSize: 1, servingUnit: 'serving', source: 'custom' },
  { name: 'Steamed Rice (1 cup)', calories: 206, protein: 4, carbs: 45, fat: 0, fiber: 1, sodium: 2, sugar: 0, servingSize: 1, servingUnit: 'cup', source: 'custom' },
  { name: 'Pan de Sal', calories: 120, protein: 4, carbs: 22, fat: 2, fiber: 1, sodium: 180, sugar: 3, servingSize: 1, servingUnit: 'pc', source: 'custom' },
  { name: 'Halo-Halo', calories: 380, protein: 6, carbs: 72, fat: 10, fiber: 2, sodium: 120, sugar: 48, servingSize: 1, servingUnit: 'serving', source: 'custom' },
  { name: 'Leche Flan', calories: 280, protein: 8, carbs: 40, fat: 10, fiber: 0, sodium: 120, sugar: 36, servingSize: 1, servingUnit: 'serving', source: 'custom' },
  { name: 'Bibingka', calories: 320, protein: 6, carbs: 52, fat: 10, fiber: 1, sodium: 280, sugar: 20, servingSize: 1, servingUnit: 'pc', source: 'custom' },
  { name: 'Puto', calories: 110, protein: 3, carbs: 20, fat: 2, fiber: 0, sodium: 90, sugar: 6, servingSize: 2, servingUnit: 'pc', source: 'custom' },
];

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  let added = 0;
  let skipped = 0;

  for (const food of philippineFoods) {
    const exists = await Food.findOne({ name: food.name, createdBy: null });
    if (!exists) {
      await Food.create({ ...food, createdBy: null });
      console.log(`✓ Added: ${food.name}`);
      added++;
    } else {
      console.log(`- Skipped (exists): ${food.name}`);
      skipped++;
    }
  }

  console.log(`\nDone. Added: ${added}, Skipped: ${skipped}`);
  process.exit(0);
};

seed().catch(err => {
  console.error(err);
  process.exit(1);
});