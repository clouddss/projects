import ReferralService from './referral.service.js';
import Commission from './commission.model.js';
import User from '../user/user.model.js';

/**
 * Transaction Integration Service
 * 
 * Middleware and hooks to integrate referral commission processing
 * with existing transaction system
 */

/**
 * Middleware to automatically process referral commissions
 * Add this to your transaction completion workflow
 */
export const processReferralCommissions = async (req, res, next) => {
    try {
        const transaction = req.transaction || req.body.transaction;
        
        if (transaction && transaction.status === 'completed' && transaction.recipient) {
            // Process commissions asynchronously to avoid blocking the main transaction flow
            setImmediate(async () => {
                try {
                    const result = await ReferralService.processCommissions(transaction);
                    if (result.processed) {
                        console.log(`Processed referral commissions for transaction ${transaction._id}:`, {
                            tier1Amount: result.tier1Amount,
                            tier2Amount: result.tier2Amount
                        });
                    }
                } catch (commissionError) {
                    console.error('Error processing referral commissions:', commissionError);
                    // Log error but don't fail the main transaction
                }
            });
        }
        
        next();
    } catch (error) {
        console.error('Error in referral commission middleware:', error);
        next(); // Continue with main flow even if referral processing fails
    }
};

/**
 * Transaction Model Post-Save Hook
 * Add this to your transaction.model.js file
 */
export const transactionPostSaveHook = async function(doc) {
    if (doc.status === 'completed' && doc.recipient && 
        ['subscription', 'tip', 'post_purchase', 'chat_purchase'].includes(doc.type)) {
        
        try {
            await ReferralService.processCommissions(doc);
        } catch (error) {
            console.error(`Failed to process referral commissions for transaction ${doc._id}:`, error);
        }
    }
};

/**
 * Real-time Commission Calculator
 * Calculate potential commissions before transaction completion
 */
export const calculatePotentialCommissions = async (recipientId, amount) => {
    try {
        const user = await User.findById(recipientId).populate({
            path: 'referralData.referralChain.tier1Referrer referralData.referralChain.tier2Referrer',
            select: 'username'
        });
        
        if (!user || (!user.referralData?.referralChain?.tier1Referrer && !user.referralData?.referralChain?.tier2Referrer)) {
            return {
                hasReferrers: false,
                tier1Commission: 0,
                tier2Commission: 0,
                totalCommissions: 0
            };
        }
        
        const rates = { tier1: 0.10, tier2: 0.02 };
        const tier1Commission = user.referralData.referralChain.tier1Referrer 
            ? Math.round(amount * rates.tier1 * 100) / 100 
            : 0;
        const tier2Commission = user.referralData.referralChain.tier2Referrer 
            ? Math.round(amount * rates.tier2 * 100) / 100 
            : 0;
        
        return {
            hasReferrers: true,
            tier1Commission,
            tier2Commission,
            totalCommissions: tier1Commission + tier2Commission,
            referrers: {
                tier1: user.referralData.referralChain.tier1Referrer?.username,
                tier2: user.referralData.referralChain.tier2Referrer?.username
            }
        };
    } catch (error) {
        console.error('Error calculating potential commissions:', error);
        return {
            hasReferrers: false,
            tier1Commission: 0,
            tier2Commission: 0,
            totalCommissions: 0,
            error: error.message
        };
    }
};

/**
 * Commission Reconciliation Service
 * Handles missed commissions and data consistency
 */
export const reconcileCommissions = async (startDate, endDate) => {
    try {
        const Transaction = (await import('../transactions/transaction.model.js')).default;
        
        // Find completed transactions without associated commissions
        const transactions = await Transaction.find({
            status: 'completed',
            type: { $in: ['subscription', 'tip', 'post_purchase', 'chat_purchase'] },
            recipient: { $ne: null },
            createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
        });
        
        const results = {
            processed: 0,
            skipped: 0,
            errors: []
        };
        
        for (const transaction of transactions) {
            try {
                // Check if commissions already exist
                const existingCommissions = await Commission.find({
                    sourceTransaction: transaction._id
                });
                
                if (existingCommissions.length === 0) {
                    const result = await ReferralService.processCommissions(transaction);
                    if (result.processed) {
                        results.processed++;
                    } else {
                        results.skipped++;
                    }
                } else {
                    results.skipped++;
                }
            } catch (error) {
                results.errors.push({
                    transactionId: transaction._id,
                    error: error.message
                });
            }
        }
        
        return results;
    } catch (error) {
        console.error('Error reconciling commissions:', error);
        throw error;
    }
};

/**
 * Performance Analytics for Commission Processing
 */
export const getCommissionAnalytics = async (dateRange = {}) => {
    try {
        const matchCriteria = {};
        
        if (dateRange.startDate || dateRange.endDate) {
            matchCriteria.createdAt = {};
            if (dateRange.startDate) matchCriteria.createdAt.$gte = new Date(dateRange.startDate);
            if (dateRange.endDate) matchCriteria.createdAt.$lte = new Date(dateRange.endDate);
        }
        
        const analytics = await Commission.aggregate([
            { $match: matchCriteria },
            {
                $group: {
                    _id: null,
                    totalCommissions: { $sum: '$commissionAmount' },
                    totalTransactions: { $sum: 1 },
                    avgCommission: { $avg: '$commissionAmount' },
                    tier1Total: {
                        $sum: { $cond: [{ $eq: ['$tier', 1] }, '$commissionAmount', 0] }
                    },
                    tier2Total: {
                        $sum: { $cond: [{ $eq: ['$tier', 2] }, '$commissionAmount', 0] }
                    },
                    byStatus: {
                        $push: {
                            status: '$status',
                            amount: '$commissionAmount'
                        }
                    },
                    byType: {
                        $push: {
                            type: '$transactionType',
                            amount: '$commissionAmount'
                        }
                    }
                }
            }
        ]);
        
        // Calculate status breakdown
        const statusBreakdown = {};
        const typeBreakdown = {};
        
        if (analytics[0]) {
            analytics[0].byStatus.forEach(item => {
                statusBreakdown[item.status] = (statusBreakdown[item.status] || 0) + item.amount;
            });
            
            analytics[0].byType.forEach(item => {
                typeBreakdown[item.type] = (typeBreakdown[item.type] || 0) + item.amount;
            });
        }
        
        return {
            summary: analytics[0] || {
                totalCommissions: 0,
                totalTransactions: 0,
                avgCommission: 0,
                tier1Total: 0,
                tier2Total: 0
            },
            statusBreakdown,
            typeBreakdown,
            tier1Percentage: analytics[0] ? 
                Math.round((analytics[0].tier1Total / analytics[0].totalCommissions) * 100) : 0,
            tier2Percentage: analytics[0] ? 
                Math.round((analytics[0].tier2Total / analytics[0].totalCommissions) * 100) : 0
        };
    } catch (error) {
        console.error('Error getting commission analytics:', error);
        throw error;
    }
};

/**
 * Bulk Commission Processing (for scheduled jobs)
 */
export const bulkProcessCommissions = async (limit = 1000) => {
    try {
        const Transaction = (await import('../transactions/transaction.model.js')).default;
        
        // Find recent completed transactions that might need commission processing
        const transactions = await Transaction.find({
            status: 'completed',
            type: { $in: ['subscription', 'tip', 'post_purchase', 'chat_purchase'] },
            recipient: { $ne: null },
            createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
        }).limit(limit);
        
        const results = {
            processed: 0,
            skipped: 0,
            errors: []
        };
        
        for (const transaction of transactions) {
            try {
                const result = await ReferralService.processCommissions(transaction);
                if (result.processed) {
                    results.processed++;
                } else {
                    results.skipped++;
                }
            } catch (error) {
                results.errors.push({
                    transactionId: transaction._id,
                    error: error.message
                });
            }
        }
        
        return results;
    } catch (error) {
        console.error('Error in bulk commission processing:', error);
        throw error;
    }
};

/**
 * Usage Examples and Integration Points:
 */

// 1. Add to your transaction controller after successful payment:
/*
import { processReferralCommissions } from './referrals/transaction-integration.js';

// In your payment completion handler:
const completePayment = async (req, res) => {
    // ... existing payment logic
    
    if (transaction.status === 'completed') {
        req.transaction = transaction;
        await processReferralCommissions(req, res, () => {});
    }
    
    res.json({ success: true, transaction });
};
*/

// 2. Add to your transaction model:
/*
import { transactionPostSaveHook } from './referrals/transaction-integration.js';

TransactionSchema.post('save', transactionPostSaveHook);
*/

// 3. For scheduled commission reconciliation:
/*
import { reconcileCommissions, bulkProcessCommissions } from './referrals/transaction-integration.js';

// Daily job to reconcile missed commissions
const dailyCommissionJob = async () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const today = new Date();
    
    const results = await reconcileCommissions(yesterday, today);
    console.log('Commission reconciliation results:', results);
};
*/

export default {
    processReferralCommissions,
    transactionPostSaveHook,
    calculatePotentialCommissions,
    reconcileCommissions,
    getCommissionAnalytics,
    bulkProcessCommissions
};