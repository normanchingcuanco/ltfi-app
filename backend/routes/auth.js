const express = require('express');
const router = express.Router();
const {
  register, login, getMe, updateProfile, forgotPassword, resetPassword,
  deleteMe, adminListUsers, adminDeleteUser
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.use(express.json());
router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/delete-account', protect, deleteMe);
router.get('/admin/users', protect, adminListUsers);
router.delete('/admin/users/:id', protect, adminDeleteUser);

module.exports = router;