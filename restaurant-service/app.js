const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Connect to MongoDB
mongoose.connect(
  "mongodb+srv://akila:2001@cluster0.awsiu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
);

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// Middleware to verify JWT
const authenticate = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token.split(' ')[1], JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Restaurant Menu Item Schema
const MenuItemSchema = new mongoose.Schema({
  restaurantId: { type: String, required: true },
  itemId: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  category: { type: String },
  isAvailable: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

const MenuItem = mongoose.model('MenuItem', MenuItemSchema);

// Restaurant Schema
const RestaurantSchema = new mongoose.Schema({
  restaurantId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  address: { type: String, required: true },
  cuisineType: { type: String, required: true },
  openingHours: { type: String },
  isOpen: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const Restaurant = mongoose.model('Restaurant', RestaurantSchema);

// Add menu item (restaurant admin only)
app.post('/restaurants/:restaurantId/menu', authenticate, async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { userId, role } = req.user;
    
    // Verify restaurant admin
    if (role !== 'restaurant') {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    // In a real app, we'd verify the user owns this restaurant
    const menuItem = new MenuItem({
      restaurantId,
      itemId: mongoose.Types.ObjectId().toString(),
      ...req.body
    });
    
    await menuItem.save();
    
    res.status(201).json(menuItem);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update menu item (restaurant admin only)
app.put('/restaurants/:restaurantId/menu/:itemId', authenticate, async (req, res) => {
  try {
    const { restaurantId, itemId } = req.params;
    const { userId, role } = req.user;
    
    if (role !== 'restaurant') {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    const menuItem = await MenuItem.findOneAndUpdate(
      { restaurantId, itemId },
      req.body,
      { new: true }
    );
    
    if (!menuItem) {
      return res.status(404).json({ message: 'Menu item not found' });
    }
    
    res.json(menuItem);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get restaurant menu (public)
app.get('/restaurants/:restaurantId/menu', async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const menuItems = await MenuItem.find({ restaurantId, isAvailable: true });
    res.json(menuItems);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update restaurant status (restaurant admin only)
app.put('/restaurants/:restaurantId/status', authenticate, async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { isOpen } = req.body;
    const { userId, role } = req.user;
    
    if (role !== 'restaurant') {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    const restaurant = await Restaurant.findOneAndUpdate(
      { restaurantId },
      { isOpen },
      { new: true }
    );
    
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }
    
    res.json(restaurant);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => console.log(`Restaurant service running on port ${PORT}`));