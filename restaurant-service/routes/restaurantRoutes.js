const express = require("express");
const router = express.Router();
const restaurantController = require("../controllers/restaurantController");
const { verifyRestaurantAdmin, verifyCustomer, verifySuperAdmin } = require("../auth/middleware");

router.post("/", verifyCustomer, restaurantController.createRestaurant);
router.get("/my-restaurant", verifyRestaurantAdmin, restaurantController.getRestaurant);
router.get("/all-restaurants", verifySuperAdmin, restaurantController.getAllRestaurants);
router.patch("/:id", verifyRestaurantAdmin, restaurantController.updateRestaurant);
router.patch("/update/:id", verifySuperAdmin, restaurantController.updateRestaurantByAdmin);

module.exports = router;
