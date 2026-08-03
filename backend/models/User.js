const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  age: { type: Number },
  height: { type: Number },
  currentWeight: { type: Number },
  goalWeight: { type: Number },
  activityLevel: {
    type: String,
    enum: ['sedentary', 'light', 'moderate', 'active', 'very active'],
    default: 'sedentary'
  },
  dietPreference: { type: String },
  dailyCalorieGoal: { type: Number },
  macroGoals: {
    protein: { type: Number },
    carbs: { type: Number },
    fat: { type: Number }
  },
  avatarInitials: { type: String },
  resetToken: { type: String },
  resetTokenExpiry: { type: Date }
}, { timestamps: true });

userSchema.pre('save', async function () {
  if (this.isModified('name')) {
    const parts = this.name.trim().split(' ');
    this.avatarInitials = parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0][0].toUpperCase();
  }

  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
});

userSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);