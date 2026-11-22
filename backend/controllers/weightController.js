const Weight = require('../models/Weight');
const User = require('../models/User');
const { deleteCloudinaryImage } = require('../utils/cloudinary');
const { calculateTDEE, calculateMacros } = require('../utils/calorieCalculator');

// Sets the profile weight to the newest weigh-in by date and recalculates goals.
// Returns the updated profile fields, or null if there is nothing to sync.
const syncProfileToLatest = async (userId) => {
  const latest = await Weight.findOne({ user: userId }).sort({ loggedAt: -1 });
  const user = await User.findById(userId);
  if (!user || !latest) return null;

  user.currentWeight = latest.weight;

  const maintenance = calculateTDEE({
    age: user.age,
    height: user.height,
    currentWeight: user.currentWeight,
    activityLevel: user.activityLevel,
    gender: user.gender
  });

  const deficit = user.dailyDeficit || 500;
  const floor = user.minCalories || 1200;
  const losing = user.goalWeight && user.currentWeight > user.goalWeight;
  const target = losing ? Math.max(maintenance - deficit, floor) : maintenance;

  user.dailyCalorieGoal = maintenance;
  user.macroGoals = calculateMacros(target);
  await user.save();

  return {
    currentWeight: user.currentWeight,
    dailyCalorieGoal: user.dailyCalorieGoal,
    dailyDeficit: deficit,
    minCalories: floor,
    macroGoals: user.macroGoals
  };
};

const logWeight = async (req, res) => {
  try {
    const { weight, notes, loggedAt, photoUrl, photoPublicId } = req.body;

    const entry = await Weight.create({
      user: req.user._id,
      weight,
      notes,
      photoUrl,
      photoPublicId,
      loggedAt: loggedAt || Date.now()
    });

    const profile = await syncProfileToLatest(req.user._id);

    res.status(201).json({ ...entry.toObject(), profile });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getWeightHistory = async (req, res) => {
  try {
    const entries = await Weight.find({ user: req.user._id })
      .sort({ loggedAt: 1 })
      .limit(200);

    res.json(entries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deleteWeightEntry = async (req, res) => {
  try {
    const entry = await Weight.findOne({ _id: req.params.id, user: req.user._id });
    if (!entry) return res.status(404).json({ message: 'Entry not found' });

    if (entry.photoPublicId) {
      await deleteCloudinaryImage(entry.photoPublicId);
    }

    await entry.deleteOne();

    const profile = await syncProfileToLatest(req.user._id);

    res.json({ message: 'Entry deleted', profile });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { logWeight, getWeightHistory, deleteWeightEntry };