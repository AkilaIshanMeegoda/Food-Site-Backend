const DeliveryPersonnel = require("../models/DeliveryPersonnel");
const axios = require('axios');
const Delivery = require("../models/Delivery");

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

const registerDeliveryPersonnel = async (userId, name, phone, vehicleType, vehicleNumber, currentLocation, token) => {
  // Check if already registered
  const existingPersonnel = await DeliveryPersonnel.findOne({ userId });
  if (existingPersonnel) {
    throw { status: 400, message: "You are already registered as delivery personnel" };
  }

  // Get geolocation
  const geoRes = await axios.get(NOMINATIM_URL, {
    params: { q: currentLocation, format: 'json' }
  });

  const location = geoRes.data[0];
  if (!location || !location.lat || !location.lon) {
    throw { status: 400, message: 'Invalid or incomplete location' };
  }

  // Save delivery personnel data
  const personnel = new DeliveryPersonnel({
    _id: userId, // 👈 setting _id to user ID
    userId, // Still keeping this for clarity & relation
    name,
    phone,
    vehicleType,
    vehicleNumber,
    currentLocation,
    status: 'available',
    lat: parseFloat(location.lat),
    lng: parseFloat(location.lon),
  });

  await personnel.save();

  console.log(personnel);
  //  CALL USER SERVICE TO UPDATE ROLE
  // Attempt to update user role, but don't block registration if it fails
  try {
    console.log("📡 Calling User Service to update role for user:", userId);


    const response = await axios.put(
      `http://user-service:5000/users/${userId}/role`,
      { role: 'delivery_personnel' },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token // Pass the token

        }
      }
    );
  
    console.log(" User role updated successfully:", response.data);
  } catch (err) {
    if (err.response) {
      // The request was made and the server responded with a status code
      console.error(" Failed to update user role - response error:", err.response.status, err.response.data);
    } else if (err.request) {
      // The request was made but no response was received
      console.error(" Failed to update user role - no response received:", err.request);
    } else {
      // Something happened in setting up the request
      console.error(" Failed to update user role - setup error:", err.message);
    }
  }
  
  return personnel;
};


const getDeliveryPersonnelProfile = async (userId) => {
  const personnel = await DeliveryPersonnel.findOne({ userId });
  if (!personnel) {
    throw { status: 404, message: "Delivery personnel not found" };
  }
  return personnel;
};

const getDeliveriesByPersonnel = async (deliveryPersonnelId) => {
  try {
    const deliveries = await Delivery.find({ deliveryPersonnelId });
    return { status: 200, data: deliveries };
  } catch (error) {
    console.error("Error in getDeliveriesByPersonnel:", error);
    return { status: 500, data: { message: "Server error" } };
  }
};


module.exports = {
  registerDeliveryPersonnel,
  getDeliveryPersonnelProfile,
  getDeliveriesByPersonnel
};
