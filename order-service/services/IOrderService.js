class IOrderService {
    async createOrder(orderData) {
      throw new Error("createOrder() not implemented");
    }
  
    async updateOrder(orderId, updateData, user) {
      throw new Error("updateOrder() not implemented");
    }
  
    async getAllOrders(queryParams, user) {
      throw new Error("getAllOrders() not implemented");
    }
  
    async getOrdersByCustomerId(customerId, queryParams, user) {
      throw new Error("getOrdersByCustomerId() not implemented");
    }
  
    async getOrdersByRestaurantId(restaurantId, queryParams, user) {
      throw new Error("getOrdersByRestaurantId() not implemented");
    }
  
    async getOrdersByPaymentStatus(status, queryParams, user) {
      throw new Error("getOrdersByPaymentStatus() not implemented");
    }
  
    async getOrderById(orderId, user) {
      throw new Error("getOrderById() not implemented");
    }
  
    async updateOrderStatus(orderId, status, user) {
      throw new Error("updateOrderStatus() not implemented");
    }
  
    async updatePaymentStatus(orderId, paymentStatus, user) {
      throw new Error("updatePaymentStatus() not implemented");
    }
  }
  
  module.exports = IOrderService;
  