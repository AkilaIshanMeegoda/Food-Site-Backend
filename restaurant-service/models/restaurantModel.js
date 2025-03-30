const mongoose = require("mongoose");

const RestaurantSchema = new mongoose.Schema({
    name: { type: String, required: true },
    address: { type: String, required: true },
    phone: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    adminId: { type: String, required: true }
});

module.exports = mongoose.model("Restaurant", RestaurantSchema);