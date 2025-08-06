import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Payer (who is making the payment)
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Payee (who is receiving the payment)
    type: { 
        type: String, 
        enum: ['subscription', 'tip', 'post_purchase', 'withdrawal', 'chat_purchase'], 
        required: true 
    },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
    transactionId: { type: String, unique: true, required: true }, 
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', default: null }, // If payment is for a post
    messageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null }, // If payment is for a message/chat
    subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', default: null }, // If payment is for a subscription
}, { timestamps: true });

export default mongoose.model('Transaction', TransactionSchema);
