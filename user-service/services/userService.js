const User = require('../models/UserModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');
const IUserService = require('./IUserService');

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key";

class UserService extends IUserService {
  async registerUser(userData) {
    const { email, password, role, restaurantId } = userData;

    if (!['customer', 'restaurant_admin', 'delivery_personnel', 'super_admin'].includes(role)) {
      throw new Error("Invalid role");
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error("Email is already registered");
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      email,
      password: hashedPassword,
      role,
      restaurantId: role === 'restaurant_admin' ? restaurantId : undefined
    });

    return await newUser.save();
  }

  async loginUser(credentials) {
    const { email, password } = credentials;

    const user = await User.findOne({ email });
    if (!user) {
      throw new Error("User not found");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error("Incorrect password");
    }

    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role,
        restaurantId: user.restaurantId
      },
      JWT_SECRET,
      { expiresIn: "30d" }
    );

    return {
      token,
      role: user.role,
      userId: user._id,
      email: user.email,
      restaurantId: user.restaurantId
    };
  }

  async getUserProfile(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    return {
      email: user.email,
      role: user.role
    };
  }

  async getUserRole(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    return { role: user.role };
  }

  async registerRestaurantOwner(userId, restaurantData, token) {
    // use this when run backend manually -> http://localhost:5001/api/restaurants/
    const response = await fetch("http://restaurant-service:5001/api/restaurants/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(restaurantData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to create restaurant");
    }

    const createdRestaurant = await response.json();
    const restaurantId = createdRestaurant._id;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { restaurantId, role: "restaurant_admin" },
      { new: true }
    );

    return {
      user: updatedUser,
      restaurant: createdRestaurant
    };
  }

  async updateUserRole(userId, role) {
    if (!['customer', 'restaurant_admin', 'delivery_personnel', 'super_admin'].includes(role)) {
      throw new Error("Invalid role");
    }

    const user = await User.findByIdAndUpdate(userId, { role }, { new: true });
    if (!user) {
      throw new Error("User not found");
    }

    return user;
  }
}

module.exports = new UserService();
