import express from 'express';
import { sendOrderCompleteEmail, sendOrderDeliveringEmail } from '../controllers/emailController.js';

const router = express.Router();

router.post('/order-complete', sendOrderCompleteEmail);
router.post('/order-delivering', sendOrderDeliveringEmail);

export default router;