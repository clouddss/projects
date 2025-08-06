import mongoose from 'mongoose';

const TipSchema = new mongoose.Schema({
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', required: true }
}, { timestamps: true });

export default mongoose.model('Tip', TipSchema);
