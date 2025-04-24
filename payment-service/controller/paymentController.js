import * as paymentService from '../services/paymentService.js';

// Create Stripe checkout session
export const createCheckoutSession = async (req, res) => {
  try {
    const sessionUrl = await paymentService.createCheckoutSession(req.body);
    res.json({ url: sessionUrl });
  } catch (error) {
    console.error("Stripe Checkout Error:", error);
    res.status(500).json({
      message: "Stripe checkout session creation failed",
      error: error.message,
    });
  }
};

// Handle Stripe webhook events
export const handleWebhookEvent = async (req, res) => {
  try {
    await paymentService.handleWebhookEvent(req);
    res.sendStatus(200);
  } catch (error) {
    console.error("Webhook handling error:", error.message);
    res.sendStatus(400);
  }
};
