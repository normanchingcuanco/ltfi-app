const mongoose = require('mongoose');

const healthDailySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true }, // YYYY-MM-DD, the day the steps belong to
  steps: { type: Number, default: null },
  sleepMinutes: { type: Number, default: null }, // sleep that ended on this date
  source: { type: String, default: 'shortcut' },
  syncedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// One row per user per day, so every sync overwrites that day
healthDailySchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('HealthDaily', healthDailySchema);