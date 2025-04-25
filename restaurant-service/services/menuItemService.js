// Implements the IMenuItemService interface
const IMenuItemService = require('./IMenuService');
const MenuItem = require('../models/menuItemModel');
const Restaurant = require('../models/restaurantModel');

class MenuItemService extends IMenuItemService {
  async createMenuItem(adminId, data) {
    console.log("Im here in createMenuItem service");
    const restaurant = await Restaurant.findOne({ adminId });
    if (!restaurant) throw new Error("Restaurant not found");

    const menuItem = new MenuItem({
      restaurantId: restaurant._id,
      restaurantOwnerId: restaurant.adminId,
      restaurantName: restaurant.name,
      ...data,
    });

    await menuItem.save();
    return menuItem;
  }

  async getMenuItems(adminId) {
    console.log("Im here in getMenuItems service");
    const restaurant = await Restaurant.findOne({ adminId });
    if (!restaurant) throw new Error("Restaurant not found");

    return MenuItem.find({ restaurantId: restaurant._id });
  }

  async updateMenuItem(menuItemId, adminId, data) {
    console.log("Im here in updateMenuItem service");
    const restaurant = await Restaurant.findOne({ adminId });
    if (!restaurant) throw new Error("Restaurant not found");

    const menuItem = await MenuItem.findOneAndUpdate(
      { _id: menuItemId, restaurantId: restaurant._id },
      data,
      { new: true }
    );
    if (!menuItem) throw new Error("Menu item not found");
    return menuItem;
  }

  async deleteMenuItem(menuItemId, adminId) {
    console.log("Im here in deleteMenuItem service");
    const restaurant = await Restaurant.findOne({ adminId });
    if (!restaurant) throw new Error("Restaurant not found");

    await MenuItem.findOneAndDelete({ _id: menuItemId, restaurantId: restaurant._id });
  }

  async getMenuItemsByRestaurant(restaurantId) {
    console.log("Im here in getMenuItemsByRestaurant service");
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant || !restaurant.isActive) throw new Error("Restaurant not found or inactive");
    if (!restaurant.isAvailable) throw new Error("Restaurant is not available for orders");

    return MenuItem.find({ restaurantId, isAvailable: true });
  }

  async getMenuItemsByCategory(restaurantId, category) {
    console.log("Im here in getMenuItemsByCategory service");
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant || !restaurant.isActive) throw new Error("Restaurant not found or inactive");

    return MenuItem.find({ restaurantId, category, isAvailable: true });
  }

  async getAllMenuItemsByCategory(category) {
    console.log("Im here in getAllMenuItemsByCategory service");
    return MenuItem.find({ category });
  }

  async getMenuItem(itemId, adminId) {
    console.log("Im here in getMenuItem service");
    const restaurant = await Restaurant.findOne({ adminId });
    if (!restaurant) throw new Error("Restaurant not found for this owner");

    const menuItem = await MenuItem.findOne({
      _id: itemId,
      restaurantId: restaurant._id
    }).populate("restaurantId", "name address");

    if (!menuItem) throw new Error("Menu item not found or doesn't belong to your restaurant");
    return menuItem;
  }

  async getAllAvailableMenuItems() {
    console.log("Im here in getAllAvailableMenuItems service");
    const activeRestaurants = await Restaurant.find({ isActive: true, isAvailable: true });
    const restaurantIds = activeRestaurants.map(r => r._id);

    return MenuItem.find({ restaurantId: { $in: restaurantIds } })
      .populate("restaurantId", "name address");
  }

  async viewItemDetail(itemId) {
    console.log("Im here in viewItemDetail service");
    const menuItem = await MenuItem.findById(itemId)
      .populate("restaurantId", "name address contact")
      .select("-createdAt -updatedAt -__v");
    if (!menuItem) throw new Error("Menu item not found");
    return menuItem;
  }
}

module.exports = new MenuItemService();