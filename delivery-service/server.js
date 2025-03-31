const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const dotenv = require("dotenv");

// Import routes
const deliveryPersonnelRoute = require("./routes/deliveryPersonnelRoute");
const connectDB = require("./config/db");

dotenv.config(); // Load environment variables from .env file

const app = express();
const port = process.env.PORT || 5003;

// MongoDB connection
connectDB();

// Middleware
app.use(bodyParser.json());
app.use(cors({ origin: "*" }));

// Use Routes
app.use("/delivery-personnel", deliveryPersonnelRoute);

// Start server
app.listen(port, () => {
  console.log(`Delivery service started at http://localhost:${port}`);
});
