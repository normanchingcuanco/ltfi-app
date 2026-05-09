const mongoose = require('mongoose');

const foodSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  barcode: { type: String },
  calories: { type: Number, required: true },
  protein: { type: Number, default: 0 },
  carbs: { type: Number, default: 0 },
  fat: { type: Number, default: 0 },
  fiber: { type: Number, default: 0 },
  sodium: { type: Number, default: 0 },
  sugar: { type: Number, default: 0 },
  servingSize: { type: Number, default: 100 },
  servingUnit: { type: String, default: 'g' },
  source: { type: String, enum: ['open_food_facts', 'ai_scan', 'custom'], default: 'custom' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

module.exports = mongoose.model('Food', foodSchema);