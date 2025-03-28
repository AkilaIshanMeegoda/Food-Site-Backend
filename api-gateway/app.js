const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
app.use(express.json());
app.use(cors());

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// Middleware to log requests (for debugging)
app.use((req, res, next) => {
  console.log(`➡️  Incoming Request: ${req.method} ${req.url}`);
  next();
});

// Middleware to verify JWT for protected routes
const authenticate = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token.split(' ')[1], JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// 🔹 Routes (Modify targets if necessary)
const services = {
  auth: 'http://auth-service:3001',
  users: 'http://user-service:3002',
  restaurants: 'http://restaurant-service:3003',
  orders: 'http://order-service:3004',
  deliveries: 'http://delivery-service:3005',
  notifications: 'http://notification-service:3006',
  payments: 'http://payment-service:3007',
};

// 🔹 Auth service (No authentication required)
app.use('/auth', createProxyMiddleware({ target: services.auth, changeOrigin: true }));

// 🔹 Protected routes (Require authentication)
const protectedRoutes = ['users', 'restaurants', 'orders', 'deliveries', 'notifications', 'payments'];
protectedRoutes.forEach((route) => {
  app.use(`/${route}`, authenticate, createProxyMiddleware({ target: services[route], changeOrigin: true }));
});

// 🔹 Error Handling for Proxy Failures
app.use((err, req, res, next) => {
  console.error('❌ Proxy Error:', err.message);
  res.status(500).json({ message: 'Internal Server Error' });
});

// Start API Gateway
const PORT = process.env.PORT || 3010;
app.listen(PORT, () => console.log(`🚀 API Gateway running on port ${PORT}`));
