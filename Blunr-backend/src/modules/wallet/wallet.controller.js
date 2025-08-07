import Post from "../../modules/posts/post.model.js";
import Subscription from "../../modules/subscription/subscription.model.js";

import * as WalletService from "./wallet.service.js";
import * as TransactionService from "../transactions/transaction.service.js";

/**
 * Get user wallet
 */
export const getWalletController = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log("userId", userId);
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

    const updatedWallet = await WalletService.updateWalletBalance(
      userId,
      amount,
    );
    res.json({ message: "Funds added successfully", wallet: updatedWallet });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Credit funds to another user's wallet (for payments/tips) - Enhanced with transaction validation
 */
export const creditUserWalletController = async (req, res) => {
  try {
    const {
      amount,
      recipientId,
      transactionId,
      subscriptionId,
      postId,
      messageId,
    } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid amount",
      });
    }

    if (!recipientId) {
      return res.status(400).json({
        success: false,
        message: "Recipient ID is required",
      });
    }

    if (!transactionId) {
      return res.status(400).json({
        success: false,
        message: "Transaction ID is required for wallet credit",
      });
    }

    // Validate transaction
    const validation =
      await TransactionService.validateTransactionForCredit(transactionId);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: "Transaction validation failed",
        error: validation.error,
      });
    }

    const { transaction } = validation;

    // Verify transaction details match request
    if (transaction.recipient.toString() !== recipientId) {
      return res.status(400).json({
        success: false,
        message: "Transaction recipient does not match request",
      });
    }

    if (transaction.amount !== Number(amount)) {
      return res.status(400).json({
        success: false,
        message: "Transaction amount does not match request",
      });
    }

    // Credit wallet
    const updatedWallet = await WalletService.updateWalletBalance(
      recipientId,
      amount,
    );

    // Mark transaction as completed
    await TransactionService.markTransactionCompleted(transactionId, {
      walletCreditedAt: new Date(),
    });

    // Add transaction to wallet history
    await WalletService.addTransactionToWallet(recipientId, transactionId);

    if (postId) {
      await Post.findByIdAndUpdate(postId, { isLocked: false }, { new: true });
      console.log(`📬 Post ${postId} unlocked.`);
    }

    if (messageId) {
      await Message.findByIdAndUpdate(
        messageId,
        { isLocked: false },
        { new: true },
      );
      console.log(`📨 Message ${messageId} unlocked.`);
    }

    if (subscriptionId) {
      await Subscription.findByIdAndUpdate(
        subscriptionId,
        { status: "active" },
        { new: true },
      );
      console.log(`📅 Subscription ${subscriptionId} activated.`);
    }

    res.json({
      success: true,
      message: "Funds credited successfully",
      wallet: updatedWallet,
      transactionId: transactionId,
    });
  } catch (error) {
    console.error("Error crediting user wallet:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
