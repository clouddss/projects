import { getUserById, getAllUsers, updateUser } from './user.service.js';
import User from './user.model.js';
import Post from '../posts/post.model.js';
import cloudinary from "../../services/cloudinary.js";
import fs from "fs";
import Subscription from "../subscription/subscription.model.js";
import Transaction from '../transactions/transaction.model.js';


export const getUser = async (req, res) => {
    try {
        const user = await getUserById(req.params.id);
        if (!user) {
            return res.status(404).json({ 
                status: 404, 
                message: 'User not found', 
                data: null 
            });
        }
        res.status(200).json({ 
            status: 200, 
            message: "User retrieved successfully", 
            data: { user } 
        });
    } catch (error) {
        console.error(error);        
        res.status(500).json({ 
            status: 500, 
            message: 'Internal Server Error', 
            data: null, 
            error: error.message 
        });
    }
};

export const getAllUsersController = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ 
                status: 403, 
                message: "Access denied, admin only", 
                data: null 
            });
        }

        // Get query params for pagination, filtering, and role-based filtering
        let { page = 1, limit = 10, search = "", role } = req.query;
        page = parseInt(page);
        limit = parseInt(limit);

        // Construct search filter
        let searchFilter = {};
        if (search) {
            searchFilter.$or = [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } }
            ];
        }

        // Apply role filter if provided
        if (role && ['user', 'creator', 'admin'].includes(role)) {
            searchFilter.role = role;
        }

        // Get total count of matching users
        const totalUsers = await User.countDocuments(searchFilter);

        // Fetch users with pagination, filtering, and sorting
        const users = await User.find(searchFilter)
            .skip((page - 1) * limit)
            .limit(limit)
            .sort({ createdAt: -1 });

        return res.status(200).json({ 
            status: 200, 
            message: "Users retrieved successfully", 
            data: { 
                users, 
                totalUsers, 
                currentPage: page, 
                totalPages: Math.ceil(totalUsers / limit) 
            }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ 
            status: 500, 
            message: 'Internal Server Error', 
            data: null, 
            error: error.message 
        });
    }
};

export const updateUserProfile = async (req, res) => {
    try {
        const userId = req.user.id; // Extract user ID from token
        let updateData = { ...req.body };

        // Handle Avatar Upload (Ensure Only One File)
        if (req.files?.avatar && req.files.avatar.length > 0) {
            const uploadedAvatar = await cloudinary.uploader.upload(req.files.avatar[0].path, {
                folder: "avatars"
            });
            updateData.avatar = uploadedAvatar.secure_url;
            fs.unlinkSync(req.files.avatar[0].path); // Delete local temp file
        }

        // Handle Banner Upload (Ensure Only One File)
        if (req.files?.banner && req.files.banner.length > 0) {
            const uploadedBanner = await cloudinary.uploader.upload(req.files.banner[0].path, {
                folder: "banners"
            });
            updateData.banner = uploadedBanner.secure_url;
            fs.unlinkSync(req.files.banner[0].path); // Delete local temp file
        }

        // Update User in DB
        const user = await User.findByIdAndUpdate(userId, updateData, { new: true });

        if (!user) {
            return res.status(404).json({ 
                status: 404, 
                message: "User not found", 
                data: null 
            });
        }

        res.status(200).json({ 
            status: 200, 
            message: "User updated successfully", 
            data: { user } 
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ 
            status: 500, 
            message: "Internal Server Error", 
            data: null, 
            error: error.message 
        });
    }
};

export const getUserProfile = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ 
                status: 401, 
                message: "Unauthorized. Invalid token.", 
                data: null 
            });
        }

        const user = await getUserById(userId);
        if (!user) {
            return res.status(404).json({ 
                status: 404, 
                message: 'User not found', 
                data: null 
            });
        }

        res.status(200).json({ 
            status: 200, 
            message: "User profile retrieved successfully", 
            data: { user } 
        });
    } catch (error) {
        console.error(error)
        res.status(500).json({ 
            status: 500, 
            message: 'Internal Server Error', 
            data: null, 
            error: error.message 
        });
    }
}

export const getAllCreators = async (req, res) => {
    try {
        // Construct search filter
        let searchFilter = { role: "creator", isBanned: { $ne: true } };

        // Apply search filter if search query is provided
        if (req.query.search) {
            searchFilter.$or = [
                { name: { $regex: req.query.search, $options: "i" } },
                { email: { $regex: req.query.search, $options: "i" } },
                { username: { $regex: req.query.search, $options: "i" } }
            ];
        }

        // Fetch all matching creators
        const creators = await User.find(searchFilter);

        return res.status(200).json({
            status: 200,
            message: "Creators retrieved successfully",
            data: creators
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            status: 500,
            message: 'Internal Server Error',
            data: null,
            error: error.message
        });
    }
};

export const getTopCreators = async (req, res) => {
    try {
        // Fetch top creators sorted by highest subscribers count
        const topCreators = await User.find({ 
            role: "creator", 
            isBanned: false 
        })
        .sort({ subscribersCount: -1 })  // Highest subscribers first
        .limit(10)  // Return only 10 top creators
        .select("name username avatar subscribersCount earnings banner");  

        return res.status(200).json({
            status: 200,
            message: "Top creators retrieved successfully",
            data: topCreators
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            status: 500,
            message: "Internal Server Error",
            data: null,
            error: error.message
        });
    }
};

export const setSubscriptionPrice = async (req, res) => {
    try {
      const userId = req.user.id; 
      const { prices } = req.body; 
      if (
        !prices ||
        typeof prices !== "object" ||
        !["1_month", "3_months", "6_months"].every((key) => typeof prices[key] === "number" && prices[key] >= 0)
      ) {
        return res.status(400).json({ message: "Invalid subscription prices!" });
      }
  
      // ✅ Update the subscription prices
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { subscriptionPrice: prices },
        { new: true, select: "subscriptionPrices" }
      );
  
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found!" });
      }
  
      res.json({
        message: "Subscription prices updated successfully!",
        subscriptionPrices: updatedUser.subscriptionPrice
      });
    } catch (error) {
      console.error("Error updating subscription prices:", error);
      res.status(500).json({ message: "Internal server error" });
    }
};
  
export const getUserProfileByUsernameController = async (req, res) => {
    try {
        const { username } = req.params;
        const userId = req.user?.id; 

        // Find user by username (excluding sensitive fields like password)
        const user = await User.findOne({ username }).select('-password -OTP');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Fetch user's posts (sorted by latest) & exclude NSFW (banned) posts
        let posts = await Post.find({ creator: user._id, isNSFW: false })
            .populate('creator', 'username avatar')
            .sort({ createdAt: -1 });

        // Fetch all active subscriptions for the logged-in user
        // Include both permanent (no expiration) and non-expired subscriptions
        const activeSubscriptions = await Subscription.find({
            subscriber: userId,
            status: "active",
            $or: [
                { expiresAt: null }, // Permanent follows (free accounts)
                { expiresAt: { $gte: new Date() } } // Non-expired subscriptions
            ]
        }).select("creator");

        // Convert subscribed creators to a Set for quick lookup
        const subscribedCreators = new Set(activeSubscriptions.map(sub => sub.creator.toString()));

        // Modify posts to include `isLikedByUser` and `isSubscribed`
        const modifiedPosts = posts.map((post) => {
            const isPostOwner = userId === post.creator._id.toString(); 
            const isSubscribed = isPostOwner || subscribedCreators.has(post.creator._id.toString());

            return {
                ...post.toObject(),
                isLikedByUser: post.likes.includes(userId),
                isSubscribed,
                isLocked: isPostOwner ? false : post.isLocked,
                media: isSubscribed ? post.media : [], // Show media only if subscribed or owner
            };
        });

        // Fetch subscription info for the viewing user
        let subscription = null;
        if (userId && userId !== user._id.toString()) {
            subscription = await Subscription.findOne({
                subscriber: userId,
                creator: user._id,
                status: "active",
                $or: [
                    { expiresAt: null }, // Permanent follows
                    { expiresAt: { $gte: new Date() } } // Non-expired subscriptions
                ]
            }).select("expiresAt subscribedAt");
        }

        res.json({ user, posts: modifiedPosts, subscription });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getDashboardStats = async (req, res) => {
    try {
        const totalCreators = await User.countDocuments({ role: 'creator' });
        const totalUsers = await User.countDocuments();
        const totalTransactions = await Transaction.countDocuments();
        const totalPosts = await Post.countDocuments();

        res.json({
            totalCreators,
            totalUsers,
            totalTransactions,
            totalPosts
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const toggleUserBanStatus = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        user.isBanned = !user.isBanned; // Toggle the ban status
        await user.save();

        res.json({
            message: user.isBanned ? "User has been banned." : "User has been unbanned.",
            isBanned: user.isBanned
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


