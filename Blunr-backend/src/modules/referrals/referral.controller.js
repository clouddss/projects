import ReferralService from './referral.service.js';
import Referral from './referral.model.js';
import Commission from './commission.model.js';
import User from '../user/user.model.js';
import { calculatePotentialCommissions, getCommissionAnalytics } from './transaction-integration.js';

/**
 * Referral Controller - API endpoints for 2-tier referral system
 */
class ReferralController {
    
    /**
     * Get user's referral dashboard data
     * GET /api/referrals/dashboard
     */
    static async getReferralDashboard(req, res) {
        try {
            const userId = req.user.id;
            const { startDate, endDate } = req.query;
            
            // Check if user has referral record, create if not exists
            let referral = await Referral.findOne({ codeOwner: userId });
            if (!referral) {
                const user = await User.findById(userId);
                const baseString = user.username || user.email.split('@')[0];
                const code = await Referral.generateReferralCode(baseString);
                
                referral = new Referral({
                    code,
                    codeOwner: userId,
                    source: 'organic'
                });
                
                await referral.save();
                console.log(`Created referral record for existing user ${userId}`);
            }
            
            const filters = {};
            if (startDate) filters.startDate = startDate;
            if (endDate) filters.endDate = endDate;
            
            const analytics = await ReferralService.getReferralAnalytics(userId, filters);
            
            if (analytics.error) {
                return res.status(404).json({
                    success: false,
                    message: analytics.error
                });
            }
            
            // Add referral link to the response
            analytics.referralLink = `${process.env.FRONTEND_URL || 'http://localhost:4200'}/signup?ref=${analytics.referralCode}`;
            
            res.json({
                success: true,
                data: analytics
            });
        } catch (error) {
            console.error('Error getting referral dashboard:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get referral dashboard',
                error: error.message
            });
        }
    }
    
    /**
     * Validate a referral code
     * POST /api/referrals/validate
     */
    static async validateReferralCode(req, res) {
        try {
            const { referralCode } = req.body;
            
            if (!referralCode) {
                return res.status(400).json({
                    success: false,
                    message: 'Referral code is required'
                });
            }
            
            const validation = await ReferralService.validateReferralCode(referralCode);
            
            res.json({
                success: validation.valid,
                data: validation.valid ? validation : null,
                message: validation.valid ? 'Valid referral code' : validation.reason
            });
        } catch (error) {
            console.error('Error validating referral code:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to validate referral code',
                error: error.message
            });
        }
    }
    
    /**
     * Get user's referral code
     * GET /api/referrals/my-code
     */
    static async getMyReferralCode(req, res) {
        try {
            const userId = req.user.id;
            
            const referral = await Referral.findOne({ codeOwner: userId });
            
            if (!referral) {
                // Generate referral record for existing user
                const user = await User.findById(userId);
                const baseString = user.username || user.email.split('@')[0];
                const code = await Referral.generateReferralCode(baseString);
                
                const newReferral = new Referral({
                    code,
                    codeOwner: userId,
                    source: 'organic'
                });
                
                await newReferral.save();
                
                return res.json({
                    success: true,
                    data: {
                        referralCode: code,
                        shareUrl: `${process.env.FRONTEND_URL}/signup?ref=${code}`,
                        isNew: true
                    }
                });
            }
            
            res.json({
                success: true,
                data: {
                    referralCode: referral.code,
                    shareUrl: `${process.env.FRONTEND_URL}/signup?ref=${referral.code}`,
                    stats: referral.stats,
                    isNew: false
                }
            });
        } catch (error) {
            console.error('Error getting referral code:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get referral code',
                error: error.message
            });
        }
    }
    
    /**
     * Get user's commission history
     * GET /api/referrals/commissions
     */
    static async getCommissionHistory(req, res) {
        try {
            const userId = req.user.id;
            const { page = 1, limit = 20, status, tier, type } = req.query;
            
            const query = { recipient: userId };
            
            // Add filters
            if (status) query.status = status;
            if (tier) query.tier = parseInt(tier);
            if (type) query.transactionType = type;
            
            const pageNum = parseInt(page);
            const limitNum = parseInt(limit);
            const skip = (pageNum - 1) * limitNum;
            
            const [docs, totalDocs] = await Promise.all([
                Commission.find(query)
                    .populate([
                        { path: 'earningUser', select: 'username avatar' },
                        { path: 'sourceTransaction', select: 'type amount currency createdAt' }
                    ])
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limitNum),
                Commission.countDocuments(query)
            ]);
            
            const totalPages = Math.ceil(totalDocs / limitNum);
            
            const commissions = {
                docs,
                totalDocs,
                limit: limitNum,
                page: pageNum,
                totalPages,
                hasNextPage: pageNum < totalPages,
                hasPrevPage: pageNum > 1
            };
            
            res.json({
                success: true,
                data: commissions
            });
        } catch (error) {
            console.error('Error getting commission history:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get commission history',
                error: error.message
            });
        }
    }
    
    /**
     * Get referral leaderboard
     * GET /api/referrals/leaderboard
     */
    static async getReferralLeaderboard(req, res) {
        try {
            const { limit = 20 } = req.query;
            
            const leaderboard = await ReferralService.getTopReferrers(parseInt(limit));
            
            res.json({
                success: true,
                data: leaderboard
            });
        } catch (error) {
            console.error('Error getting referral leaderboard:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get referral leaderboard',
                error: error.message
            });
        }
    }
    
    /**
     * Calculate potential commission for a transaction
     * POST /api/referrals/calculate-commission
     */
    static async calculateCommission(req, res) {
        try {
            const { recipientId, amount } = req.body;
            
            if (!recipientId || !amount) {
                return res.status(400).json({
                    success: false,
                    message: 'Recipient ID and amount are required'
                });
            }
            
            const commission = await calculatePotentialCommissions(recipientId, amount);
            
            res.json({
                success: true,
                data: commission
            });
        } catch (error) {
            console.error('Error calculating commission:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to calculate commission',
                error: error.message
            });
        }
    }
    
    /**
     * Get commission analytics (Admin only)
     * GET /api/referrals/analytics
     */
    static async getCommissionAnalytics(req, res) {
        try {
            // Check admin role
            if (req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. Admin role required.'
                });
            }
            
            const { startDate, endDate } = req.query;
            const dateRange = {};
            
            if (startDate) dateRange.startDate = startDate;
            if (endDate) dateRange.endDate = endDate;
            
            const analytics = await getCommissionAnalytics(dateRange);
            
            res.json({
                success: true,
                data: analytics
            });
        } catch (error) {
            console.error('Error getting commission analytics:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get commission analytics',
                error: error.message
            });
        }
    }
    
    /**
     * Process commission payouts (Admin only)
     * POST /api/referrals/process-payouts
     */
    static async processCommissionPayouts(req, res) {
        try {
            // Check admin role
            if (req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. Admin role required.'
                });
            }
            
            const { minAmount = 10, limit = 100 } = req.body;
            
            const results = await ReferralService.processCommissionPayouts(minAmount, limit);
            
            res.json({
                success: true,
                data: results,
                message: `Processed ${results.processed} commission payouts`
            });
        } catch (error) {
            console.error('Error processing commission payouts:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to process commission payouts',
                error: error.message
            });
        }
    }
    
    /**
     * Get referral statistics (Admin only)
     * GET /api/referrals/admin/stats
     */
    static async getAdminReferralStats(req, res) {
        try {
            // Check admin role
            if (req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. Admin role required.'
                });
            }
            
            const [
                totalReferrals,
                activeReferrals,
                totalCommissions,
                pendingCommissions,
                topReferrers
            ] = await Promise.all([
                Referral.countDocuments({ 'stats.totalReferrals': { $gt: 0 } }),
                Referral.countDocuments({ 'stats.activeReferrals': { $gt: 0 } }),
                Commission.aggregate([
                    { $group: { _id: null, total: { $sum: '$commissionAmount' } } }
                ]),
                Commission.aggregate([
                    { $match: { status: 'pending' } },
                    { $group: { _id: null, total: { $sum: '$commissionAmount' }, count: { $sum: 1 } } }
                ]),
                ReferralService.getTopReferrers(5)
            ]);
            
            res.json({
                success: true,
                data: {
                    overview: {
                        totalReferrals,
                        activeReferrals,
                        totalCommissionsPaid: totalCommissions[0]?.total || 0,
                        pendingCommissions: {
                            amount: pendingCommissions[0]?.total || 0,
                            count: pendingCommissions[0]?.count || 0
                        }
                    },
                    topReferrers
                }
            });
        } catch (error) {
            console.error('Error getting admin referral stats:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get referral statistics',
                error: error.message
            });
        }
    }
    
    /**
     * Update referral code (User can customize their code once)
     * PUT /api/referrals/update-code
     */
    static async updateReferralCode(req, res) {
        try {
            const userId = req.user.id;
            const { newCode } = req.body;
            
            if (!newCode || newCode.length < 6 || newCode.length > 12) {
                return res.status(400).json({
                    success: false,
                    message: 'Referral code must be between 6 and 12 characters'
                });
            }
            
            // Check if code is available
            const existingCode = await Referral.findOne({ 
                code: newCode.toUpperCase(),
                codeOwner: { $ne: userId }
            });
            
            if (existingCode) {
                return res.status(400).json({
                    success: false,
                    message: 'This referral code is already taken'
                });
            }
            
            // Update user's referral code
            const referral = await Referral.findOneAndUpdate(
                { codeOwner: userId },
                { code: newCode.toUpperCase() },
                { new: true }
            );
            
            if (!referral) {
                return res.status(404).json({
                    success: false,
                    message: 'Referral record not found'
                });
            }
            
            res.json({
                success: true,
                data: {
                    referralCode: referral.code,
                    shareUrl: `${process.env.FRONTEND_URL}/signup?ref=${referral.code}`
                },
                message: 'Referral code updated successfully'
            });
        } catch (error) {
            console.error('Error updating referral code:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update referral code',
                error: error.message
            });
        }
    }
    
    /**
     * Get users referred by current user
     * GET /api/referrals/referred-users
     */
    static async getReferredUsers(req, res) {
        try {
            const userId = req.user.id;
            const { page = 1, limit = 10, tier } = req.query;
            
            console.log('getReferredUsers - userId:', userId, 'type:', typeof userId);
            
            // Get user's referral record with populated direct referrals
            const referral = await Referral.findOne({ codeOwner: userId })
                .populate({
                    path: 'directReferrals',
                    select: 'username avatar createdAt earnings',
                    model: 'User'
                });
            
            console.log('getReferredUsers - user referral found:', !!referral);
            
            if (!referral) {
                return res.json({
                    success: true,
                    data: {
                        users: [],
                        total: 0,
                        page: parseInt(page),
                        totalPages: 0,
                        hasNextPage: false,
                        hasPrevPage: false
                    }
                });
            }
            
            // Get direct referrals from the referral record
            let users = referral.directReferrals || [];
            
            // Filter by tier if specified
            if (tier) {
                const tierNum = parseInt(tier);
                if (tierNum === 1) {
                    // All direct referrals are tier 1, so keep all users
                    // (In a proper implementation, tier1 would be users directly referred by current user)
                    // Since directReferrals contains all users referred by this user, they are all tier 1
                    // No filtering needed for tier 1
                } else if (tierNum === 2) {
                    // Tier 2 would be users referred by the current user's tier 1 referrals
                    // Since the tier relationships aren't properly set up, let's check for users
                    // where current user is tier2Referrer
                    const tier2UserIds = await Referral.find({ tier2Referrer: userId })
                        .select('codeOwner')
                        .lean();
                    const tier2Ids = tier2UserIds.map(r => r.codeOwner.toString());
                    users = users.filter(user => tier2Ids.includes(user._id.toString()));
                }
            }
            
            // Apply pagination
            const pageNum = parseInt(page);
            const limitNum = parseInt(limit);
            const total = users.length;
            const skip = (pageNum - 1) * limitNum;
            const paginatedUsers = users.slice(skip, skip + limitNum);
            
            console.log('getReferredUsers - direct referrals found:', users.length, 'paginated:', paginatedUsers.length);
            
            // Format users for response
            const formattedUsers = paginatedUsers.map(user => ({
                _id: user._id,
                username: user.username,
                avatar: user.avatar,
                joinedAt: user.createdAt,
                tier: 1, // All direct referrals are tier 1
                status: 'active',
                totalEarnings: user.earnings || 0
            }));
            
            const totalPages = Math.ceil(total / limitNum);
            
            res.json({
                success: true,
                data: {
                    users: formattedUsers,
                    total: total,
                    page: pageNum,
                    totalPages: totalPages,
                    hasNextPage: pageNum < totalPages,
                    hasPrevPage: pageNum > 1
                }
            });
        } catch (error) {
            console.error('Error getting referred users:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get referred users',
                error: error.message
            });
        }
    }
}

export default ReferralController;