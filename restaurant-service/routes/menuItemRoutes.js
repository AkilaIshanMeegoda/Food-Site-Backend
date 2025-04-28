const express = require("express");
const router = express.Router();
const menuItemController = require("../controllers/menuItemController");
// verifyRestaurantAdmin middleware is used to protect the routes
const { verifyRestaurantAdmin }  = require("../auth/middleware");

// create a new menu item
router.post("/", verifyRestaurantAdmin, menuItemController.createMenuItem);
// view a menu item
router.get("/:id", verifyRestaurantAdmin, menuItemController.viewMenuItem);
// get all menu items
router.get("/", verifyRestaurantAdmin, menuItemController.getMenuItems);
// update a menu item
router.put("/:id", verifyRestaurantAdmin, menuItemController.updateMenuItem);
// delete a menu item
router.delete("/:id", verifyRestaurantAdmin, menuItemController.deleteMenuItem);

module.exports = router;
