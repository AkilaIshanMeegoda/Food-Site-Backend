const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken } = require('../middleware/authMiddleware');

// Public routes
router.post('/register', userController.register);
router.post('/login', userController.login);

// Protected routes
router.get('/profile', verifyToken, userController.getProfile);
router.get('/:userId/role', verifyToken, userController.getUserRole);
router.post('/register-restaurant-owner', verifyToken, userController.registerRestaurantOwner);
router.put('/:userId/role', verifyToken, userController.updateUserRole);

module.exports = router;
