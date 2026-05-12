const mongoose = require('mongoose');

const workoutSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['HIIT', 'Tabata', 'circuit', 'custom'], default: 'custom' },
  intervals: [
    {
      name: { type: String, required: true },
      workSeconds: { type: Number, required: true },
      restSeconds: { type: Number, required: true }
    }
  ],
  rounds: { type: Number, default: 1 },
  caloriesBurned: { type: Number, default: 0 },
  completedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Workout', workoutSchema);