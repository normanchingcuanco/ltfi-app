const mongoose = require('mongoose');

const weightSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  weight: { type: Number, required: true },
  notes: { type: String },
  loggedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Weight', weightSchema);