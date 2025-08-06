import mongoose from 'mongoose';
const UserSchema = new mongoose.Schema({
    name: { type: String },
    username: { type: String },
    email: { type: String, unique: true, required: true },
    phone: { type: String },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['user', 'creator', 'admin'], default: 'user' },
    bio: { type: String, maxlength: 500 },
    avatar: { type: String },
    banner: { type: String },
    location: { type: String },
    website: { type: String },
    birthdate: { type: Date },

    // Social Media Links
    socialLinks: {
        twitter: { type: String },
        instagram: { type: String },
        tiktok: { type: String }
    },

    // Subscription & Monetization
    isVerified: { type: Boolean, default: false },
    subscriptionPrice: {
        "1_month": { type: Number, default: 0 },
        "3_months": { type: Number, default: 0 },
        "6_months": { type: Number, default: 0 }
    },
    subscribersCount: { type: Number, default: 0 },
    earnings: { type: Number, default: 0 },
    walletAddress: { type: String },

    // FCM Token for Notifications
    fcmTokens: [{
        token: { type: String },
        device: { type: String, enum: ['android', 'ios', 'web'] },
        lastUpdated: { type: Date, default: Date.now }
    }],

    // Payment & Payout Info
    paymentMethods: [{
        type: { type: String, enum: ['credit_card', 'paypal', 'crypto'] },
        details: { type: String }
    }],

    // Content Restrictions
    isNSFW: { type: Boolean, default: false },
    isBanned: { type: Boolean, default: false },

    // Subscription & Following
    subscriptions: [{
        creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        subscribedAt: { type: Date, default: Date.now },
        expiresAt: { type: Date },
        duration: { type: String, enum: ['1_month', '3_months', '6_months'] }, // Added duration field
        status: { type: String }
    }],
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    lastLogin: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },

    OTP: {
        OTP: { type: String },
        generateAt: { type: Date, default: Date.now },
        expireAt: { type: Date, index: { expires: '5m' } }
    }

}, { timestamps: true });

export default mongoose.model('User', UserSchema);
