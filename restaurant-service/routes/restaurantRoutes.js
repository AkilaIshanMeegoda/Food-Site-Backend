const express = require("express");
const router = express.Router();
const restaurantController = require("../controllers/restaurantController");
const { verifyRestaurantAdmin, verifyCustomer, verifySuperAdmin } = require("../auth/middleware");

// route for create a restaurant by a customer
router.post("/", verifyCustomer, restaurantController.createRestaurant);
// route for get a restaurant by a restaurant owner
router.get("/my-restaurant", verifyRestaurantAdmin, restaurantController.getRestaurant);
// route for get all restaurants by a super admin
router.get("/all-restaurants", verifySuperAdmin, restaurantController.getAllRestaurants);
// route for update a restaurant by a restaurant owner
router.patch("/:id", verifyRestaurantAdmin, restaurantController.updateRestaurant);
// routee for update a restaurant by a super admin
router.patch("/update/:id", verifySuperAdmin, restaurantController.updateRestaurantByAdmin);

module.exports = router;
