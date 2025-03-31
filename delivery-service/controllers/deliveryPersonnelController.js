const deliveryPersonnelService = require("../services/deliveryPersonnelService");

const registerDeliveryPersonnel = async (req, res) => {
  try {
    const { name, phone, vehicleType, vehicleNumber, currentLocation } = req.body;
    const userId = req.user.userId;

    const personnel = await deliveryPersonnelService.registerDeliveryPersonnel(
      userId, name, phone, vehicleType, vehicleNumber, currentLocation
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

module.exports = {
  registerDeliveryPersonnel,
  getDeliveryPersonnelProfile,
};
