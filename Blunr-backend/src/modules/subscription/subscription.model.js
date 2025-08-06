import mongoose from 'mongoose';

const SubscriptionSchema = new mongoose.Schema({
    subscriber: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    subscribedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: false }, // Made optional for permanent follows
    status: { type: String, enum: ['pending','active', 'expired', 'cancelled'], default: 'pending' },
    paymentTransactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' } 
}, { timestamps: true });

export default mongoose.model('Subscription', SubscriptionSchema);
