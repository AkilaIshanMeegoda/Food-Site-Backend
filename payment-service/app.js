import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import Stripe from 'stripe';
import 'dotenv/config';

// Constants and Environment Validation
const PORT = process.env.PORT || 5004;
const CLIENT_PORT = process.env.CLIENT_PORT || 3000;
const MONGODB_CONNECTION_STRING = process.env.MONGODB_CONNECTION_STRING;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const DB_NAME = "PaymentDB";

// Validate required environment variables
if (!MONGODB_CONNECTION_STRING || !STRIPE_SECRET_KEY) {
  console.error("Missing required environment variables");
  process.exit(1);
}

const app = express();
const stripe = new Stripe(STRIPE_SECRET_KEY);

// Middleware
app.use(bodyParser.json());
app.use(cors({ origin: "*" }));

app.post('/api/payment/checkout', async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: 'lkr',
            product_data: {
              name: 'T-shirt',
            },
            unit_amount: 20000,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `http://localhost:${CLIENT_PORT}/success`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe error:', err);
    res.status(500).json({ error: 'Payment processing failed' });
  }
});

// Database Connection and Server Startup
async function startServer() {
  try {
    await mongoose.connect(MONGODB_CONNECTION_STRING, {
      dbName: DB_NAME,
    });
    console.log(`Connected to MongoDB (${DB_NAME})`);

    app.listen(PORT, () => {
      console.log(`Payment service running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Database connection failed:', error.message);
    process.exit(1);
  }
}

startServer();