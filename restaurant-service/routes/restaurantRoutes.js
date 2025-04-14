const express = require("express");
const router = express.Router();
const restaurantController = require("../controllers/restaurantController");
const { verifyRestaurantAdmin, verifyCustomer } = require("../auth/middleware");

router.post("/", verifyCustomer, restaurantController.createRestaurant);
router.get("/my-restaurant", verifyRestaurantAdmin, restaurantController.getRestaurant);
router.patch("/:id", verifyRestaurantAdmin, restaurantController.updateRestaurant);

module.exports = router;
