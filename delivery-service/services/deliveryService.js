const axios = require('axios');
const geolib = require('geolib');
const Delivery = require('../models/Delivery');
const DeliveryPersonnel = require('../models/DeliveryPersonnel');

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

exports.assignDriver = async (orderId, pickupAddress, dropoffAddress) => {
  try {
    console.log('Assigning for Order ID:', orderId);

    // Get coordinates for pickup and dropoff
    const [pickupRes, dropoffRes] = await Promise.all([
      axios.get(NOMINATIM_URL, { params: { q: pickupAddress, format: 'json' } }),
      axios.get(NOMINATIM_URL, { params: { q: dropoffAddress, format: 'json' } }),
    ]);

    if (!pickupRes.data.length || !dropoffRes.data.length) {
      return { status: 400, data: { message: 'Invalid pickup or dropoff address' } };
    }

    const pickup = {
      lat: parseFloat(pickupRes.data[0].lat),
      lng: parseFloat(pickupRes.data[0].lon),
    };

    const dropoff = {
      lat: parseFloat(dropoffRes.data[0].lat),
      lng: parseFloat(dropoffRes.data[0].lon),
    };

    // Find available drivers
    const drivers = await DeliveryPersonnel.find({ status: 'available' });

    let nearestDriver = null;
    let shortestDistance = Infinity;

    for (const driver of drivers) {
      const distance = geolib.getDistance(
        { latitude: driver.lat, longitude: driver.lng },
        { latitude: pickup.lat, longitude: pickup.lng }
      );

      if (distance < shortestDistance) {
        shortestDistance = distance;
        nearestDriver = driver;
      }
    }

    if (!nearestDriver) {
      return { status: 404, data: { message: 'No available drivers' } };
    }

    const delivery = await Delivery.create({
      orderId,
      deliveryPersonnelId: nearestDriver._id,
      pickupAddress,
      dropoffAddress,
      pickupLat: pickup.lat,
      pickupLng: pickup.lng,
      dropoffLat: dropoff.lat,
      dropoffLng: dropoff.lng,
      status: 'pending',
    });

    return { status: 200, data: { message: 'Driver assigned', delivery } };
  } catch (error) {
    console.error('Error in assignDriver:', error);
    return { status: 500, data: { message: 'Server error' } };
  }
};