const Order = require("../models/OrderModel");
const IOrderService = require("./IOrderService");

class OrderService extends IOrderService {
  async createOrder(orderData) {
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

    if (!customerId || !restaurantId || !items?.length) {
      throw new Error("Missing required fields");
    }

    const subAmount = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const totalAmount = (subAmount + 150 + (subAmount * 0.05)).toFixed(2);

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
      orderStatus: "pending",
      paymentStatus: "pending",
    });

    return await newOrder.save();
  }

  async updateOrder(orderId, updateData, user) {
    const order = await Order.findById(orderId);
    if (!order) throw new Error("Order not found");

    if (user.role === "customer" && user.id !== order.customerId) {
      throw new Error("Not authorized to update this order");
    }

    if (user.role === "restaurant" && user.id !== order.restaurantId) {
      throw new Error("Not authorized to update this order");
    }

    return await Order.findByIdAndUpdate(
      orderId,
      { $set: updateData },
      { new: true, runValidators: true }
    );
  }

  async getAllOrders(queryParams, user) {
    const filters = this._buildFilters(queryParams, user);
    
    const page = parseInt(queryParams.page) || 1;
    const limit = parseInt(queryParams.limit) || 10;
    const skip = (page - 1) * limit;

    const [orders, totalOrders] = await Promise.all([
      Order.find(filters)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Order.countDocuments(filters)
    ]);

    return {
      orders,
      totalOrders,
      totalPages: Math.ceil(totalOrders / limit),
      currentPage: page
    };
  }

  async getOrdersByCustomerId(customerId, queryParams, user) {
    const filters = { customerId, ...this._buildQueryFilters(queryParams) };
    return this._paginatedResults(filters, queryParams);
  }

  async getOrdersByRestaurantId(restaurantId, queryParams, user) {
    if (user.role === "restaurant" && user.id !== restaurantId) {
      throw new Error("Not authorized to view these orders");
    }

    const filters = { restaurantId, ...this._buildQueryFilters(queryParams) };
    return this._paginatedResults(filters, queryParams);
  }

  async getOrdersByPaymentStatus(status, queryParams, user) {
    const filters = { 
      paymentStatus: status,
      ...this._buildRoleBasedFilters(user),
      ...this._buildQueryFilters(queryParams)
    };
    return this._paginatedResults(filters, queryParams);
  }

  async getOrderById(orderId, user) {
    const order = await Order.findById(orderId);
    if (!order) throw new Error("Order not found");

    if (
      (user.role === "customer" && user.id !== order.customerId) ||
      (user.role === "restaurant" && user.id !== order.restaurantId)
    ) {
      throw new Error("Not authorized to view this order");
    }

    return order;
  }

  async updateOrderStatus(orderId, status, user) {
    const order = await Order.findById(orderId);
    if (!order) throw new Error("Order not found");

    if (user.role === "restaurant" && user.id !== order.restaurantId) {
      throw new Error("Not authorized to update this order status");
    }

    order.orderStatus = status;
    return await order.save();
  }

  async updatePaymentStatus(orderId, paymentStatus, user) {
    if (!["admin", "restaurant"].includes(user.role)) {
      throw new Error("Not authorized to update payment status");
    }

    const order = await Order.findById(orderId);
    if (!order) throw new Error("Order not found");

    order.paymentStatus = paymentStatus;
    return await order.save();
  }

  // Helper methods
  _buildFilters(queryParams, user) {
    const filters = this._buildQueryFilters(queryParams);
    
    if (user.role === "customer") {
      filters.customerId = user.id;
    } else if (user.role === "restaurant") {
      filters.restaurantId = user.id;
    }
    
    return filters;
  }

  _buildQueryFilters(queryParams) {
    const filters = {};
    const { orderStatus, paymentStatus, startDate, endDate, minAmount, maxAmount } = queryParams;

    if (orderStatus) filters.orderStatus = orderStatus;
    if (paymentStatus) filters.paymentStatus = paymentStatus;

    if (startDate || endDate) {
      filters.createdAt = {};
      if (startDate) filters.createdAt.$gte = new Date(startDate);
      if (endDate) filters.createdAt.$lte = new Date(endDate);
    }

    if (minAmount || maxAmount) {
      filters.totalAmount = {};
      if (minAmount) filters.totalAmount.$gte = Number(minAmount);
      if (maxAmount) filters.totalAmount.$lte = Number(maxAmount);
    }

    return filters;
  }

  async _paginatedResults(filters, queryParams) {
    const page = parseInt(queryParams.page) || 1;
    const limit = parseInt(queryParams.limit) || 10;
    const skip = (page - 1) * limit;

    const [orders, totalOrders] = await Promise.all([
      Order.find(filters).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Order.countDocuments(filters)
    ]);

    return {
      orders,
      totalOrders,
      totalPages: Math.ceil(totalOrders / limit),
      currentPage: page
    };
  }
}

module.exports = new OrderService();
