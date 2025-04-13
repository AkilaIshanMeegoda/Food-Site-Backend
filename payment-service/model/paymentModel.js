import mongoose from "mongoose";

const Payment = mongoose.model("Payment", {
  checkoutSessionId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  paymentStatus: {
    type: String,
    enum: ["paid", "unpaid"],
    required: true,
  },
  amountTotal: {
    type: Number,
    required: true,
    min: 0,
  },
  currency: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
  },
  createdAt: { type: Date, default: Date.now },
});

export default Payment;
