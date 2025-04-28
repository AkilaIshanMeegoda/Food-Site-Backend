const axios = require("axios");
const geolib = require("geolib");
const Delivery = require("../models/Delivery");
const DeliveryPersonnel = require("../models/DeliveryPersonnel");
require('dotenv').config();

const NOMINATIM_URL = process.env.NOMINATIM_URL;

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
    
    if (!drivers || drivers.length === 0) {
      return { status: 404, data: { message: 'No available drivers' } };
    }
    
    // Calculate distance for each driver to the pickup location
    const driversWithDistance = drivers.map(driver => {
      const distance = geolib.getDistance(
        { latitude: driver.lat, longitude: driver.lng },
        { latitude: pickup.lat, longitude: pickup.lng }
      );
      return { driver, distance };
    });
    
    // Find the minimum distance to the pickup location
    const nearestDistance = Math.min(...driversWithDistance.map(d => d.distance));

    // Filter drivers who are at the nearest distance
    const nearestDrivers = driversWithDistance.filter(d => d.distance === nearestDistance);

    // Log the nearest drivers
    console.log('Nearest distance:', nearestDistance); 
    console.log('Nearest drivers:', nearestDrivers); 

    // Extract the drivers from the filtered result
    const driversToAssign = nearestDrivers.map(d => d.driver);

    console.log('Drivers to assign:', driversToAssign);  // This should now include all drivers at the same distance

    // Create delivery with all assigned drivers
    const delivery = await Delivery.create({
      orderId,
      assignedDrivers: driversToAssign.map(driver => driver._id),
      pickupAddress,
      dropoffAddress,
      pickupLat: pickup.lat,
      pickupLng: pickup.lng,
      dropoffLat: dropoff.lat,
      dropoffLng: dropoff.lng,
      status: 'pending',
    });
    
    // If only one driver is the nearest, directly assign them as deliveryPersonnelId
    if (driversToAssign.length === 1) {
      delivery.deliveryPersonnelId = driversToAssign[0]._id;
      await delivery.save();
    }   
    
    // Send notifications to all assigned drivers
    for (const driver of driversToAssign) {
      // Send email to delivery personnel
      try {
        await axios.post("http://notification-service:5005/notifications/order-delivery-assign", {
          email: driver.email,
          orderId: orderId
        });
      } catch (error) {
        console.log("Send email to delivery personnel failed: ", error);
      }
      
      // Send SMS to delivery personnel
      try {
        await axios.post("http://notification-service:5005/notifications/delivery-personnel/sms", {
          phoneNumber: driver.phone,
          orderId: orderId
        });
      } catch (error) {
        console.log("Send sms to delivery personnel failed: ", error);
      }
    }
    
    const responseMessage = driversToAssign.length === 1 
      ? 'One driver assigned' 
      : `${driversToAssign.length} drivers at the nearest location assigned`;
    
    return { 
      status: 200, 
      data: { 
        message: responseMessage, 
        delivery,
        assignedDriverCount: driversToAssign.length
      } 
    };
  } catch (error) {
    console.error('Error in assignDriver:', error);
    return { status: 500, data: { message: 'Server error' } };
  }
};

//accept the delivery by driver
exports.acceptDelivery = async (orderId, deliveryPersonnelId) => {
  try {
    const delivery = await Delivery.findOne({ orderId, assignedDrivers: { $in: [deliveryPersonnelId] } });

    if (!delivery) {
      return { status: 404, data: { message: 'Delivery not found' } };
    }

    delivery.status = 'accepted';
    delivery.deliveryPersonnelId = deliveryPersonnelId;
    delivery.assignedDrivers = null;  // Clear assigned drivers once accepted
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