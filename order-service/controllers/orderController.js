const orderService = require("../services/orderService");

// Create a new order
exports.createOrder = async (req, res) => {
  try {
    const savedOrder = await orderService.createOrder(req.body);

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
};

// Update an order
exports.updateOrder = async (req, res) => {
  try {
    const orderId = req.params.id;
    const updateData = req.body;
    
    const updatedOrder = await orderService.updateOrder(orderId, updateData, req.user);

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
};

// Get all orders
exports.getAllOrders = async (req, res) => {
  try {
    const result = await orderService.getAllOrders(req.query, req.user);

    res.status(200).json({
      success: true,
      count: result.orders.length,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
      data: result.orders,
    });
  } catch (error) {
    console.error("Get orders error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
      error: error.message,
    });
  }
};

// Get orders by customer ID
exports.getOrdersByCustomerId = async (req, res) => {
  try {
    const { customerId } = req.params;
    
    const result = await orderService.getOrdersByCustomerId(customerId, req.query, req.user);

    res.status(200).json({
      success: true,
      count: result.orders.length,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
      data: result.orders,
    });
  } catch (error) {
    console.error("Get customer orders error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch customer orders",
      error: error.message,
    });
  }
};

// Get orders by restaurant ID
exports.getOrdersByRestaurantId = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    
    const result = await orderService.getOrdersByRestaurantId(restaurantId, req.query, req.user);

    res.status(200).json({
      success: true,
      count: result.orders.length,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
      data: result.orders,
    });
  } catch (error) {
    console.error("Get restaurant orders error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch restaurant orders",
      error: error.message,
    });
  }
};

// Get orders by payment status
exports.getOrdersByPaymentStatus = async (req, res) => {
  try {
    const { status } = req.params;
    
    const result = await orderService.getOrdersByPaymentStatus(status, req.query, req.user);

    res.status(200).json({
      success: true,
      count: result.orders.length,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
      data: result.orders,
    });
  } catch (error) {
    console.error("Get orders by payment status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders by payment status",
      error: error.message,
    });
  }
};

// Get single order by ID
exports.getOrderById = async (req, res) => {
  try {
    const order = await orderService.getOrderById(req.params.id, req.user);

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
};

// Update order status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    const order = await orderService.updateOrderStatus(req.params.id, status, req.user);

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
};

// Update payment status
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { paymentStatus } = req.body;
    
    const order = await orderService.updatePaymentStatus(req.params.id, paymentStatus, req.user);

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
};
