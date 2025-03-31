const express = require('express');
const router = express.Router();
const { verifyDeliveryPersonnel } = require('../middleware/authMiddleware');
const {registerDeliveryPersonnel, getDeliveryPersonnelProfile} = require('../controllers/deliveryPersonnelController');

router.post('/register', verifyDeliveryPersonnel,registerDeliveryPersonnel);
router.get('/profile', verifyDeliveryPersonnel, getDeliveryPersonnelProfile );


module.exports = router;
