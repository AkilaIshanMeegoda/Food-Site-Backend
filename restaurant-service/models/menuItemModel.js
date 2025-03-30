const mongoose = require("mongoose");

const MenuItemSchema = new mongoose.Schema({
    restaurantId: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true },
    category: { type: String },
    isAvailable: { type: Boolean, default: true }
});

module.exports = mongoose.model("MenuItem", MenuItemSchema);