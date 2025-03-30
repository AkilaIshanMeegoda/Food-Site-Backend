const express = require("express");
const router = express.Router();
const menuItemController = require("../controllers/menuItemController");
const { verifyRestaurantAdmin }  = require("../auth/middleware");

router.post("/", verifyRestaurantAdmin, menuItemController.createMenuItem);
router.get("/", verifyRestaurantAdmin, menuItemController.getMenuItems);
router.put("/:id", verifyRestaurantAdmin, menuItemController.updateMenuItem);
router.delete("/:id", verifyRestaurantAdmin, menuItemController.deleteMenuItem);

module.exports = router;
