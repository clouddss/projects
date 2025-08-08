import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Payer (who is making the payment)
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Payee (who is receiving the payment)
    type: { 
        type: String, 
        enum: ['subscription', 'tip', 'post_purchase', 'withdrawal', 'chat_purchase', 'external_payment', 'referral_commission'], 
        required: true 
    },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
    transactionId: { type: String, unique: true, required: true }, 
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', default: null }, // If payment is for a post
    messageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null }, // If payment is for a message/chat
    subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', default: null }, // If payment is for a subscription
    externalPaymentId: { type: String, default: null }, // External payment system reference
    paymentProvider: { type: String, default: null }, // External payment provider (e.g., 'switchere', 'coinbase')
    
    // Referral System Fields
    commissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Commission', default: null }, // If this is a commission payment
    referralTier: { type: Number, enum: [1, 2], default: null }, // Referral tier for commission payments
    sourceTransactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', default: null } // Original transaction that generated commission
}, { timestamps: true });

// Add indexes for referral system queries
TransactionSchema.index({ type: 1, status: 1, createdAt: -1 });
TransactionSchema.index({ commissionId: 1 });
TransactionSchema.index({ referralTier: 1, type: 1 });
TransactionSchema.index({ sourceTransactionId: 1 });
TransactionSchema.index({ recipient: 1, type: 1, status: 1 });

// Import transaction integration hook
import { transactionPostSaveHook } from '../referrals/transaction-integration.js';

// Add post-save hook for automatic referral commission processing
TransactionSchema.post('save', transactionPostSaveHook);

export default mongoose.model('Transaction', TransactionSchema);
