const DeliveryPersonnel = require("../../delivery-service/models/DeliveryPersonnel");
const axios = require('axios');

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

const registerDeliveryPersonnel = async (userId, name, phone, vehicleType, vehicleNumber, currentLocation) => {
  // Check if already registered
  const existingPersonnel = await DeliveryPersonnel.findOne({ userId });
  if (existingPersonnel) {
    throw { status: 400, message: "You are already registered as delivery personnel" };
  }

  // Get geolocation for the address using the Nominatim API
  const geoRes = await axios.get(NOMINATIM_URL, {
    params: { q: currentLocation, format: 'json' }
  });

  // Check if location data is returned
  const location = geoRes.data[0];
  if (!location || !location.lat || !location.lon) {
    throw { status: 400, message: 'Invalid or incomplete location' };
  }

  const personnel = new DeliveryPersonnel({
    userId,
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
  return personnel;
};

const getDeliveryPersonnelProfile = async (userId) => {
  const personnel = await DeliveryPersonnel.findOne({ userId });
  if (!personnel) {
    throw { status: 404, message: "Delivery personnel not found" };
  }
  return personnel;
};

module.exports = {
  registerDeliveryPersonnel,
  getDeliveryPersonnelProfile,
};
