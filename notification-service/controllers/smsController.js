import * as smsService from "../services/smsService.js";

export async function sendOrderCompleteSMS(req, res) {
  try {
    const { phoneNumber, userName, orderId } = req.body;
    const result = await smsService.sendOrderCompleteSMS(phoneNumber, userName, orderId);
    res.status(200).json({
      success: true,
      message: "SMS sent successfully",
      data: result,
    });
  } catch (error) {
    console.error("SMS Error:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message,
      apiError: error.apiError || undefined,
    });
  }
}

export async function sendOrderDeliveringSMS(req, res) {
  try {
    const { phoneNumber, userName, orderId } = req.body;
    await smsService.sendOrderDeliveringSMS(phoneNumber, userName, orderId);
    res.status(200).json({
      success: true,
      message: "Delivery SMS sent successfully",
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message,
      apiError: error.apiError || undefined,
    });
  }
}

export async function sendDeliveryPersonnelSMS(req, res) {
  try {
    const { phoneNumber, orderId } = req.body;
    await smsService.sendDeliveryPersonnelSMS(phoneNumber, orderId);
    res.status(200).json({
      success: true,
      message: "Delivery SMS sent successfully",
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message,
      apiError: error.apiError || undefined,
    });
  }
}
