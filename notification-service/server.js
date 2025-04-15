import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import 'dotenv/config';

const app = express();

const PORT = process.env.PORT || 5005;

// Middleware
app.use(bodyParser.json());
app.use(cors({ origin: "*" }));

// Start server
app.listen(PORT, () => {
    console.log(`Notification service started at http://localhost:${PORT}`);
});