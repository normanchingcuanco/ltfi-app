const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { calculateTDEE, calculateMacros } = require('../utils/calorieCalculator');

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

const register = async (req, res) => {
  try {
    const { name, email, password, age, height, currentWeight, goalWeight, activityLevel, dietPreference } = req.body;

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already registered' });

    const dailyCalorieGoal = calculateTDEE({ age, height, currentWeight, activityLevel });
    const macroGoals = calculateMacros(dailyCalorieGoal);

    const user = await User.create({
      name, email, password, age, height,
      currentWeight, goalWeight, activityLevel,
      dietPreference, dailyCalorieGoal, macroGoals
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      avatarInitials: user.avatarInitials,
      dailyCalorieGoal: user.dailyCalorieGoal,
      macroGoals: user.macroGoals,
      token: generateToken(user._id)
    });
  } catch (err) {
      console.error('REGISTER ERROR:', err);
      res.status(500).json({ message: err.message });
    }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const match = await user.comparePassword(password);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      avatarInitials: user.avatarInitials,
      dailyCalorieGoal: user.dailyCalorieGoal,
      macroGoals: user.macroGoals,
      token: generateToken(user._id)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { register, login, getMe };