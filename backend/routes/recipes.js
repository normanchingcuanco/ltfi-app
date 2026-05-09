const express = require('express');
const router = express.Router();
const { createRecipe, getRecipes, getRecipe, updateRecipe, deleteRecipe } = require('../controllers/recipeController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', getRecipes);
router.get('/:id', getRecipe);
router.post('/', createRecipe);
router.put('/:id', updateRecipe);
router.delete('/:id', deleteRecipe);

module.exports = router;