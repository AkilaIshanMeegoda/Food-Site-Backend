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
const OrderSchema = new mongoose.Schema({
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    restaurants: [{
        restaurantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Restaurant',
            required: true
        },
        restaurantName: String,
        items: [{
            menuItemId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'MenuItem',
                required: true
            },
            name: String,
            quantity: {
                type: Number,
                required: true,
                min: 1
            },
            price: {
                type: Number,
                required: true,
                min: 0
            }
        }],
        subtotal: {
            type: Number,
            required: true,
            min: 0
        },
        status: {
            type: String,
            enum: ['pending', 'confirmed', 'preparing', 'ready_for_pickup', 'on_the_way', 'delivered', 'cancelled'],
            default: 'pending'
        },
        preparationTime: Number // in minutes
    }],
    totalAmount: {
        type: Number,
        required: true,
        min: 0
    },
    deliveryAddress: {
        type: String,
        required: true
    },
    deliveryInstructions: String,
    status: {
        type: String,
        enum: ['pending', 'processing', 'partially_ready', 'ready_for_delivery', 'on_the_way', 'delivered', 'cancelled'],
        default: 'pending'
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'refunded'],
        default: 'pending'
    },
    paymentMethod: String,
    deliveryPersonnelId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    deliveryRoute: [{
        restaurantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Restaurant'
        },
        restaurantName: String,
        address: String,
        orderReady: Boolean,
        pickupTime: Date
    }]
}, { timestamps: true });

const Order = mongoose.model("Order", OrderSchema);

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

    const token = authHeader.split(" ")[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: "Invalid token" });
    }
}

// Helper function to calculate optimal delivery route
async function calculateDeliveryRoute(restaurantIds, deliveryAddress) {
    try {
        const restaurantsResponse = await axios.post(`http://restaurant-service:5001/restaurants/batch`, {
            restaurantIds
        });
        
        return restaurantsResponse.data.map(restaurant => ({
            restaurantId: restaurant._id,
            restaurantName: restaurant.name,
            address: restaurant.address,
            orderReady: false,
            pickupTime: null
        }));
    } catch (err) {
        console.error("Failed to calculate delivery route:", err);
        return null;
    }
}

// Create a new order with items from multiple restaurants
app.post("/orders", verifyToken, async (req, res) => {
    if (req.user.role !== 'customer') {
        return res.status(403).json({ error: "Only customers can place orders" });
    }

    const { restaurants, deliveryAddress, deliveryInstructions, paymentMethod } = req.body;
    
    try {
        let totalAmount = 0;
        const restaurantOrders = [];

        // Validate each restaurant's items and calculate totals
        for (const restaurant of restaurants) {
            const { restaurantId, items } = restaurant;
            
            // Fetch restaurant details
            const restaurantResponse = await axios.get(`http://restaurant-service:5001/restaurants/${restaurantId}`);
            if (!restaurantResponse.data || !restaurantResponse.data.isActive) {
                return res.status(404).json({ error: `Restaurant ${restaurantId} not found or inactive` });
            }

            // Fetch menu items to validate and calculate subtotal
            const menuItemsResponse = await axios.get(`http://restaurant-service:5001/restaurants/${restaurantId}/menu-items`);
            const menuItems = menuItemsResponse.data;

            // Validate items and calculate subtotal
            let subtotal = 0;
            const orderItems = [];

            for (const item of items) {
                const menuItem = menuItems.find(mi => mi._id === item.menuItemId);
                if (!menuItem || !menuItem.isAvailable) {
                    return res.status(400).json({ error: `Menu item ${item.menuItemId} not found or unavailable` });
                }
                subtotal += menuItem.price * item.quantity;
                orderItems.push({
                    menuItemId: item.menuItemId,
                    name: menuItem.name,
                    quantity: item.quantity,
                    price: menuItem.price
                });
            }

            totalAmount += subtotal;
            restaurantOrders.push({
                restaurantId,
                restaurantName: restaurantResponse.data.name,
                items: orderItems,
                subtotal,
                status: 'pending',
                preparationTime: restaurantResponse.data.averagePreparationTime || 30
            });
        }

        // Calculate delivery route
        const deliveryRoute = await calculateDeliveryRoute(
            restaurants.map(r => r.restaurantId),
            deliveryAddress
        );

        if (!deliveryRoute) {
            return res.status(500).json({ error: "Failed to calculate delivery route" });
        }

        // Create order
        const order = new Order({
            customerId: req.user.userId,
            restaurants: restaurantOrders,
            totalAmount,
            deliveryAddress,
            deliveryInstructions,
            paymentMethod,
            status: 'pending',
            deliveryRoute
        });

        await order.save();

        // Process payment
        try {
            const paymentResponse = await axios.post(`http://payment-service:5004/payments/process`, {
                orderId: order._id,
                amount: order.totalAmount,
                customerId: order.customerId,
                paymentMethod
            });
            
            order.paymentStatus = paymentResponse.data.status;
            await order.save();
        } catch (paymentErr) {
            console.error("Payment processing failed:", paymentErr.message);
            order.paymentStatus = 'failed';
            await order.save();
            return res.status(400).json({ error: "Payment processing failed" });
        }

        // Notify each restaurant
        for (const restaurant of order.restaurants) {
            try {
                await axios.post(`http://notification-service:5005/notify/restaurant`, {
                    restaurantId: restaurant.restaurantId,
                    orderId: order._id,
                    message: `New order received: Order #${order._id}`
                });
            } catch (notifyErr) {
                console.error(`Failed to notify restaurant ${restaurant.restaurantId}:`, notifyErr.message);
            }
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
        const orders = await Order.find({ customerId: req.user.userId })
            .sort({ createdAt: -1 })
            .populate('restaurants.restaurantId', 'name')
            .populate('deliveryPersonnelId', 'name');
        
        res.status(200).json(orders);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch orders" });
    }
});

// Get orders for restaurant admin
app.get("/orders/restaurant", verifyToken, async (req, res) => {
    if (req.user.role !== 'restaurant_admin') {
        return res.status(403).json({ error: "Access denied" });
    }

    try {
        const restaurant = await axios.get(`http://restaurant-service:5001/restaurants/my-restaurant`, {
            headers: { Authorization: req.header("Authorization") }
        });
        
        const orders = await Order.find({ 
            "restaurants.restaurantId": restaurant.data._id 
        })
        .sort({ createdAt: -1 })
        .populate('customerId', 'name');

        // Filter to only include this restaurant's portion of each order
        const filteredOrders = orders.map(order => {
            const restaurantOrder = order.restaurants.find(r => r.restaurantId.toString() === restaurant.data._id.toString());
            return {
                _id: order._id,
                customer: order.customerId,
                restaurantOrder,
                orderStatus: order.status,
                deliveryAddress: order.deliveryAddress,
                deliveryInstructions: order.deliveryInstructions,
                createdAt: order.createdAt,
                updatedAt: order.updatedAt
            };
        });

        res.status(200).json(filteredOrders);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch orders" });
    }
});

// Update restaurant portion of an order status
app.put("/orders/:id/restaurant-status", verifyToken, async (req, res) => {
    if (req.user.role !== 'restaurant_admin') {
        return res.status(403).json({ error: "Access denied" });
    }

    const { status } = req.body;
    const allowedStatuses = ['confirmed', 'preparing', 'ready_for_pickup', 'cancelled'];

    if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status update" });
    }

    try {
        const restaurant = await axios.get(`http://restaurant-service:5001/restaurants/my-restaurant`, {
            headers: { Authorization: req.header("Authorization") }
        });
        
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        const restaurantOrder = order.restaurants.find(r => 
            r.restaurantId.toString() === restaurant.data._id.toString()
        );
        
        if (!restaurantOrder) {
            return res.status(404).json({ error: "This order doesn't contain items from your restaurant" });
        }

        restaurantOrder.status = status;
        order.updatedAt = new Date();

        // Update overall order status based on all restaurants' statuses
        const allRestaurantsReady = order.restaurants.every(r => 
            r.status === 'ready_for_pickup' || r.status === 'delivered' || r.status === 'cancelled'
        );
        
        const anyRestaurantCancelled = order.restaurants.some(r => r.status === 'cancelled');
        
        if (anyRestaurantCancelled) {
            order.status = 'cancelled';
        } else if (allRestaurantsReady) {
            order.status = 'ready_for_delivery';
        } else if (order.restaurants.some(r => r.status === 'ready_for_pickup')) {
            order.status = 'partially_ready';
        }

        await order.save();

        // Notify customer if status changed to ready_for_pickup
        if (status === 'ready_for_pickup') {
            try {
                await axios.post(`http://notification-service:5005/notify/customer`, {
                    customerId: order.customerId,
                    orderId: order._id,
                    message: `Part of your order is ready for pickup: Order #${order._id}`
                });
            } catch (notifyErr) {
                console.error("Failed to notify customer:", notifyErr.message);
            }
        }

        res.status(200).json({
            orderId: order._id,
            restaurantOrder,
            orderStatus: order.status
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update order status" });
    }
});

// Get available orders for delivery personnel
app.get("/orders/delivery/available", verifyToken, async (req, res) => {
    if (req.user.role !== 'delivery_personnel') {
        return res.status(403).json({ error: "Access denied" });
    }

    try {
        const orders = await Order.find({ 
            status: 'ready_for_delivery',
            deliveryPersonnelId: { $exists: false }
        })
        .sort({ updatedAt: -1 })
        .populate('restaurants.restaurantId', 'name address');
        
        res.status(200).json(orders);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch available orders" });
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
                status: 'ready_for_delivery',
                deliveryPersonnelId: { $exists: false }
            },
            { 
                deliveryPersonnelId: req.user.userId,
                status: 'on_the_way',
                updatedAt: new Date()
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

        // Start delivery tracking
        try {
            await axios.post(`http://delivery-service:5003/delivery/start`, {
                orderId: order._id,
                deliveryPersonnelId: req.user.userId,
                route: order.deliveryRoute,
                deliveryAddress: order.deliveryAddress
            });
        } catch (deliveryErr) {
            console.error("Failed to start delivery tracking:", deliveryErr.message);
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
                updatedAt: new Date(),
                'restaurants.$[].status': 'delivered'
            },
            { new: true }
        );

        if (!order) {
            return res.status(404).json({ error: "Order not found or not assigned to you" });
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

// Get order details
app.get("/orders/:id", verifyToken, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('restaurants.restaurantId', 'name address phone')
            .populate('customerId', 'name email')
            .populate('deliveryPersonnelId', 'name phone');

        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        // Authorization checks
        if (req.user.role === 'customer' && order.customerId._id.toString() !== req.user.userId) {
            return res.status(403).json({ error: "Access denied" });
        }

        if (req.user.role === 'restaurant_admin') {
            const restaurant = await axios.get(`http://restaurant-service:5001/restaurants/my-restaurant`, {
                headers: { Authorization: req.header("Authorization") }
            });
            
            if (!order.restaurants.some(r => r.restaurantId._id.toString() === restaurant.data._id.toString())) {
                return res.status(403).json({ error: "Access denied" });
            }
        }

        if (req.user.role === 'delivery_personnel' && 
            (!order.deliveryPersonnelId || order.deliveryPersonnelId._id.toString() !== req.user.userId)) {
            return res.status(403).json({ error: "Access denied" });
        }

        res.status(200).json(order);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch order details" });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Order service started at http://localhost:${port}`);
});