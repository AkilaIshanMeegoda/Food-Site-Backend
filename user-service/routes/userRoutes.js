const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { verifyToken } = require("../middleware/authMiddleware");

// Public routes
router.post("/register", userController.registerUser);
router.post("/login", userController.loginUser);

// Protected routes
router.get("/profile", verifyToken, userController.getUserProfile);
router.get("/users/:userId/role", verifyToken, userController.getUserRole);
router.post("/register-restaurant-owner", verifyToken, userController.registerRestaurantOwner);
router.put("/users/:userId/role", verifyToken, userController.updateUserRole);

module.exports = router;
