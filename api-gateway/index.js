const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const jwt = require('jsonwebtoken');
const app = express();
require('dotenv').config();

// Middleware to verify JWT
const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (authHeader) {
        const token = authHeader.split(' ')[1];
        
        jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
            if (err) {
                return res.sendStatus(403);
            }
            
            req.user = user;
            next();
        });
    } else {
        res.sendStatus(401);
    }
};

// Routes
app.use('/users', createProxyMiddleware({ target: 'http://user-service:3001', changeOrigin: true }));
app.use('/restaurants', authenticateJWT, createProxyMiddleware({ target: 'http://restaurant-service:3002', changeOrigin: true }));
app.use('/orders', authenticateJWT, createProxyMiddleware({ target: 'http://order-service:3003', changeOrigin: true }));
app.use('/deliveries', authenticateJWT, createProxyMiddleware({ target: 'http://delivery-service:3004', changeOrigin: true }));
app.use('/notifications', authenticateJWT, createProxyMiddleware({ target: 'http://notification-service:3005', changeOrigin: true }));
app.use('/payments', authenticateJWT, createProxyMiddleware({ target: 'http://payment-service:3006', changeOrigin: true }));

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`API Gateway running on port ${PORT}`);
});