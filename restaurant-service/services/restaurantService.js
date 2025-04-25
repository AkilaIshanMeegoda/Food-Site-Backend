const IRestaurantService = require('./IRestaurantService');
const Restaurant = require('../models/restaurantModel');

class RestaurantService extends IRestaurantService {
  async createRestaurant(adminId, data) {
    console.log("Im here in createRestaurant service");
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
  }

  async getRestaurant(adminId) {
    console.log("Im here in getRestaurant service");
    const restaurant = await Restaurant.findOne({ adminId });
    if (!restaurant) {
      throw new Error("Restaurant not found");
    }
    return restaurant;
  }

  async updateRestaurant(restaurantId, adminId, data) {
    console.log("Im here in updateRestaurant service");
    const restaurant = await Restaurant.findOneAndUpdate(
      { _id: restaurantId, adminId },
      data,
      { new: true }
    );
    if (!restaurant) {
      throw new Error("Restaurant not found or not authorized to update");
    }
    return restaurant;
  }

  async getActiveRestaurants() {
    console.log("Im here in getActiveRestaurants service");
    return Restaurant.find({ isActive: true });
  }
  // This function is used to get a restaurant by its ID.
  async getRestaurantById(id) {
    console.log("Im here in getRestaurantById service");
    return Restaurant.findById(id);
  }

  async getAllRestaurants() {
    console.log("Im here in getAllRestaurants service");
    return Restaurant.find();
  }

  async updateRestaurantByAdmin(restaurantId, data) {
    console.log("Im here in updateRestaurantByAdmin service");
    const restaurant = await Restaurant.findOneAndUpdate(
      { _id: restaurantId },
      data,
      { new: true }
    );
    if (!restaurant) {
      throw new Error("Restaurant not found or not authorized to update");
    }
    return restaurant;
  }
}

module.exports = new RestaurantService();