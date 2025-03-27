const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const app = express();
require('dotenv').config();

// Middleware
app.use(bodyParser.json());

// Database connection
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'mysql-user',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Akila@1002',
    database: process.env.DB_NAME || 'user_service',
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

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Routes
app.post('/register', async (req, res) => {
    try {
        const { name, email, password, phone, role } = req.body;
        
        // Validate role
        if (!['customer', 'restaurant', 'delivery'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Insert user
        const [result] = await pool.execute(
            'INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)',
            [name, email, hashedPassword, phone, role]
        );
        
        // Generate JWT
        const token = jwt.sign(
            { userId: result.insertId, email, role },
            JWT_SECRET,
            { expiresIn: '1h' }
        );
        
        res.status(201).json({ message: 'User registered successfully', token });
    } catch (error) {
        console.error(error);
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ error: 'Email already exists' });
        } else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Find user
        const [users] = await pool.execute(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );
        
        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const user = users[0];
        
        // Compare passwords
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Generate JWT
        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '1h' }
        );
        
        res.json({ message: 'Login successful', token, role: user.role });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/profile', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        const decoded = jwt.verify(token, JWT_SECRET);
        
        const [users] = await pool.execute(
            'SELECT id, name, email, phone, role FROM users WHERE id = ?',
            [decoded.userId]
        );
        
        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json(users[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`User service running on port ${PORT}`);
});

// Initialize database
async function initializeDatabase() {
    try {
        const connection = await pool.getConnection();
        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                phone VARCHAR(20),
                role ENUM('customer', 'restaurant', 'delivery') NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        connection.release();
        console.log('User service database initialized');
    } catch (error) {
        console.error('Database initialization error:', error);
    }
}

initializeDatabase();