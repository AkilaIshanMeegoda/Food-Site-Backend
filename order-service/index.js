const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const axios = require("axios");

const app = express();
const port = process.env.PORT || 5002;

// MongoDB connection
mongoose.connect("mongodb+srv://foodApp:2001@cluster0.afkbz0b.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0");

// Order Schema
const Order = mongoose.model("Order", {
    customerId: {
        type: String,
        required: true
    },
    restaurantId: {
        type: String,
        required: true
    },
    items: [{
        menuItemId: String,
        name: String,
        quantity: Number,
        price: Number
    }],
    totalAmount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'preparing', 'ready_for_pickup', 'on_the_way', 'delivered', 'cancelled'],
        default: 'pending'
    },
    deliveryAddress: {
        type: String,
        required: true
    },
    deliveryInstructions: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    deliveryPersonnelId: {
        type: String
    }
});

// Middleware
app.use(bodyParser.json());
app.use(cors({ origin: "*" }));

// JWT Secret Key
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key";

// Middleware to verify JWT Token
function verifyToken(req, res, next) {
    const authHeader = req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Access denied. Missing or invalid token format" });
    }

    const token = authHeader.split(" ")[1]; // Extract token after "Bearer"

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: "Invalid token" });
    }
}

// Create a new order
app.post("/orders", verifyToken, async (req, res) => {
    if (req.user.role !== 'customer') {
        return res.status(403).json({ error: "Only customers can place orders" });
    }

    const { restaurantId, items, deliveryAddress, deliveryInstructions } = req.body;
    
    try {
        // Fetch restaurant details
        const restaurantResponse = await axios.get(`http://localhost:5001/public/restaurants/${restaurantId}`);
        if (!restaurantResponse.data) {
            return res.status(404).json({ error: "Restaurant not found" });
        }

        // Fetch menu items to validate and calculate total
        const menuItemsResponse = await axios.get(`http://localhost:5001/public/restaurants/${restaurantId}/menu-items`);
        const menuItems = menuItemsResponse.data;

        // Validate items and calculate total
        let totalAmount = 0;
        const orderItems = [];

        for (const item of items) {
            const menuItem = menuItems.find(mi => mi._id === item.menuItemId);
            if (!menuItem) {
                return res.status(400).json({ error: `Menu item ${item.menuItemId} not found` });
            }
            totalAmount += menuItem.price * item.quantity;
            orderItems.push({
                menuItemId: item.menuItemId,
                name: menuItem.name,
                quantity: item.quantity,
                price: menuItem.price
            });
        }

        // Create order
        const order = new Order({
            customerId: req.user.userId,
            restaurantId,
            items: orderItems,
            totalAmount,
            deliveryAddress,
            deliveryInstructions,
            status: 'pending'
        });

        await order.save();

        // Notify restaurant
        try {
            await axios.post(`http://notification-service:5005/notify/restaurant`, {
                restaurantId,
                orderId: order._id,
                message: `New order received: Order #${order._id}`
            });
        } catch (notifyErr) {
            console.error("Failed to notify restaurant:", notifyErr.message);
        }

        res.status(201).json(order);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to create order" });
    }
});

// Get orders for customer
app.get("/orders/customer", verifyToken, async (req, res) => {
    if (req.user.role !== 'customer') {
        return res.status(403).json({ error: "Access denied" });
    }

    try {
        const orders = await Order.find({ customerId: req.user.userId }).sort({ createdAt: -1 });
        res.status(200).json(orders);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch orders" });
    }
});

// Get orders for restaurant
app.get("/orders/restaurant", verifyToken, async (req, res) => {
    if (req.user.role !== 'restaurant_admin') {
        return res.status(403).json({ error: "Access denied" });
    }

    try {
        // Get restaurant ID for this admin
        const restaurantResponse = await axios.get(`http://localhost:5001/restaurants/my-restaurant`, {
            headers: { Authorization: req.header("Authorization") }
        });
        
        const restaurantId = restaurantResponse.data._id;
        const orders = await Order.find({ restaurantId }).sort({ createdAt: -1 });
        res.status(200).json(orders);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch orders" });
    }
});

// Update order status (for restaurant admin)
app.put("/orders/:id/status", verifyToken, async (req, res) => {
    if (req.user.role !== 'restaurant_admin') {
        return res.status(403).json({ error: "Access denied" });
    }

    const { status } = req.body;
    const allowedStatuses = ['confirmed', 'preparing', 'ready_for_pickup', 'cancelled'];

    if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status update" });
    }

    try {
        // Get restaurant ID for this admin
        const restaurantResponse = await axios.get(`http://localhost:5001/restaurants/my-restaurant`, {
            headers: { Authorization: req.header("Authorization") }
        });
        
        const restaurantId = restaurantResponse.data._id;

        const order = await Order.findOneAndUpdate(
            { _id: req.params.id, restaurantId },
            { status, updatedAt: Date.now() },
            { new: true }
        );

        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        // Notify customer if status changed to ready_for_pickup
        if (status === 'ready_for_pickup') {
            try {
                await axios.post(`http://notification-service:5005/notify/customer`, {
                    customerId: order.customerId,
                    orderId: order._id,
                    message: `Your order is ready for pickup: Order #${order._id}`
                });
            } catch (notifyErr) {
                console.error("Failed to notify customer:", notifyErr.message);
            }
        }

        res.status(200).json(order);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update order status" });
    }
});

// Get orders for delivery personnel
app.get("/orders/delivery", verifyToken, async (req, res) => {
    if (req.user.role !== 'delivery_personnel') {
        return res.status(403).json({ error: "Access denied" });
    }

    try {
        // Get orders assigned to this delivery personnel
        const orders = await Order.find({ 
            deliveryPersonnelId: req.user.userId,
            status: { $in: ['ready_for_pickup', 'on_the_way'] }
        }).sort({ updatedAt: -1 });
        
        res.status(200).json(orders);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch orders" });
    }
});

// Assign order to delivery personnel
app.put("/orders/:id/assign", verifyToken, async (req, res) => {
    if (req.user.role !== 'delivery_personnel') {
        return res.status(403).json({ error: "Access denied" });
    }

    try {
        const order = await Order.findOneAndUpdate(
            { 
                _id: req.params.id,
                status: 'ready_for_pickup',
                deliveryPersonnelId: { $exists: false }
            },
            { 
                deliveryPersonnelId: req.user.userId,
                status: 'on_the_way',
                updatedAt: Date.now()
            },
            { new: true }
        );

        if (!order) {
            return res.status(404).json({ error: "Order not available for delivery" });
        }

        // Notify customer
        try {
            await axios.post(`http://notification-service:5005/notify/customer`, {
                customerId: order.customerId,
                orderId: order._id,
                message: `Your order is on the way: Order #${order._id}`
            });
        } catch (notifyErr) {
            console.error("Failed to notify customer:", notifyErr.message);
        }

        res.status(200).json(order);
    } catch (err) {
        res.status(500).json({ error: "Failed to assign order" });
    }
});

// Update order status to delivered
app.put("/orders/:id/delivered", verifyToken, async (req, res) => {
    if (req.user.role !== 'delivery_personnel') {
        return res.status(403).json({ error: "Access denied" });
    }

    try {
        const order = await Order.findOneAndUpdate(
            { 
                _id: req.params.id,
                deliveryPersonnelId: req.user.userId,
                status: 'on_the_way'
            },
            { 
                status: 'delivered',
                updatedAt: Date.now()
            },
            { new: true }
        );

        if (!order) {
            return res.status(404).json({ error: "Order not found or not assigned to you" });
        }

        // Process payment
        try {
            await axios.post(`http://localhost:5004/payments/process`, {
                orderId: order._id,
                amount: order.totalAmount,
                customerId: order.customerId
            });
        } catch (paymentErr) {
            console.error("Failed to process payment:", paymentErr.message);
        }

        // Notify customer
        try {
            await axios.post(`http://notification-service:5005/notify/customer`, {
                customerId: order.customerId,
                orderId: order._id,
                message: `Your order has been delivered: Order #${order._id}`
            });
        } catch (notifyErr) {
            console.error("Failed to notify customer:", notifyErr.message);
        }

        res.status(200).json(order);
    } catch (err) {
        res.status(500).json({ error: "Failed to update order status" });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Order service started at http://localhost:${port}`);
});