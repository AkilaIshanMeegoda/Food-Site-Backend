const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const nodemailer = require("nodemailer");

const app = express();
const port = process.env.PORT || 5005;

// Middleware
app.use(bodyParser.json());
app.use(cors({ origin: "*" }));

// Email configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'your-email@gmail.com',
        pass: process.env.EMAIL_PASS || 'your-email-password'
    }
});

// Notify customer via email
app.post("/notify/customer", async (req, res) => {
    const { customerId, orderId, message } = req.body;

    try {
        // In a real app, we would fetch customer email from user service
        // For demo, we'll just log it
        console.log(`Sending notification to customer ${customerId}: ${message}`);

        // Example email sending (commented out for safety)
        /*
        await transporter.sendMail({
            from: 'food-delivery@example.com',
            to: 'customer@example.com',
            subject: `Order Update: ${orderId}`,
            text: message
        });
        */

        res.status(200).json({ message: "Notification sent to customer" });
    } catch (err) {
        console.error("Failed to notify customer:", err);
        res.status(500).json({ error: "Failed to send notification" });
    }
});

// Notify restaurant via email
app.post("/notify/restaurant", async (req, res) => {
    const { restaurantId, orderId, message } = req.body;

    try {
        // In a real app, we would fetch restaurant email from restaurant service
        console.log(`Sending notification to restaurant ${restaurantId}: ${message}`);

        // Example email sending (commented out for safety)
        /*
        await transporter.sendMail({
            from: 'food-delivery@example.com',
            to: 'restaurant@example.com',
            subject: `New Order: ${orderId}`,
            text: message
        });
        */

        res.status(200).json({ message: "Notification sent to restaurant" });
    } catch (err) {
        console.error("Failed to notify restaurant:", err);
        res.status(500).json({ error: "Failed to send notification" });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Notification service started at http://localhost:${port}`);
});