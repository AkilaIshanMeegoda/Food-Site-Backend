const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
app.use(express.json());
app.use(cors());

// Mock email transporter
const transporter = nodemailer.createTransport({
  host: 'smtp.example.com',
  port: 587,
  secure: false,
  auth: {
    user: 'username',
    pass: 'password'
  }
});

// Mock SMS service
const sendSMS = (phone, message) => {
  console.log(`Sending SMS to ${phone}: ${message}`);
  return true;
};

// Notification endpoint
app.post('/notify', async (req, res) => {
  try {
    const { type, ...data } = req.body;
    
    switch (type) {
      case 'new_order':
        // In a real app, we'd fetch user email/phone from user service
        await transporter.sendMail({
          from: 'noreply@fooddelivery.com',
          to: 'restaurant@example.com',
          subject: 'New Order Received',
          text: `You have a new order #${data.orderId}`
        });
        break;
        
      case 'order_status':
        // In a real app, we'd fetch user email/phone from user service
        await transporter.sendMail({
          from: 'noreply@fooddelivery.com',
          to: 'customer@example.com',
          subject: 'Order Status Update',
          text: `Your order #${data.orderId} status is now ${data.status}`
        });
        sendSMS('+94123456789', `Your order #${data.orderId} status is now ${data.status}`);
        break;
        
      case 'delivery_assignment':
        // In a real app, we'd fetch user email/phone from user service
        sendSMS('+94123456789', `You have been assigned to deliver order #${data.orderId}`);
        break;
        
      default:
        return res.status(400).json({ message: 'Invalid notification type' });
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send notification' });
  }
});

const PORT = process.env.PORT || 3006;
app.listen(PORT, () => console.log(`Notification service running on port ${PORT}`));