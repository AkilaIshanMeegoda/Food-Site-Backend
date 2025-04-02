const express = require('express');
const router = express.Router();
const {assignDriver, acceptDelivery} = require('../controllers/deliveryController');
const { verifyDeliveryPersonnel } = require('../middleware/authMiddleware');


router.post('/assign', assignDriver);
router.post('/accept', verifyDeliveryPersonnel, acceptDelivery);


module.exports = router;