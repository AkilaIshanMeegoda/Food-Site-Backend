const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const nodemailer = require('nodemailer');
const app = express();
require('dotenv').config();

// Middleware
app.use(bodyParser.json());

// Database connection
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'mysql-notification',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Akila@1002',
    database: process.env.DB_NAME || 'notification_service',
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

// Email transporter (using Mailtrap for testing)
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'sandbox.smtp.mailtrap.io',
    port: process.env.EMAIL_PORT || 2525,
    auth: {
        user: process.env.EMAIL_USER || 'your-mailtrap-user',
        pass: process.env.EMAIL_PASS || 'your-mailtrap-pass'
    }
});

// Routes
app.post('/notifications', async (req, res) => {
    try {
        const { type, recipient_id, recipient_type, message, data } = req.body;
        
        // Store notification in database
        const [result] = await pool.execute(
            'INSERT INTO notifications (type, recipient_id, recipient_type, message, data) VALUES (?, ?, ?, ?, ?)',
            [type, recipient_id, recipient_type, message, JSON.stringify(data)]
        );
        
        // Get user details (email/phone) from user service
        let user;
        try {
            // In a real app, we'd call the user service
            // For this example, we'll simulate it
            user = {
                email: 'user@example.com',
                phone: '+94123456789'
            };
            
            // Send email
            if (user.email) {
                await transporter.sendMail({
                    from: '"Food Delivery" <noreply@fooddelivery.com>',
                    to: user.email,
                    subject: 'Notification from Food Delivery',
                    text: message
                });
            }
            
            // Send SMS (simulated)
            console.log(`SMS sent to ${user.phone}: ${message}`);
        } catch (error) {
            console.error('Error sending notification:', error);
            // Continue even if notification fails
        }
        
        res.status(201).json({ 
            message: 'Notification sent successfully',
            notificationId: result.insertId
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/notifications/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        const [notifications] = await pool.execute(
            'SELECT * FROM notifications WHERE recipient_id = ? ORDER BY created_at DESC',
            [userId]
        );
        
        res.json(notifications);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Start server
const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
    console.log(`Notification service running on port ${PORT}`);
});

// Initialize database
async function initializeDatabase() {
    try {
        const connection = await pool.getConnection();
        
        await connection.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                type VARCHAR(50) NOT NULL,
                recipient_id INT NOT NULL,
                recipient_type ENUM('customer', 'restaurant', 'delivery') NOT NULL,
                message TEXT NOT NULL,
                data JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        connection.release();
        console.log('Notification service database initialized');
    } catch (error) {
        console.error('Database initialization error:', error);
    }
}

initializeDatabase();