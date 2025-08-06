import mongoose from 'mongoose';

const WithdrawalSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 1 },
    cryptoAddress: { type: String, required: true, trim: true }, // Store only the crypto address
    status: { 
      type: String, 
      enum: ['pending', 'completed', 'failed'], 
      default: 'pending' 
    },
    note: { type: String, default: '', trim: true }, 
    adminNote: { type: String, default: '', trim: true }, 
    confirmationLink: { type: String, default: '', trim: true }, 
    requestedAt: { type: Date, default: Date.now },
    processedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

export default mongoose.model('Withdrawal', WithdrawalSchema);
