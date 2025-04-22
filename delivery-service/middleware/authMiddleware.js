const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key";

// Middleware to verify JWT Token and check delivery personnel role
function verifyDeliveryPersonnel(req, res, next) {
  const authHeader = req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ error: "Access denied. Missing or invalid token format" });
  }

  const token = authHeader.split(" ")[1]; // Extract token after "Bearer"

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "delivery_personnel") {
      return res
        .status(403)
        .json({ error: "Access denied. Delivery personnel role required" });
    }
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
}

// auth/middleware.js
const verifyCustomer = (req, res, next) => {
    const authHeader = req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Access denied. Missing or invalid token format" });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role !== "customer") { // Ensure user is a customer
            return res.status(403).json({ error: "Access denied. Customer role required" });
        }
        req.user = decoded; // Attach user data to request
        next();
    } catch (error) {
        res.status(401).json({ error: "Invalid token" });
    }
};

module.exports = { verifyDeliveryPersonnel, verifyCustomer };
