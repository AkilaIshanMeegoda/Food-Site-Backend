// payment-service/index.js
const express = require('express');
const mysql = require('mysql2/promise');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const app = express();

// Middleware
app.use(morgan('combined'));
app.use(helmet());
app.use(cors());
app.use(express.json());

// Database connection
let pool;
async function initDb() {
  pool = await mysql.createPool({
    host: process.env.DB_HOST || 'mysql-payment',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '2001',
    database: process.env.DB_NAME || 'payment_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  // Create tables if they don't exist
  await pool.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL UNIQUE,
      amount DECIMAL(10, 2) NOT NULL,
      payment_method VARCHAR(50) NOT NULL,
      status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
      transaction_id VARCHAR(255),
      payment_details TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
}

// JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware to verify JWT
const authenticate = (roles = []) => async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (roles.length && !roles.includes(decoded.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Simulate payment gateway (in a real app, integrate with actual payment provider)
async function processPayment(orderId, amount, paymentMethod, paymentDetails) {
  // Simulate API call to payment gateway
  return new Promise((resolve) => {
    setTimeout(() => {
      // Simulate random failures (10% chance)
      if (Math.random() < 0.1) {
        resolve({
          success: false,
          transactionId: null,
          error: 'Payment failed due to insufficient funds'
        });
      } else {
        resolve({
          success: true,
          transactionId: `txn_${Math.random().toString(36).substr(2, 9)}`,
          error: null
        });
      }
    }, 1000);
  });
}

// Routes
// Process payment
app.post('/', authenticate(['customer']), async (req, res) => {
  try {
    const { order_id, payment_method, payment_details } = req.body;
    
    if (!order_id || !payment_method) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Get order details
    const orderResponse = await axios.get(`http://order-service:3003/${order_id}`, {
      headers: { Authorization: `Bearer ${req.headers.authorization.split(' ')[1]}` }
    });
    const order = orderResponse.data;
    
    // Verify order belongs to requesting customer
    if (order.customer_id !== req.user.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    // Check if payment already exists
    const [existingPayments] = await pool.query('SELECT * FROM payments WHERE order_id = ?', [order_id]);
    
    if (existingPayments.length > 0) {
      return res.status(400).json({ error: 'Payment already processed for this order' });
    }
    
    // Process payment
    const paymentResult = await processPayment(
      order_id,
      order.total_amount,
      payment_method,
      payment_details
    );
    
    // Record payment
    const [result] = await pool.query(
      'INSERT INTO payments (order_id, amount, payment_method, status, transaction_id, payment_details) VALUES (?, ?, ?, ?, ?, ?)',
      [
        order_id,
        order.total_amount,
        payment_method,
        paymentResult.success ? 'completed' : 'failed',
        paymentResult.transactionId,
        JSON.stringify(payment_details)
      ]
    );
    
    // Update order status if payment successful
    if (paymentResult.success) {
      await axios.patch(
        `http://order-service:3003/${order_id}/status`,
        { status: 'confirmed' },
        { headers: { Authorization: `Bearer ${process.env.SERVICE_TOKEN}` } }
      );
      
      // Notify restaurant
      try {
        await axios.post('http://notification-service:3006/notify', {
          type: 'payment_received',
          order_id,
          restaurant_id: order.restaurant_id,
          amount: order.total_amount
        });
      } catch (notifyErr) {
        console.error('Failed to send notification:', notifyErr);
      }
    }
    
    const [payment] = await pool.query('SELECT * FROM payments WHERE id = ?', [result.insertId]);
    
    res.status(201).json({
      ...payment[0],
      success: paymentResult.success,
      error: paymentResult.error
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Payment processing failed' });
  }
});

// Get payment by order ID
app.get('/order/:id', authenticate(), async (req, res) => {
  try {
    const [payments] = await pool.query('SELECT * FROM payments WHERE order_id = ?', [req.params.id]);
    
    if (payments.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    
    const payment = payments[0];
    
    // Verify authorization
    if (req.user.role === 'customer') {
      // Get order to verify it belongs to this customer
      const orderResponse = await axios.get(`http://order-service:3003/${req.params.id}`, {
        headers: { Authorization: `Bearer ${req.headers.authorization.split(' ')[1]}` }
      });
      
      if (orderResponse.data.customer_id !== req.user.userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    } else if (req.user.role === 'restaurant_admin') {
      // Get order to verify it belongs to this restaurant
      const orderResponse = await axios.get(`http://order-service:3003/${req.params.id}`, {
        headers: { Authorization: `Bearer ${req.headers.authorization.split(' ')[1]}` }
      });
      
      // Verify the restaurant belongs to the requesting user
      const [restaurants] = await pool.query('SELECT * FROM restaurants WHERE id = ? AND owner_id = ?', [orderResponse.data.restaurant_id, req.user.userId]);
      
      if (restaurants.length === 0) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }
    
    res.json(payment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch payment' });
  }
});

// Initialize database and start server
initDb().then(() => {
  const PORT = process.env.PORT || 3005;
  app.listen(PORT, () => {
    console.log(`Payment service running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Database initialization failed:', err);
  process.exit(1);
});