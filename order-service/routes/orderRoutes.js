const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const { verifyToken } = require("../middleware/authMiddleware");

// Create a new order
router.post("/order", verifyToken, orderController.createOrder);

// Create stripe (card) payments
router.post("/order/from-stripe", orderController.stripeOrder);

// Update an order
router.patch("/order/:id", verifyToken, orderController.updateOrder);

// Get all orders with filtering
router.get("/orders", verifyToken, orderController.getAllOrders);

// Get orders by customer ID
router.get("/orders/customer/:customerId", verifyToken, orderController.getOrdersByCustomerId);

// Get orders by restaurant ID
router.get("/orders/restaurant/:restaurantId", verifyToken, orderController.getOrdersByRestaurantId);

// Get orders by payment status
router.get("/orders/payment/:status", verifyToken, orderController.getOrdersByPaymentStatus);

// Get single order by ID
router.get("/orders/:id", verifyToken, orderController.getOrderById);

// Update order status
router.patch("/orders/:id/status", verifyToken, orderController.updateOrderStatus);

// Update payment status
router.patch("/orders/:id/payment", verifyToken, orderController.updatePaymentStatus);

module.exports = router;
