const express = require('express');
const router = express.Router();
const { getMeals, addFoodToMeal, removeFoodFromMeal, updateFoodInMeal, getDailySummary } = require('../controllers/mealController');
const { protect } = require('../middleware/auth');

router.use(express.json());
router.use(protect);

router.get('/', getMeals);
router.get('/summary', getDailySummary);
router.post('/', addFoodToMeal);
router.put('/:mealId/food/:foodId', updateFoodInMeal);
router.delete('/:mealId/food/:foodId', removeFoodFromMeal);

module.exports = router;