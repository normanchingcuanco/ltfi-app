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
      .limit(200);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const EPOCH = new Date('2025-01-01');

const calendarWeek = (dateStr) => {
  const d = new Date(dateStr);
  const diffDays = Math.floor((d - EPOCH) / (24 * 60 * 60 * 1000));
  return Math.floor(diffDays / 7) + 1;
};

const mondayOf = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  return d;
};

const weeksBetween = (dateStr1, dateStr2) => {
  const m1 = mondayOf(dateStr1);
  const m2 = mondayOf(dateStr2);
  return Math.round((m2 - m1) / (7 * 24 * 60 * 60 * 1000));
};

const logExercise = async (req, res) => {
  try {
    const { exercise, date, sets, notes, weekOverride } = req.body;

    const existing = await ExerciseLog.findOne({
      user: req.user._id, exercise, date
    });

    if (existing) {
      existing.sets = sets;
      existing.notes = notes;
      if (weekOverride !== undefined && weekOverride !== null) {
        existing.week = weekOverride;
      }
      await existing.save();
      return res.json(existing);
    }

    let week;
    if (weekOverride !== undefined && weekOverride !== null) {
      week = weekOverride;
    } else {
      const previous = await ExerciseLog.findOne({
        user: req.user._id, exercise
      }).sort({ date: -1 });

      if (previous) {
        const elapsed = weeksBetween(previous.date, date);
        week = previous.week + Math.max(elapsed, 0);
      } else {
        week = calendarWeek(date);
      }
    }

    const log = await ExerciseLog.create({
      user: req.user._id, exercise, date, week, sets, notes
    });
    res.status(201).json(log);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateExerciseLog = async (req, res) => {
  try {
    const { sets, notes, week } = req.body;
    const log = await ExerciseLog.findById(req.params.id);
    if (!log) return res.status(404).json({ message: 'Log not found' });
    if (log.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    if (sets !== undefined) log.sets = sets;
    if (notes !== undefined) log.notes = notes;
    if (week !== undefined) log.week = week;
    await log.save();
    res.json(log);
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

const deleteExerciseByName = async (req, res) => {
  try {
    const { exercise } = req.params;
    await ExerciseLog.deleteMany({ user: req.user._id, exercise });
    res.json({ message: 'Exercise deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getExercises, getExerciseLogs, logExercise, updateExerciseLog, deleteExerciseLog, deleteExerciseByName };