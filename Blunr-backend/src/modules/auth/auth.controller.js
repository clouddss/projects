import { registerUser, loginUser,findUser, generateOtp, findByIdAndUpdate, updateUserPassword, encrypt } from './auth.service.js';
import User from '../user/user.model.js';
import Wallet from '../wallet/wallet.model.js';
import ReferralService from '../referrals/referral.service.js';
import nodemailer from 'nodemailer';
import ejs from 'ejs';
import path from 'path';
import sendEmail from '../../services/mailService.js';
import { fileURLToPath } from "url";
// import { Template } from '../../';

export const register = async (req, res) => {
    try {
        const { username, email, password, role, referralCode } = req.body;
        const validRoles = ['user', 'creator', 'admin'];

        // Validate role
        if (!role || !validRoles.includes(role)) {
            return res.status(400).json({
                status: 400,
                message: 'Invalid role provided',
                data: null
            });
        }

        // Check if username is provided
        if (!username) {
            return res.status(400).json({
                status: 400,
                message: 'Username is required',
                data: null
            });
        }

        // Check if username is already taken
        const existingUsername = await User.findOne({ username });
        if (existingUsername) {
            return res.status(409).json({
                status: 409,
                message: 'Username already taken',
                data: null
            });
        }

        // Check if the email is already registered
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({
                status: 409,
                message: 'Email already registered',
                data: null
            });
        }

        // Register the new user
        const newUser = await registerUser(username, email, password, role);
        
        // Create a wallet for the user
        const newWallet = new Wallet({ user: newUser.user._id, balance: 0, currency: 'USD' });
        await newWallet.save();

        // Handle referral system integration
        try {
            await ReferralService.createUserReferralRecord(newUser.user._id, referralCode);
            console.log(`Referral record created for user ${newUser.user._id}${referralCode ? ` with referral code ${referralCode}` : ' (organic)'}`);
        } catch (referralError) {
            console.error('Error setting up referral for new user:', referralError);
            // Don't fail registration if referral setup fails
        }

        return res.status(201).json({
            status: 201,
            message: 'User registered successfully',
            data: { user: newUser, wallet: newWallet }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            status: 500,
            message: 'Internal Server Error',
            data: null,
            error: error.message
        });
    }
};

export const login = async (req, res) => {
    try {
        const { email, password, fcmToken, stayLoggedIn } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                status: 400,
                message: 'Email and password are required',
                data: null,
            });
        }

        const { status, message, token, user } = await loginUser(email, password, fcmToken, stayLoggedIn);

        if (status !== 200) {
            return res.status(status).json({
                status,
                message,
                data: null,
            });
        }

        return res.status(200).json({
            status: 200,
            message: 'Login successful',
            data: { user, token },
        });
    } catch (error) {
        return res.status(500).json({
            status: 500,
            message: 'Internal server error',
            error: error.message,
        });
    }
};


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const forgetPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Validate email
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Find user by email
    const user = await findUser({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate OTP
    const otp = generateOtp();
    const generateTime = new Date();
    const expireTime = new Date(Date.now() + 5 * 60 * 1000); // OTP expires in 5 minutes

    // Update OTP in user record
    await findByIdAndUpdate(user._id, {
      OTP: { OTP: otp, generateAt: generateTime, expireAt: expireTime }
    });

    // Render email template
    const emailBody = await ejs.renderFile(
      path.join(__dirname, '../../templates/Otp.ejs'),
      {
        userName: user.username || 'User',
        otp,
        supportEmail: "support@yourapp.com",
      }
    );

    console.log("OTP Email Body:", emailBody);
    console.log(user.email,"userEmail")

    // Send OTP email
    await sendEmail(
      {
        email: user.email,
        name: user.firstName || 'User'
      },
      "Password Reset OTP - Blunr",
      emailBody
    );

    res.status(200).json({
      message: "OTP sent successfully",
      response: { OTP: otp }
    });
  } catch (error) {
    console.error("Error in forgetPassword controller:", error);
    res.status(500).json({ message: "Failed to send OTP", error: error.message });
  }
};


export const resetPassword = async (req, res) => {
    try {
        const { email, password, OTP } = req.body;
        const user = await findUser({ email });

        if (!user) {
            return res.status(400).json({ status: 400, message: 'User not found' });
        }

        // Debugging OTP
        console.log("Stored OTP:", user.OTP);
        console.log("Received OTP:", OTP);

        // Validate OTP
        const nowTime = new Date();
        const expireAt = new Date(user.OTP.expireAt);

        if (!user.OTP || user.OTP.OTP !== OTP || nowTime > expireAt) {
            return res.status(400).json({ status: 400, message: 'Invalid or expired OTP' });
        }

        // Encrypt password
        const hashedPassword = await encrypt(password);

        // Update password in database
        const result = await updateUserPassword(user.email, hashedPassword);
        console.log("Password update result:", result); // Debugging update result

        // Fetch updated user to verify password change
        const updatedUser = await findUser({ email });
        console.log("Updated User Password:", updatedUser.password);

        res.status(200).json({ status: 200, message: 'Password reset successfully' });
    } catch (error) {
        res.status(500).json({ status: 500, message: 'Internal server error', error: error.message });
    }
};
