import Referral from './referral.model.js';
import Commission from './commission.model.js';
import User from '../user/user.model.js';
import Transaction from '../transactions/transaction.model.js';

/**
 * Referral Service - Business logic for 2-tier referral system
 */
class ReferralService {
    
    /**
     * Create referral record for new user
     * @param {ObjectId} userId - New user ID
     * @param {string} referralCode - Referral code used (optional)
     */
    static async createUserReferralRecord(userId, referralCode = null) {
        try {
            let referralData = {
                tier1Referrer: null,
                tier2Referrer: null
            };
            
            // If user was referred, establish the referral chain
            if (referralCode) {
                const canReferResult = await Referral.canRefer(referralCode, userId);
                
                if (canReferResult.canRefer) {
                    const referrerReferral = canReferResult.referral;
                    
                    // Add user to referrer's direct referrals and create referral record
                    const newUserReferral = await referrerReferral.addReferral(userId);
                    
                    referralData = {
                        tier1Referrer: referrerReferral.codeOwner,
                        tier2Referrer: referrerReferral.tier1Referrer
                    };
                    
                    console.log(`User ${userId} referred by code ${referralCode} and assigned code ${newUserReferral.code}`);
                } else {
                    console.log(`Referral failed: ${canReferResult.reason}`);
                    // Still create referral record for new user, but as organic
                    const newUserCode = await Referral.generateReferralCode();
                    const newUserReferral = new Referral({
                        code: newUserCode,
                        codeOwner: userId,
                        tier1Referrer: null,
                        tier2Referrer: null,
                        source: 'organic'
                    });
                    
                    await newUserReferral.save();
                }
            } else {
                // Create referral record without referrer (organic user)
                const newUserCode = await Referral.generateReferralCode();
                const newUserReferral = new Referral({
                    code: newUserCode,
                    codeOwner: userId,
                    tier1Referrer: null,
                    tier2Referrer: null,
                    source: 'organic'
                });
                
                await newUserReferral.save();
                console.log(`Organic user ${userId} assigned referral code ${newUserCode}`);
            }
            
            return referralData;
        } catch (error) {
            console.error('Error creating user referral record:', error);
            throw error;
        }
    }
    
    /**
     * Process commissions for a completed transaction
     * @param {Object} transaction - Transaction object
     */
    static async processCommissions(transaction) {
        try {
            if (transaction.status !== 'completed' || !transaction.recipient) {
                return { processed: false, reason: 'Transaction not eligible for commissions' };
            }
            
            // Get referral data for the earning user
            const userReferral = await Referral.findOne({ 
                codeOwner: transaction.recipient 
            }).populate('tier1Referrer tier2Referrer');
            
            if (!userReferral || (!userReferral.tier1Referrer && !userReferral.tier2Referrer)) {
                return { processed: false, reason: 'No referrers found for user' };
            }
            
            // Create commission records
            const referralData = {
                tier1Referrer: userReferral.tier1Referrer?._id,
                tier2Referrer: userReferral.tier2Referrer?._id
            };
            
            const commissions = await Commission.createCommissions(transaction, referralData);
            
            // Update referral statistics
            if (userReferral.tier1Referrer) {
                const tier1Referral = await Referral.findOne({ 
                    codeOwner: userReferral.tier1Referrer._id 
                });
                if (tier1Referral) {
                    const tier1Amount = commissions.find(c => c.tier === 1)?.commissionAmount || 0;
                    tier1Referral.stats.tier1CommissionEarned += tier1Amount;
                    tier1Referral.stats.totalCommissionEarned += tier1Amount;
                    tier1Referral.stats.lastActivity = new Date();
                    await tier1Referral.save();
                }
            }
            
            if (userReferral.tier2Referrer) {
                const tier2Referral = await Referral.findOne({ 
                    codeOwner: userReferral.tier2Referrer._id 
                });
                if (tier2Referral) {
                    const tier2Amount = commissions.find(c => c.tier === 2)?.commissionAmount || 0;
                    tier2Referral.stats.tier2CommissionEarned += tier2Amount;
                    tier2Referral.stats.totalCommissionEarned += tier2Amount;
                    tier2Referral.stats.lastActivity = new Date();
                    await tier2Referral.save();
                }
            }
            
            return { 
                processed: true, 
                commissions: commissions.length,
                tier1Amount: commissions.find(c => c.tier === 1)?.commissionAmount || 0,
                tier2Amount: commissions.find(c => c.tier === 2)?.commissionAmount || 0
            };
            
        } catch (error) {
            console.error('Error processing commissions:', error);
            throw error;
        }
    }
    
    /**
     * Get referral analytics for a user
     * @param {ObjectId} userId - User ID
     * @param {Object} filters - Date range and other filters
     */
    static async getReferralAnalytics(userId, filters = {}) {
        try {
            const referralRecord = await Referral.findOne({ codeOwner: userId })
                .populate('directReferrals', 'username createdAt earnings')
                .populate('tier1Referrer tier2Referrer', 'username');
            
            if (!referralRecord) {
                return { error: 'No referral record found' };
            }
            
            // Get commission summary
            const commissionSummary = await Commission.getCommissionSummary(userId, filters);
            
            // Get recent commissions
            const recentCommissions = await Commission.find({ recipient: userId })
                .populate('earningUser', 'username')
                .populate('sourceTransaction', 'type amount createdAt')
                .sort({ createdAt: -1 })
                .limit(10);
            
            // Calculate performance metrics
            const activeReferrals = referralRecord.directReferrals.filter(ref => ref.earnings > 0);
            const conversionRate = referralRecord.directReferrals.length > 0 
                ? (activeReferrals.length / referralRecord.directReferrals.length * 100).toFixed(2)
                : 0;
            
            return {
                referralCode: referralRecord.code,
                stats: referralRecord.stats,
                commissionSummary,
                directReferrals: referralRecord.directReferrals,
                tier1Referrer: referralRecord.tier1Referrer,
                tier2Referrer: referralRecord.tier2Referrer,
                recentCommissions,
                performance: {
                    conversionRate: `${conversionRate}%`,
                    activeReferrals: activeReferrals.length,
                    averageEarningsPerReferral: activeReferrals.length > 0 
                        ? (activeReferrals.reduce((sum, ref) => sum + ref.earnings, 0) / activeReferrals.length).toFixed(2)
                        : 0
                }
            };
        } catch (error) {
            console.error('Error getting referral analytics:', error);
            throw error;
        }
    }
    
    /**
     * Validate referral code and get referrer info
     * @param {string} referralCode - Referral code to validate
     */
    static async validateReferralCode(referralCode) {
        try {
            const referral = await Referral.findOne({ 
                code: referralCode.toUpperCase(),
                isActive: true 
            }).populate('codeOwner', 'username avatar isVerified');
            
            if (!referral) {
                return { valid: false, reason: 'Invalid referral code' };
            }
            
            return {
                valid: true,
                referrer: {
                    username: referral.codeOwner.username,
                    avatar: referral.codeOwner.avatar,
                    isVerified: referral.codeOwner.isVerified
                },
                benefits: {
                    tier1Rate: '10%',
                    tier2Rate: '2%',
                    description: 'Earn commissions from your referrals earnings!'
                }
            };
        } catch (error) {
            console.error('Error validating referral code:', error);
            throw error;
        }
    }
    
    /**
     * Process commission payouts (batch processing)
     * @param {number} minAmount - Minimum commission amount for payout
     * @param {number} limit - Maximum number of commissions to process
     */
    static async processCommissionPayouts(minAmount = 10, limit = 100) {
        try {
            const pendingCommissions = await Commission.getPendingCommissions(limit, minAmount);
            
            if (pendingCommissions.length === 0) {
                return { processed: 0, message: 'No pending commissions found' };
            }
            
            const results = {
                processed: 0,
                failed: 0,
                totalAmount: 0,
                errors: []
            };
            
            for (const commission of pendingCommissions) {
                try {
                    // In a real implementation, you would integrate with payment processor here
                    // For now, we'll simulate the payout process
                    
                    if (commission.recipient.walletAddress) {
                        // Create payout transaction record
                        const payoutTransaction = new Transaction({
                            user: commission.recipient._id,
                            recipient: commission.recipient._id,
                            type: 'withdrawal',
                            amount: commission.commissionAmount,
                            currency: commission.currency,
                            status: 'completed',
                            transactionId: `COMM_${commission._id}_${Date.now()}`
                        });
                        
                        await payoutTransaction.save();
                        await commission.markAsPaid(payoutTransaction._id);
                        
                        // Update user earnings
                        await User.findByIdAndUpdate(commission.recipient._id, {
                            $inc: { earnings: commission.commissionAmount }
                        });
                        
                        results.processed++;
                        results.totalAmount += commission.commissionAmount;
                    } else {
                        await commission.markAsFailed('No wallet address configured');
                        results.failed++;
                    }
                } catch (commissionError) {
                    await commission.markAsFailed(commissionError.message);
                    results.failed++;
                    results.errors.push({
                        commissionId: commission._id,
                        error: commissionError.message
                    });
                }
            }
            
            return results;
        } catch (error) {
            console.error('Error processing commission payouts:', error);
            throw error;
        }
    }
    
    /**
     * Get leaderboard of top referrers
     * @param {number} limit - Number of top referrers to return
     */
    static async getTopReferrers(limit = 20) {
        try {
            const topReferrers = await Referral.aggregate([
                {
                    $match: { 
                        'stats.totalReferrals': { $gt: 0 },
                        isActive: true 
                    }
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'codeOwner',
                        foreignField: '_id',
                        as: 'user'
                    }
                },
                {
                    $unwind: '$user'
                },
                {
                    $project: {
                        code: 1,
                        username: '$user.username',
                        avatar: '$user.avatar',
                        isVerified: '$user.isVerified',
                        stats: 1,
                        joinedAt: '$createdAt'
                    }
                },
                {
                    $sort: { 
                        'stats.totalCommissionEarned': -1,
                        'stats.totalReferrals': -1
                    }
                },
                {
                    $limit: limit
                }
            ]);
            
            return topReferrers;
        } catch (error) {
            console.error('Error getting top referrers:', error);
            throw error;
        }
    }
}

export default ReferralService;