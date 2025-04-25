class IRestaurantService {
    async createRestaurant(adminId, data) {
      throw new Error("createRestaurant() not implemented");
    }
  
    async getRestaurant(adminId) {
      throw new Error("getRestaurant() not implemented");
    }
  
    async updateRestaurant(restaurantId, adminId, data) {
      throw new Error("updateRestaurant() not implemented");
    }
  
    async getActiveRestaurants() {
      throw new Error("getActiveRestaurants() not implemented");
    }
  
    async getRestaurantById(id) {
      throw new Error("getRestaurantById() not implemented");
    }
  
    async getAllRestaurants() {
      throw new Error("getAllRestaurants() not implemented");
    }
  
    async updateRestaurantByAdmin(restaurantId, data) {
      throw new Error("updateRestaurantByAdmin() not implemented");
    }
  }
  
  module.exports = IRestaurantService;