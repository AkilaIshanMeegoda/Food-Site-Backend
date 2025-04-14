import express from 'express';
import { createCheckoutSession, handleWebhookEvent } from '../controller/paymentController.js';

const router = express.Router();

router.post('/checkout', express.json(), createCheckoutSession);
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhookEvent);

export default router;