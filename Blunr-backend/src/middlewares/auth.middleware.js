import jwt from 'jsonwebtoken';
import User from '../modules/user/user.model.js';
import dotenv from 'dotenv';

dotenv.config();

const authMiddleware = async (req, res, next) => {
    try {
        // Allow OPTIONS requests to pass through for CORS preflight
        if (req.method === 'OPTIONS') {
            return next();
        }

        const token = req.header('Authorization')?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ message: 'Access Denied. No token provided.' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = await User.findById(decoded.userId).select('-password');

        if (!req.user) {
            return res.status(401).json({ message: 'User not found.' });
        }

        next();
    } catch (error) {
        console.error("Auth Middleware Error:", error); // Debugging
        res.status(401).json({ message: 'Invalid or expired token.' });
    }
};

export default authMiddleware;
