const ExerciseLog = require('../models/ExerciseLog');

const getExercises = async (req, res) => {
  try {
    const logs = await ExerciseLog.find({ user: req.user._id })
      .sort({ updatedAt: -1 });
    const exerciseMap = new Map();
    logs.forEach(log => {
      if (!exerciseMap.has(log.exercise)) {
        exerciseMap.set(log.exercise, log);
      }
    });
    res.json(Array.from(exerciseMap.values()));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getExerciseLogs = async (req, res) => {
  try {
    const { exercise } = req.params;
    const logs = await ExerciseLog.find({ user: req.user._id, exercise })
      .sort({ date: -1 })
      .limit(20);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const logExercise = async (req, res) => {
  try {
    const { exercise, date, week, sets, notes } = req.body;
    const existing = await ExerciseLog.findOne({
      user: req.user._id, exercise, date
    });
    if (existing) {
      existing.sets = sets;
      existing.notes = notes;
      existing.week = week;
      await existing.save();
      return res.json(existing);
    }
    const log = await ExerciseLog.create({
      user: req.user._id, exercise, date, week, sets, notes
    });
    res.status(201).json(log);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deleteExerciseLog = async (req, res) => {
  try {
    const log = await ExerciseLog.findById(req.params.id);
    if (!log) return res.status(404).json({ message: 'Log not found' });
    if (log.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    await log.deleteOne();
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getExercises, getExerciseLogs, logExercise, deleteExerciseLog };