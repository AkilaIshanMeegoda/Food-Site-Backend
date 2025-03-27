// api-gateway/index.js
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');

const app = express();

// Middleware
app.use(morgan('combined'));
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Service routes
app.use('/auth', createProxyMiddleware({ 
  target: 'http://auth-service:3001', 
  changeOrigin: true 
}));

app.use('/restaurants', createProxyMiddleware({ 
  target: 'http://restaurant-service:3002', 
  changeOrigin: true 
}));

app.use('/orders', createProxyMiddleware({ 
  target: 'http://order-service:3003', 
  changeOrigin: true 
}));

app.use('/delivery', createProxyMiddleware({ 
  target: 'http://delivery-service:3004', 
  changeOrigin: true 
}));

app.use('/payments', createProxyMiddleware({ 
  target: 'http://payment-service:3005', 
  changeOrigin: true 
}));

app.use('/notifications', createProxyMiddleware({ 
  target: 'http://notification-service:3006', 
  changeOrigin: true 
}));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 3010;
app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});