// restaurant-service/index.js
const express = require('express');
const mysql = require('mysql2/promise');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');
const jwt = require('jsonwebtoken');

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
    host: process.env.DB_HOST || 'mysql-restaurant',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '2001',
    database: process.env.DB_NAME || 'restaurant_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  // Create tables if they don't exist
  await pool.query(`
    CREATE TABLE IF NOT EXISTS restaurants (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      address TEXT NOT NULL,
      phone VARCHAR(20) NOT NULL,
      email VARCHAR(255) NOT NULL,
      owner_id INT NOT NULL,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS menu_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      restaurant_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      price DECIMAL(10, 2) NOT NULL,
      category VARCHAR(100),
      is_available BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
    )
  `);
}

// JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware to verify JWT and check role
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
// Get all restaurants
app.get('/', async (req, res) => {
  try {
    const [restaurants] = await pool.query('SELECT * FROM restaurants WHERE is_active = TRUE');
    res.json(restaurants);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch restaurants' });
  }
});

// Get restaurant by ID
app.get('/:id', async (req, res) => {
  try {
    const [restaurants] = await pool.query('SELECT * FROM restaurants WHERE id = ? AND is_active = TRUE', [req.params.id]);
    
    if (restaurants.length === 0) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }
    
    const [menuItems] = await pool.query('SELECT * FROM menu_items WHERE restaurant_id = ? AND is_available = TRUE', [req.params.id]);
    
    res.json({
      ...restaurants[0],
      menu: menuItems
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch restaurant' });
  }
});

// Create restaurant (admin only)
app.post('/', authenticate(['restaurant_admin']), async (req, res) => {
  try {
    const { name, description, address, phone, email } = req.body;
    
    if (!name || !address || !phone || !email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const [result] = await pool.query(
      'INSERT INTO restaurants (name, description, address, phone, email, owner_id) VALUES (?, ?, ?, ?, ?, ?)',
      [name, description, address, phone, email, req.user.userId]
    );
    
    const [restaurant] = await pool.query('SELECT * FROM restaurants WHERE id = ?', [result.insertId]);
    
    res.status(201).json(restaurant[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create restaurant' });
  }
});

// Add menu item (restaurant admin only)
app.post('/:id/menu', authenticate(['restaurant_admin']), async (req, res) => {
  try {
    const restaurantId = req.params.id;
    const { name, description, price, category } = req.body;
    
    if (!name || !price) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Verify the restaurant belongs to the requesting user
    const [restaurants] = await pool.query('SELECT * FROM restaurants WHERE id = ? AND owner_id = ?', [restaurantId, req.user.userId]);
    
    if (restaurants.length === 0) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    const [result] = await pool.query(
      'INSERT INTO menu_items (restaurant_id, name, description, price, category) VALUES (?, ?, ?, ?, ?)',
      [restaurantId, name, description, price, category]
    );
    
    const [menuItem] = await pool.query('SELECT * FROM menu_items WHERE id = ?', [result.insertId]);
    
    res.status(201).json(menuItem[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add menu item' });
  }
});

// Initialize database and start server
initDb().then(() => {
  const PORT = process.env.PORT || 3002;
  app.listen(PORT, () => {
    console.log(`Restaurant service running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Database initialization failed:', err);
  process.exit(1);
});