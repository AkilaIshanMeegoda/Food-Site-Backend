// delivery-service/index.js
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
    host: process.env.DB_HOST || 'mysql-delivery',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '2001',
    database: process.env.DB_NAME || 'delivery_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  // Create tables if they don't exist
  await pool.query(`
    CREATE TABLE IF NOT EXISTS delivery_personnel (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL UNIQUE,
      vehicle_type VARCHAR(50),
      vehicle_number VARCHAR(50),
      is_available BOOLEAN DEFAULT TRUE,
      current_location POINT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS deliveries (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL UNIQUE,
      delivery_person_id INT NOT NULL,
      pickup_time DATETIME,
      delivery_time DATETIME,
      status ENUM('assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled') DEFAULT 'assigned',
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

// Routes
// Register as delivery personnel
app.post('/register', authenticate(['delivery_personnel']), async (req, res) => {
  try {
    const { vehicle_type, vehicle_number } = req.body;
    
    // Check if already registered
    const [existing] = await pool.query('SELECT * FROM delivery_personnel WHERE user_id = ?', [req.user.userId]);
    
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Already registered as delivery personnel' });
    }
    
    // Register
    await pool.query(
      'INSERT INTO delivery_personnel (user_id, vehicle_type, vehicle_number) VALUES (?, ?, ?)',
      [req.user.userId, vehicle_type, vehicle_number]
    );
    
    res.status(201).json({ message: 'Registered as delivery personnel' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Update availability
app.patch('/availability', authenticate(['delivery_personnel']), async (req, res) => {
  try {
    const { is_available } = req.body;
    
    if (typeof is_available !== 'boolean') {
      return res.status(400).json({ error: 'Invalid availability status' });
    }
    
    await pool.query(
      'UPDATE delivery_personnel SET is_available = ? WHERE user_id = ?',
      [is_available, req.user.userId]
    );
    
    res.json({ message: 'Availability updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update availability' });
  }
});

// Assign delivery to order
app.post('/assign', async (req, res) => {
  try {
    const { order_id } = req.body;
    
    if (!order_id) {
      return res.status(400).json({ error: 'Order ID is required' });
    }
    
    // Get order details
    const orderResponse = await axios.get(`http://order-service:3003/${order_id}`);
    const order = orderResponse.data;
    
    if (order.status !== 'ready_for_pickup') {
      return res.status(400).json({ error: 'Order is not ready for pickup' });
    }
    
    // Find available delivery personnel (simplified - in real app would consider location)
    const [availablePersonnel] = await pool.query(
      'SELECT * FROM delivery_personnel WHERE is_available = TRUE ORDER BY RAND() LIMIT 1'
    );
    
    if (availablePersonnel.length === 0) {
      return res.status(400).json({ error: 'No delivery personnel available' });
    }
    
    const deliveryPerson = availablePersonnel[0];
    
    // Assign delivery
    await pool.query(
      'INSERT INTO deliveries (order_id, delivery_person_id) VALUES (?, ?)',
      [order_id, deliveryPerson.user_id]
    );
    
    // Update order status
    await axios.patch(
      `http://order-service:3003/${order_id}/status`,
      { status: 'on_delivery' },
      { headers: { Authorization: `Bearer ${process.env.SERVICE_TOKEN}` } }
    );
    
    // Update delivery person availability
    await pool.query(
      'UPDATE delivery_personnel SET is_available = FALSE WHERE user_id = ?',
      [deliveryPerson.user_id]
    );
    
    // Notify delivery person (in a real app, this would be async via message queue)
    try {
      await axios.post('http://notification-service:3006/notify', {
        type: 'delivery_assigned',
        order_id,
        delivery_person_id: deliveryPerson.user_id
      });
    } catch (notifyErr) {
      console.error('Failed to send notification:', notifyErr);
    }
    
    res.status(201).json({ 
      message: 'Delivery assigned',
      delivery_person_id: deliveryPerson.user_id
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to assign delivery' });
  }
});

// Update delivery status
app.patch('/:id/status', authenticate(['delivery_personnel']), async (req, res) => {
  try {
    const { status } = req.body;
    const deliveryId = req.params.id;
    
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }
    
    // Verify this delivery is assigned to the requesting user
    const [deliveries] = await pool.query(
      'SELECT * FROM deliveries WHERE id = ? AND delivery_person_id = ?',
      [deliveryId, req.user.userId]
    );
    
    if (deliveries.length === 0) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    const delivery = deliveries[0];
    
    // Update delivery status
    const updateData = { status };
    
    if (status === 'picked_up') {
      updateData.pickup_time = new Date();
    } else if (status === 'delivered') {
      updateData.delivery_time = new Date();
      
      // Update delivery person availability
      await pool.query(
        'UPDATE delivery_personnel SET is_available = TRUE WHERE user_id = ?',
        [req.user.userId]
      );
      
      // Update order status
      await axios.patch(
        `http://order-service:3003/${delivery.order_id}/status`,
        { status: 'delivered' },
        { headers: { Authorization: `Bearer ${process.env.SERVICE_TOKEN}` } }
      );
    }
    
    await pool.query(
      'UPDATE deliveries SET ? WHERE id = ?',
      [updateData, deliveryId]
    );
    
    res.json({ message: 'Delivery status updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update delivery status' });
  }
});

// Get deliveries for current user
app.get('/', authenticate(['delivery_personnel']), async (req, res) => {
  try {
    const [deliveries] = await pool.query(
      'SELECT * FROM deliveries WHERE delivery_person_id = ? ORDER BY created_at DESC',
      [req.user.userId]
    );
    
    res.json(deliveries);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch deliveries' });
  }
});

// Initialize database and start server
initDb().then(() => {
  const PORT = process.env.PORT || 3004;
  app.listen(PORT, () => {
    console.log(`Delivery service running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Database initialization failed:', err);
  process.exit(1);
});