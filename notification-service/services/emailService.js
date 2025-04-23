import transporter from "../config/emailConfig.js";
import { orderTemplates } from "../templates/orderTemplates.js";

export async function sendEmail(to, templateType, templateData) {
  try {
    const template = orderTemplates[templateType](...templateData);

    const mailOptions = {
      from: process.env.EMAIL_USERNAME || "your-email@gmail.com",
      to,
      subject: template.subject,
      html: template.html,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to}`);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
}
