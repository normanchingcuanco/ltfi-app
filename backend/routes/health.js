const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { syncAuth, generateToken, sync, getDay } = require('../controllers/healthController');

router.post('/token', protect, generateToken);
router.post('/sync', syncAuth, sync);
router.get('/', protect, getDay);

module.exports = router;