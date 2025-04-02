const deliveryService = require('../services/deliveryService');

exports.assignDriver = async (req, res) => {
  try {
    const { orderId, pickupAddress, dropoffAddress } = req.body;
    const result = await deliveryService.assignDriver(orderId, pickupAddress, dropoffAddress);
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error('Error in assignDriver:', error);
    res.status(500).json({ message: 'Server error' });
  }
};