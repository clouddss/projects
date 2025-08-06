import Withdrawal from './withdraw.model.js';
import User from '../user/user.model.js';

/**
 * @desc Create a new withdrawal request
 * @route POST /api/withdrawals
 * @access User
 */
export const createWithdrawal = async (req, res) => {
    try {
        const { amount, cryptoAddress, note } = req.body;
        const userId = req.user.id;

        // Validate required fields
        if (!cryptoAddress) {
            return res.status(400).json({ status: 400, message: "Crypto address is required" });
        }

        // Validate user balance
        const user = await User.findById(userId);
        if (!user || user.walletBalance < amount) {
            return res.status(400).json({ status: 400, message: "Insufficient balance" });
        }

        // Deduct amount from user wallet
        user.walletBalance -= amount;
        await user.save();

        // Create withdrawal request
        const withdrawal = await Withdrawal.create({
            user: userId,
            amount,
            cryptoAddress,
            note: note || '',
            status: "pending"
        });

        return res.status(201).json({
            status: 201,
            message: "Withdrawal request submitted successfully",
            data: withdrawal
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: 500, message: "Internal Server Error", error: error.message });
    }
};

/**
 * @desc Get all withdrawals (Admin only) with pagination and status filter
 * @route GET /api/withdrawals
 * @access Admin
 */
export const getAllWithdrawals = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ status: 403, message: "Access denied, admin only" });
        }

        // Pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Status filter
        const status = req.query.status;
        const filter = status ? { status } : {};

        const withdrawals = await Withdrawal.find(filter)
            .populate('user', 'name email username avatar')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalWithdrawals = await Withdrawal.countDocuments(filter);

        return res.status(200).json({
            status: 200,
            message: "Withdrawals retrieved successfully",
            data: withdrawals,
            pagination: {
                total: totalWithdrawals,
                page,
                limit,
                totalPages: Math.ceil(totalWithdrawals / limit)
            }
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: 500, message: "Internal Server Error", error: error.message });
    }
};

/**
 * @desc Get withdrawals of the logged-in user
 * @route GET /api/withdrawals/my
 * @access User
 */
export const getUserWithdrawals = async (req, res) => {
    try {
        const withdrawals = await Withdrawal.find({ user: req.user.id }).sort({ createdAt: -1 });

        return res.status(200).json({ status: 200, message: "User withdrawals retrieved successfully", data: withdrawals });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: 500, message: "Internal Server Error", error: error.message });
    }
};

/**
 * @desc Update withdrawal status (Admin only)
 * @route PUT /api/withdrawals/:id
 * @access Admin
 */
export const updateWithdrawalStatus = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ status: 403, message: "Access denied, admin only" });
        }

        const { status, adminNote, confirmationLink } = req.body;

        // Validate status
        if (!['pending', 'completed', 'failed'].includes(status)) {
            return res.status(400).json({ status: 400, message: "Invalid status" });
        }

        const withdrawal = await Withdrawal.findById(req.params.id);
        if (!withdrawal) {
            return res.status(404).json({ status: 404, message: "Withdrawal not found" });
        }

        // Update status, admin note, and confirmation link
        withdrawal.status = status;
        withdrawal.processedAt = new Date();
        if (adminNote) withdrawal.adminNote = adminNote;
        if (confirmationLink) withdrawal.confirmationLink = confirmationLink;

        await withdrawal.save();

        return res.status(200).json({ status: 200, message: "Withdrawal status updated", data: withdrawal });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: 500, message: "Internal Server Error", error: error.message });
    }
};


/**
 * @desc Delete a withdrawal request (Admin only)
 * @route DELETE /api/withdrawals/:id
 * @access Admin
 */
export const deleteWithdrawal = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ status: 403, message: "Access denied, admin only" });
        }

        const withdrawal = await Withdrawal.findById(req.params.id);
        if (!withdrawal) {
            return res.status(404).json({ status: 404, message: "Withdrawal not found" });
        }

        await withdrawal.deleteOne();

        return res.status(200).json({ status: 200, message: "Withdrawal deleted successfully" });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: 500, message: "Internal Server Error", error: error.message });
    }
};
