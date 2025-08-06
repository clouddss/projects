import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../user/user.model.js';
import OTP from 'otp-generator';

// Register User
export const registerUser = async (username, email, password, role) => {
    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create a new user with username
        const user = new User({ username, email, password: hashedPassword, role });
        await user.save();

        return { status: 201, message: 'User registered successfully', user };
    } catch (error) {
        return { status: 500, message: 'Error registering user', error: error.message };
    }
};

// Login User
export const loginUser = async (email, password, fcmToken, stayLoggedIn) => {
    try {
        const user = await User.findOne({ email }).select('+password');

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return { status: 401, message: 'Invalid credentials' };
        }

        // Generate JWT token with different expiration based on stayLoggedIn
        const tokenExpiration = stayLoggedIn ? '30d' : '24h';
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: tokenExpiration });

        // Handle FCM Token Storage (For Multi-Device Support)
        if (fcmToken) {
            const existingToken = user.fcmTokens?.find((t) => t.token === fcmToken);
            
            if (!existingToken) {
                user.fcmTokens.push({ token: fcmToken, device: "web" }); 
            }
        }

        user.lastLogin = new Date();
        await user.save(); // Save updated user data

        return { status: 200, message: 'Login successful', token, user };
    } catch (error) {
        return { status: 500, message: 'Error logging in', error: error.message };
    }
};


// Update User Password
export const updateUserPassword = async (email, newPassword) => {
    return await User.updateOne({ email }, { $set: { password: newPassword } });
};


// Encrypt Password
export const encrypt = async (password) => {
    return await bcrypt.hash(password, 10);
};

// Generate OTP
export const generateOtp = () => {
    return OTP.generate(6, { digits: true, lowerCaseAlphabets: false, upperCaseAlphabets: false, specialChars: false });
};

// Find User by Query
export const findUser = async (query) => {
    return await User.findOne(query).select('+password');
};


// Find and Update User by ID
export const findByIdAndUpdate = async (id, updateBody) => {
    return await User.findByIdAndUpdate(id, updateBody, { new: true });
};
