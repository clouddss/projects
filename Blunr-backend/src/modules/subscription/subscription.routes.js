import express from "express";
import {
    subscribe,
    unsubscribe,
    getUserSubscriptions,
    getCreatorSubscribers,
    checkSubscriptionStatus,
    renewSubscription
} from "./subscription.controller.js";
import authMiddleware from '../../middlewares/auth.middleware.js';

const router = express.Router();

router.post("/:creatorId", authMiddleware, subscribe);
router.delete("/unsubscribe/:creatorId", authMiddleware, unsubscribe);
router.get("/my", authMiddleware, getUserSubscriptions);
router.get("/creator/:creatorId", authMiddleware, getCreatorSubscribers);
router.post("/status/:creatorId", authMiddleware, checkSubscriptionStatus);
router.post("/renew-subscription/:creatorId", authMiddleware, renewSubscription);

export default router;
