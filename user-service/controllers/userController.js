const userService = require('../services/userService');

exports.register = async (req, res) => {
  try {
    const savedUser = await userService.registerUser(req.body);
    
    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: {
        id: savedUser._id,
        email: savedUser.email,
        role: savedUser.role
      }
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(400).json({
      success: false,
      message: "Failed to register user",
      error: error.message
    });
  }
};

exports.login = async (req, res) => {
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
      message: "Login failed",
      error: error.message
    });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const profile = await userService.getUserProfile(req.user.userId);
    
    res.status(200).json({
      success: true,
      ...profile,
      message: "Welcome to your profile"
    });
  } catch (error) {
    console.error("Profile fetch error:", error);
    res.status(404).json({
      success: false,
      message: "Failed to fetch profile",
      error: error.message
    });
  }
};

exports.getUserRole = async (req, res) => {
  try {
    const roleData = await userService.getUserRole(req.params.userId);
    
    res.status(200).json({
      success: true,
      ...roleData
    });
  } catch (error) {
    console.error("Role fetch error:", error);
    res.status(404).json({
      success: false,
      message: "Failed to fetch user role",
      error: error.message
    });
  }
};

exports.registerRestaurantOwner = async (req, res) => {
  try {
    const result = await userService.registerRestaurantOwner(
      req.user.userId,
      req.body,
      req.body.token
    );
    
    res.status(200).json({
      success: true,
      message: "Restaurant registered and user updated successfully",
      ...result
    });
  } catch (error) {
    console.error("Restaurant registration error:", error);
    res.status(500).json({
      success: false,
      message: "Error processing request",
      error: error.message
    });
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const user = await userService.updateUserRole(req.params.userId, req.body.role);
    
    res.status(200).json({
      success: true,
      message: "Role updated",
      user
    });
  } catch (error) {
    console.error("Role update error:", error);
    res.status(400).json({
      success: false,
      message: "Failed to update role",
      error: error.message
    });
  }
};
