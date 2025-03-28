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

// Payment Schema
const PaymentSchema = new mongoose.Schema({
  paymentId: { type: String, required: true, unique: true },
  orderId: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'LKR' },
  method: { type: String, enum: ['card', 'online_banking', 'mobile_wallet'], required: true },
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  gatewayResponse: { type: Object },
  createdAt: { type: Date, default: Date.now }
});

const Payment = mongoose.model('Payment', PaymentSchema);

// Mock payment gateway integration
const processPayment = async (paymentData) => {
  // In a real app, this would integrate with PayHere, Dialog Genie, etc.
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        transactionId: `txn_${Math.random().toString(36).substr(2, 9)}`,
        status: 'completed'
      });
    }, 1000);
  });
};

// Process payment
app.post('/payments', authenticate, async (req, res) => {
  try {
    const { orderId, amount, method } = req.body;
    const { userId, role } = req.user;
    
    // Verify order exists and belongs to customer
    let order;
    try {
      const response = await axios.get(`http://order-service:3004/orders/${orderId}`, {
        headers: { Authorization: req.headers['authorization'] }
      });
      order = response.data;
    } catch (error) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    if (order.customerId !== userId || role !== 'customer') {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    // Verify amount matches order total
    if (order.totalAmount !== amount) {
      return res.status(400).json({ message: 'Amount does not match order total' });
    }
    
    // Process payment
    const paymentResponse = await processPayment({
      orderId,
      amount,
      method,
      customerId: userId
    });
    
    // Create payment record
    const payment = new Payment({
      paymentId: mongoose.Types.ObjectId().toString(),
      orderId,
      amount,
      method,
      status: paymentResponse.success ? 'completed' : 'failed',
      gatewayResponse: paymentResponse
    });
    
    await payment.save();
    
    // Update order payment status
    try {
      await axios.put(`http://order-service:3004/orders/${orderId}/status`, {
        paymentStatus: paymentResponse.success ? 'paid' : 'failed'
      }, {
        headers: { Authorization: req.headers['authorization'] }
      });
    } catch (error) {
      console.error('Failed to update order:', error.message);
    }
    
    // Send payment confirmation
    try {
      await axios.post('http://notification-service:3006/notify', {
        type: 'payment_confirmation',
        orderId: orderId,
        customerId: userId,
        status: paymentResponse.success ? 'paid' : 'failed'
      });
    } catch (error) {
      console.error('Failed to send notification:', error.message);
    }
    
    res.status(201).json(payment);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get payment details
app.get('/payments/:paymentId', authenticate, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { userId, role } = req.user;
    
    const payment = await Payment.findOne({ paymentId });
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }
    
    // Verify order belongs to customer or user is admin/restaurant
    let order;
    try {
      const response = await axios.get(`http://order-service:3004/orders/${payment.orderId}`, {
        headers: { Authorization: req.headers['authorization'] }
      });
      order = response.data;
    } catch (error) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    if (order.customerId !== userId && 
        order.restaurantId !== userId && 
        role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    res.json(payment);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

const PORT = process.env.PORT || 3007;
app.listen(PORT, () => console.log(`Payment service running on port ${PORT}`));