import Subscription from "./subscription.model.js";
import User from "../user/user.model.js";
import mongoose from "mongoose";

// Subscribe to a creator
export const subscribe = async (req, res) => {
  try {
    const { creatorId } = req.params;
    const { duration } = req.body; // Expecting duration: '1_month', '3_months', or '6_months'
    const userId = req.user.id;

    if (userId === creatorId) {
      return res
        .status(400)
        .json({ message: "You cannot subscribe to yourself." });
    }

    const creator = await User.findById(creatorId);
    if (!creator) {
      return res.status(404).json({ message: "Creator not found." });
    }

    const price = creator.subscriptionPrice[duration];

    // if (!price || price < 0) {
    //   return res
    //     .status(400)
    //     .json({
    //       message: "Invalid subscription duration or creator does not charge.",
    //     });
    // }

    const existingSubscription = await Subscription.findOne({
      subscriber: userId,
      creator: creatorId,
      status: "active",
    });
    if (existingSubscription) {
      return res
        .status(400)
        .json({ message: "You are already subscribed to this creator." });
    }

    // For free accounts (price = 0), don't set expiration date (permanent follow)
    let expiresAt = null;
    if (price > 0) {
      expiresAt = new Date();
      expiresAt.setMonth(
        expiresAt.getMonth() +
          (duration === "1_month" ? 1 : duration === "3_months" ? 3 : 6)
      );
    }

    const subscriptionStatus = price > 0 ? "pending" : "active";

    const newSubscription = await Subscription.create({
      subscriber: userId,
      creator: creatorId,
      duration,
      expiresAt,
      status: subscriptionStatus,
    });

    await User.findByIdAndUpdate(creatorId, { $inc: { subscribersCount: 1 } });
    
    const subscriptionData = {
      creatorId,
      subscribedAt: new Date(),
      duration,
      status: subscriptionStatus,
    };
    
    // Only add expiresAt if it's not null (for paid subscriptions)
    if (expiresAt) {
      subscriptionData.expiresAt = expiresAt;
    }
    
    await User.findByIdAndUpdate(userId, {
      $push: {
        subscriptions: subscriptionData,
      },
    });

    res.status(201).json({
      message: "Subscription successful.",
      subscription: newSubscription,
    });
  } catch (error) {
    console.error("Subscription error:", error);
    res.status(500).json({ message: "Internal Server Error." });
  }
};

// Unsubscribe
export const unsubscribe = async (req, res) => {
  try {
    const { creatorId } = req.params;
    const userId = req.user.id;

    const subscription = await Subscription.findOneAndUpdate(
      { subscriber: userId, creator: creatorId, status: "active" },
      { status: "cancelled" },
      { new: true }
    );

    if (!subscription) {
      return res.status(404).json({ message: "No active subscription found." });
    }

    await User.findByIdAndUpdate(creatorId, { $inc: { subscribersCount: -1 } });
    res.status(200).json({ message: "Unsubscribed successfully." });
  } catch (error) {
    console.error("Unsubscription error:", error);
    res.status(500).json({ message: "Internal Server Error." });
  }
};

// Get user's active subscriptions
export const getUserSubscriptions = async (req, res) => {
  try {
    const userId = req.user.id;
    const subscriptions = await Subscription.find({
      subscriber: userId,
      status: "active",
    }).populate("creator", "name username avatar subscriptionPrice");

    res.status(200).json({
      message: "Subscriptions retrieved successfully.",
      subscriptions,
    });
  } catch (error) {
    console.error("Get subscriptions error:", error);
    res.status(500).json({ message: "Internal Server Error." });
  }
};

// Get all subscribers of a creator
export const getCreatorSubscribers = async (req, res) => {
  try {
    const { creatorId } = req.params;
    const creator = await User.findById(creatorId);
    if (!creator)
      return res.status(404).json({ message: "Creator not found." });

    const subscribers = await Subscription.find({
      creator: creatorId,
      status: "active",
    }).populate("subscriber", "name username avatar");

    res
      .status(200)
      .json({ message: "Subscribers retrieved successfully.", subscribers });
  } catch (error) {
    console.error("Get subscribers error:", error);
    res.status(500).json({ message: "Internal Server Error." });
  }
};

// Check subscription status
export const checkSubscriptionStatus = async (req, res) => {
  try {
    const { creatorId } = req.params;
    const userId = req.user.id;

    const subscription = await Subscription.findOne({
      subscriber: userId,
      creator: creatorId,
      status: "active",
    });
    res.status(200).json({ isSubscribed: !!subscription });
  } catch (error) {
    console.error("Check subscription status error:", error);
    res.status(500).json({ message: "Internal Server Error." });
  }
};

// Renew subscription
export const renewSubscription = async (req, res) => {
  try {
    const { creatorId } = req.params;
    const { duration } = req.body;
    const userId = req.user.id;

    const creator = await User.findById(creatorId);
    if (!creator)
      return res.status(404).json({ message: "Creator not found." });

    const price = creator.subscriptionPrice[duration];
    
    // For free subscriptions, handle as permanent follow
    let newExpiration = null;
    if (price > 0) {
      newExpiration = new Date();
      newExpiration.setMonth(
        newExpiration.getMonth() +
          (duration === "1_month" ? 1 : duration === "3_months" ? 3 : 6)
      );
    }

    let subscription = await Subscription.findOne({
      subscriber: userId,
      creator: creatorId,
    });

    if (subscription) {
      if (subscription.status === "active") {
        subscription.expiresAt = newExpiration;
      } else {
        subscription.expiresAt = newExpiration;
        subscription.status = "pending";
        await User.findByIdAndUpdate(creatorId, {
          $inc: { subscribersCount: 1 },
        });
      }
    } else {
      subscription = new Subscription({
        subscriber: userId,
        creator: creatorId,
        duration,
        expiresAt: newExpiration,
        status: "active",
      });
      await User.findByIdAndUpdate(creatorId, {
        $inc: { subscribersCount: 1 },
      });
    }

    await subscription.save();
    res
      .status(200)
      .json({ message: "Subscription renewed successfully.", subscription });
  } catch (error) {
    console.error("Subscription renewal error:", error);
    res.status(500).json({ message: "Internal Server Error." });
  }
};
