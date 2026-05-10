const express = require('express');
const router = express.Router();
const { scanFoodImage } = require('../controllers/aiScanController');
const { protect } = require('../middleware/auth');

router.post('/', (req, res, next) => {
  console.log('Content-Length:', req.headers['content-length']);
  next();
}, express.json({ limit: '20mb' }), protect, scanFoodImage);

module.exports = router;