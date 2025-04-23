import axios from "axios";
import "dotenv/config";

export async function sendOrderCompleteSMS(req, res) {
  try {
    const { phoneNumber, userName, orderId } = req.body;

    if (!phoneNumber || !userName || !orderId) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
      });
    }

    const message = `Hi ${userName}, your order #${orderId} is complete! Thank you.`;
    const result = await _sendSMS(phoneNumber, message);

    return res.status(200).json({
      success: true,
      message: "SMS sent successfully",
      data: result,
    });
  } catch (error) {
    console.error("SMS Error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
      apiError: error.response?.data,
    });
  }
}

export async function sendOrderDeliveringSMS(req, res) {
  try {
    const { phoneNumber, userName, orderId } = req.body;

    if (!phoneNumber || !userName || !orderId) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
      });
    }

    const message = `Hi ${userName}, your order #${orderId} is on the way!.`;
    await _sendSMS(phoneNumber, message);

    res.status(200).json({
      success: true,
      message: "Delivery SMS sent successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      apiError: error.response?.data,
    });
  }
}

export async function sendDeliveryPersonnelSMS(req, res) {
  try {
    const { phoneNumber, orderId } = req.body;

    if (!phoneNumber || !orderId) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
      });
    }

    const message = `You have been assigned to deliver Order #${orderId}. Please proceed to pick up the order and ensure timely delivery.`;
    await _sendSMS(phoneNumber, message);

    res.status(200).json({
      success: true,
      message: "Delivery SMS sent successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      apiError: error.response?.data,
    });
  }
}

// async function _sendSMS(phoneNumber, message) {
//   const API_KEY = process.env.SMS_API_KEY;
//   const DEVICE_ID = process.env.SMS_DEVICE_ID;

//   if (!API_KEY || !DEVICE_ID) {
//     throw new Error("SMS gateway not configured");
//   }

//   // Clean phone number
//   const cleanNumber = phoneNumber.replace(/\D/g, "");
//   if (!cleanNumber) {
//     throw new Error("Invalid phone number");
//   }

//   try {
//     const response = await axios.post(
//       `https://api.textbee.dev/api/v1/gateway/devices/${DEVICE_ID}/send-sms`,
//       {
//         recipients: [`+${cleanNumber}`], // Ensure + prefix
//         message: message.substring(0, 160), // Truncate if too long
//       },
//       {
//         headers: {
//           "x-api-key": API_KEY,
//           "Content-Type": "application/json",
//         },
//         timeout: 5000, // 5 second timeout
//       }
//     );

//     // Check for success in response (adjust based on TextBee's actual response)
//     if (response.data?.status !== "success") {
//       throw new Error(response.data?.message || "SMS failed");
//     }

//     return response.data;
//   } catch (error) {
//     const apiError = error.response?.data || error.message;
//     throw new Error(`SMS API Error: ${JSON.stringify(apiError)}`);
//   }
// }

async function _sendSMS(phoneNumber, message) {
  const API_KEY = process.env.SMS_API_KEY;
  const DEVICE_ID = process.env.SMS_DEVICE_ID;

  console.log("Using SMS API:", API_KEY, DEVICE_ID);
  console.log("Phone Number Before Clean:", phoneNumber);

  if (!API_KEY || !DEVICE_ID) {
    throw new Error("SMS gateway not configured");
  }

  const cleanNumber = phoneNumber.replace(/\D/g, "");
  if (!cleanNumber) {
    throw new Error("Invalid phone number");
  }

  try {
    const response = await axios.post(
      `https://api.textbee.dev/api/v1/gateway/devices/${DEVICE_ID}/send-sms`,
      {
        recipients: [`+${cleanNumber}`],
        message: message.substring(0, 160),
      },
      {
        headers: {
          "x-api-key": API_KEY,
          "Content-Type": "application/json",
        },
        timeout: 5000,
      }
    );

    console.log("TextBee response:", response.data);

    // ✅ ACTUAL FIX HERE
    if (!response.data?.data?.success) {
      throw new Error(response.data?.data?.message || "SMS failed");
    }

    return response.data.data; // return only the inner result
  } catch (error) {
    console.error("TextBee error:", error.response?.data || error.message);
    throw new Error(
      `SMS API Error: ${JSON.stringify(error.response?.data || error.message)}`
    );
  }
}
