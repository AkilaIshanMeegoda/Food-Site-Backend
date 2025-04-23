import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import paymentRoutes from './route/paymentRoute.js';
import 'dotenv/config';

// Constants and Environment Validation
const PORT = process.env.PORT || 5004;
const MONGODB_CONNECTION_STRING = process.env.MONGODB_CONNECTION_STRING;
const DB_NAME = "PaymentDB";

// Validate required environment variables
if (!MONGODB_CONNECTION_STRING) {
  console.error("Missing required environment variables");
  process.exit(1);
}

const app = express();

// Middleware
app.use(cors({ origin: "*" }));

app.use('/api/payment', paymentRoutes);

// Database Connection and Server Startup
async function startServer() {
  try {
    await mongoose.connect(MONGODB_CONNECTION_STRING, {
      dbName: DB_NAME,
    });
    console.log(`Connected to MongoDB (${DB_NAME})`);

    app.listen(PORT, () => {
      console.log(`Payment service running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Database connection failed:', error.message);
    process.exit(1);
  }
}

startServer();