const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 5000;

// MongoDB connection
mongoose.connect("mongodb+srv://akila:2001@cluster0.awsiu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0");

// User Schema
const User = mongoose.model("User", {
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ['customer', 'restaurant_admin', 'delivery_personnel'],
        required: true
    },
    restaurantId: {
        type: String,
        required: function() { return this.role === 'restaurant_admin'; }
    }
});

// Middleware
app.use(bodyParser.json());
app.use(cors({ origin: "*" }));

// JWT Secret Key
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key";

// User Registration
app.post("/register", async (req, res) => {
    const { email, password, role, restaurantId } = req.body;

    // Validate role
    if (!['customer', 'restaurant_admin', 'delivery_personnel'].includes(role)) {
        return res.status(400).json({ error: "Invalid role" });
    }

    // Check if the user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        return res.status(400).json({ error: "Email is already registered" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create a new user
    const newUser = new User({
        email,
        password: hashedPassword,
        role,
        restaurantId: role === 'restaurant_admin' ? restaurantId : undefined
    });

    try {
        await newUser.save();
        res.status(201).json({ message: "User registered successfully" });
    } catch (err) {
        res.status(500).json({ error: "Failed to register user" });
    }
});

// User Login with JWT Authentication
app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    // Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
        return res.status(400).json({ error: "User not found" });
    }

    // Check if the password matches
    const isMatch = await bcrypt.compare(password, user.password);
    if (isMatch) {
        // Create JWT token
        const token = jwt.sign(
            { 
                userId: user._id, 
                email: user.email,
                role: user.role,
                restaurantId: user.restaurantId
            },
            JWT_SECRET,
            { expiresIn: "1h" }
        );

        res.status(200).json({
            message: "Login successful",
            token: token,
            role: user.role
        });
    } else {
        res.status(400).json({ error: "Incorrect password" });
    }
});

// Middleware to verify JWT Token
function verifyToken(req, res, next) {
    const token = req.header("Authorization");
    if (!token) return res.status(401).json({ error: "Access denied" });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: "Invalid token" });
    }
}

// Protected Route (Example)
app.get("/profile", verifyToken, async (req, res) => {
    const userId = req.user.userId;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    res.status(200).json({
        email: user.email,
        role: user.role,
        message: "Welcome to your profile",
    });
});

// Get user role
app.get("/users/:userId/role", verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) return res.status(404).json({ error: "User not found" });
        
        res.status(200).json({ role: user.role });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});

// Start server
app.listen(port, () => {
    console.log(`User service started at http://localhost:${port}`);
});