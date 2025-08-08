import express from 'express';
import ReferralController from './referral.controller.js';
import authMiddleware from '../../middlewares/auth.middleware.js';
import adminMiddleware from '../../middlewares/admin.middleware.js';

const router = express.Router();

/**
 * Referral System Routes
 * Base path: /api/referrals
 */

// Public routes (no authentication required)

/**
 * @route   GET /api/referrals/health
 * @desc    Health check for referral system
 * @access  Public
 */
router.get('/health', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Referral system is operational',
        timestamp: new Date().toISOString()
    });
});

/**
 * @route   POST /api/referrals/validate
 * @desc    Validate a referral code
 * @access  Public
 */
router.post('/validate', ReferralController.validateReferralCode);

/**
 * @route   GET /api/referrals/leaderboard
 * @desc    Get top referrers leaderboard
 * @access  Public
 */
router.get('/leaderboard', ReferralController.getReferralLeaderboard);

// Protected routes (authentication required)

/**
 * @route   GET /api/referrals/dashboard
 * @desc    Get user's referral dashboard with analytics
 * @access  Private
 */
router.get('/dashboard', authMiddleware, ReferralController.getReferralDashboard);

/**
 * @route   GET /api/referrals/my-code
 * @desc    Get user's referral code
 * @access  Private
 */
router.get('/my-code', authMiddleware, ReferralController.getMyReferralCode);

/**
 * @route   PUT /api/referrals/update-code
 * @desc    Update user's referral code (one-time customization)
 * @access  Private
 */
router.put('/update-code', authMiddleware, ReferralController.updateReferralCode);

/**
 * @route   GET /api/referrals/commissions
 * @desc    Get user's commission history with pagination
 * @access  Private
 * @params  page, limit, status, tier, type
 */
router.get('/commissions', authMiddleware, ReferralController.getCommissionHistory);

/**
 * @route   POST /api/referrals/calculate-commission
 * @desc    Calculate potential commission for a transaction
 * @access  Private
 */
router.post('/calculate-commission', authMiddleware, ReferralController.calculateCommission);

/**
 * @route   GET /api/referrals/referred-users
 * @desc    Get users referred by current user with pagination and filtering
 * @access  Private
 * @params  page, limit, tier (1 or 2)
 */
router.get('/referred-users', authMiddleware, ReferralController.getReferredUsers);

// Admin routes (admin role required)

/**
 * @route   GET /api/referrals/analytics
 * @desc    Get comprehensive commission analytics
 * @access  Private (Admin only)
 */
router.get('/analytics', authMiddleware, adminMiddleware, ReferralController.getCommissionAnalytics);

/**
 * @route   GET /api/referrals/admin/stats
 * @desc    Get system-wide referral statistics
 * @access  Private (Admin only)
 */
router.get('/admin/stats', authMiddleware, adminMiddleware, ReferralController.getAdminReferralStats);

/**
 * @route   POST /api/referrals/process-payouts
 * @desc    Process pending commission payouts
 * @access  Private (Admin only)
 */
router.post('/process-payouts', authMiddleware, adminMiddleware, ReferralController.processCommissionPayouts);

export default router;

/**
 * Integration Instructions:
 * 
 * 1. Add to your main app.js or server.js:
 * ```javascript
 * import referralRoutes from './modules/referrals/referral.routes.js';
 * app.use('/api/referrals', referralRoutes);
 * ```
 * 
 * 2. Ensure middleware files exist:
 * - authMiddleware: Validates JWT tokens and sets req.user
 * - adminMiddleware: Checks if user has admin role
 * 
 * 3. Frontend Integration Examples:
 * 
 * // Get user's referral dashboard
 * fetch('/api/referrals/dashboard', {
 *     headers: { 'Authorization': `Bearer ${token}` }
 * })
 * 
 * // Validate referral code during registration
 * fetch('/api/referrals/validate', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({ referralCode: 'JOHN1234' })
 * })
 * 
 * // Get commission history with filters
 * fetch('/api/referrals/commissions?page=1&limit=20&status=paid&tier=1', {
 *     headers: { 'Authorization': `Bearer ${token}` }
 * })
 */