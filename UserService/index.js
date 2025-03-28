const express = require("express");
const mongoose = require("mongoose");
const md5 = require("md5");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const port = 5000;

// MongoDB connection
mongoose.connect("mongodb+srv://akila:2001@cluster0.awsiu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0");

mongoose.set("strictQuery", false);

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
});

// Middleware
app.use(bodyParser.json());
app.use(cors({ origin: "*" }));

// JWT Secret Key
const JWT_SECRET = "your_jwt_secret_key"; // Change this to something more secure in production

// User Registration
app.post("/register", async (req, res) => {
    const { email, password } = req.body;

    // Check if the user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        return res.status(400).json({ error: "Email is already registered" });
    }

    // Create a new user
    const newUser = new User({
        email,
        password: md5(password), // Save the password in hashed form
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

    // Check if the password matches (hashed password)
    if (user.password === md5(password)) {
        // Create JWT token
        const token = jwt.sign(
            { userId: user._id, email: user.email },
            JWT_SECRET,
            { expiresIn: "1h" } // Token will expire in 1 hour
        );

        res.status(200).json({
            message: "Login successful",
            token: token, // Send back the JWT token
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
        req.user = decoded; // Store user info in request
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
        message: "Welcome to your profile",
    });
});

// Start server
app.listen(port, () => {
    console.log(`Server started at http://localhost:${port}`);
});
