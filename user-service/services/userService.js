const User = require("../models/UserModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fetch = require('node-fetch');
const { JWT_SECRET } = require("../middleware/authMiddleware");

// Register a new user
exports.registerUser = async (userData) => {
  const { email, password, role, restaurantId } = userData;

  // Validate role
  if (!['customer', 'restaurant_admin', 'delivery_personnel'].includes(role)) {
    throw new Error("Invalid role");
  }

  // Check if the user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new Error("Email is already registered");
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Create a new user
  const newUser = new User({
    email,
    password: hashedPassword,
    role,
    restaurantId: role === 'restaurant_admin' ? restaurantId : undefined
  });

  return await newUser.save();
};

// Login user and generate token
exports.loginUser = async (credentials) => {
  const { email, password } = credentials;

  // Find the user by email
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error("User not found");
  }

  // Check if the password matches
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error("Incorrect password");
  }

  // Create JWT token
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
};

// Get user profile
exports.getUserProfile = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  return {
    email: user.email,
    role: user.role
  };
};

// Get user role
exports.getUserRole = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  return { role: user.role };
};

// Register restaurant owner
exports.registerRestaurantOwner = async (restaurantData, userId) => {
  const token = restaurantData.token;

  // Make request to restaurant service
  const response = await fetch("http://restaurant-service:5001/api/restaurants/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(restaurantData),
  });

  // Handle HTTP errors (4xx/5xx)
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to create restaurant");
  }

  // Parse JSON response
  const createdRestaurant = await response.json();
  const restaurantId = createdRestaurant._id;

  // Update user document
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { restaurantId, role: "restaurant_admin" },
    { new: true }
  );

  return {
    user: updatedUser,
    restaurant: createdRestaurant
  };
};

// Update user role
exports.updateUserRole = async (userId, role) => {
  if (!['customer', 'restaurant_admin', 'delivery_personnel'].includes(role)) {
    throw new Error("Invalid role");
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { role: role },
    { new: true }
  );

  if (!user) {
    throw new Error("User not found");
  }

  return user;
};
