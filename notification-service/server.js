import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import "dotenv/config";
import emailRoutes from "./routes/emailRoutes.js";
import smsRoutes from "./routes/smsRoutes.js";

const app = express();

const PORT = process.env.PORT || 5005;

// Middlewares
app.use(bodyParser.json());
app.use(cors({ origin: "*" }));

app.use('/notifications', emailRoutes);
app.use('/notifications', smsRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// Start server
app.listen(PORT, () => {
  console.log(`Notification service started at http://localhost:${PORT}`);
});
