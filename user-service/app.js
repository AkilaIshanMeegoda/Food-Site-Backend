const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

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

// User Schema
const UserSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  address: { type: String },
  role: { type: String, enum: ['customer', 'restaurant', 'delivery'], required: true },
  createdAt: { type: Date, default: Date.now }
});

// Restaurant-specific fields
UserSchema.add({
  restaurantName: { type: String },
  restaurantAddress: { type: String },
  cuisineType: { type: String },
  isVerified: { type: Boolean, default: false }
});

// Delivery-specific fields
UserSchema.add({
  vehicleType: { type: String },
  licenseNumber: { type: String },
  isAvailable: { type: Boolean, default: true }
});

const User = mongoose.model('User', UserSchema);

// Create user profile
app.post('/users', authenticate, async (req, res) => {
  try {
    const { userId, role } = req.user;
    const userData = req.body;
    
    // Ensure userId matches
    if (userData.userId !== userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    // Create or update user profile
    const user = await User.findOneAndUpdate(
      { userId },
      { ...userData, role },
      { new: true, upsert: true }
    );
    
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user profile
app.get('/users/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUser = req.user;
    
    // Users can only access their own profile or admin can access any
    if (userId !== requestingUser.userId && requestingUser.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all restaurants (for customers)
app.get('/restaurants', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'customer') {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    const restaurants = await User.find({ role: 'restaurant', isVerified: true });
    res.json(restaurants);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Verify restaurant (admin only)
app.put('/restaurants/:userId/verify', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    const { userId } = req.params;
    const restaurant = await User.findOneAndUpdate(
      { userId, role: 'restaurant' },
      { isVerified: true },
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

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`User service running on port ${PORT}`));