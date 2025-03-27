const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const app = express();
require('dotenv').config();

// Middleware
app.use(bodyParser.json());

// Database connection
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'mysql-restaurant',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Akila@1002',
    database: process.env.DB_NAME || 'restaurant_service',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const waitForDatabase = async () => {
    let connected = false;
    while (!connected) {
        try {
            const connection = await pool.getConnection();
            console.log("✅ Connected to MySQL!");
            connection.release();
            connected = true;
        } catch (error) {
            console.log("⏳ Waiting for MySQL to be ready...");
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds before retrying
        }
    }
};

// Wait for MySQL before initializing the database
waitForDatabase().then(() => {
    initializeDatabase();
});

// Routes
app.post('/restaurants', async (req, res) => {
    try {
        const { name, description, address, owner_id } = req.body;
        
        const [result] = await pool.execute(
            'INSERT INTO restaurants (name, description, address, owner_id, is_active) VALUES (?, ?, ?, ?, ?)',
            [name, description, address, owner_id, true]
        );
        
        res.status(201).json({ 
            message: 'Restaurant created successfully',
            restaurantId: result.insertId
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/restaurants', async (req, res) => {
    try {
        const [restaurants] = await pool.execute(
            'SELECT * FROM restaurants WHERE is_active = true'
        );
        
        res.json(restaurants);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/restaurants/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const [restaurants] = await pool.execute(
            'SELECT * FROM restaurants WHERE id = ? AND is_active = true',
            [id]
        );
        
        if (restaurants.length === 0) {
            return res.status(404).json({ error: 'Restaurant not found' });
        }
        
        res.json(restaurants[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.put('/restaurants/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, address, is_active } = req.body;
        
        const [result] = await pool.execute(
            'UPDATE restaurants SET name = ?, description = ?, address = ?, is_active = ? WHERE id = ?',
            [name, description, address, is_active, id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Restaurant not found' });
        }
        
        res.json({ message: 'Restaurant updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Menu Items
app.post('/restaurants/:restaurantId/menu', async (req, res) => {
    try {
        const { restaurantId } = req.params;
        const { name, description, price, category } = req.body;
        
        const [result] = await pool.execute(
            'INSERT INTO menu_items (restaurant_id, name, description, price, category, is_available) VALUES (?, ?, ?, ?, ?, ?)',
            [restaurantId, name, description, price, category, true]
        );
        
        res.status(201).json({ 
            message: 'Menu item added successfully',
            itemId: result.insertId
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/restaurants/:restaurantId/menu', async (req, res) => {
    try {
        const { restaurantId } = req.params;
        
        const [items] = await pool.execute(
            'SELECT * FROM menu_items WHERE restaurant_id = ? AND is_available = true',
            [restaurantId]
        );
        
        res.json(items);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.put('/restaurants/:restaurantId/menu/:itemId', async (req, res) => {
    try {
        const { restaurantId, itemId } = req.params;
        const { name, description, price, category, is_available } = req.body;
        
        const [result] = await pool.execute(
            'UPDATE menu_items SET name = ?, description = ?, price = ?, category = ?, is_available = ? WHERE id = ? AND restaurant_id = ?',
            [name, description, price, category, is_available, itemId, restaurantId]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Menu item not found' });
        }
        
        res.json({ message: 'Menu item updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.delete('/restaurants/:restaurantId/menu/:itemId', async (req, res) => {
    try {
        const { restaurantId, itemId } = req.params;
        
        const [result] = await pool.execute(
            'DELETE FROM menu_items WHERE id = ? AND restaurant_id = ?',
            [itemId, restaurantId]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Menu item not found' });
        }
        
        res.json({ message: 'Menu item deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Start server
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
    console.log(`Restaurant service running on port ${PORT}`);
});

// Initialize database
async function initializeDatabase() {
    try {
        const connection = await pool.getConnection();
        
        await connection.query(`
            CREATE TABLE IF NOT EXISTS restaurants (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                address TEXT NOT NULL,
                owner_id INT NOT NULL,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        
        await connection.query(`
            CREATE TABLE IF NOT EXISTS menu_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                restaurant_id INT NOT NULL,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                price DECIMAL(10, 2) NOT NULL,
                category VARCHAR(100),
                is_available BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
            )
        `);
        
        connection.release();
        console.log('Restaurant service database initialized');
    } catch (error) {
        console.error('Database initialization error:', error);
    }
}

initializeDatabase();