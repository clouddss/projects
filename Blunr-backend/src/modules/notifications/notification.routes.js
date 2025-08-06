import express from "express";
import {
    createNotificationController,
    getUserNotificationsController,
    markNotificationsAsReadController,
    deleteNotificationsController
} from "./notification.controller.js";
import authMiddleware from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/createNotification", authMiddleware, createNotificationController);
router.get("/", authMiddleware, getUserNotificationsController);
router.put("/mark-as-read", authMiddleware, markNotificationsAsReadController);
router.delete("/", authMiddleware, deleteNotificationsController);

export default router;
