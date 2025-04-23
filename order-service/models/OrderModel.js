const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema(
  {
    customerId: { type: String, required: true },
    customerName: String,
    customerEmail: String,
    customerPhone: String,
    restaurantId: String,
    restaurantName: String,
    items: [
      {
        id: String,
        name: String,
        quantity: Number,
        price: Number,
      },
    ],
    orderStatus: { type: String, default: "pending" },
    totalAmount: Number,
    deliveryAddress: String,
    deliveryInstructions: String,
    paymentMethod: String,
    paymentStatus: { type: String, default: "pending" },
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", OrderSchema);

module.exports = Order;
