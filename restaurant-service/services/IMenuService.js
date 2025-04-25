// Defines the interface for menu item operations
class IMenuItemService {
    async createMenuItem(adminId, data) {
      throw new Error("createMenuItem() not implemented");
    }
  
    async getMenuItems(adminId) {
      throw new Error("getMenuItems() not implemented");
    }
  
    async updateMenuItem(menuItemId, adminId, data) {
      throw new Error("updateMenuItem() not implemented");
    }
  
    async deleteMenuItem(menuItemId, adminId) {
      throw new Error("deleteMenuItem() not implemented");
    }
  
    async getMenuItemsByRestaurant(restaurantId) {
      throw new Error("getMenuItemsByRestaurant() not implemented");
    }
  
    async getMenuItemsByCategory(restaurantId, category) {
      throw new Error("getMenuItemsByCategory() not implemented");
    }
  
    async getAllMenuItemsByCategory(category) {
      throw new Error("getAllMenuItemsByCategory() not implemented");
    }
  
    async getMenuItem(itemId, adminId) {
      throw new Error("getMenuItem() not implemented");
    }
  
    async getAllAvailableMenuItems() {
      throw new Error("getAllAvailableMenuItems() not implemented");
    }
  
    async viewItemDetail(itemId) {
      throw new Error("viewItemDetail() not implemented");
    }
  }
  
  module.exports = IMenuItemService;