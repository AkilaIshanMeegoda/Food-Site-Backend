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
  } catch (error) {
    console.error("Error initializing Stripe:", error);
  }
}

export const createCheckoutSession = async (orderData) => {
  if (!stripe) {
    throw new Error("Stripe API not initialized.");
  }

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
  } = orderData;

  if (!customerId || !restaurantId || !items || items.length === 0) {
    throw new Error("Missing required order fields");
  }

  const subTotal = items.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0
  );
  const deliveryFee = 150;
  const tax = subTotal * 0.05;
  const totalAmount = (subTotal + deliveryFee + tax).toFixed(2);

  // const line_items = items.map((item) => ({
  //   price_data: {
  //     currency: "lkr",
  //     product_data: {
  //       name: item.name,
  //     },
  //     unit_amount: Math.round(item.price * 100),
  //   },
  //   quantity: item.quantity,
  // }));

  const line_items = [
    ...items.map((item) => ({
      price_data: {
        currency: "lkr",
        product_data: { name: item.name },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    })),
    {
      price_data: {
        currency: "lkr",
        product_data: { name: "Delivery Fee" },
        unit_amount: Math.round(deliveryFee * 100), // delivery fee in cents
      },
      quantity: 1,
    },
    {
      price_data: {
        currency: "lkr",
        product_data: { name: "Tax" },
        unit_amount: Math.round(tax * 100), // tax in cents
      },
      quantity: 1,
    },
  ];

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

  return session.url;
};

export const handleWebhookEvent = async (req) => {
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

      // Save payment info
      await Payment.create({
        checkoutSessionId: session.id,
        paymentStatus: session.payment_status,
        amountTotal: totalAmount,
        currency: session.currency,
        customerEmail: session.customer_email,
      });
      // Create order
      const orderResponse = await axios.post(
        "http://order-service:5002/order/from-stripe",
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

      // Notify user by email
      await axios.post(
        "http://notification-service:5005/notifications/order-complete",
        {
          customerEmail: metadata.customerEmail,
          customerName: metadata.customerName,
          orderId,
          orderTotal: metadata.totalAmount,
          orderItems: items,
        }
      );

      console.log(`Order ${orderId} created and email sent.`);

      // Notify user by sms
      await axios.post(
        "http://notification-service:5005/notifications/order-complete/sms",
        {
          phoneNumber: metadata.customerPhone,
          userName: metadata.customerName,
          orderId,
        }
      );

      console.log(`Order ${orderId} created and sms sent.`);
    }
  } catch (error) {
    console.error("Error in handleWebhookEvent:", error);
    throw error;
  }
};
