import express from 'express';
import {
    createCommentController,
    getCommentsByPostController,
    toggleLikeCommentController
} from './comment.controller.js';
import authMiddleware from '../../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/add-comment', authMiddleware, createCommentController);
router.get('/getPostsComment/:postId',authMiddleware, getCommentsByPostController);
router.put('/toggle-like/:commentId', authMiddleware, toggleLikeCommentController);

export default router;
