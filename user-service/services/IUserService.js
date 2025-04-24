class IUserService {
    async registerUser(userData) {
      throw new Error("registerUser() not implemented");
    }
  
    async loginUser(credentials) {
      throw new Error("loginUser() not implemented");
    }
  
    async getUserProfile(userId) {
      throw new Error("getUserProfile() not implemented");
    }
  
    async getUserRole(userId) {
      throw new Error("getUserRole() not implemented");
    }
  
    async registerRestaurantOwner(userId, restaurantData, token) {
      throw new Error("registerRestaurantOwner() not implemented");
    }
  
    async updateUserRole(userId, role) {
      throw new Error("updateUserRole() not implemented");
    }
  }
  
  module.exports = IUserService;
  