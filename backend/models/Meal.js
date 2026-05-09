const mongoose = require('mongoose');

const mealSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true }, // YYYY-MM-DD format
  mealType: {
    type: String,
    enum: ['breakfast', 'lunch', 'dinner', 'snacks'],
    required: true
  },
  foods: [
    {
      foodId: { type: mongoose.Schema.Types.ObjectId, ref: 'Food' },
      name: { type: String, required: true },
      quantity: { type: Number, required: true },
      unit: { type: String, default: 'g' },
      calories: { type: Number, required: true },
      protein: { type: Number, default: 0 },
      carbs: { type: Number, default: 0 },
      fat: { type: Number, default: 0 },
      fiber: { type: Number, default: 0 },
      sodium: { type: Number, default: 0 },
      sugar: { type: Number, default: 0 }
    }
  ],
  totalCalories: { type: Number, default: 0 }
}, { timestamps: true });

mealSchema.pre('save', async function () {
  this.totalCalories = this.foods.reduce((sum, food) => sum + food.calories, 0);
});

module.exports = mongoose.model('Meal', mealSchema);