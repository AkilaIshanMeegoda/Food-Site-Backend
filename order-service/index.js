const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const axios = require('axios');
const app = express();
require('dotenv').config();

// Middleware
app.use(bodyParser.json());

// Database connection
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'mysql-order',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Akila@1002',
    database: process.env.DB_NAME || 'order_service',
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
app.post('/orders', async (req, res) => {
    try {
        const { customer_id, restaurant_id, items, delivery_address, special_instructions } = req.body;
        
        // Calculate total price
        let total_price = 0;
        const menuItems = [];
        
        // Get menu items from restaurant service
        try {
            const response = await axios.get(`http://restaurant-service:3002/restaurants/${restaurant_id}/menu`);
            menuItems.push(...response.data);
        } catch (error) {
            console.error('Error fetching menu items:', error);
            return res.status(400).json({ error: 'Failed to fetch menu items' });
        }
        
        // Validate items and calculate total
        for (const item of items) {
            const menuItem = menuItems.find(mi => mi.id === item.menu_item_id);
            if (!menuItem) {
                return res.status(400).json({ error: `Menu item with ID ${item.menu_item_id} not found` });
            }
            if (!menuItem.is_available) {
                return res.status(400).json({ error: `Menu item with ID ${item.menu_item_id} is not available` });
            }
            total_price += menuItem.price * item.quantity;
        }
        
        // Start transaction
        const connection = await pool.getConnection();
        await connection.beginTransaction();
        
        try {
            // Create order
            const [orderResult] = await connection.execute(
                'INSERT INTO orders (customer_id, restaurant_id, total_price, status, delivery_address, special_instructions) VALUES (?, ?, ?, ?, ?, ?)',
                [customer_id, restaurant_id, total_price, 'pending', delivery_address, special_instructions]
            );
            
            const orderId = orderResult.insertId;
            
            // Add order items
            for (const item of items) {
                await connection.execute(
                    'INSERT INTO order_items (order_id, menu_item_id, quantity, price_at_order) VALUES (?, ?, ?, ?)',
                    [orderId, item.menu_item_id, item.quantity, menuItems.find(mi => mi.id === item.menu_item_id).price]
                );
            }
            
            // Commit transaction
            await connection.commit();
            connection.release();
            
            // Notify restaurant (in a real app, this would be async)
            try {
                await axios.post('http://notification-service:3005/notifications', {
                    type: 'new_order',
                    recipient_id: restaurant_id,
                    recipient_type: 'restaurant',
                    message: `New order #${orderId} received`,
                    data: { order_id: orderId }
                });
            } catch (error) {
                console.error('Error sending notification:', error);
                // Not critical, continue
            }
            
            res.status(201).json({ 
                message: 'Order created successfully',
                orderId,
                total_price
            });
        } catch (error) {
            // Rollback on error
            await connection.rollback();
            connection.release();
            throw error;
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/orders/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const [orders] = await pool.execute(
            'SELECT * FROM orders WHERE id = ?',
            [id]
        );
        
        if (orders.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        const order = orders[0];
        
        // Get order items
        const [items] = await pool.execute(
            'SELECT * FROM order_items WHERE order_id = ?',
            [id]
        );
        
        order.items = items;
        
        res.json(order);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/customers/:customerId/orders', async (req, res) => {
    try {
        const { customerId } = req.params;
        
        const [orders] = await pool.execute(
            'SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC',
            [customerId]
        );
        
        res.json(orders);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/restaurants/:restaurantId/orders', async (req, res) => {
    try {
        const { restaurantId } = req.params;
        
        const [orders] = await pool.execute(
            'SELECT * FROM orders WHERE restaurant_id = ? ORDER BY created_at DESC',
            [restaurantId]
        );
        
        res.json(orders);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.put('/orders/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        // Validate status
        if (!['pending', 'accepted', 'preparing', 'ready', 'picked_up', 'delivered', 'cancelled'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        
        const [result] = await pool.execute(
            'UPDATE orders SET status = ? WHERE id = ?',
            [status, id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        // Notify customer if status changed to certain values
        if (['accepted', 'preparing', 'ready', 'picked_up', 'delivered', 'cancelled'].includes(status)) {
            try {
                // Get order to find customer_id
                const [orders] = await pool.execute('SELECT customer_id FROM orders WHERE id = ?', [id]);
                if (orders.length > 0) {
                    await axios.post('http://notification-service:3005/notifications', {
                        type: 'order_status',
                        recipient_id: orders[0].customer_id,
                        recipient_type: 'customer',
                        message: `Order #${id} status updated to ${status}`,
                        data: { order_id: id, status }
                    });
                }
            } catch (error) {
                console.error('Error sending notification:', error);
                // Not critical, continue
            }
        }
        
        res.json({ message: 'Order status updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Start server
const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
    console.log(`Order service running on port ${PORT}`);
});

// Initialize database
async function initializeDatabase() {
    try {
        const connection = await pool.getConnection();
        
        await connection.query(`
            CREATE TABLE IF NOT EXISTS orders (
                id INT AUTO_INCREMENT PRIMARY KEY,
                customer_id INT NOT NULL,
                restaurant_id INT NOT NULL,
                total_price DECIMAL(10, 2) NOT NULL,
                status ENUM('pending', 'accepted', 'preparing', 'ready', 'picked_up', 'delivered', 'cancelled') DEFAULT 'pending',
                delivery_address TEXT NOT NULL,
                special_instructions TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        
        await connection.query(`
            CREATE TABLE IF NOT EXISTS order_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_id INT NOT NULL,
                menu_item_id INT NOT NULL,
                quantity INT NOT NULL,
                price_at_order DECIMAL(10, 2) NOT NULL,
                FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
            )
        `);
        
        connection.release();
        console.log('Order service database initialized');
    } catch (error) {
        console.error('Database initialization error:', error);
    }
}

initializeDatabase();