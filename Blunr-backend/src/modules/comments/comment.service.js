import Comment from './comment.model.js';
import Post from '../posts/post.model.js';
import mongoose from 'mongoose';

/**
 * Create a comment on a post
 */
export const createComment = async (userId, postId, text) => {
    const comment = await Comment.create({ user: userId, post: postId, text });
    
    // Push comment ID to the post's comments array
    await Post.findByIdAndUpdate(postId, { $push: { comments: comment._id } });

    // Populate user data before returning
    await comment.populate("user", "username name avatar");
    
    return comment;
};
/**
 * Get comments for a post
 */
export const getCommentsByPost = async (postId, userId) => {
    const comments = await Comment.find({ post: postId })
        .populate("user", "username name avatar")
        .lean();

    // Ensure userId is a valid ObjectId before converting
    const userObjectId = mongoose.isValidObjectId(userId) ? new mongoose.Types.ObjectId(userId) : null;

    const modifiedComments = comments.map(comment => ({
        ...comment,
        isLiked: userObjectId ? comment.likes.some(like => like.toString() === userObjectId.toString()) : false
    }));

    return {
        message: "Comments fetched successfully",
        data: modifiedComments
    };
};


/**
 * Toggle like/unlike a comment
 */
export const toggleLikeComment = async (commentId, userId) => {
    const comment = await Comment.findById(commentId);
    if (!comment) {
        throw new Error("Comment not found");
    }

    // If user has already liked, unlike it; otherwise, like it
    const hasLiked = comment.likes.includes(userId);
    if (hasLiked) {
        comment.likes.pull(userId); // Remove like
    } else {
        comment.likes.push(userId); // Add like
    }

    await comment.save();
    await comment.populate("user", "username name avatar");
    return comment;
};

