const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const connectDB = require('./config/db');
const userRoutes = require('./routes/userRoutes');
const dotenv = require("dotenv");

// Connect to MongoDB
dotenv.config();
connectDB();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(bodyParser.json());
app.use(cors({ origin: "*" }));

// Routes - Note: To match your frontend login hook, we're using root paths
app.use('/', userRoutes);

// Start server
app.listen(port, () => {
  console.log(`User service started at http://localhost:${port}`);
});
