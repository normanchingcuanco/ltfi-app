const Workout = require('../models/Workout');

const createWorkout = async (req, res) => {
  try {
    const { name, type, mode, intervals, rounds, repeat, warmUp, coolDown } = req.body;
    const workout = await Workout.create({
      user: req.user._id,
      name, type, mode, intervals, rounds, repeat, warmUp, coolDown
    });
    res.status(201).json(workout);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getWorkouts = async (req, res) => {
  try {
    const workouts = await Workout.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(workouts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getWorkout = async (req, res) => {
  try {
    const workout = await Workout.findOne({ _id: req.params.id, user: req.user._id });
    if (!workout) return res.status(404).json({ message: 'Workout not found' });
    res.json(workout);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateWorkout = async (req, res) => {
  try {
    const workout = await Workout.findOne({ _id: req.params.id, user: req.user._id });
    if (!workout) return res.status(404).json({ message: 'Workout not found' });
    const { name, type, mode, intervals, rounds, repeat, warmUp, coolDown } = req.body;
    if (name) workout.name = name;
    if (type) workout.type = type;
    if (mode) workout.mode = mode;
    if (intervals) workout.intervals = intervals;
    if (rounds) workout.rounds = rounds;
    if (repeat !== undefined) workout.repeat = repeat;
    if (warmUp !== undefined) workout.warmUp = warmUp;
    if (coolDown !== undefined) workout.coolDown = coolDown;
    await workout.save();
    res.json(workout);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deleteWorkout = async (req, res) => {
  try {
    const workout = await Workout.findOne({ _id: req.params.id, user: req.user._id });
    if (!workout) return res.status(404).json({ message: 'Workout not found' });
    await workout.deleteOne();
    res.json({ message: 'Workout deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const logWorkout = async (req, res) => {
  try {
    const workout = await Workout.findOne({ _id: req.params.id, user: req.user._id });
    if (!workout) return res.status(404).json({ message: 'Workout not found' });
    workout.caloriesBurned = req.body.caloriesBurned || 0;
    workout.completedAt = new Date();
    await workout.save();
    res.json(workout);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { createWorkout, getWorkouts, getWorkout, updateWorkout, deleteWorkout, logWorkout };