const express = require('express');
const router = express.Router();
const {assignDriver, acceptDelivery, updateStatus} = require('../controllers/deliveryController');
const { verifyDeliveryPersonnel, verifyRestaurantAdmin } = require('../middleware/authMiddleware');


router.post('/assign', verifyRestaurantAdmin, assignDriver);
router.post('/accept', verifyDeliveryPersonnel, acceptDelivery);
router.put('/update-status/:orderId', verifyDeliveryPersonnel, updateStatus);


module.exports = router;