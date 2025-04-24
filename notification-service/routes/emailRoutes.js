import express from 'express';
import { sendDeliveryPersonnelEmail, sendOrderCompleteEmail, sendOrderDeliveringEmail } from '../controllers/emailController.js';

const router = express.Router();

router.post('/order-complete', sendOrderCompleteEmail);
router.post('/order-delivering', sendOrderDeliveringEmail);
router.post('/order-delivery-assign', sendDeliveryPersonnelEmail);

export default router;