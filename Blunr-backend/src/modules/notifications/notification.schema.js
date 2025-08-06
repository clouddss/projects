import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema({
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['like', 'comment', 'subscription', 'tip', 'message'], required: true },
    relatedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    relatedPost: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
    isRead: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model('Notification', NotificationSchema);
