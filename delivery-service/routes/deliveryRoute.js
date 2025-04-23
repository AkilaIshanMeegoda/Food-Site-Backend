const express = require('express');
const router = express.Router();
const {assignDriver, acceptDelivery, updateStatus, getDeliveryByOrderId} = require('../controllers/deliveryController');
const { verifyDeliveryPersonnel, verifyRestaurantAdmin, verifyCustomer } = require('../middleware/authMiddleware');


router.post('/assign', verifyRestaurantAdmin, assignDriver);
router.post('/accept', verifyDeliveryPersonnel, acceptDelivery);
router.put('/update-status/:orderId', verifyDeliveryPersonnel, updateStatus);
router.get("/order/:orderId", verifyCustomer, getDeliveryByOrderId);



module.exports = router;