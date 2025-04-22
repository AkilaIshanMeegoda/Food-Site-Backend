const MenuItem = require("../models/menuItemModel");
const Restaurant = require("../models/restaurantModel");

exports.createMenuItem = async (adminId, data) => {
  console.log("check details", adminId, data);
  const restaurant = await Restaurant.findOne({ adminId });
  if (!restaurant) {
    throw new Error("Restaurant not found");
  }

  const menuItem = new MenuItem({
    restaurantId: restaurant._id,
    restaurantOwnerId: restaurant.adminId,
    restaurantName: restaurant.name,
    ...data,
  });

  await menuItem.save();
  return menuItem;
};

exports.getMenuItems = async (adminId) => {
  const restaurant = await Restaurant.findOne({ adminId });
  if (!restaurant) {
    throw new Error("Restaurant not found");
  }

  return await MenuItem.find({ restaurantId: restaurant._id });
};

exports.updateMenuItem = async (menuItemId, adminId, data) => {
  const restaurant = await Restaurant.findOne({ adminId });
  if (!restaurant) {
    throw new Error("Restaurant not found");
  }

  const menuItem = await MenuItem.findOneAndUpdate(
    { _id: menuItemId, restaurantId: restaurant._id },
    data,
    { new: true }
  );

  if (!menuItem) {
    throw new Error("Menu item not found");
  }

  return menuItem;
};

exports.deleteMenuItem = async (menuItemId, adminId) => {
  const restaurant = await Restaurant.findOne({ adminId });
  if (!restaurant) {
    throw new Error("Restaurant not found");
  }

  await MenuItem.findOneAndDelete({
    _id: menuItemId,
    restaurantId: restaurant._id,
  });
};

exports.getMenuItemsByRestaurant = async (restaurantId) => {
  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant || !restaurant.isActive) {
    throw new Error("Restaurant not found or inactive");
  }
  return await MenuItem.find({ restaurantId, isAvailable: true });
};

exports.getMenuItemsByCategory = async (restaurantId, category) => {
  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant || !restaurant.isActive) {
    throw new Error("Restaurant not found or inactive");
  }

  return await MenuItem.find({
    restaurantId,
    category,
    isAvailable: true,
  });
};

exports.getAllMenuItemsByCategory = async (category) => {
  return await MenuItem.find({ category });
};

exports.getMenuItem = async (itemId, adminId) => {
  console.log("get menu item", itemId, adminId);
  // First verify the item belongs to the owner's restaurant
  const restaurant = await Restaurant.findOne({ adminId: adminId });
  console.log("checking restaurant", restaurant);
  if (!restaurant) {
    throw new Error("Restaurant not found for this owner");
  }

  const menuItem = await MenuItem.findOne({
    _id: itemId,
    restaurantId: restaurant._id,
  }).populate("restaurantId", "name address");

  if (!menuItem) {
    throw new Error("Menu item not found or doesn't belong to your restaurant");
  }

  return menuItem;
};

exports.getAllAvailableMenuItems = async () => {
  // Get all menu items from active restaurants that are available
  const activeRestaurants = await Restaurant.find({ isActive: true });
  console.log("checking active restaurants", activeRestaurants);
  const restaurantIds = activeRestaurants.map((r) => r._id);

  return await MenuItem.find({
    restaurantId: { $in: restaurantIds },
  }).populate("restaurantId", "name address");
};

exports.viewItemDetail = async (itemId) => {
  console.log("get menu item", itemId);
  // First verify the item belongs to the owner's restaurant
  const menuItem = await MenuItem.findById(itemId)
    .populate("restaurantId", "name address contact")
    .select("-createdAt -updatedAt -__v");
  console.log("checking menuItem", menuItem);

  if (!menuItem) {
    throw new Error("Menu item not found");
  }

  return menuItem;
};
