const express = require("express");
const router = express.Router();
const restaurantController = require("../controllers/restaurantController");
const { verifyRestaurantAdmin } = require("../auth/middleware");

router.post("/", verifyRestaurantAdmin, restaurantController.createRestaurant);
router.get("/my-restaurant", verifyRestaurantAdmin, restaurantController.getRestaurant);
router.put("/:id", verifyRestaurantAdmin, restaurantController.updateRestaurant);

module.exports = router;
