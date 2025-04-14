const express = require('express');
const router = express.Router();
const { verifyDeliveryPersonnel } = require('../middleware/authMiddleware');
const {registerDeliveryPersonnel, getDeliveryPersonnelProfile, getMyDeliveries} = require('../controllers/deliveryPersonnelController');

router.post('/register', verifyDeliveryPersonnel,registerDeliveryPersonnel);
router.get('/profile', verifyDeliveryPersonnel, getDeliveryPersonnelProfile );
router.get('/my-deliveries', verifyDeliveryPersonnel, getMyDeliveries);


module.exports = router;
