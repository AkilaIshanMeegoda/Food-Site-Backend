import Stripe from 'stripe';
import 'dotenv/config';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const CLIENT_PORT = process.env.CLIENT_PORT || 9000;

let stripe;
if (!STRIPE_SECRET_KEY) {
  console.error('Error: STRIPE_SECRET_KEY is missing in the environment variables.');
} else {
  try {
    stripe = new Stripe(STRIPE_SECRET_KEY);
  } catch (stripeInitError) {
    console.error('Error initializing Stripe:', stripeInitError);
  }
}

export const createCheckoutSession = async (req, res) => {
  if (!stripe) {
    return res.status(500).json({ error: 'Stripe API not initialized.' });
  }

  try {
    const items = req.body;

    // Validate if the request body is an array and not empty
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Invalid request: Items must be a non-empty array.' });
    }

    const lineItems = [];

    // Iterate through items and perform validation
    for (const item of items) {
      if (!item || typeof item.name !== 'string' || typeof item.price !== 'number' || typeof item.quantity !== 'number' || item.quantity <= 0) {
        return res.status(400).json({ error: 'Invalid item in request. Each item must have a name (string), price (number), and a positive quantity (number).' });
      }

      lineItems.push({
        price_data: {
          currency: 'lkr',
          product_data: {
            name: item.name,
          },
          unit_amount: item.price * 100, // Ensure price is in cents
        },
        quantity: item.quantity,
      });
    }

    const session = await stripe.checkout.sessions.create({
      line_items: lineItems,
      mode: 'payment',
      success_url: `http://localhost:${CLIENT_PORT}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `http://localhost:${CLIENT_PORT}/cancel`,
      payment_method_types: ['card'],
    });

    if (!session || !session.url) {
      console.error('Error creating Stripe checkout session:', session);
      return res.status(500).json({ error: 'Failed to create Stripe checkout session.' });
    }

    res.redirect(303, session.url);

  } catch (err) {
    console.error('Error processing payment:', err);
    let errorMessage = 'Payment processing failed due to an unexpected error.';

    if (err instanceof Stripe.errors.StripeError) {
      errorMessage = `Stripe error: ${err.message}`;
    } else if (err instanceof Error) {
      errorMessage = `Server error during payment: ${err.message}`;
    }

    res.status(500).json({ error: errorMessage });
  }
};