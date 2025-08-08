import mongoose from 'mongoose';

/**
 * Commission Model - Tracks individual commission payments and history
 * Handles both Tier 1 (direct) and Tier 2 (indirect) referral commissions
 */
const CommissionSchema = new mongoose.Schema({
    // Commission Recipient
    recipient: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true,
        index: true
    },
    
    // Commission Source
    sourceTransaction: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Transaction', 
        required: true,
        index: true
    },
    earningUser: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    }, // User whose earning generated this commission
    referralChain: {
        tier1Referrer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        tier2Referrer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    },
    
    // Commission Details
    tier: { 
        type: Number, 
        enum: [1, 2], 
        required: true,
        index: true
    }, // 1 for direct referral, 2 for indirect
    
    commissionRate: { 
        type: Number, 
        required: true 
    }, // Percentage as decimal (0.10 for 10%)
    
    baseAmount: { 
        type: Number, 
        required: true 
    }, // Original transaction amount
    
    commissionAmount: { 
        type: Number, 
        required: true 
    }, // Calculated commission amount
    
    currency: { 
        type: String, 
        default: 'USD' 
    },
    
    // Payment Status
    status: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'cancelled'],
        default: 'pending',
        index: true
    },
    
    paidAt: { type: Date, default: null },
    failureReason: { type: String, default: null },
    
    // Transaction Context
    transactionType: {
        type: String,
        enum: ['subscription', 'tip', 'post_purchase', 'chat_purchase'],
        required: true
    },
    
    // Metadata
    notes: { type: String, default: null },
    paymentTransactionId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Transaction',
        default: null 
    } // Transaction record for commission payment
    
}, { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Compound Indexes for Efficient Querying
CommissionSchema.index({ recipient: 1, status: 1, createdAt: -1 });
CommissionSchema.index({ earningUser: 1, tier: 1, createdAt: -1 });
CommissionSchema.index({ sourceTransaction: 1, tier: 1 });
CommissionSchema.index({ status: 1, createdAt: -1 });
CommissionSchema.index({ tier: 1, transactionType: 1, createdAt: -1 });
CommissionSchema.index({ recipient: 1, tier: 1, status: 1 });

// Virtual for commission percentage display
CommissionSchema.virtual('commissionPercentage').get(function() {
    return Math.round(this.commissionRate * 10000) / 100; // Convert to percentage with 2 decimals
});

// Static method to create commissions for a transaction
CommissionSchema.statics.createCommissions = async function(transaction, referralData) {
    const commissions = [];
    const rates = { tier1: 0.10, tier2: 0.02 };
    
    // Create Tier 1 commission (direct referrer)
    if (referralData.tier1Referrer && transaction.amount > 0) {
        const tier1Commission = new this({
            recipient: referralData.tier1Referrer,
            sourceTransaction: transaction._id,
            earningUser: transaction.recipient,
            referralChain: {
                tier1Referrer: referralData.tier1Referrer,
                tier2Referrer: referralData.tier2Referrer
            },
            tier: 1,
            commissionRate: rates.tier1,
            baseAmount: transaction.amount,
            commissionAmount: Math.round(transaction.amount * rates.tier1 * 100) / 100,
            currency: transaction.currency,
            transactionType: transaction.type
        });
        
        commissions.push(tier1Commission);
    }
    
    // Create Tier 2 commission (original referrer)
    if (referralData.tier2Referrer && transaction.amount > 0) {
        const tier2Commission = new this({
            recipient: referralData.tier2Referrer,
            sourceTransaction: transaction._id,
            earningUser: transaction.recipient,
            referralChain: {
                tier1Referrer: referralData.tier1Referrer,
                tier2Referrer: referralData.tier2Referrer
            },
            tier: 2,
            commissionRate: rates.tier2,
            baseAmount: transaction.amount,
            commissionAmount: Math.round(transaction.amount * rates.tier2 * 100) / 100,
            currency: transaction.currency,
            transactionType: transaction.type
        });
        
        commissions.push(tier2Commission);
    }
    
    if (commissions.length > 0) {
        await this.insertMany(commissions);
    }
    
    return commissions;
};

// Method to mark commission as paid
CommissionSchema.methods.markAsPaid = async function(paymentTransactionId = null) {
    this.status = 'paid';
    this.paidAt = new Date();
    this.paymentTransactionId = paymentTransactionId;
    
    await this.save();
    return this;
};

// Method to mark commission as failed
CommissionSchema.methods.markAsFailed = async function(reason) {
    this.status = 'failed';
    this.failureReason = reason;
    
    await this.save();
    return this;
};

// Static method to get commission summary for user
CommissionSchema.statics.getCommissionSummary = async function(userId, dateRange = {}) {
    const matchCriteria = { recipient: new mongoose.Types.ObjectId(userId) };
    
    // Add date filtering if provided
    if (dateRange.startDate || dateRange.endDate) {
        matchCriteria.createdAt = {};
        if (dateRange.startDate) matchCriteria.createdAt.$gte = new Date(dateRange.startDate);
        if (dateRange.endDate) matchCriteria.createdAt.$lte = new Date(dateRange.endDate);
    }
    
    const summary = await this.aggregate([
        { $match: matchCriteria },
        {
            $group: {
                _id: null,
                totalCommissions: { $sum: '$commissionAmount' },
                pendingCommissions: {
                    $sum: {
                        $cond: [{ $eq: ['$status', 'pending'] }, '$commissionAmount', 0]
                    }
                },
                paidCommissions: {
                    $sum: {
                        $cond: [{ $eq: ['$status', 'paid'] }, '$commissionAmount', 0]
                    }
                },
                tier1Commissions: {
                    $sum: {
                        $cond: [{ $eq: ['$tier', 1] }, '$commissionAmount', 0]
                    }
                },
                tier2Commissions: {
                    $sum: {
                        $cond: [{ $eq: ['$tier', 2] }, '$commissionAmount', 0]
                    }
                },
                totalTransactions: { $sum: 1 }
            }
        }
    ]);
    
    return summary[0] || {
        totalCommissions: 0,
        pendingCommissions: 0,
        paidCommissions: 0,
        tier1Commissions: 0,
        tier2Commissions: 0,
        totalTransactions: 0
    };
};

// Static method to get pending commissions for payout processing
CommissionSchema.statics.getPendingCommissions = async function(limit = 100, minAmount = 1) {
    return this.find({
        status: 'pending',
        commissionAmount: { $gte: minAmount }
    })
    .populate('recipient', 'username email walletAddress')
    .populate('sourceTransaction', 'type amount currency')
    .sort({ createdAt: 1 })
    .limit(limit);
};

export default mongoose.model('Commission', CommissionSchema);