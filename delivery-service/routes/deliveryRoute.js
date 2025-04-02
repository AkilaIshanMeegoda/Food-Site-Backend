const express = require('express');
const router = express.Router();
const {assignDriver} = require('../controllers/deliveryController');

router.post('/assign', assignDriver);

module.exports = router;