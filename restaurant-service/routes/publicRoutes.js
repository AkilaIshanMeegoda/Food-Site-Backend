const express = require("express");
const router = express.Router();
const publicController = require('../controllers/publicController');

// Public routes for get all available restaurants
router.get("/restaurants", publicController.getRestaurants);
// Public route to get all available menu items for a restaurant
router.get("/restaurants/:id/menu-items", publicController.getMenuItemsByRestaurant);
//Public route to get a restaurant by ID
router.get("/restaurants/:id", publicController.getRestaurantById);
// Public route to get a available menu item
router.get("/menu-items/:id", publicController.viewItemDetail);
// Public route to get all available menu items for a restaurant by category /
router.get("/restaurants/:id/menu-items/category/:category", publicController.getMenuItemsByCategory);
// Public route to get all available menu items by category
router.get("/menu-items/category/:category", publicController.getAllMenuItemsByCategory);
// Public route to get all available menu items
router.get('/all-menu-items', publicController.getAllAvailableMenuItems);
module.exports = router;
