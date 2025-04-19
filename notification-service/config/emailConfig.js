import nodemailer from 'nodemailer';

const emailConfig = {
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USERNAME || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASSWORD || 'your-app-password',
  },
};

const transporter = nodemailer.createTransport(emailConfig);

transporter.verify((error, success) => {
  if (error) {
    console.error('Error verifying transporter:', error);
  } else {
    console.log('Server is ready to take our messages');
  }
});

export default transporter;