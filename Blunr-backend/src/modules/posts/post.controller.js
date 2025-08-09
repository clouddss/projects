import fs from "fs";
import sharp from "sharp";
import cloudinary from "../../services/cloudinary.js";
import * as PostService from "./post.service.js";
import Post from "./post.model.js";
import Subscription from "../subscription/subscription.model.js";
import User from "../user/user.model.js";

export const createPost = async (req, res) => {
  try {
    const { caption, isNSFW, price, isLocked } = req.body;

    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized. Please log in." });
    }

    console.log("📂 Debug: Received files ->", req.files);

    let mediaUrls = [];

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          console.log(
            "📤 Debug: Processing file ->",
            file.originalname,
            "| MIME Type:",
            file.mimetype
          );

          let result = null;
          const uploadOptions = {
            folder: "posts",
            public_id: `post-${Date.now()}`,
          };

          if (file.mimetype.startsWith("image")) {
            const resizedImagePath = `${file.path}-resized.jpg`;

            await sharp(file.path)
              .resize({ width: 800 })
              .jpeg({ quality: 80 })
              .toFile(resizedImagePath);

            result = await cloudinary.uploader.upload(resizedImagePath, {
              ...uploadOptions,
              resource_type: "image",
            });

            // Delete the original & resized images safely
            await deleteFile(file.path);
            await deleteFile(resizedImagePath);
          } else if (file.mimetype.startsWith("video")) {
            console.log("🎥 Debug: Uploading video file ->", file.originalname);

            result = await cloudinary.uploader.upload(file.path, {
              ...uploadOptions,
              resource_type: "video",
            });

            // Delete the video file safely
            await deleteFile(file.path);
          } else {
            console.log("⚠️ Unsupported file type:", file.mimetype);
            continue;
          }

          if (result && result.secure_url) {
            console.log(
              "✅ Debug: Cloudinary upload successful ->",
              result.secure_url
            );
            mediaUrls.push({
              url: result.secure_url,
              publicId: result.public_id,
              type: file.mimetype.startsWith("image") ? "image" : "video",
            });
          } else {
            console.error("❌ Error: No secure URL returned from Cloudinary!");
          }
        } catch (uploadError) {
          console.error("❌ Error uploading file to Cloudinary:", uploadError);
        }
      }
    }

    console.log("📸 Debug: Final media URLs before saving ->", mediaUrls);

    const postData = {
      creator: req.user._id,
      caption,
      media: mediaUrls,
      isNSFW,
      price,
      isLocked,
    };

    const post = await PostService.createPost(postData);
    console.log("✅ Debug: Post created ->", post);

    res.status(201).json(post);
  } catch (error) {
    console.error("❌ Error in createPost:", error);

    // Safely delete any uploaded files in case of failure
    if (req.files) {
      for (const file of req.files) {
        await deleteFile(file.path);
      }
    }

    res.status(500).json({ error: error.message });
  }
};

const deleteFile = async (filePath) => {
  try {
    if (filePath) {
      await fs.access(filePath); // Check if file exists
      await fs.unlink(filePath);
      console.log(`🗑️ Deleted file: ${filePath}`);
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error(`❌ Error deleting file ${filePath}:`, error);
    }
  }
};

export const getAllPosts = async (req, res) => {
  try {
    const userId = req.user?.id;

    // Fetch only non-banned posts
    const posts = await PostService.getAllPosts({ isNSFW: false });

    // Fetch all active subscriptions for the user (including permanent follows)
    const activeSubscriptions = await Subscription.find({
      subscriber: userId,
      status: "active",
      $or: [
        { expiresAt: null }, // Permanent follows (free accounts)
        { expiresAt: { $gte: new Date() } } // Non-expired subscriptions
      ]
    }).select("creator");

    const subscribedCreators = new Set(
      activeSubscriptions.map((sub) => sub.creator.toString())
    );

    // Fetch all banned creators
    const bannedCreators = await User.find({ isBanned: true }).select("_id");
    const bannedCreatorIds = new Set(bannedCreators.map((user) => user._id.toString()));

    const modifiedPosts = posts
      .filter((post) => {
        // Check if creator exists (not deleted from database)
        if (!post.creator || !post.creator._id) {
          console.warn("Post with missing creator found:", post._id);
          return false;
        }
        return !bannedCreatorIds.has(post.creator._id.toString());
      })
      .map((post) => {
        // Double-check creator exists before accessing properties
        if (!post.creator || !post.creator._id) {
          return null;
        }
        
        const creatorId = post.creator._id.toString();
        const isPostOwner = userId === creatorId;
        const isSubscribed = isPostOwner || subscribedCreators.has(creatorId);

        return {
          ...post.toObject(),
          isLikedByUser: post.likes.includes(userId),
          isSubscribed,
          isLocked: isPostOwner ? false : post.isLocked,
          media: isSubscribed ? post.media : [], // Show media only if subscribed or owner
        };
      })
      .filter(post => post !== null); // Remove any null entries

    res.json(modifiedPosts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const likePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized. Please log in." });
    }

    const post = await PostService.getPostById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found." });
    }

    // Check if the user already liked the post
    const isLiked = post.likes.includes(userId);

    if (isLiked) {
      // Unlike the post
      post.likes = post.likes.filter(
        (id) => id.toString() !== userId.toString()
      );
    } else {
      // Like the post
      post.likes.push(userId);
    }

    await post.save();

    res.json({
      message: isLiked
        ? "Post unliked successfully."
        : "Post liked successfully.",
      likesCount: post.likes.length,
      isLikedByUser: !isLiked,
    });
  } catch (error) {
    console.error("❌ Error in likePost:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * @desc Get posts created by the authenticated user
 * @route GET /api/posts/my
 * @access Private (Requires Authentication)
 */
export const getMyPosts = async (req, res) => {
  try {
    const userId = req.user.id; // Authenticated user ID
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Fetch posts created by the user
    const posts = await Post.find({ creator: userId })
      .sort({ createdAt: -1 }) // Newest first
      .skip(skip)
      .limit(limit)
      .populate("creator", "username name avatar") // Populating user info
      .populate("likes", "username") // Optionally populate likes
      .populate({
        path: "comments",
        populate: { path: "user", select: "username" },
      });

    // Count total user posts for pagination
    const totalPosts = await Post.countDocuments({ creator: userId });

    res.status(200).json({
      success: true,
      posts,
      page,
      totalPages: Math.ceil(totalPosts / limit),
      totalPosts,
    });
  } catch (error) {
    console.error("Error fetching user posts:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * @desc Get media files from the authenticated user's posts
 * @route GET /api/posts/my/media
 * @access Private (Requires Authentication)
 */
export const getMyMedia = async (req, res) => {
  try {
    const userId = req.user.id; // Authenticated user ID
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Fetch media from user's posts
    const posts = await Post.find({ creator: userId }, { media: 1 }) // Select only 'media' field
      .sort({ createdAt: -1 }) // Newest first
      .skip(skip)
      .limit(limit);

    // Extract media URLs
    const mediaFiles = posts.flatMap((post) =>
      post.media.map((m) => ({ url: m.url, type: m.type }))
    );

    // Count total media for pagination
    const totalMedia = await Post.aggregate([
      { $match: { creator: userId } },
      { $unwind: "$media" },
      { $count: "total" },
    ]);
    const totalCount = totalMedia[0]?.total || 0;

    res.status(200).json({
      success: true,
      media: mediaFiles,
      page,
      totalPages: Math.ceil(totalCount / limit),
      totalMedia: totalCount,
    });
  } catch (error) {
    console.error("Error fetching user media:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const deletePost = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.json({
      status: 400,
      message: "ID is required!",
    });
  }

  await Post.findByIdAndDelete(id);

  return res.json({
    status: 200,
    message: "Post deleted successfully!",
  });
};


// 🚨 Ban a Post (Mark as NSFW)
export const banPost = async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await Post.findByIdAndUpdate(
      postId,
      { isNSFW: true },
      { new: true }
    );

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    res.json({ message: "Post has been banned (marked as NSFW)", post });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Unban a Post (Remove NSFW Flag)
export const unbanPost = async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await Post.findByIdAndUpdate(
      postId,
      { isNSFW: false },
      { new: true }
    );

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    res.json({ message: "Post has been unbanned (NSFW removed)", post });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
