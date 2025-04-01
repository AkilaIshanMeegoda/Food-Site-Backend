import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import 'dotenv/config';

const app = express();

const PORT = process.env.PORT || 5004;
const MONGODB_CONNECTION_STRING = process.env.MONGODB_CONNECTION_STRING;

// MongoDB connection
mongoose.connect(MONGODB_CONNECTION_STRING);

// Payment Schema
const Payment = mongoose.model("Payment", {
    orderId: {
        type: String,
        required: true,
        unique: true
    },
    customerId: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending'
    },
    paymentMethod: {
        type: String
    },
    transactionId: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Middleware
app.use(bodyParser.json());
app.use(cors({ origin: "*" }));

// Process payment
app.post("/payments/process", async (req, res) => {
    const { orderId, amount, customerId } = req.body;

    try {
        // In a real app, we would integrate with a payment gateway like PayHere or Stripe
        // For this demo, we'll just simulate a successful payment

        const payment = new Payment({
            orderId,
            customerId,
            amount,
            status: 'completed',
            paymentMethod: 'credit_card',
            transactionId: `txn_${Math.random().toString(36).substr(2, 9)}`
        });

        await payment.save();

        console.log(`Payment processed for order ${orderId}, amount: ${amount}`);

        res.status(200).json(payment);
    } catch (err) {
        console.error("Payment processing failed:", err);
        res.status(500).json({ error: "Payment processing failed" });
    }
});

// Get payment by order ID
app.get("/payments/order/:orderId", async (req, res) => {
    try {
        const payment = await Payment.findOne({ orderId: req.params.orderId });
        if (!payment) {
            return res.status(404).json({ error: "Payment not found" });
        }
        res.status(200).json(payment);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch payment" });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Payment service started at http://localhost:${PORT}`);
});