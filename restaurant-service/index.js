// const express = require("express");
// const mongoose = require("mongoose");
// const bodyParser = require("body-parser");
// const cors = require("cors");
// const jwt = require("jsonwebtoken");

// const app = express();
// const port = process.env.PORT || 5001;

// // MongoDB connection
// mongoose.connect("mongodb+srv://foodApp:2001@cluster0.afkbz0b.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0");

// // Restaurant Schema
// const Restaurant = mongoose.model("Restaurant", {
//     name: {
//         type: String,
//         required: true
//     },
//     address: {
//         type: String,
//         required: true
//     },
//     phone: {
//         type: String,
//         required: true
//     },
//     isActive: {
//         type: Boolean,
//         default: true
//     },
//     adminId: {
//         type: String,
//         required: true
//     }
// });

// // Menu Item Schema
// const MenuItem = mongoose.model("MenuItem", {
//     restaurantId: {
//         type: String,
//         required: true
//     },
//     name: {
//         type: String,
//         required: true
//     },
//     description: {
//         type: String
//     },
//     price: {
//         type: Number,
//         required: true
//     },
//     category: {
//         type: String
//     },
//     isAvailable: {
//         type: Boolean,
//         default: true
//     }
// });

// // Middleware
// app.use(bodyParser.json());
// app.use(cors({ origin: "*" }));

// // JWT Secret Key
// const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key";

// // Middleware to verify JWT Token and check restaurant admin role
// function verifyRestaurantAdmin(req, res, next) {
//     const authHeader = req.header("Authorization");
//     if (!authHeader || !authHeader.startsWith("Bearer ")) {
//         return res.status(401).json({ error: "Access denied. Missing or invalid token format" });
//     }

//     const token = authHeader.split(" ")[1]; // Extract token after "Bearer"

//     try {
//         const decoded = jwt.verify(token, JWT_SECRET);
//         if (decoded.role !== 'restaurant_admin') {
//             return res.status(403).json({ error: "Access denied. Restaurant admin role required" });
//         }
//         req.user = decoded;
//         next();
//     } catch (error) {
//         res.status(401).json({ error: "Invalid token" });
//     }
// }

// // Create a new restaurant
// app.post("/restaurants", verifyRestaurantAdmin, async (req, res) => {
//     const { name, address, phone } = req.body;
    
//     // Check if restaurant already exists for this admin
//     const existingRestaurant = await Restaurant.findOne({ adminId: req.user.userId });
//     if (existingRestaurant) {
//         return res.status(400).json({ error: "You already have a restaurant registered" });
//     }

//     const restaurant = new Restaurant({
//         name,
//         address,
//         phone,
//         adminId: req.user.userId
//     });

//     try {
//         await restaurant.save();
//         res.status(201).json(restaurant);
//     } catch (err) {
//         res.status(500).json({ error: "Failed to create restaurant" });
//     }
// });

// // Get restaurant by admin ID
// app.get("/restaurants/my-restaurant", verifyRestaurantAdmin, async (req, res) => {
//     try {
//         const restaurant = await Restaurant.findOne({ adminId: req.user.userId });
//         if (!restaurant) {
//             return res.status(404).json({ error: "Restaurant not found" });
//         }
//         res.status(200).json(restaurant);
//     } catch (err) {
//         res.status(500).json({ error: "Failed to fetch restaurant" });
//     }
// });

// // Update restaurant
// app.put("/restaurants/:id", verifyRestaurantAdmin, async (req, res) => {
//     try {
//         const restaurant = await Restaurant.findOneAndUpdate(
//             { _id: req.params.id, adminId: req.user.userId },
//             req.body,
//             { new: true }
//         );
//         if (!restaurant) {
//             return res.status(404).json({ error: "Restaurant not found" });
//         }
//         res.status(200).json(restaurant);
//     } catch (err) {
//         res.status(500).json({ error: "Failed to update restaurant" });
//     }
// });

// // Add menu item
// app.post("/menu-items", verifyRestaurantAdmin, async (req, res) => {
//     const restaurant = await Restaurant.findOne({ adminId: req.user.userId });
//     if (!restaurant) {
//         return res.status(404).json({ error: "Restaurant not found" });
//     }

//     const menuItem = new MenuItem({
//         restaurantId: restaurant._id,
//         ...req.body
//     });

//     try {
//         await menuItem.save();
//         res.status(201).json(menuItem);
//     } catch (err) {
//         res.status(500).json({ error: "Failed to add menu item" });
//     }
// });

// // Get all menu items for a restaurant
// app.get("/menu-items", verifyRestaurantAdmin, async (req, res) => {
//     const restaurant = await Restaurant.findOne({ adminId: req.user.userId });
//     if (!restaurant) {
//         return res.status(404).json({ error: "Restaurant not found" });
//     }

//     try {
//         const menuItems = await MenuItem.find({ restaurantId: restaurant._id });
//         res.status(200).json(menuItems);
//     } catch (err) {
//         res.status(500).json({ error: "Failed to fetch menu items" });
//     }
// });

// // Update menu item
// app.put("/menu-items/:id", verifyRestaurantAdmin, async (req, res) => {
//     try {
//         const restaurant = await Restaurant.findOne({ adminId: req.user.userId });
//         if (!restaurant) {
//             return res.status(404).json({ error: "Restaurant not found" });
//         }

//         const menuItem = await MenuItem.findOneAndUpdate(
//             { _id: req.params.id, restaurantId: restaurant._id },
//             req.body,
//             { new: true }
//         );
//         if (!menuItem) {
//             return res.status(404).json({ error: "Menu item not found" });
//         }
//         res.status(200).json(menuItem);
//     } catch (err) {
//         res.status(500).json({ error: "Failed to update menu item" });
//     }
// });

// // Delete menu item
// app.delete("/menu-items/:id", verifyRestaurantAdmin, async (req, res) => {
//     try {
//         const restaurant = await Restaurant.findOne({ adminId: req.user.userId });
//         if (!restaurant) {
//             return res.status(404).json({ error: "Restaurant not found" });
//         }

//         const menuItem = await MenuItem.findOneAndDelete({ 
//             _id: req.params.id, 
//             restaurantId: restaurant._id 
//         });
//         if (!menuItem) {
//             return res.status(404).json({ error: "Menu item not found" });
//         }
//         res.status(200).json({ message: "Menu item deleted successfully" });
//     } catch (err) {
//         res.status(500).json({ error: "Failed to delete menu item" });
//     }
// });

// // Public endpoints (no authentication required)

// // Get all active restaurants
// app.get("/public/restaurants", async (req, res) => {
//     try {
//         const restaurants = await Restaurant.find({ isActive: true });
//         res.status(200).json(restaurants);
//     } catch (err) {
//         res.status(500).json({ error: "Failed to fetch restaurants" });
//     }
// });

// // Get menu items for a restaurant
// app.get("/public/restaurants/:id/menu-items", async (req, res) => {
//     try {
//         const restaurant = await Restaurant.findById(req.params.id);
//         if (!restaurant || !restaurant.isActive) {
//             return res.status(404).json({ error: "Restaurant not found or inactive" });
//         }

//         const menuItems = await MenuItem.find({ 
//             restaurantId: req.params.id,
//             isAvailable: true 
//         });
//         res.status(200).json(menuItems);
//     } catch (err) {
//         res.status(500).json({ error: "Failed to fetch menu items" });
//     }
// });

// app.get("/public/restaurants/:id", async (req, res) => {
//     try {
//         const restaurant = await Restaurant.findById(req.params.id);
//         if (!restaurant || !restaurant.isActive) {
//             return res.status(404).json({ error: "Restaurant not found or inactive" });
//         }
//         res.status(200).json(restaurant);
//     } catch (err) {
//         res.status(500).json({ error: "Failed to fetch restaurant" });
//     }
// });

// // Start server
// app.listen(port, () => {
//     console.log(`Restaurant service started at http://localhost:${port}`);
// });