import { sendEmail } from "../services/emailService.js";

export async function sendOrderCompleteEmail(req, res) {
  try {
    const { customerEmail, customerName, orderId, orderTotal, orderItems } =
      req.body;
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

export async function sendDeliveryPersonnelEmail(req, res) {
  try {
    const { email, orderId } = req.body;

    if (!email || !orderId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: email and orderId are required.",
      });
    }

    const result = await sendEmail(email, "deliveryAssignment", [orderId]);

    return res.status(200).json({
      success: true,
      message: "Email sent to delivery personnel successfully.",
      data: result,
    });
  } catch (error) {
    console.error("Error sending delivery assignment email:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to send email to delivery personnel.",
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
}
