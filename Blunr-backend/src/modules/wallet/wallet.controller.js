import * as WalletService from './wallet.service.js';

/**
 * Get user wallet
 */
export const getWalletController = async (req, res) => {
    try {
        const userId = req.user.id;
        console.log("userId",userId);
        const wallet = await WalletService.getWalletByUserId(userId);
        
        if (!wallet) {
            return res.status(404).json({ message: "Wallet not found" });
        }

        res.json(wallet);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Create wallet for user
 */
export const createWalletController = async (req, res) => {
    try {
        const userId = req.user.id;
        const wallet = await WalletService.createWallet(userId);

        res.status(201).json(wallet);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Add funds to wallet
 */
export const addFundsController = async (req, res) => {
    try {
        const { amount } = req.body;
        const userId = req.user.id;

        if (!amount || amount <= 0) {
            return res.status(400).json({ message: "Invalid amount" });
        }

        const updatedWallet = await WalletService.updateWalletBalance(userId, amount);
        res.json({ message: "Funds added successfully", wallet: updatedWallet });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Credit funds to another user's wallet (for payments/tips)
 */
export const creditUserWalletController = async (req, res) => {
    try {
        const { amount, recipientId } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ message: "Invalid amount" });
        }

        if (!recipientId) {
            return res.status(400).json({ message: "Recipient ID is required" });
        }

        const updatedWallet = await WalletService.updateWalletBalance(recipientId, amount);
        res.json({ 
            success: true,
            message: "Funds credited successfully", 
            wallet: updatedWallet 
        });
    } catch (error) {
        console.error('Error crediting user wallet:', error);
        res.status(500).json({ error: error.message });
    }
};
