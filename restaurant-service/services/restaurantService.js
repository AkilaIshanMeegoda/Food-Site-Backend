const Restaurant = require("../models/restaurantModel");

exports.createRestaurant = async (adminId, data) => {
    const existingRestaurant = await Restaurant.findOne({ adminId });
    if (existingRestaurant) {
        throw new Error("You already have a restaurant registered");
    }

    const restaurant = new Restaurant({
        ...data,
        adminId
    });

    await restaurant.save();
    return restaurant;
};

exports.getRestaurant = async (adminId) => {
    const restaurant = await Restaurant.findOne({ adminId });
    if (!restaurant) {
        throw new Error("Restaurant not found");
    }

    return restaurant;
};

exports.updateRestaurant = async (restaurantId, adminId, data) => {
    const restaurant = await Restaurant.findOneAndUpdate(
        { _id: restaurantId, adminId },
        data,
        { new: true }
    );
    if (!restaurant) {
        throw new Error("Restaurant not found or not authorized to update");
    }

    return restaurant;
};

exports.getActiveRestaurants = async () => {
    return await Restaurant.find({ isActive: true });
};

exports.getRestaurantById = async (id) => {
    return await Restaurant.findById(id);
};