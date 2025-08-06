import * as CommentService from './comment.service.js';

/**
 * Create a comment
 */
export const createCommentController = async (req, res) => {
    try {
        const { postId, text } = req.body;
        const userId = req.user.id;

        if (!postId || !text) {
            return res.status(400).json({ message: 'Post ID and text are required' });
        }

        const comment = await CommentService.createComment(userId, postId, text);
        res.status(201).json({ message: 'Comment added successfully', comment });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Get comments for a post with 'isLiked' field
 */
export const getCommentsByPostController = async (req, res) => {
    try {
        const { postId } = req.params;
        const userId = req.user?.id; 
        console.log("userId",userId);

        const comments = await CommentService.getCommentsByPost(postId, userId);
        res.json(comments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Toggle like on a comment (like/unlike)
 */
export const toggleLikeCommentController = async (req, res) => {
    try {
        const { commentId } = req.params;
        const userId = req.user.id;

        const updatedComment = await CommentService.toggleLikeComment(commentId, userId);
        res.json({
            message: updatedComment.likes.includes(userId) ? "Comment liked" : "Comment unliked",
            comment: updatedComment,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
