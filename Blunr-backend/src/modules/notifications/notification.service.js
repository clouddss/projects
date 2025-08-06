import Notification from "./Notification.js";

/**
 * Create a new notification
 */
export const createNotification = async ({ recipient, type, relatedUser, relatedPost }) => {
    return await Notification.create({ recipient, type, relatedUser, relatedPost });
};

/**
 * Get notifications for a user (paginated)
 */
export const getUserNotifications = async (userId, page = 1, limit = 10) => {
    const notifications = await Notification.find({ recipient: userId })
        .populate("relatedUser", "username profilePic")
        .populate("relatedPost", "_id caption")
        .sort({ createdAt: -1 }) // Most recent first
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

    const unreadCount = await Notification.countDocuments({ recipient: userId, isRead: false });

    return { notifications, unreadCount };
};

/**
 * Mark notifications as read (single or multiple)
 */
export const markNotificationsAsRead = async (userId, notificationIds) => {
    return await Notification.updateMany(
        { recipient: userId, _id: { $in: notificationIds } },
        { $set: { isRead: true } }
    );
};

/**
 * Delete notifications (single or multiple)
 */
export const deleteNotifications = async (userId, notificationIds) => {
    return await Notification.deleteMany({ recipient: userId, _id: { $in: notificationIds } });
};
