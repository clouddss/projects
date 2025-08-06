import * as TipService from './tip.service.js';

export const getReceivedTipsController = async (req, res) => {
    try {
        const userId = req.user.id;
        const tips = await TipService.getReceivedTips(userId);
        res.json(tips);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getSentTipsController = async (req, res) => {
    try {
        const userId = req.user.id;
        const tips = await TipService.getSentTips(userId);
        res.json(tips);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const sendTipController = async (req, res) => {
    try {
        const { recipientId, amount, currency } = req.body;
        const senderId = req.user.id;

        if (!recipientId || !amount) {
            return res.status(400).json({ message: 'Recipient and amount are required' });
        }

        const tip = await TipService.sendTip(senderId, recipientId, amount, currency);
        res.status(201).json({ message: 'Tip sent successfully', tip });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
