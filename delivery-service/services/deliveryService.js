const axios = require('axios');
const geolib = require('geolib');
const Delivery = require('../models/Delivery');
const DeliveryPersonnel = require('../models/DeliveryPersonnel');

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

//Automatically assign a nearest and available delivery personnel for a order
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

      //find the nearest delievry personnel
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

    // send sms to delivery personnel
    //if not using docker- http://localhost:5005/api/notifications/delivery-personnel/sms
    try {
      await axios.post("http://notification-service:5005/api/notifications/delivery-personnel/sms", {
        phoneNumber: nearestDriver.phone,
        orderId: orderId
      });
    } catch (error) {
      console.log("Send sms to delivery personnel failed: ", error);
    }

    return { status: 200, data: { message: 'Driver assigned', delivery } };
  } catch (error) {
    console.error('Error in assignDriver:', error);
    return { status: 500, data: { message: 'Server error' } };
  }
};


//accept the delivery by driver
exports.acceptDelivery = async (orderId, deliveryPersonnelId) => {
    try {
      const delivery = await Delivery.findOne({ orderId, deliveryPersonnelId });
  
      if (!delivery) {
        return { status: 404, data: { message: 'Delivery not found' } };
      }
  
      delivery.status = 'accepted';
      await delivery.save();
  
      await DeliveryPersonnel.updateOne({ _id: deliveryPersonnelId }, { status: 'busy' });
  
      return { status: 200, data: { message: 'Delivery accepted' } };
    } catch (error) {
      console.error('Error in acceptDelivery:', error);
      return { status: 500, data: { message: 'Server error' } };
    }
  };

  
exports.updateStatus = async (orderId, status) => {
    try {
      const delivery = await Delivery.findOne({ orderId });
  
      if (!delivery) {
        return { status: 404, data: { message: 'Delivery not found' } };
      }
  
      delivery.status = status;
      await delivery.save();
  
      if (status === 'delivered') {
        await DeliveryPersonnel.updateOne({ _id: delivery.deliveryPersonnelId }, { status: 'available' });
      }
  
      return { status: 200, data: { message: 'Delivery status updated' } };
    } catch (error) {
      console.error('Error in updateStatus:', error);
      return { status: 500, data: { message: 'Server error' } };
    }
  };

  exports.getDeliveryByOrderId = async (orderId) => {
    const delivery = await Delivery.findOne({ orderId });
  
    if (!delivery) {
      throw new Error("Delivery information not found for this order");
    }
  
    return delivery;
  };