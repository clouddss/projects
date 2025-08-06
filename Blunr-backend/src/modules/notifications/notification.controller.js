import * as NotificationService from "./notification.service.js";

/**
 * Create a notification (usually triggered internally)
 */
export const createNotificationController = async (req, res) => {
    try {
        const { recipient, type, relatedUser, relatedPost } = req.body;

        if (!recipient || !type) {
            return res.status(400).json({ message: "Recipient and type are required" });
        }

        const notification = await NotificationService.createNotification({ recipient, type, relatedUser, relatedPost });

        res.status(201).json({ message: "Notification created successfully", notification });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Get all notifications for a user
 */
export const getUserNotificationsController = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 10 } = req.query;

        const result = await NotificationService.getUserNotifications(userId, parseInt(page), parseInt(limit));

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Mark notifications as read
 */
export const markNotificationsAsReadController = async (req, res) => {
    try {
        const userId = req.user.id;
        const { notificationIds } = req.body;

        if (!notificationIds || !notificationIds.length) {
            return res.status(400).json({ message: "Notification IDs are required" });
        }

        await NotificationService.markNotificationsAsRead(userId, notificationIds);

        res.json({ message: "Notifications marked as read" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Delete notifications
 */
export const deleteNotificationsController = async (req, res) => {
    try {
        const userId = req.user.id;
        const { notificationIds } = req.body;

        if (!notificationIds || !notificationIds.length) {
            return res.status(400).json({ message: "Notification IDs are required" });
        }

        await NotificationService.deleteNotifications(userId, notificationIds);

        res.json({ message: "Notifications deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
