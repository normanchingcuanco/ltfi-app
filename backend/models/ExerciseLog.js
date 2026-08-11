const mongoose = require('mongoose');

const setSchema = new mongoose.Schema({
  setNumber: { type: Number, required: true },
  weight: { type: Number, default: 0 },
  reps: { type: Number, default: 0 },
  notes: { type: String, default: '' }
}, { _id: false });

const exerciseLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  exercise: { type: String, required: true, trim: true },
  date: { type: String, required: true },
  week: { type: Number },
  sets: [setSchema],
  notes: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('ExerciseLog', exerciseLogSchema);