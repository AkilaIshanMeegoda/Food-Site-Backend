import { sendEmail } from "../services/emailService.js";

export async function sendOrderCompleteEmail(req, res) {
  try {
    const { customerEmail, customerName, orderId, orderTotal, orderItems } = req.body;
    await sendEmail(customerEmail, "orderComplete", [
      customerName,
      orderId,
      orderTotal,
      orderItems,
    ]);
    res
      .status(200)
      .json({ message: "Order completion email sent successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function sendOrderDeliveringEmail(req, res) {
  try {
    const { customerEmail, customerName, orderId, estimatedTime } = req.body;
    await sendEmail(customerEmail, "orderDelivering", [
      customerName,
      orderId,
      estimatedTime,
    ]);
    res.status(200).json({ message: "Order delivery email sent successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
