const express = require('express');
const router = express.Router();
const { createWorkout, getWorkouts, getWorkout, updateWorkout, deleteWorkout, logWorkout } = require('../controllers/workoutController');
const { protect } = require('../middleware/auth');

router.use(express.json());
router.use(protect);
router.get('/', getWorkouts);
router.get('/:id', getWorkout);
router.post('/', createWorkout);
router.put('/:id', updateWorkout);
router.delete('/:id', deleteWorkout);
router.post('/:id/log', logWorkout);

module.exports = router;