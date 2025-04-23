const userService = require("../services/userService");

// Register a new user
exports.registerUser = async (req, res) => {
  try {
    await userService.registerUser(req.body);
    
    res.status(201).json({ 
      success: true,
      message: "User registered successfully" 
    });
  } catch (error) {
    console.error("Register user error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to register user"
    });
  }
};

// Login user
exports.loginUser = async (req, res) => {
  try {
    const userData = await userService.loginUser(req.body);
    
    res.status(200).json({
      success: true,
      message: "Login successful",
      ...userData
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Get user profile
exports.getUserProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const userProfile = await userService.getUserProfile(userId);
    
    res.status(200).json({
      success: true,
      ...userProfile,
      message: "Welcome to your profile"
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
};

// Get user role
exports.getUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const roleData = await userService.getUserRole(userId);
    
    res.status(200).json({
      success: true,
      ...roleData
    });
  } catch (error) {
    console.error("Get user role error:", error);
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
};

// Register restaurant owner
exports.registerRestaurantOwner = async (req, res) => {
  try {
    const result = await userService.registerRestaurantOwner(req.body, req.user.userId);
    
    res.status(200).json({
      success: true,
      message: "Restaurant registered and user updated successfully.",
      user: result.user,
      restaurant: result.restaurant
    });
  } catch (error) {
    console.error("Register restaurant owner error:", error);
    res.status(500).json({
      success: false,
      message: "Error processing request.",
      error: error.message
    });
  }
};

// Update user role
exports.updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    
    console.log(`PUT /users/${userId}/role`);
    console.log(`Request body:`, req.body);
    
    const updatedUser = await userService.updateUserRole(userId, role);
    
    console.log(`Role updated successfully for user ${userId}:`, updatedUser.role);
    res.status(200).json({
      success: true,
      message: 'Role updated',
      user: updatedUser
    });
  } catch (error) {
    console.error(`Error updating role for user:`, req.params.userId, error);
    res.status(error.message === "User not found" ? 404 : 400).json({
      success: false,
      message: error.message
    });
  }
};
