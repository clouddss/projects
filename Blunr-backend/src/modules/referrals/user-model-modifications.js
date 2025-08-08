/**
 * USER MODEL MODIFICATIONS FOR REFERRAL SYSTEM
 * 
 * Add these fields to the existing User model schema to integrate with the referral system.
 * These modifications enhance the existing user.model.js without breaking current functionality.
 */

// Add to UserSchema (line 32, after walletAddress field):

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

/**
 * INDEXES TO ADD FOR PERFORMANCE
 * 
 * Add these indexes for optimal query performance:
 */

// Add to UserSchema.index() calls:
UserSchema.index({ 'referralData.referralCode': 1 }, { sparse: true });
UserSchema.index({ 'referralData.referredBy': 1 });
UserSchema.index({ 'referralData.referralChain.tier1Referrer': 1 });
UserSchema.index({ 'referralData.referralChain.tier2Referrer': 1 });
UserSchema.index({ 'referralData.totalReferrals': -1 });
UserSchema.index({ 'commissionEarnings.totalCommissions': -1 });

/**
 * VIRTUAL METHODS TO ADD
 * 
 * Add these virtual methods to the UserSchema:
 */

// Virtual for total referral earnings
UserSchema.virtual('totalReferralEarnings').get(function() {
    return this.commissionEarnings.tier1Earnings + this.commissionEarnings.tier2Earnings;
});

// Virtual for referral conversion rate
UserSchema.virtual('referralConversionRate').get(function() {
    if (this.referralData.totalReferrals === 0) return 0;
    return Math.round((this.referralData.activeReferrals / this.referralData.totalReferrals) * 10000) / 100;
});

/**
 * INSTANCE METHODS TO ADD
 * 
 * Add these methods to UserSchema.methods:
 */

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

/**
 * STATIC METHODS TO ADD
 * 
 * Add these static methods to UserSchema.statics:
 */

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

/**
 * MIDDLEWARE TO ADD
 * 
 * Add this pre-save middleware to automatically generate referral code:
 */

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

/**
 * EXAMPLE UPDATED EARNINGS CALCULATION
 * 
 * Update the earnings field calculation to include referral commissions:
 */

UserSchema.virtual('totalEarnings').get(function() {
    const baseEarnings = this.earnings || 0;
    const referralEarnings = this.totalReferralEarnings || 0;
    return baseEarnings + referralEarnings;
});

/**
 * SAMPLE DOCUMENT STRUCTURE
 * 
 * Example of how a User document would look with referral integration:
 */

const sampleUserWithReferral = {
    _id: "507f1f77bcf86cd799439011",
    username: "johndoe",
    email: "john@example.com",
    // ... other existing fields
    earnings: 250.00,
    
    // NEW REFERRAL FIELDS
    referralData: {
        referralCode: "JOHN1234",
        referredBy: "507f1f77bcf86cd799439012", // ObjectId of referrer
        referralChain: {
            tier1Referrer: "507f1f77bcf86cd799439012", // Direct referrer
            tier2Referrer: "507f1f77bcf86cd799439013"  // Original referrer
        },
        referralStats: {
            totalReferrals: 15,
            activeReferrals: 8,
            totalCommissionsEarned: 75.50,
            pendingCommissions: 12.25
        },
        referralSource: "referral"
    },
    
    commissionEarnings: {
        tier1Earnings: 60.00,  // From direct referrals
        tier2Earnings: 15.50,  // From indirect referrals  
        totalCommissions: 75.50,
        lastCommissionDate: "2024-01-15T10:30:00Z"
    }
};

export { sampleUserWithReferral };