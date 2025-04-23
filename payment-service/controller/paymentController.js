import Stripe from "stripe";
import "dotenv/config";
import axios from "axios";
import Payment from "../model/paymentModel.js";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const CLIENT_PORT = process.env.CLIENT_PORT || 9000;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

let stripe;
if (!STRIPE_SECRET_KEY) {
  console.error(
    "Error: STRIPE_SECRET_KEY is missing in the environment variables."
  );
} else {
  try {
    stripe = new Stripe(STRIPE_SECRET_KEY);
  } catch (stripeInitError) {
    console.error("Error initializing Stripe:", stripeInitError);
  }
}

export const createCheckoutSession = async (req, res) => {
  if (!stripe) {
    return res.status(500).json({ error: "Stripe API not initialized." });
  }

  try {
    const {
      customerId,
      customerName,
      customerEmail,
      customerPhone,
      restaurantId,
      restaurantName,
      items,
      deliveryAddress,
      deliveryInstructions,
      paymentMethod,
    } = req.body;

    if (!customerId || !restaurantId || !items || items.length === 0) {
      return res.status(400).json({ message: "Missing required order fields" });
    }

    // Calculate total amount (same logic as in Order Service)
    const subTotal = items.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0
    );
    const deliveryFee = 150;
    const tax = subTotal * 0.05;
    const totalAmount = (subTotal + deliveryFee + tax).toFixed(2);

    // Stripe expects line items in smallest currency unit (cents)
    const line_items = items.map((item) => ({
      price_data: {
        currency: "lkr",
        product_data: {
          name: item.name,
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items,
      customer_email: customerEmail,
      success_url: `http://localhost:${CLIENT_PORT}/checkout/success`,
      cancel_url: `http://localhost:${CLIENT_PORT}/checkout/cancel`,
      metadata: {
        customerId,
        customerName,
        customerEmail,
        customerPhone,
        restaurantId,
        restaurantName,
        deliveryAddress,
        deliveryInstructions,
        paymentMethod,
        totalAmount,
        items: JSON.stringify(items),
      },
    });

    return res.json({ url: session.url });
  } catch (error) {
    console.error("Stripe Checkout Error:", error);
    return res.status(500).json({
      message: "Stripe checkout session creation failed",
      error: error.message,
    });
  }
};

export const handleWebhookEvent = async (req, res) => {
  try {
    const sig = req.headers["stripe-signature"];

    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      STRIPE_WEBHOOK_SECRET
    );

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const metadata = session.metadata;
      const items = JSON.parse(metadata.items);

      const totalAmount = session.amount_total / 100;

      await Payment.create({
        checkoutSessionId: session.id,
        paymentStatus: session.payment_status,
        amountTotal: totalAmount,
        currency: session.currency,
        customerEmail: session.customer_email,
      });

      const orderResponse = await axios.post(
        "http://localhost:5002/api/order/from-stripe",
        {
          customerId: metadata.customerId,
          customerName: metadata.customerName,
          customerEmail: metadata.customerEmail,
          customerPhone: metadata.customerPhone,
          restaurantId: metadata.restaurantId,
          restaurantName: metadata.restaurantName,
          deliveryAddress: metadata.deliveryAddress,
          deliveryInstructions: metadata.deliveryInstructions,
          paymentMethod: metadata.paymentMethod,
          totalAmount,
          items,
          checkoutSessionId: session.id,
        }
      );

      const { orderId } = orderResponse.data;

      // Send email via Notification Service
      await axios.post(
        "http://localhost:5005/api/notifications/order-complete",
        {
          customerEmail: metadata.customerEmail,
          customerName: metadata.customerName,
          orderId: orderId,
          orderTotal: metadata.totalAmount,
          orderItems: items
        }
      );

      console.log(`Order ${orderId} created and email sent.`);
      return res.sendStatus(200);
    }

    return res.sendStatus(200);
  } catch (error) {
    console.error("Webhook handling error:", error.message);
    return res.sendStatus(400);
  }
};
