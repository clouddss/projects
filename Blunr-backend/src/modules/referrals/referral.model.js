import mongoose from 'mongoose';

/**
 * Referral Model - Tracks referral relationships and chains
 * Supports 2-tier referral system with commission tracking
 */
const ReferralSchema = new mongoose.Schema({
    // Referral Code & User Management
    code: { 
        type: String, 
        unique: true, 
        required: true,
        uppercase: true,
        minlength: 6,
        maxlength: 12
    },
    codeOwner: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true,
        index: true
    },
    
    // Referral Chain Tracking
    directReferrals: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    }], // Users directly referred by this code owner
    
    tier1Referrer: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        default: null,
        index: true
    }, // Direct referrer (Tier 1)
    
    tier2Referrer: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        default: null,
        index: true
    }, // Original referrer (Tier 2)
    
    // Performance Metrics
    stats: {
        totalReferrals: { type: Number, default: 0 },
        activeReferrals: { type: Number, default: 0 }, // Currently earning users
        totalCommissionEarned: { type: Number, default: 0 },
        tier1CommissionEarned: { type: Number, default: 0 },
        tier2CommissionEarned: { type: Number, default: 0 },
        lastActivity: { type: Date, default: Date.now }
    },
    
    // Status & Configuration
    isActive: { type: Boolean, default: true },
    expiresAt: { type: Date, default: null }, // Optional expiration
    
    // Metadata
    source: { 
        type: String, 
        enum: ['organic', 'campaign', 'influencer', 'partner', 'migration'],
        default: 'organic'
    },
    campaign: { type: String, default: null } // Campaign identifier
    
}, { 
    timestamps: true,
    // Optimize for frequent queries
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Compound Indexes for Performance
ReferralSchema.index({ codeOwner: 1, isActive: 1 });
ReferralSchema.index({ tier1Referrer: 1, tier2Referrer: 1 });
ReferralSchema.index({ code: 1, isActive: 1 });
ReferralSchema.index({ 'stats.lastActivity': -1 });
ReferralSchema.index({ createdAt: -1 });

// Virtual for commission rate configuration
ReferralSchema.virtual('commissionRates').get(function() {
    return {
        tier1: 0.10, // 10% for direct referrals
        tier2: 0.02  // 2% for indirect referrals
    };
});

// Static method to generate unique referral code
ReferralSchema.statics.generateReferralCode = async function(baseString = '') {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const codeLength = 8;
    
    let code;
    let isUnique = false;
    let attempts = 0;
    
    while (!isUnique && attempts < 10) {
        if (baseString && attempts === 0) {
            // Try to create code from username/email first
            code = baseString.substring(0, 4).toUpperCase() + 
                   Math.random().toString(36).substring(2, 6).toUpperCase();
        } else {
            // Generate random code
            code = '';
            for (let i = 0; i < codeLength; i++) {
                code += characters.charAt(Math.floor(Math.random() * characters.length));
            }
        }
        
        const existing = await this.findOne({ code });
        if (!existing) {
            isUnique = true;
        }
        attempts++;
    }
    
    return code;
};

// Method to check if user can be referred (prevent self-referral and circular references)
ReferralSchema.statics.canRefer = async function(referrerCode, newUserId) {
    const referral = await this.findOne({ code: referrerCode }).populate('codeOwner');
    
    if (!referral || !referral.isActive) {
        return { canRefer: false, reason: 'Invalid or inactive referral code' };
    }
    
    // Prevent self-referral
    if (referral.codeOwner._id.toString() === newUserId.toString()) {
        return { canRefer: false, reason: 'Cannot refer yourself' };
    }
    
    // Check if user is already in the referral chain (prevent circular references)
    if (referral.directReferrals.includes(newUserId)) {
        return { canRefer: false, reason: 'User already referred' };
    }
    
    return { canRefer: true, referral };
};

// Method to add a new referral to the chain
ReferralSchema.methods.addReferral = async function(newUserId) {
    // Add to direct referrals
    this.directReferrals.push(newUserId);
    
    // Update stats
    this.stats.totalReferrals += 1;
    this.stats.activeReferrals += 1;
    this.stats.lastActivity = new Date();
    
    await this.save();
    
    // Create referral record for the new user
    const newUserCode = await this.constructor.generateReferralCode();
    
    const newUserReferral = new this.constructor({
        code: newUserCode,
        codeOwner: newUserId,
        tier1Referrer: this.codeOwner, // Direct referrer
        tier2Referrer: this.tier1Referrer, // Original referrer (if exists)
        source: 'referral'
    });
    
    await newUserReferral.save();
    
    return newUserReferral;
};

// Method to calculate commission for a transaction
ReferralSchema.statics.calculateCommissions = function(amount, tiers = { tier1: 0.10, tier2: 0.02 }) {
    return {
        tier1Commission: Math.round(amount * tiers.tier1 * 100) / 100,
        tier2Commission: Math.round(amount * tiers.tier2 * 100) / 100
    };
};

export default mongoose.model('Referral', ReferralSchema);