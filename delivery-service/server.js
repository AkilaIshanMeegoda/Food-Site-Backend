// External modules
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const dotenv = require("dotenv");

// Internal modules
const connectDB = require("./config/db");
const deliveryPersonnelRoute = require("./routes/deliveryPersonnelRoute");
const deliveryRoute = require("./routes/deliveryRoute");

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const port = process.env.PORT || 5003;

// Connect to MongoDB
connectDB();

// Middleware
app.use(bodyParser.json());
app.use(cors({ origin: "*" }));

// API Routes
app.use("/delivery-personnel", deliveryPersonnelRoute);
app.use("/delivery", deliveryRoute);

// Create HTTP server and initialize Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

// Store connected drivers' sockets
let driverSockets = {};

// Socket.IO logic
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("registerDriver", ({ userId }) => {
    console.log("Received userId:", userId); // Log the userId to check its value

    if (userId) {
      driverSockets[userId] = socket;
      console.log(`Driver ${userId} connected`);
    } else {
      console.log("No userId provided");
    }
  });

  // In your backend's 'locationUpdate' handler:
socket.on("locationUpdate", (data) => {
  console.log("Raw data received:", data);

  // Validate required fields
  if (!data.userId || data.lat === undefined || data.lng === undefined) {
    return console.error("Missing required fields in location update");
  }

  // Parse coordinates as numbers
  const lat = parseFloat(data.lat);
  const lng = parseFloat(data.lng);

  // Validate coordinate ranges
  if (isNaN(lat) || isNaN(lng)) {
    return console.error("Invalid coordinate format (must be numbers)");
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return console.error("Coordinates out of valid range");
  }

  // Emit validated data
  io.emit("driverLocation", { userId: data.userId, lat, lng });
});
  

  socket.on("disconnect", () => {
    for (const userId in driverSockets) {
      if (driverSockets[userId].id === socket.id) {
        delete driverSockets[userId];
        console.log(`Driver ${userId} disconnected`);
        break;
      }
    }
  });
});

// Start the HTTP server (Express + Socket.IO)
server.listen(port, () => {
  console.log(
    `Delivery service and socket server running on http://localhost:${port}`
  );
});
