const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const orderRoutes = require("./routes/orderRoutes");

// Connect to MongoDB
dotenv.config();
connectDB();

// Initialize express app
const app = express();
const port = process.env.PORT || 5002;

// Middleware
app.use(bodyParser.json());
app.use(cors({ origin: "*" }));

// Routes
app.use("/api", orderRoutes);

// Start the server
app.listen(port, () => {
  console.log(`Order service running on port ${port}`);
});

module.exports = app;
