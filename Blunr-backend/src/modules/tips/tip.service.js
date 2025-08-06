// Tip Service
import Tip from './tip.model.js';
import Wallet from '../wallet/wallet.model.js';
import Transaction from '../transactions/transaction.model.js';

export const getReceivedTips = async (userId) => {
    return await Tip.find({ recipient: userId }).populate('sender', 'username avatar');
};

export const getSentTips = async (userId) => {
    return await Tip.find({ sender: userId }).populate('recipient', 'username avatar');
};

export const sendTip = async (senderId, recipientId, amount, currency = 'USD') => {
    const senderWallet = await Wallet.findOne({ user: senderId });
    if (!senderWallet || senderWallet.balance < amount) {
        throw new Error('Insufficient balance');
    }
    senderWallet.balance -= amount;
    await senderWallet.save();
    const recipientWallet = await Wallet.findOneAndUpdate(
        { user: recipientId },
        { $inc: { balance: amount } },
        { new: true, upsert: true }
    );

    const transaction = await Transaction.create({
        sender: senderId,
        recipient: recipientId,
        amount,
        currency,
        type: 'tip'
    });

    const tip = await Tip.create({
        sender: senderId,
        recipient: recipientId,
        amount,
        currency,
        transactionId: transaction._id
    });

    return tip;
};

