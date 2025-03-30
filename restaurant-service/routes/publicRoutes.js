const express = require("express");
const router = express.Router();
const publicController = require('../controllers/publicController');


router.get("/restaurants", publicController.getRestaurants);

router.get("/restaurants/:id/menu-items", publicController.getMenuItemsByRestaurant);

router.get("/restaurants/:id", publicController.getRestaurantById);

router.get("/restaurants/:id/menu-items/category/:category", publicController.getMenuItemsByCategory);

router.get("/menu-items/category/:category", publicController.getMenuItemsByCategory);

module.exports = router;
