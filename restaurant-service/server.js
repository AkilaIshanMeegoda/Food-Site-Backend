const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const dotenv = require("dotenv");
const restaurantRoutes = require("./routes/restaurantRoutes");
const menuItemRoutes = require("./routes/menuItemRoutes");
const publicRoutes = require("./routes/publicRoutes");
const connectDB = require("./config");

dotenv.config();
connectDB();

const app = express();
const port = process.env.PORT || 5001;

app.use(bodyParser.json());
app.use(cors({ origin: "*" }));
app.use("/restaurants", restaurantRoutes);
app.use("/menu-items", menuItemRoutes);
app.use("/public", publicRoutes);

app.listen(port, () => {
    console.log(`Restaurant service started at http://localhost:${port}`);
});