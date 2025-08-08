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

    // Referral System Integration
    referralData: {
        referralCode: { 
            type: String, 
            unique: true, 
            sparse: true, // Allows multiple null values
            uppercase: true,
            index: true 
        },
        referredBy: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'User', 
            default: null 
        }, // Direct referrer (Tier 1)
        referralChain: {
            tier1Referrer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
            tier2Referrer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
        },
        referralStats: {
            totalReferrals: { type: Number, default: 0 },
            activeReferrals: { type: Number, default: 0 },
            totalCommissionsEarned: { type: Number, default: 0 },
            pendingCommissions: { type: Number, default: 0 }
        },
        referralSource: { 
            type: String, 
            enum: ['organic', 'referral', 'campaign', 'influencer'],
            default: 'organic' 
        }
    },

    // Commission & Earnings Tracking
    commissionEarnings: {
        tier1Earnings: { type: Number, default: 0 }, // From direct referrals
        tier2Earnings: { type: Number, default: 0 }, // From indirect referrals
        totalCommissions: { type: Number, default: 0 },
        lastCommissionDate: { type: Date, default: null }
    },

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

// Indexes for referral system performance
UserSchema.index({ 'referralData.referralCode': 1 }, { sparse: true });
UserSchema.index({ 'referralData.referredBy': 1 });
UserSchema.index({ 'referralData.referralChain.tier1Referrer': 1 });
UserSchema.index({ 'referralData.referralChain.tier2Referrer': 1 });
UserSchema.index({ 'referralData.referralStats.totalReferrals': -1 });
UserSchema.index({ 'commissionEarnings.totalCommissions': -1 });

// Virtual for total referral earnings
UserSchema.virtual('totalReferralEarnings').get(function() {
    return this.commissionEarnings.tier1Earnings + this.commissionEarnings.tier2Earnings;
});

// Virtual for referral conversion rate
UserSchema.virtual('referralConversionRate').get(function() {
    if (this.referralData.referralStats.totalReferrals === 0) return 0;
    return Math.round((this.referralData.referralStats.activeReferrals / this.referralData.referralStats.totalReferrals) * 10000) / 100;
});

// Virtual for total earnings including referrals
UserSchema.virtual('totalEarnings').get(function() {
    const baseEarnings = this.earnings || 0;
    const referralEarnings = this.totalReferralEarnings || 0;
    return baseEarnings + referralEarnings;
});

// Method to generate and assign referral code
UserSchema.methods.generateReferralCode = async function() {
    if (this.referralData.referralCode) {
        return this.referralData.referralCode;
    }
    
    const Referral = mongoose.model('Referral');
    const baseString = this.username || this.email.split('@')[0];
    const code = await Referral.generateReferralCode(baseString);
    
    this.referralData.referralCode = code;
    await this.save();
    
    return code;
};

// Method to update referral stats
UserSchema.methods.updateReferralStats = async function(increment = {}) {
    const updates = {};
    
    if (increment.totalReferrals) {
        updates['referralData.referralStats.totalReferrals'] = 
            (this.referralData.referralStats.totalReferrals || 0) + increment.totalReferrals;
    }
    
    if (increment.activeReferrals !== undefined) {
        updates['referralData.referralStats.activeReferrals'] = 
            (this.referralData.referralStats.activeReferrals || 0) + increment.activeReferrals;
    }
    
    if (increment.totalCommissionsEarned) {
        updates['referralData.referralStats.totalCommissionsEarned'] = 
            (this.referralData.referralStats.totalCommissionsEarned || 0) + increment.totalCommissionsEarned;
    }
    
    if (Object.keys(updates).length > 0) {
        await this.constructor.updateOne({ _id: this._id }, { $inc: updates });
    }
};

// Static method to find users by referral code
UserSchema.statics.findByReferralCode = function(referralCode) {
    return this.findOne({ 'referralData.referralCode': referralCode.toUpperCase() });
};

// Static method to get referral leaderboard
UserSchema.statics.getReferralLeaderboard = function(limit = 20) {
    return this.find({ 
        'referralData.referralStats.totalReferrals': { $gt: 0 } 
    })
    .sort({ 
        'referralData.referralStats.totalCommissionsEarned': -1,
        'referralData.referralStats.totalReferrals': -1 
    })
    .limit(limit)
    .select('username avatar isVerified referralData.referralStats commissionEarnings');
};

// Pre-save middleware to auto-generate referral code for new users
UserSchema.pre('save', async function(next) {
    // Auto-generate referral code for new users
    if (this.isNew && !this.referralData.referralCode) {
        try {
            const Referral = mongoose.model('Referral');
            const baseString = this.username || this.email.split('@')[0];
            this.referralData.referralCode = await Referral.generateReferralCode(baseString);
        } catch (error) {
            console.error('Error generating referral code:', error);
            // Continue without referral code if generation fails
        }
    }
    next();
});

export default mongoose.model('User', UserSchema);
