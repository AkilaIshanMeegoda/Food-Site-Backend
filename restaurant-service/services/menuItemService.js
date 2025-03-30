const MenuItem = require("../models/menuItemModel");
const Restaurant = require("../models/restaurantModel");

exports.createMenuItem = async (adminId, data) => {
    const restaurant = await Restaurant.findOne({ adminId });
    if (!restaurant) {
        throw new Error("Restaurant not found");
    }

    const menuItem = new MenuItem({
        restaurantId: restaurant._id,
        ...data
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

    await MenuItem.findOneAndDelete({ _id: menuItemId, restaurantId: restaurant._id });
};

exports.getMenuItemsByRestaurant = async (restaurantId) => {
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant || !restaurant.isActive) {
        throw new Error('Restaurant not found or inactive');
    }
    return await MenuItem.find({ restaurantId, isAvailable: true });
};

exports.getMenuItemsByCategory = async (restaurantId, category) => {
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant || !restaurant.isActive) {
        throw new Error('Restaurant not found or inactive');
    }

    return await MenuItem.find({ 
        restaurantId, 
        category, 
        isAvailable: true 
    });
};

exports.getMenuItemsByCategory = async (category) => {
    return await MenuItem.find({ category, isAvailable: true });
};