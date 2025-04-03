import mongoose from "mongoose";

const Payment = mongoose.model('Payment', {
    stripeId: String,
    orderId: Object,
    customerId: Object,
    status: {
        type: String,
        enum: ['pending', 'completed'],
        default: 'pending'
    },
    createdAt: Date
});

export default Payment;