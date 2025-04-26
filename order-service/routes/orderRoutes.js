const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const { verifyToken } = require("../middleware/authMiddleware");

// Create a new order
router.post("/", verifyToken, orderController.createOrder);

// Create stripe (card) payments
router.post("/from-stripe", orderController.stripeOrder);

// Update an order
router.patch("/:id", verifyToken, orderController.updateOrder);

// Get all orders with filtering
router.get("/", verifyToken, orderController.getAllOrders);

// Get orders by customer ID
router.get("/customer/:customerId", verifyToken, orderController.getOrdersByCustomerId);

// Get orders by restaurant ID
router.get("/restaurant/:restaurantId", verifyToken, orderController.getOrdersByRestaurantId);

// Get orders by payment status
router.get("/payment/:status", verifyToken, orderController.getOrdersByPaymentStatus);

// Get single order by ID
router.get("/:id", verifyToken, orderController.getOrderById);

// Update order status
router.patch("/:id/status", verifyToken, orderController.updateOrderStatus);

// Update payment status
router.patch("/:id/payment", verifyToken, orderController.updatePaymentStatus);

module.exports = router;
