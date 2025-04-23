const express = require('express');
const router = express.Router();
const { verifyDeliveryPersonnel, verifyCustomer } = require('../middleware/authMiddleware');
const {registerDeliveryPersonnel, getDeliveryPersonnelProfile, getMyDeliveries} = require('../controllers/deliveryPersonnelController');

router.post('/register', verifyCustomer, registerDeliveryPersonnel);
router.get('/profile', verifyDeliveryPersonnel, getDeliveryPersonnelProfile );
router.get('/my-deliveries', verifyDeliveryPersonnel, getMyDeliveries);


module.exports = router;
