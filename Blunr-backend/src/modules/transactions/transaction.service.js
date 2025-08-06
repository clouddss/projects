import Transaction from './transaction.model.js';

export const createTransaction = async (data) => {
    try {
        const transaction = await Transaction.create(data);

        return transaction;
    } catch (err) {
        console.error("❌ Error creating transaction:", err);
        throw err;
    }
};

export const getTransactionById = async (transactionId) => {
    return await Transaction.findById(transactionId).populate('user', 'username avatar');
};

export const getUserTransactions = async (userId) => {
    return await Transaction.find({ user: userId })
        .populate('user', 'name email username avatar') 
        .populate('recipient', 'name username avatar')
        .sort({ createdAt: -1 });
};

export const updateTransactionStatus = async (transactionId, status) => {
    const validStatuses = ['pending', 'completed', 'failed'];
    if (!validStatuses.includes(status)) {
        throw new Error('Invalid transaction status');
    }

    return await Transaction.findByIdAndUpdate(
        transactionId,
        { status },
        { new: true }
    );
};

export const updateTransaction = async (transactionId, updateData) => {
    return await Transaction.findByIdAndUpdate(transactionId, updateData, { new: true });
};