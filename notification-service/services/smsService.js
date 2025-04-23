import axios from "axios";
import "dotenv/config";

const API_KEY = process.env.SMS_API_KEY;
const DEVICE_ID = process.env.SMS_DEVICE_ID;

function validatePhone(phoneNumber) {
  const cleaned = phoneNumber.replace(/\D/g, "");
  if (!cleaned) throw new Error("Invalid phone number");
  return cleaned;
}

async function sendSMS(phoneNumber, message) {
  if (!API_KEY || !DEVICE_ID) {
    throw new Error("SMS gateway not configured");
  }

  const cleanNumber = validatePhone(phoneNumber);

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

    const data = response.data?.data;
    if (!data?.success) {
      throw new Error(data?.message || "SMS failed");
    }

    return data;
  } catch (error) {
    const apiError = error.response?.data || error.message;
    console.error("TextBee error:", apiError);
    throw {
      message: `SMS API Error: ${JSON.stringify(apiError)}`,
      apiError,
      statusCode: 500,
    };
  }
}

export async function sendOrderCompleteSMS(phoneNumber, userName, orderId) {
  if (!phoneNumber || !userName || !orderId) {
    throw { message: "Missing required fields", statusCode: 400 };
  }

  const message = `Hi ${userName}, your order #${orderId} is complete! Thank you.`;
  return await sendSMS(phoneNumber, message);
}

export async function sendOrderDeliveringSMS(phoneNumber, userName, orderId) {
  if (!phoneNumber || !userName || !orderId) {
    throw { message: "Missing required fields", statusCode: 400 };
  }

  const message = `Hi ${userName}, your order #${orderId} is on the way!.`;
  await sendSMS(phoneNumber, message);
}

export async function sendDeliveryPersonnelSMS(phoneNumber, orderId) {
  if (!phoneNumber || !orderId) {
    throw { message: "Missing required fields", statusCode: 400 };
  }

  const message = `You have been assigned to deliver Order #${orderId}. Please proceed to pick up the order and ensure timely delivery.`;
  await sendSMS(phoneNumber, message);
}
