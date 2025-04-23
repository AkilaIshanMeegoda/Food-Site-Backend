const mongoose = require("mongoose");

const deliveryPersonnelSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId, // Use the user's _id directly as this document's _id
    required: true,
    ref: 'User' // Optional but recommended for population
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId, // Should match the same type as _id
    required: true,
    ref: 'User'
  },
  name: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  vehicleType: {
    type: String,
    required: true,
  },
  vehicleNumber: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["available", "busy"],
    default: "available",
  },
  currentLocation: {
    type: String,
  },
  lat: Number,
  lng: Number
});

module.exports = mongoose.model("DeliveryPersonnel", deliveryPersonnelSchema);
