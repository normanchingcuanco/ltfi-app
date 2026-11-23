const crypto = require('crypto');
const User = require('../models/User');
const HealthDaily = require('../models/HealthDaily');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const hash = (t) => crypto.createHash('sha256').update(t).digest('hex');

const todayFor = (tz) => {
  try {
    return new Date().toLocaleDateString('en-CA', { timeZone: tz || 'Asia/Manila' });
  } catch {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
  }
};

// Auth for the Shortcut only. Header: x-health-token
const syncAuth = async (req, res, next) => {
  try {
    const token = req.headers['x-health-token'];
    if (!token) return res.status(401).json({ message: 'Not authorized' });
    const user = await User.findOne({ healthSyncTokenHash: hash(token) });
    if (!user) return res.status(401).json({ message: 'Not authorized' });
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Not authorized' });
  }
};

// POST /api/health/token (logged in). Shows the token once, replaces any old one.
const generateToken = async (req, res) => {
  try {
    const token = crypto.randomBytes(32).toString('hex');
    await User.findByIdAndUpdate(req.user._id, { healthSyncTokenHash: hash(token) });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/health/sync (sync token). Body: { date?, steps?, sleepMinutes? }
const sync = async (req, res) => {
  try {
    const { date, steps, sleepMinutes } = req.body;
    const day = date || todayFor(req.user.timezone);
    if (!DATE_RE.test(day)) {
      return res.status(400).json({ message: 'date must be YYYY-MM-DD' });
    }

    const set = { syncedAt: new Date() };

    if (steps !== undefined && steps !== null && steps !== '') {
      const n = Number(steps);
      if (!Number.isFinite(n) || n < 0) {
        return res.status(400).json({ message: 'steps must be a number' });
      }
      set.steps = Math.round(n);
    }

    if (sleepMinutes !== undefined && sleepMinutes !== null && sleepMinutes !== '') {
      const n = Number(sleepMinutes);
      if (!Number.isFinite(n) || n < 0) {
        return res.status(400).json({ message: 'sleepMinutes must be a number' });
      }
      set.sleepMinutes = Math.round(n);
    }

    if (set.steps === undefined && set.sleepMinutes === undefined) {
      return res.status(400).json({ message: 'Send steps or sleepMinutes' });
    }

    const doc = await HealthDaily.findOneAndUpdate(
      { user: req.user._id, date: day },
      { $set: set },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json({ date: doc.date, steps: doc.steps, sleepMinutes: doc.sleepMinutes });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/health?date=YYYY-MM-DD (logged in). Defaults to today.
const getDay = async (req, res) => {
  try {
    const day = req.query.date || todayFor(req.user.timezone);
    if (!DATE_RE.test(day)) {
      return res.status(400).json({ message: 'date must be YYYY-MM-DD' });
    }
    const doc = await HealthDaily.findOne({ user: req.user._id, date: day });
    res.json({
      date: day,
      steps: doc ? doc.steps : null,
      sleepMinutes: doc ? doc.sleepMinutes : null,
      syncedAt: doc ? doc.syncedAt : null
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { syncAuth, generateToken, sync, getDay };