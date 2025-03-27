// order-service/index.js
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
    host: process.env.DB_HOST || 'mysql-order',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '2001',
    database: process.env.DB_NAME || 'order_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  // Create tables if they don't exist
  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customer_id INT NOT NULL,
      restaurant_id INT NOT NULL,
      status ENUM('pending', 'confirmed', 'preparing', 'ready_for_pickup', 'on_delivery', 'delivered', 'cancelled') DEFAULT 'pending',
      total_amount DECIMAL(10, 2) NOT NULL,
      delivery_address TEXT NOT NULL,
      delivery_instructions TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      menu_item_id INT NOT NULL,
      quantity INT NOT NULL DEFAULT 1,
      price_at_order DECIMAL(10, 2) NOT NULL,
      special_instructions TEXT,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
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
// Create order (customer only)
app.post('/', authenticate(['customer']), async (req, res) => {
  try {
    const { restaurant_id, items, delivery_address, delivery_instructions } = req.body;
    
    if (!restaurant_id || !items || !delivery_address || items.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Verify restaurant exists and get menu items
    const restaurantResponse = await axios.get(`http://restaurant-service:3002/${restaurant_id}`);
    const restaurant = restaurantResponse.data;
    
    // Calculate total and validate items
    let total = 0;
    const orderItems = [];
    
    for (const item of items) {
      const menuItem = restaurant.menu.find(mi => mi.id === item.menu_item_id);
      
      if (!menuItem) {
        return res.status(400).json({ error: `Menu item ${item.menu_item_id} not found` });
      }
      
      if (!menuItem.is_available) {
        return res.status(400).json({ error: `Menu item ${menuItem.name} is not available` });
      }
      
      const quantity = item.quantity || 1;
      total += menuItem.price * quantity;
      
      orderItems.push({
        menu_item_id: menuItem.id,
        quantity,
        price_at_order: menuItem.price,
        special_instructions: item.special_instructions
      });
    }
    
    // Create order
    const [orderResult] = await pool.query(
      'INSERT INTO orders (customer_id, restaurant_id, total_amount, delivery_address, delivery_instructions) VALUES (?, ?, ?, ?, ?)',
      [req.user.userId, restaurant_id, total, delivery_address, delivery_instructions]
    );
    
    // Add order items
    for (const item of orderItems) {
      await pool.query(
        'INSERT INTO order_items (order_id, menu_item_id, quantity, price_at_order, special_instructions) VALUES (?, ?, ?, ?, ?)',
        [orderResult.insertId, item.menu_item_id, item.quantity, item.price_at_order, item.special_instructions]
      );
    }
    
    // Get full order details
    const [order] = await pool.query('SELECT * FROM orders WHERE id = ?', [orderResult.insertId]);
    const [itemsResult] = await pool.query('SELECT * FROM order_items WHERE order_id = ?', [orderResult.insertId]);
    
    // Notify restaurant (in a real app, this would be async via message queue)
    try {
      await axios.post('http://notification-service:3006/notify', {
        type: 'new_order',
        order_id: orderResult.insertId,
        restaurant_id,
        customer_id: req.user.userId
      });
    } catch (notifyErr) {
      console.error('Failed to send notification:', notifyErr);
    }
    
    res.status(201).json({
      ...order[0],
      items: itemsResult
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Get order by ID
app.get('/:id', authenticate(), async (req, res) => {
  try {
    const [orders] = await pool.query('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    
    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const order = orders[0];
    
    // Check if user is authorized to view this order
    if (req.user.role === 'customer' && order.customer_id !== req.user.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    if (req.user.role === 'restaurant_admin') {
      // Verify the restaurant belongs to the requesting user
      const [restaurants] = await pool.query('SELECT * FROM restaurants WHERE id = ? AND owner_id = ?', [order.restaurant_id, req.user.userId]);
      
      if (restaurants.length === 0) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }
    
    const [items] = await pool.query('SELECT * FROM order_items WHERE order_id = ?', [req.params.id]);
    
    res.json({
      ...order,
      items
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Get orders for current user
app.get('/', authenticate(), async (req, res) => {
  try {
    let query = '';
    let params = [];
    
    if (req.user.role === 'customer') {
      query = 'SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC';
      params = [req.user.userId];
    } else if (req.user.role === 'restaurant_admin') {
      query = `
        SELECT o.* FROM orders o
        JOIN restaurants r ON o.restaurant_id = r.id
        WHERE r.owner_id = ?
        ORDER BY o.created_at DESC
      `;
      params = [req.user.userId];
    } else if (req.user.role === 'delivery_personnel') {
      query = `
        SELECT o.* FROM orders o
        JOIN deliveries d ON o.id = d.order_id
        WHERE d.delivery_person_id = ?
        ORDER BY o.created_at DESC
      `;
      params = [req.user.userId];
    } else {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    const [orders] = await pool.query(query, params);
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Update order status (restaurant admin or delivery personnel)
app.patch('/:id/status', authenticate(['restaurant_admin', 'delivery_personnel']), async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }
    
    // Get current order
    const [orders] = await pool.query('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    
    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const order = orders[0];
    
    // Authorization checks
    if (req.user.role === 'restaurant_admin') {
      // Verify the restaurant belongs to the requesting user
      const [restaurants] = await pool.query('SELECT * FROM restaurants WHERE id = ? AND owner_id = ?', [order.restaurant_id, req.user.userId]);
      
      if (restaurants.length === 0) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    } else if (req.user.role === 'delivery_personnel') {
      // Verify the delivery is assigned to this personnel
      const [deliveries] = await pool.query('SELECT * FROM deliveries WHERE order_id = ? AND delivery_person_id = ?', [req.params.id, req.user.userId]);
      
      if (deliveries.length === 0) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }
    
    // Update status
    await pool.query('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);
    
    // Notify customer (in a real app, this would be async via message queue)
    try {
      await axios.post('http://notification-service:3006/notify', {
        type: 'order_status_update',
        order_id: req.params.id,
        new_status: status,
        customer_id: order.customer_id
      });
    } catch (notifyErr) {
      console.error('Failed to send notification:', notifyErr);
    }
    
    res.json({ message: 'Order status updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// Initialize database and start server
initDb().then(() => {
  const PORT = process.env.PORT || 3003;
  app.listen(PORT, () => {
    console.log(`Order service running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Database initialization failed:', err);
  process.exit(1);
});