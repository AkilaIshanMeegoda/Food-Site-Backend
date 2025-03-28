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

// Order Schema
const OrderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  customerId: { type: String, required: true },
  restaurantId: { type: String, required: true },
  items: [{
    itemId: { type: String, required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true }
  }],
  totalAmount: { type: Number, required: true },
  deliveryAddress: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'delivered', 'cancelled'],
    default: 'pending'
  },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
  deliveryPersonId: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Order = mongoose.model('Order', OrderSchema);

// Create order (customer only)
app.post('/orders', authenticate, async (req, res) => {
  try {
    const { userId, role } = req.user;
    
    if (role !== 'customer') {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    const orderData = {
      orderId: mongoose.Types.ObjectId().toString(),
      customerId: userId,
      ...req.body,
      status: 'pending',
      paymentStatus: 'pending'
    };
    
    const order = new Order(orderData);
    await order.save();
    
    // Notify restaurant (in a real app, this would be async via message queue)
    try {
      await axios.post('http://notification-service:3006/notify', {
        type: 'new_order',
        orderId: order.orderId,
        restaurantId: order.restaurantId
      });
    } catch (error) {
      console.error('Failed to send notification:', error.message);
    }
    
    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get order details
app.get('/orders/:orderId', authenticate, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { userId, role } = req.user;
    
    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Check authorization
    if (order.customerId !== userId && 
        order.restaurantId !== userId && 
        order.deliveryPersonId !== userId && 
        role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get orders by customer
app.get('/customers/:customerId/orders', authenticate, async (req, res) => {
  try {
    const { customerId } = req.params;
    const { userId, role } = req.user;
    
    if (customerId !== userId && role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    const orders = await Order.find({ customerId }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update order status (restaurant admin only)
app.put('/orders/:orderId/status', authenticate, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const { userId, role } = req.user;
    
    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Only restaurant admin can update status to preparing/ready
    if (role === 'restaurant' && order.restaurantId === userId) {
      if (['preparing', 'ready', 'cancelled'].includes(status)) {
        order.status = status;
        order.updatedAt = new Date();
        await order.save();
        
        // Notify customer
        try {
          await axios.post('http://notification-service:3006/notify', {
            type: 'order_status',
            orderId: order.orderId,
            customerId: order.customerId,
            status: status
          });
        } catch (error) {
          console.error('Failed to send notification:', error.message);
        }
        
        return res.json(order);
      }
    }
    
    // Delivery person can update status to picked_up/delivered
    if (role === 'delivery' && order.deliveryPersonId === userId) {
      if (['picked_up', 'delivered'].includes(status)) {
        order.status = status;
        order.updatedAt = new Date();
        await order.save();
        
        // Notify customer
        try {
          await axios.post('http://notification-service:3006/notify', {
            type: 'order_status',
            orderId: order.orderId,
            customerId: order.customerId,
            status: status
          });
        } catch (error) {
          console.error('Failed to send notification:', error.message);
        }
        
        return res.json(order);
      }
    }
    
    return res.status(403).json({ message: 'Unauthorized' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

const PORT = process.env.PORT || 3004;
app.listen(PORT, () => console.log(`Order service running on port ${PORT}`));