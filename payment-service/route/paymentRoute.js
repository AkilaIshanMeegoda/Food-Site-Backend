import express from 'express';
import { createCheckoutSession } from '../controller/paymentController.js';

const router = express.Router();

router.post('/checkout', createCheckoutSession);

export default router;