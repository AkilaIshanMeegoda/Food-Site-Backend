const mongoose = require("mongoose");

const MenuItemSchema = new mongoose.Schema({
    restaurantId: { type: String, required: true },
    restaurantOwnerId: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true },
    category: { type: String },
    image: { type: String, required:true },
    isAvailable: { type: Boolean, default: true },
    preparationTime: { type: String, required: true },
    
});

module.exports = mongoose.model("MenuItem", MenuItemSchema);