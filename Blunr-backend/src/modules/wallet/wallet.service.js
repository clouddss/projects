import Wallet from './wallet.model.js';

/**
 * Get wallet by user ID
 */
export const getWalletByUserId = async (userId) => {
    return await Wallet.findOne({ user: userId }).populate('transactions');
};

/**
 * Create a new wallet for a user
 */
export const createWallet = async (userId) => {
    return await Wallet.create({ user: userId });
};

/**
 * Update wallet balance
 */
export const updateWalletBalance = async (userId, amount) => {
    return await Wallet.findOneAndUpdate(
        { user: userId },
        { $inc: { balance: amount } },
        { new: true }
    );
};

/**
 * Add transaction to wallet
 */
export const addTransactionToWallet = async (userId, transactionId) => {
    return await Wallet.findOneAndUpdate(
        { user: userId },
        { $push: { transactions: transactionId } },
        { new: true }
    );
};
