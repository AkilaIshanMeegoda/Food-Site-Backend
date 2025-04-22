const mongoose = require("mongoose");

const deliverySchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    unique: true,
  },
  deliveryPersonnelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "DeliveryPersonnel",
  },
  pickupAddress: String,  
  dropoffAddress: String, 
  pickupLat: Number,
  pickupLng: Number,
  dropoffLat: Number,
  dropoffLng: Number,
  status: {
    type: String,
    enum: ["pending", "accepted", "picked_up", "on_the_way", "delivered"],
    default: "pending",
  },
});

module.exports = mongoose.model("Delivery", deliverySchema);
