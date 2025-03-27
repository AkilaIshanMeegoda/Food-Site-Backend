// notification-service/index.js
const express = require('express');
const mysql = require('mysql2/promise');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const nodemailer = require('nodemailer');

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
    host: process.env.DB_HOST || 'mysql-notification',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '2001',
    database: process.env.DB_NAME || 'notification_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  // Create tables if they don't exist
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      type VARCHAR(50) NOT NULL,
      message TEXT NOT NULL,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

// Email transporter (simulated - in a real app, configure with actual SMTP)
const transporter = nodemailer.createTransport({
  host: 'smtp.example.com',
  port: 587,
  secure: false,
  auth: {
    user: 'username',
    pass: 'password'
  }
});

// Simulate SMS sending
async function sendSMS(phone, message) {
  console.log(`[SMS] To: ${phone}, Message: ${message}`);
  return true;
}

// Routes
// Send notification
app.post('/notify', async (req, res) => {
  try {
    const { type, order_id, customer_id, restaurant_id, delivery_person_id, new_status, amount } = req.body;
    
    if (!type) {
      return res.status(400).json({ error: 'Notification type is required' });
    }
    
    let userId, message, emailSubject, smsMessage;
    
    switch (type) {
      case 'new_order':
        // Get restaurant owner details
        const restaurantResponse = await axios.get(`http://restaurant-service:3002/${restaurant_id}`);
        const restaurant = restaurantResponse.data;
        userId = restaurant.owner_id;
        
        message = `New order received: #${order_id}`;
        emailSubject = 'New Order Received';
        smsMessage = `New order #${order_id} received at ${restaurant.name}`;
        break;
        
      case 'order_status_update':
        userId = customer_id;
        
        message = `Your order #${order_id} status updated to: ${new_status}`;
        emailSubject = 'Order Status Update';
        smsMessage = `Order #${order_id} status: ${new_status}`;
        break;
        
      case 'payment_received':
        // Get restaurant owner details
        const restaurantRes = await axios.get(`http://restaurant-service:3002/${restaurant_id}`);
        const restaurantInfo = restaurantRes.data;
        userId = restaurantInfo.owner_id;
        
        message = `Payment received for order #${order_id}: LKR ${amount.toFixed(2)}`;
        emailSubject = 'Payment Received';
        smsMessage = `Payment received for order #${order_id}: LKR ${amount.toFixed(2)}`;
        break;
        
      case 'delivery_assigned':
        userId = delivery_person_id;
        
        message = `New delivery assigned: Order #${order_id}`;
        emailSubject = 'New Delivery Assignment';
        smsMessage = `New delivery: Order #${order_id}`;
        break;
        
      default:
        return res.status(400).json({ error: 'Invalid notification type' });
    }
    
    // Get user details
    const userResponse = await axios.get(`http://auth-service:3001/auth/user/${userId}`, {
      headers: { Authorization: `Bearer ${process.env.SERVICE_TOKEN}` }
    });
    const user = userResponse.data;
    
    // Store notification in database
    await pool.query(
      'INSERT INTO notifications (user_id, type, message) VALUES (?, ?, ?)',
      [userId, type, message]
    );
    
    // Send email (simulated)
    try {
      const mailOptions = {
        from: 'noreply@fooddelivery.com',
        to: user.email,
        subject: emailSubject,
        text: message
      };
      
      console.log(`[EMAIL] Sending to ${user.email}: ${message}`);
      // In a real app: await transporter.sendMail(mailOptions);
    } catch (emailErr) {
      console.error('Failed to send email:', emailErr);
    }
    
    // Send SMS (simulated)
    if (user.phone) {
      try {
        await sendSMS(user.phone, smsMessage);
      } catch (smsErr) {
        console.error('Failed to send SMS:', smsErr);
      }
    }
    
    res.status(201).json({ message: 'Notification sent' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

// Get notifications for user
app.get('/', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    const [notifications] = await pool.query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC',
      [decoded.userId]
    );
    
    res.json(notifications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Initialize database and start server
initDb().then(() => {
  const PORT = process.env.PORT || 3006;
  app.listen(PORT, () => {
    console.log(`Notification service running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Database initialization failed:', err);
  process.exit(1);
});