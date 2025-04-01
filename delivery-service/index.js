const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const axios = require("axios");

const app = express();
const port = process.env.PORT || 5003;

// MongoDB connection
mongoose.connect("mongodb+srv://foodApp:2001@cluster0.afkbz0b.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0");

// Delivery Personnel Schema
const DeliveryPersonnel = mongoose.model("DeliveryPersonnel", {
    userId: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    vehicleType: {
        type: String,
        required: true
    },
    vehicleNumber: {
        type: String,
        required: true
    },
    isAvailable: {
        type: Boolean,
        default: true
    },
    currentLocation: {
        type: String
    }
});

// Middleware
app.use(bodyParser.json());
app.use(cors({ origin: "*" }));

// JWT Secret Key
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key";

// Middleware to verify JWT Token and check delivery personnel role
function verifyDeliveryPersonnel(req, res, next) {
    const authHeader = req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Access denied. Missing or invalid token format" });
    }

    const token = authHeader.split(" ")[1]; // Extract token after "Bearer"

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role !== 'delivery_personnel') {
            return res.status(403).json({ error: "Access denied. Delivery personnel role required" });
        }
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: "Invalid token" });
    }
}

// Register delivery personnel
app.post("/delivery-personnel", verifyDeliveryPersonnel, async (req, res) => {
    const { name, phone, vehicleType, vehicleNumber } = req.body;

    // Check if already registered
    const existingPersonnel = await DeliveryPersonnel.findOne({ userId: req.user.userId });
    if (existingPersonnel) {
        return res.status(400).json({ error: "You are already registered as delivery personnel" });
    }

    const personnel = new DeliveryPersonnel({
        userId: req.user.userId,
        name,
        phone,
        vehicleType,
        vehicleNumber
    });

    try {
        await personnel.save();
        res.status(201).json(personnel);
    } catch (err) {
        res.status(500).json({ error: "Failed to register delivery personnel" });
    }
});

// Update availability
app.put("/delivery-personnel/availability", verifyDeliveryPersonnel, async (req, res) => {
    const { isAvailable, currentLocation } = req.body;

    try {
        const personnel = await DeliveryPersonnel.findOneAndUpdate(
            { userId: req.user.userId },
            { isAvailable, currentLocation },
            { new: true }
        );
        if (!personnel) {
            return res.status(404).json({ error: "Delivery personnel not found" });
        }
        res.status(200).json(personnel);
    } catch (err) {
        res.status(500).json({ error: "Failed to update availability" });
    }
});

// Get delivery personnel profile
app.get("/delivery-personnel/me", verifyDeliveryPersonnel, async (req, res) => {
    try {
        const personnel = await DeliveryPersonnel.findOne({ userId: req.user.userId });
        if (!personnel) {
            return res.status(404).json({ error: "Delivery personnel not found" });
        }
        res.status(200).json(personnel);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch profile" });
    }
});

// Get available delivery personnel
app.get("/delivery-personnel/available", async (req, res) => {
    try {
        const personnel = await DeliveryPersonnel.find({ isAvailable: true });
        res.status(200).json(personnel);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch available personnel" });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Delivery service started at http://localhost:${port}`);
});