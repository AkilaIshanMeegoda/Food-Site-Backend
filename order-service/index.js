// order-backend.js

const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const jwt = require("jsonwebtoken");

const app = express();
const port = process.env.PORT || 5002;

// MongoDB connection
mongoose.connect(
  "mongodb+srv://foodApp:2001@cluster0.afkbz0b.mongodb.net/orders?retryWrites=true&w=majority&appName=Cluster0"
);

const OrderSchema = new mongoose.Schema(
  {
    customerId: { type: String, required: true },
    customerName: String,
    customerEmail: String,
    restaurantId: String,
    restaurantName: String,
    items: [
      {
        id: String,
        name: String,
        quantity: Number,
        price: Number,
      },
    ],
    orderStatus: { type: String, default: "pending" },
    totalAmount: Number,
    deliveryAddress: String,
    deliveryInstructions: String,
    paymentMethod: String,
    paymentStatus: { type: String, default: "pending" },
  },
  { timestamps: true }
);
const Order = mongoose.model("Order", OrderSchema);

// Middleware
app.use(bodyParser.json());
app.use(cors({ origin: "*" }));

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key";
function verifyToken(req, res, next) {
  const authHeader = req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ error: "Access denied. Missing or invalid token format" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
}

// 1. Create order endpoint
app.post("/api/order", verifyToken, async (req, res) => {
  try {
    const {
      customerId,
      customerName,
      customerEmail,
      restaurantId,
      restaurantName,
      items,
      deliveryAddress,
      deliveryInstructions,
      paymentMethod,
    } = req.body;

    // Validate required fields
    if (!customerId || !restaurantId || !items || !items.length) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // Calculate totalAmount by summing quantity * price for each item
    const totalAmount = items.reduce((sum, item) => {
      return sum + item.quantity * item.price;
    }, 0);

    // Create new order
    const newOrder = new Order({
      customerId,
      customerName,
      customerEmail,
      restaurantId,
      restaurantName,
      items,
      totalAmount,
      deliveryAddress,
      deliveryInstructions,
      paymentMethod,
      orderStatus: "false",
      paymentStatus: "pending",
    });

    const savedOrder = await newOrder.save();

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      order: savedOrder,
    });
  } catch (error) {
    console.error("Create order error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create order",
      error: error.message,
    });
  }
});

// 2. Update order endpoint (partial update)
app.patch("/api/order/:id", verifyToken, async (req, res) => {
  try {
    const orderId = req.params.id;
    const updateData = req.body;

    // Find the order first
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Check authorization (customer can only update their own orders)
    // Restaurant can update orders for their restaurant
    if (
      req.user.role === "customer" &&
      req.user.id !== order.customerId &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this order",
      });
    }

    if (
      req.user.role === "restaurant" &&
      req.user.id !== order.restaurantId &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this order",
      });
    }

    // Update only the fields that are provided
    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: "Order updated successfully",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Update order error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update order",
      error: error.message,
    });
  }
});

// 3. Get all orders with filtering
app.get("/api/orders", verifyToken, async (req, res) => {
  try {
    const filters = {};

    // Extract query parameters
    const {
      customerId,
      restaurantId,
      orderStatus,
      paymentStatus,
      startDate,
      endDate,
      minAmount,
      maxAmount,
    } = req.query;

    // Build filters object based on provided query parameters
    if (customerId) filters.customerId = customerId;
    if (restaurantId) filters.restaurantId = restaurantId;
    if (orderStatus) filters.orderStatus = orderStatus;
    if (paymentStatus) filters.paymentStatus = paymentStatus;

    // Date range filter
    if (startDate || endDate) {
      filters.createdAt = {};
      if (startDate) filters.createdAt.$gte = new Date(startDate);
      if (endDate) filters.createdAt.$lte = new Date(endDate);
    }

    // Amount range filter
    if (minAmount || maxAmount) {
      filters.totalAmount = {};
      if (minAmount) filters.totalAmount.$gte = Number(minAmount);
      if (maxAmount) filters.totalAmount.$lte = Number(maxAmount);
    }

    // Authorization check - limit results based on user role
    if (req.user.role === "customer") {
      // Customers can only see their own orders
      filters.customerId = req.user.id;
    } else if (req.user.role === "restaurant") {
      // Restaurants can only see orders for their restaurant
      filters.restaurantId = req.user.id;
    }
    // Admin can see all orders, so no additional filter needed

    // Execute query with pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const orders = await Order.find(filters)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const totalOrders = await Order.countDocuments(filters);

    res.status(200).json({
      success: true,
      count: orders.length,
      totalPages: Math.ceil(totalOrders / limit),
      currentPage: page,
      data: orders,
    });
  } catch (error) {
    console.error("Get orders error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
      error: error.message,
    });
  }
});

// 4. Get orders by customer ID
app.get("/api/orders/customer/:customerId", verifyToken, async (req, res) => {
  try {
    const { customerId } = req.params;

   

    // Additional filters
    const filters = { customerId };

    if (req.query.orderStatus) {
      filters.orderStatus = req.query.orderStatus;
    }

    if (req.query.paymentStatus) {
      filters.paymentStatus = req.query.paymentStatus;
    }

    // Date range filter
    if (req.query.startDate || req.query.endDate) {
      filters.createdAt = {};
      if (req.query.startDate)
        filters.createdAt.$gte = new Date(req.query.startDate);
      if (req.query.endDate)
        filters.createdAt.$lte = new Date(req.query.endDate);
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const orders = await Order.find(filters)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalOrders = await Order.countDocuments(filters);

    res.status(200).json({
      success: true,
      count: orders.length,
      totalPages: Math.ceil(totalOrders / limit),
      currentPage: page,
      data: orders,
    });
  } catch (error) {
    console.error("Get customer orders error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch customer orders",
      error: error.message,
    });
  }
});

// 5. Get orders by restaurant ID
app.get(
  "/api/orders/restaurant/:restaurantId",
  verifyToken,
  async (req, res) => {
    try {
      const { restaurantId } = req.params;

      // Authorization check
      if (req.user.role === "restaurant" && req.user.id !== restaurantId) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to view these orders",
        });
      }

      // Additional filters
      const filters = { restaurantId };

      if (req.query.orderStatus) {
        filters.orderStatus = req.query.orderStatus;
      }

      if (req.query.paymentStatus) {
        filters.paymentStatus = req.query.paymentStatus;
      }

      // Date range filter
      if (req.query.startDate || req.query.endDate) {
        filters.createdAt = {};
        if (req.query.startDate)
          filters.createdAt.$gte = new Date(req.query.startDate);
        if (req.query.endDate)
          filters.createdAt.$lte = new Date(req.query.endDate);
      }

      // Pagination
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const orders = await Order.find(filters)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const totalOrders = await Order.countDocuments(filters);

      res.status(200).json({
        success: true,
        count: orders.length,
        totalPages: Math.ceil(totalOrders / limit),
        currentPage: page,
        data: orders,
      });
    } catch (error) {
      console.error("Get restaurant orders error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch restaurant orders",
        error: error.message,
      });
    }
  }
);

// 6. Get orders by payment status
app.get("/api/orders/payment/:status", verifyToken, async (req, res) => {
  try {
    const { status } = req.params;

    // Build filters
    const filters = { paymentStatus: status };

    // Authorization check - limit results based on user role
    if (req.user.role === "customer") {
      // Customers can only see their own orders
      filters.customerId = req.user.id;
    } else if (req.user.role === "restaurant") {
      // Restaurants can only see orders for their restaurant
      filters.restaurantId = req.user.id;
    }

    // Additional filters
    if (req.query.orderStatus) {
      filters.orderStatus = req.query.orderStatus;
    }

    // Date range filter
    if (req.query.startDate || req.query.endDate) {
      filters.createdAt = {};
      if (req.query.startDate)
        filters.createdAt.$gte = new Date(req.query.startDate);
      if (req.query.endDate)
        filters.createdAt.$lte = new Date(req.query.endDate);
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const orders = await Order.find(filters)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalOrders = await Order.countDocuments(filters);

    res.status(200).json({
      success: true,
      count: orders.length,
      totalPages: Math.ceil(totalOrders / limit),
      currentPage: page,
      data: orders,
    });
  } catch (error) {
    console.error("Get orders by payment status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders by payment status",
      error: error.message,
    });
  }
});

// 7. Get single order by ID
app.get("/api/orders/:id", verifyToken, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Authorization check
    if (
      req.user.role === "customer" &&
      req.user.id !== order.customerId &&
      req.user.role === "restaurant" &&
      req.user.id !== order.restaurantId &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this order",
      });
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error("Get order error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch order",
      error: error.message,
    });
  }
});

// 8. Update order status
app.patch("/api/orders/:id/status", verifyToken, async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Authorization check
    if (
      req.user.role === "restaurant" &&
      req.user.id !== order.restaurantId &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this order status",
      });
    }

    // Update status
    order.orderStatus = status;
    await order.save();

    res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      data: order,
    });
  } catch (error) {
    console.error("Update order status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update order status",
      error: error.message,
    });
  }
});

// 9. Update payment status
app.patch("/api/orders/:id/payment", verifyToken, async (req, res) => {
  try {
    const { paymentStatus } = req.body;

    if (!paymentStatus) {
      return res.status(400).json({
        success: false,
        message: "Payment status is required",
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Authorization check - only admin or restaurant can update payment status
    if (req.user.role !== "admin" && req.user.role !== "restaurant") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update payment status",
      });
    }

    // Update payment status
    order.paymentStatus = paymentStatus;
    await order.save();

    res.status(200).json({
      success: true,
      message: "Payment status updated successfully",
      data: order,
    });
  } catch (error) {
    console.error("Update payment status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update payment status",
      error: error.message,
    });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Order service running on port ${port}`);
});

module.exports = app;
