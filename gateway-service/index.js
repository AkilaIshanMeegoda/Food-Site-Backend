//hello// gateway/index.js
import express from "express";
import proxy from "express-http-proxy";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.GATEWAY_PORT || 8000;

// Enable CORS for all incoming requests (clients talk to gateway only)
app.use(cors());
app.use(express.json());

// Gateway root
app.get('/', (req, res) => {
  res.send('Hello from Gateway Service');
});

// Define service proxies
app.use("/userApi", proxy("http://user-service:5000"));
app.use("/restaurantApi", proxy("http://restaurant-service:5001"));
app.use("/orderApi", proxy("http://order-service:5002"));
app.use("/deliveryApi", proxy("http://delivery-service:5003"));
app.use("/paymentApi", proxy("http://payment-service:5004"));
app.use("/notificationApi", proxy("http://notification-service:5005"));

// Start gateway
app.listen(PORT, () => {
  console.log(`Gateway is listening on port ${PORT}`);
});
