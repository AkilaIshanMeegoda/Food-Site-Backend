import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import 'dotenv/config';

const app = express();

const PORT = process.env.PORT || 5004;
const MONGODB_CONNECTION_STRING = process.env.MONGODB_CONNECTION_STRING;

mongoose.connect(MONGODB_CONNECTION_STRING);

app.use(bodyParser.json());
app.use(cors({ origin: "*" }));

app.listen(PORT, () => {
    console.log(`Payment service started at http://localhost:${PORT}`);
});