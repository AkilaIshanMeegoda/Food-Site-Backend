// order-backend.js

const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const jwt = require("jsonwebtoken");

const app = express();
const port = process.env.PORT || 5002;

// MongoDB connection
mongoose.connect("mongodb+srv://foodApp:2001@cluster0.afkbz0b.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0");

// Schemas
const MenuItemSchema = new mongoose.Schema({
    restaurantId: { type: String, required: true },
    id: { type: String, required: true }, // e.g., '101'
    name: String,
    description: String,
    price: Number,
    category: String,
    image: String,
    isAvailable: { type: Boolean, default: true }
});
const MenuItem = mongoose.model("MenuItem", MenuItemSchema);

const RestaurantSchema = new mongoose.Schema({
    id: { type: String, required: true }, // e.g., '1'
    name: String,
    cuisine: String,
    image: String,
    rating: Number,
    deliveryTime: String,
    isActive: { type: Boolean, default: true }
});
const Restaurant = mongoose.model("Restaurant", RestaurantSchema);

const OrderSchema = new mongoose.Schema({
    customerId: { type: String, required: true },
    restaurants: [{
        restaurantId: String,
        restaurantName: String,
        items: [{
            id: String,
            name: String,
            quantity: Number,
            price: Number
        }],
        subtotal: Number,
        status: { type: String, default: 'pending' }
    }],
    totalAmount: Number,
    deliveryAddress: String,
    deliveryInstructions: String,
    paymentMethod: String,
    status: { type: String, default: 'pending' }
}, { timestamps: true });
const Order = mongoose.model("Order", OrderSchema);

// Middleware
app.use(bodyParser.json());
app.use(cors({ origin: "*" }));

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key";
function verifyToken(req, res, next) {
    const authHeader = req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Access denied. Missing or invalid token format" });
    }
    const token = authHeader.split(" ")[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: "Invalid token" });
    }
}

// Create a new order (customer)
app.post("/orders", verifyToken, async (req, res) => {
    if (req.user.role !== 'customer') {
        return res.status(403).json({ error: "Only customers can place orders" });
    }

    const { restaurants, deliveryAddress, deliveryInstructions, paymentMethod } = req.body;

    try {
        let totalAmount = 0;
        const restaurantOrders = [];

        for (const restaurant of restaurants) {
            const { restaurantId, restaurantName, items } = restaurant;
            
            // Validate and calculate items
            let subtotal = 0;
            const orderItems = [];
            for (const item of items) {
                subtotal += item.price * item.quantity;
                orderItems.push({
                    id: item.id,
                    name: item.name,
                    quantity: item.quantity,
                    price: item.price
                });
            }
            totalAmount += subtotal;
            restaurantOrders.push({
                restaurantId,
                restaurantName: restaurantName,
                items: orderItems,
                subtotal,
                status: 'pending'
            });
        }

        const order = new Order({
            customerId: req.user.userId,
            restaurants: restaurantOrders,
            totalAmount,
            deliveryAddress,
            deliveryInstructions,
            paymentMethod,
            status: 'pending'
        });

        await order.save();
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

// Get order details (customer)
app.get("/orders/:id", verifyToken, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }
        if (req.user.role === 'customer' && order.customerId !== req.user.userId) {
            return res.status(403).json({ error: "Access denied" });
        }
        res.status(200).json(order);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch order details" });
    }
});

// (Optional) Admin and delivery endpoints can be added similarly

// Start server
app.listen(port, () => {
    console.log(`Order service started at http://localhost:${port}`);
});
