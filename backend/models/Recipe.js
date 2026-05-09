const mongoose = require('mongoose');

const recipeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true },
  ingredients: [
    {
      foodId: { type: mongoose.Schema.Types.ObjectId, ref: 'Food' },
      name: { type: String, required: true },
      quantity: { type: Number, required: true },
      unit: { type: String, default: 'g' },
      calories: { type: Number, default: 0 },
      protein: { type: Number, default: 0 },
      carbs: { type: Number, default: 0 },
      fat: { type: Number, default: 0 }
    }
  ],
  servings: { type: Number, default: 1 },
  totalCalories: { type: Number, default: 0 },
  totalProtein: { type: Number, default: 0 },
  totalCarbs: { type: Number, default: 0 },
  totalFat: { type: Number, default: 0 },
  notes: { type: String }
}, { timestamps: true });

recipeSchema.pre('save', async function () {
  this.totalCalories = this.ingredients.reduce((sum, i) => sum + i.calories, 0);
  this.totalProtein = this.ingredients.reduce((sum, i) => sum + i.protein, 0);
  this.totalCarbs = this.ingredients.reduce((sum, i) => sum + i.carbs, 0);
  this.totalFat = this.ingredients.reduce((sum, i) => sum + i.fat, 0);
});

module.exports = mongoose.model('Recipe', recipeSchema);