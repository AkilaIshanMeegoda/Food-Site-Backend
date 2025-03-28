const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const axios = require('axios');

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

// Delivery Person Schema
const DeliveryPersonSchema = new mongoose.Schema({
  deliveryPersonId: { type: String, required: true, unique: true },
  isAvailable: { type: Boolean, default: true },
  currentLocation: {
    lat: { type: Number },
    lng: { type: Number }
  },
  lastUpdated: { type: Date, default: Date.now }
});

const DeliveryPerson = mongoose.model('DeliveryPerson', DeliveryPersonSchema);

// Delivery Assignment Schema
const DeliveryAssignmentSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  deliveryPersonId: { type: String, required: true },
  restaurantLocation: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  deliveryLocation: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  status: { 
    type: String, 
    enum: ['assigned', 'picked_up', 'delivered'],
    default: 'assigned'
  },
  assignedAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const DeliveryAssignment = mongoose.model('DeliveryAssignment', DeliveryAssignmentSchema);

// Update delivery person availability
app.put('/delivery-persons/:deliveryPersonId/availability', authenticate, async (req, res) => {
  try {
    const { deliveryPersonId } = req.params;
    const { isAvailable } = req.body;
    const { userId, role } = req.user;
    
    if (role !== 'delivery' || userId !== deliveryPersonId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    const deliveryPerson = await DeliveryPerson.findOneAndUpdate(
      { deliveryPersonId },
      { isAvailable, lastUpdated: new Date() },
      { new: true, upsert: true }
    );
    
    res.json(deliveryPerson);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update delivery person location
app.put('/delivery-persons/:deliveryPersonId/location', authenticate, async (req, res) => {
  try {
    const { deliveryPersonId } = req.params;
    const { lat, lng } = req.body;
    const { userId, role } = req.user;
    
    if (role !== 'delivery' || userId !== deliveryPersonId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    const deliveryPerson = await DeliveryPerson.findOneAndUpdate(
      { deliveryPersonId },
      { 
        currentLocation: { lat, lng },
        lastUpdated: new Date() 
      },
      { new: true, upsert: true }
    );
    
    res.json(deliveryPerson);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Assign delivery person to order
app.post('/orders/:orderId/assign', authenticate, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { userId, role } = req.user;
    
    if (role !== 'restaurant') {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    // In a real app, we'd have a more sophisticated assignment algorithm
    const availableDeliveryPerson = await DeliveryPerson.findOne({ isAvailable: true });
    if (!availableDeliveryPerson) {
      return res.status(400).json({ message: 'No available delivery persons' });
    }
    
    // Get order details
    let order;
    try {
      const response = await axios.get(`http://order-service:3004/orders/${orderId}`);
      order = response.data;
    } catch (error) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Create delivery assignment
    const assignment = new DeliveryAssignment({
      orderId,
      deliveryPersonId: availableDeliveryPerson.deliveryPersonId,
      restaurantLocation: { lat: 6.9271, lng: 79.8612 }, // Default Colombo location
      deliveryLocation: { lat: 6.9271, lng: 79.8612 }, // Default Colombo location
      status: 'assigned'
    });
    
    await assignment.save();
    
    // Update order with delivery person
    try {
      await axios.put(`http://order-service:3004/orders/${orderId}/status`, {
        status: 'confirmed',
        deliveryPersonId: availableDeliveryPerson.deliveryPersonId
      }, {
        headers: { Authorization: req.headers['authorization'] }
      });
    } catch (error) {
      console.error('Failed to update order:', error.message);
    }
    
    // Update delivery person availability
    await DeliveryPerson.findOneAndUpdate(
      { deliveryPersonId: availableDeliveryPerson.deliveryPersonId },
      { isAvailable: false }
    );
    
    // Notify delivery person
    try {
      await axios.post('http://notification-service:3006/notify', {
        type: 'delivery_assignment',
        orderId: orderId,
        deliveryPersonId: availableDeliveryPerson.deliveryPersonId
      });
    } catch (error) {
      console.error('Failed to send notification:', error.message);
    }
    
    res.status(201).json(assignment);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get delivery assignments for delivery person
app.get('/delivery-persons/:deliveryPersonId/assignments', authenticate, async (req, res) => {
  try {
    const { deliveryPersonId } = req.params;
    const { userId, role } = req.user;
    
    if (role !== 'delivery' || userId !== deliveryPersonId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    const assignments = await DeliveryAssignment.find({ deliveryPersonId });
    res.json(assignments);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => console.log(`Delivery service running on port ${PORT}`));