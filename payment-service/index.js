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
    host: process.env.DB_HOST || 'mysql-payment',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Akila@1002',
    database: process.env.DB_NAME || 'payment_service',
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

// Simulated payment gateway
const processPayment = async (paymentDetails) => {
    // In a real app, this would integrate with PayHere, Stripe, etc.
    // For this example, we'll simulate a successful payment 90% of the time
    
    return new Promise((resolve) => {
        setTimeout(() => {
            const success = Math.random() < 0.9;
            resolve({
                success,
                transactionId: success ? `txn_${Math.random().toString(36).substr(2, 9)}` : null,
                message: success ? 'Payment processed successfully' : 'Payment failed due to insufficient funds'
            });
        }, 1000);
    });
};

// Routes
app.post('/payments', async (req, res) => {
    try {
        const { order_id, amount, payment_method, customer_id } = req.body;
        
        // Verify order amount matches
        let order;
        try {
            const response = await axios.get(`http://order-service:3003/orders/${order_id}`);
            order = response.data;
            
            if (order.total_price !== amount) {
                return res.status(400).json({ error: 'Amount does not match order total' });
            }
        } catch (error) {
            console.error('Error fetching order:', error);
            return res.status(400).json({ error: 'Failed to verify order' });
        }
        
        // Process payment
        const paymentResult = await processPayment({
            amount,
            payment_method,
            customer_id,
            order_id
        });
        
        // Record payment
        const [result] = await pool.execute(
            'INSERT INTO payments (order_id, amount, status, payment_method, transaction_id, customer_id) VALUES (?, ?, ?, ?, ?, ?)',
            [order_id, amount, paymentResult.success ? 'completed' : 'failed', payment_method, paymentResult.transactionId, customer_id]
        );
        
        if (paymentResult.success) {
            // Update order status
            try {
                await axios.put(`http://order-service:3003/orders/${order_id}/status`, {
                    status: 'accepted'
                });
            } catch (error) {
                console.error('Error updating order status:', error);
                // Continue but log error
            }
            
            // Notify customer
            try {
                await axios.post('http://notification-service:3005/notifications', {
                    type: 'payment_success',
                    recipient_id: customer_id,
                    recipient_type: 'customer',
                    message: `Payment for order #${order_id} was successful`,
                    data: { order_id, amount }
                });
            } catch (error) {
                console.error('Error sending notification:', error);
                // Not critical, continue
            }
        } else {
            // Notify customer of payment failure
            try {
                await axios.post('http://notification-service:3005/notifications', {
                    type: 'payment_failed',
                    recipient_id: customer_id,
                    recipient_type: 'customer',
                    message: `Payment for order #${order_id} failed`,
                    data: { order_id, amount, reason: paymentResult.message }
                });
            } catch (error) {
                console.error('Error sending notification:', error);
                // Not critical, continue
            }
        }
        
        res.status(201).json({ 
            success: paymentResult.success,
            message: paymentResult.message,
            paymentId: result.insertId,
            transactionId: paymentResult.transactionId
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/payments/order/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        
        const [payments] = await pool.execute(
            'SELECT * FROM payments WHERE order_id = ?',
            [orderId]
        );
        
        res.json(payments);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Start server
const PORT = process.env.PORT || 3006;
app.listen(PORT, () => {
    console.log(`Payment service running on port ${PORT}`);
});

// Initialize database
async function initializeDatabase() {
    try {
        const connection = await pool.getConnection();
        
        await connection.query(`
            CREATE TABLE IF NOT EXISTS payments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_id INT NOT NULL,
                amount DECIMAL(10, 2) NOT NULL,
                status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
                payment_method VARCHAR(50) NOT NULL,
                transaction_id VARCHAR(100),
                customer_id INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        connection.release();
        console.log('Payment service database initialized');
    } catch (error) {
        console.error('Database initialization error:', error);
    }
}

initializeDatabase();