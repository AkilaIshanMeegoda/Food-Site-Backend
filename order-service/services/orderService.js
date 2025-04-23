const Order = require("../models/OrderModel");

// Create a new order
exports.createOrder = async (orderData) => {
  const {
    customerId,
    customerName,
    customerEmail,
    customerPhone,
    restaurantId,
    restaurantName,
    items,
    deliveryAddress,
    deliveryInstructions,
    paymentMethod,
  } = orderData;

  // Validate required fields
  if (!customerId || !restaurantId || !items || !items.length) {
    throw new Error("Missing required fields");
  }

  const subAmount = items.reduce((sum, item) => {
    return sum + item.quantity * item.price;
  }, 0);
  
  const totalAmount = (subAmount + 150 + (subAmount * 5 / 100)).toFixed(2);

  // Create new order
  const newOrder = new Order({
    customerId,
    customerName,
    customerEmail,
    customerPhone,
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

  return await newOrder.save();
};

// Update an order
exports.updateOrder = async (orderId, updateData, user) => {
  // Find the order first
  const order = await Order.findById(orderId);
  if (!order) {
    throw new Error("Order not found");
  }

  // Check authorization (customer can only update their own orders)
  // Restaurant can update orders for their restaurant
  if (
    user.role === "customer" &&
    user.id !== order.customerId &&
    user.role !== "admin"
  ) {
    throw new Error("Not authorized to update this order");
  }

  if (
    user.role === "restaurant" &&
    user.id !== order.restaurantId &&
    user.role !== "admin"
  ) {
    throw new Error("Not authorized to update this order");
  }

  // Update only the fields that are provided
  return await Order.findByIdAndUpdate(
    orderId,
    { $set: updateData },
    { new: true, runValidators: true }
  );
};

// Get all orders with filtering
exports.getAllOrders = async (queryParams, user) => {
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
    page = 1,
    limit = 10
  } = queryParams;

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
  if (user.role === "customer") {
    // Customers can only see their own orders
    filters.customerId = user.id;
  } else if (user.role === "restaurant") {
    // Restaurants can only see orders for their restaurant
    filters.restaurantId = user.id;
  }
  // Admin can see all orders, so no additional filter needed

  // Pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const pageLimit = parseInt(limit);

  const orders = await Order.find(filters)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(pageLimit);

  // Get total count for pagination
  const totalOrders = await Order.countDocuments(filters);

  return {
    orders,
    totalOrders,
    totalPages: Math.ceil(totalOrders / pageLimit),
    currentPage: parseInt(page)
  };
};

// Get orders by customer ID
exports.getOrdersByCustomerId = async (customerId, queryParams, user) => {
  // Additional filters
  const filters = { customerId };

  if (queryParams.orderStatus) {
    filters.orderStatus = queryParams.orderStatus;
  }

  if (queryParams.paymentStatus) {
    filters.paymentStatus = queryParams.paymentStatus;
  }

  // Date range filter
  if (queryParams.startDate || queryParams.endDate) {
    filters.createdAt = {};
    if (queryParams.startDate)
      filters.createdAt.$gte = new Date(queryParams.startDate);
    if (queryParams.endDate)
      filters.createdAt.$lte = new Date(queryParams.endDate);
  }

  // Pagination
  const page = parseInt(queryParams.page) || 1;
  const limit = parseInt(queryParams.limit) || 10;
  const skip = (page - 1) * limit;

  const orders = await Order.find(filters)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalOrders = await Order.countDocuments(filters);

  return {
    orders,
    totalOrders,
    totalPages: Math.ceil(totalOrders / limit),
    currentPage: page
  };
};

// Get orders by restaurant ID
exports.getOrdersByRestaurantId = async (restaurantId, queryParams, user) => {
  // Authorization check
  if (user.role === "restaurant" && user.id !== restaurantId) {
    throw new Error("Not authorized to view these orders");
  }

  // Additional filters
  const filters = { restaurantId };

  if (queryParams.orderStatus) {
    filters.orderStatus = queryParams.orderStatus;
  }

  if (queryParams.paymentStatus) {
    filters.paymentStatus = queryParams.paymentStatus;
  }

  // Date range filter
  if (queryParams.startDate || queryParams.endDate) {
    filters.createdAt = {};
    if (queryParams.startDate)
      filters.createdAt.$gte = new Date(queryParams.startDate);
    if (queryParams.endDate)
      filters.createdAt.$lte = new Date(queryParams.endDate);
  }

  // Pagination
  const page = parseInt(queryParams.page) || 1;
  const limit = parseInt(queryParams.limit) || 10;
  const skip = (page - 1) * limit;

  const orders = await Order.find(filters)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalOrders = await Order.countDocuments(filters);

  return {
    orders,
    totalOrders,
    totalPages: Math.ceil(totalOrders / limit),
    currentPage: page
  };
};

// Get orders by payment status
exports.getOrdersByPaymentStatus = async (status, queryParams, user) => {
  // Build filters
  const filters = { paymentStatus: status };

  // Authorization check - limit results based on user role
  if (user.role === "customer") {
    // Customers can only see their own orders
    filters.customerId = user.id;
  } else if (user.role === "restaurant") {
    // Restaurants can only see orders for their restaurant
    filters.restaurantId = user.id;
  }

  // Additional filters
  if (queryParams.orderStatus) {
    filters.orderStatus = queryParams.orderStatus;
  }

  // Date range filter
  if (queryParams.startDate || queryParams.endDate) {
    filters.createdAt = {};
    if (queryParams.startDate)
      filters.createdAt.$gte = new Date(queryParams.startDate);
    if (queryParams.endDate)
      filters.createdAt.$lte = new Date(queryParams.endDate);
  }

  // Pagination
  const page = parseInt(queryParams.page) || 1;
  const limit = parseInt(queryParams.limit) || 10;
  const skip = (page - 1) * limit;

  const orders = await Order.find(filters)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalOrders = await Order.countDocuments(filters);

  return {
    orders,
    totalOrders,
    totalPages: Math.ceil(totalOrders / limit),
    currentPage: page
  };
};

// Get single order by ID
exports.getOrderById = async (orderId, user) => {
  const order = await Order.findById(orderId);

  if (!order) {
    throw new Error("Order not found");
  }

  // Authorization check
  if (
    user.role === "customer" &&
    user.id !== order.customerId &&
    user.role === "restaurant" &&
    user.id !== order.restaurantId &&
    user.role !== "admin"
  ) {
    throw new Error("Not authorized to view this order");
  }

  return order;
};

// Update order status
exports.updateOrderStatus = async (orderId, status, user) => {
  if (!status) {
    throw new Error("Status is required");
  }

  const order = await Order.findById(orderId);

  if (!order) {
    throw new Error("Order not found");
  }

  // Authorization check
  if (
    user.role === "restaurant" &&
    user.id !== order.restaurantId &&
    user.role !== "admin"
  ) {
    throw new Error("Not authorized to update this order status");
  }

  // Update status
  order.orderStatus = status;
  return await order.save();
};

// Update payment status
exports.updatePaymentStatus = async (orderId, paymentStatus, user) => {
  if (!paymentStatus) {
    throw new Error("Payment status is required");
  }

  const order = await Order.findById(orderId);

  if (!order) {
    throw new Error("Order not found");
  }

  // Authorization check - only admin or restaurant can update payment status
  if (user.role !== "admin" && user.role !== "restaurant") {
    throw new Error("Not authorized to update payment status");
  }

  // Update payment status
  order.paymentStatus = paymentStatus;
  return await order.save();
};
