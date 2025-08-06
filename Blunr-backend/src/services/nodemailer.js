import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config(); // Load environment variables

// Configure Nodemailer transporter
const transporter = nodemailer.createTransport({
  host: process.env.NODEMAILER_HOST,
  port: process.env.NODEMAILER_PORT,
  secure: false, // `false` for TLS (587), `true` for SSL (465)
  auth: {
    user: process.env.NODEMAILER_EMAIL,
    pass: process.env.NODEMAILER_PASSWORD,
  },
});

// Function to send OTP email
export const sendOtpEmail = async (email, otp) => {
  try {
    const mailOptions = {
      from: `"Your App Name" <${process.env.NODEMAILER_EMAIL}>`, // Custom sender name
      to: email,
      subject: "Password Reset OTP",
      text: `Your OTP for password reset is: ${otp}. This OTP is valid for 5 minutes.`,
      html: `<p>Your OTP for password reset is: <strong>${otp}</strong>.</p><p>This OTP is valid for <strong>5 minutes</strong>.</p>`,
    };

    await transporter.sendMail(mailOptions);
    console.log(`📧 OTP sent to ${email}`);
  } catch (error) {
    console.error("❌ Error sending OTP email:", error);
    throw new Error("Error sending OTP email");
  }
};

export default transporter;
