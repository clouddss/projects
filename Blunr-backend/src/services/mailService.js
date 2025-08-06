import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Nodemailer Transporter
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD,
    },
});

// Function to Send Email
const sendEmail = async (receiver, subject, content, textContent = "") => {
    console.log(receiver,"reciver mail")
    try {
        const mailOptions = {
            from: process.env.NODEMAILER_EMAIL,
            to: receiver.email,
            subject,
            text: textContent,
            html: content,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("Message sent: %s", info.messageId);
        return info;
    } catch (error) {
        console.error("Error sending email:", error);
        throw error;
    }
};

export default sendEmail;
