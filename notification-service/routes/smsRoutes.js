import express from 'express';
import { sendDeliveryPersonnelSMS, sendOrderCompleteSMS, sendOrderDeliveringSMS } from '../controllers/smsController.js';

const router = express.Router();

router.post('/order-complete/sms', sendOrderCompleteSMS);
router.post('/order-delivering/sms', sendOrderDeliveringSMS);
router.post('/delivery-personnel/sms', sendDeliveryPersonnelSMS);

export default router;