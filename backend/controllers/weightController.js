const Weight = require('../models/Weight');
const User = require('../models/User');
const { deleteCloudinaryImage } = require('../utils/cloudinary');
const { calculateTDEE, calculateMacros } = require('../utils/calorieCalculator');

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

    // Newest entry by date drives the profile, so backdated logs don't override it
    const latest = await Weight.findOne({ user: req.user._id }).sort({ loggedAt: -1 });

    const user = await User.findById(req.user._id);
    let profile = null;

    if (user && latest) {
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

      profile = {
        currentWeight: user.currentWeight,
        dailyCalorieGoal: user.dailyCalorieGoal,
        dailyDeficit: deficit,
        minCalories: floor,
        macroGoals: user.macroGoals
      };
    }

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
    res.json({ message: 'Entry deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { logWeight, getWeightHistory, deleteWeightEntry };