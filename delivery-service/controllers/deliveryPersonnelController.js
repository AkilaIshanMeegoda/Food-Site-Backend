const deliveryPersonnelService = require("../services/deliveryPersonnelService");

const registerDeliveryPersonnel = async (req, res) => {
  try {
    const { name, phone, email, vehicleType, vehicleNumber, currentLocation } = req.body;
    const userId = req.user.userId;

    const token = req.headers.authorization; // Get the token

    const personnel = await deliveryPersonnelService.registerDeliveryPersonnel(
      userId, name, phone, email, vehicleType, vehicleNumber, currentLocation, token 
    );

    res.status(201).json({ message: 'Personnel registered', personnel });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || "Server error during registration" });
  }
};

const getDeliveryPersonnelProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const personnel = await deliveryPersonnelService.getDeliveryPersonnelProfile(userId);

    res.status(200).json(personnel);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || "Failed to fetch profile" });
  }
};


// Fetch deliveries for a specific delivery personnel
const getMyDeliveries = async (req, res) => {
  try {
    const userId = req.user.userId; // This is what you stored in token during login

    // Find the delivery personnel record using userId
    const personnel = await deliveryPersonnelService.getDeliveryPersonnelProfile(userId);

    if (!personnel) {
      return res.status(404).json({ message: "You are not registered as delivery personnel" });
    }

    // Use the actual deliveryPersonnel._id to fetch deliveries
    const result = await deliveryPersonnelService.getDeliveriesByPersonnel(personnel._id);

    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Error in getMyDeliveries:", error);
    res.status(500).json({ message: "Server error" });
  }
};



module.exports = {
  registerDeliveryPersonnel,
  getDeliveryPersonnelProfile,
  getMyDeliveries
};
