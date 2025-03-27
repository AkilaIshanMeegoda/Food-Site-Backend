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
    host: process.env.DB_HOST || 'mysql-delivery',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Akila@1002',
    database: process.env.DB_NAME || 'delivery_service',
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
app.get('/deliveries/available', async (req, res) => {
    try {
        const [deliveries] = await pool.execute(
            'SELECT * FROM deliveries WHERE status = "available"'
        );
        
        res.json(deliveries);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/deliveries/assign', async (req, res) => {
    try {
        const { order_id } = req.body;
        
        // Get order details
        let order;
        try {
            const response = await axios.get(`http://order-service:3003/orders/${order_id}`);
            order = response.data;
        } catch (error) {
            console.error('Error fetching order:', error);
            return res.status(400).json({ error: 'Failed to fetch order details' });
        }
        
        // Find available delivery person
        const [availableDeliveries] = await pool.execute(
            'SELECT * FROM deliveries WHERE status = "available" LIMIT 1'
        );
        
        if (availableDeliveries.length === 0) {
            return res.status(400).json({ error: 'No available delivery personnel' });
        }
        
        const deliveryPerson = availableDeliveries[0];
        
        // Update delivery status
        await pool.execute(
            'UPDATE deliveries SET status = "assigned", current_order_id = ? WHERE id = ?',
            [order_id, deliveryPerson.id]
        );
        
        // Update order status to "picked_up"
        try {
            await axios.put(`http://order-service:3003/orders/${order_id}/status`, {
                status: 'picked_up'
            });
        } catch (error) {
            console.error('Error updating order status:', error);
            // Continue but log error
        }
        
        // Notify delivery person
        try {
            await axios.post('http://notification-service:3005/notifications', {
                type: 'delivery_assigned',
                recipient_id: deliveryPerson.user_id,
                recipient_type: 'delivery',
                message: `New delivery assigned: Order #${order_id}`,
                data: { order_id }
            });
        } catch (error) {
            console.error('Error sending notification:', error);
            // Not critical, continue
        }
        
        res.json({ 
            message: 'Delivery assigned successfully',
            delivery_person_id: deliveryPerson.id,
            delivery_person_name: deliveryPerson.name
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.put('/deliveries/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        // Validate status
        if (!['available', 'assigned', 'delivering', 'on_break'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        
        const [result] = await pool.execute(
            'UPDATE deliveries SET status = ? WHERE id = ?',
            [status, id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Delivery person not found' });
        }
        
        res.json({ message: 'Delivery status updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/deliveries/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const [deliveries] = await pool.execute(
            'SELECT * FROM deliveries WHERE id = ?',
            [id]
        );
        
        if (deliveries.length === 0) {
            return res.status(404).json({ error: 'Delivery person not found' });
        }
        
        const delivery = deliveries[0];
        
        // If assigned to an order, get order details
        if (delivery.current_order_id) {
            try {
                const response = await axios.get(`http://order-service:3003/orders/${delivery.current_order_id}`);
                delivery.current_order = response.data;
            } catch (error) {
                console.error('Error fetching order:', error);
                // Continue without order details
            }
        }
        
        res.json(delivery);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Start server
const PORT = process.env.PORT || 3004;
app.listen(PORT, () => {
    console.log(`Delivery service running on port ${PORT}`);
});

// Initialize database
async function initializeDatabase() {
    try {
        const connection = await pool.getConnection();
        
        await connection.query(`
            CREATE TABLE IF NOT EXISTS deliveries (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                name VARCHAR(255) NOT NULL,
                phone VARCHAR(20) NOT NULL,
                vehicle_type VARCHAR(50),
                vehicle_number VARCHAR(50),
                status ENUM('available', 'assigned', 'delivering', 'on_break') DEFAULT 'available',
                current_order_id INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        
        connection.release();
        console.log('Delivery service database initialized');
    } catch (error) {
        console.error('Database initialization error:', error);
    }
}

initializeDatabase();