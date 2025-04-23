const deliveryService = require('../services/deliveryService');

//automatically assign the nearest and available delivery personnel for a order 
exports.assignDriver = async (req, res) => {
  try {
    //pickupAdress - Restaurant Address
    //dropoffAddress - Delivery Address
    const { orderId, pickupAddress, dropoffAddress } = req.body;
    const result = await deliveryService.assignDriver(orderId, pickupAddress, dropoffAddress);
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error('Error in assignDriver:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

//accept delivery by the delivery personnel
exports.acceptDelivery = async (req, res) => {
    try {
      const { orderId, deliveryPersonnelId } = req.body;
      const result = await deliveryService.acceptDelivery(orderId, deliveryPersonnelId);
      res.status(result.status).json(result.data);
    } catch (error) {
      console.error('Error in acceptDelivery:', error);
      res.status(500).json({ message: 'Server error' });
    }
  };

  //update delivery status by delivery personnel
  exports.updateStatus = async (req, res) => {
    try {
      const { orderId } = req.params;
      const { status } = req.body;
      const result = await deliveryService.updateStatus(orderId, status);
      res.status(result.status).json(result.data);
    } catch (error) {
      console.error('Error in updateStatus:', error);
      res.status(500).json({ message: 'Server error' });
    }
  };



exports.getDeliveryByOrderId = async (req, res) => {
  try {
    const { orderId } = req.params;

    const delivery = await deliveryService.getDeliveryByOrderId(orderId);

    return res.status(200).json({
      success: true,
      data: delivery
    });
  } catch (error) {
    console.error("Get delivery error:", error.message);

    const statusCode = error.message.includes("not found") ? 404 : 500;

    return res.status(statusCode).json({
      success: false,
      message: error.message
    });
  }
};


