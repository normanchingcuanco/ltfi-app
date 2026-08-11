const Weight = require('../models/Weight');
const { deleteCloudinaryImage } = require('../utils/cloudinary');

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

    res.status(201).json(entry);
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