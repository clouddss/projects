import express from "express";
import {
  createPost,
  getAllPosts,
  likePost,
  getMyPosts,
  getMyMedia,
  deletePost,
  banPost,
  unbanPost,
} from "./post.controller.js";
import upload from "../../middlewares/multer.js";
import authMiddleware from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/create", authMiddleware, upload.array("media", 10), createPost);
router.post("/getAllPosts", authMiddleware, getAllPosts);
router.post("/like/:postId", authMiddleware, likePost);
router.delete("/delete/:id", authMiddleware, deletePost);
router.get("/my-posts", authMiddleware, getMyPosts);
router.get("/my-media", authMiddleware, getMyMedia);
router.put('/ban/:postId',banPost);
router.put('/unban/:postId',unbanPost);

export default router;
