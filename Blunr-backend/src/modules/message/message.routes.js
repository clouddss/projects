import express from "express";
import {
  createChatRoom,
  getUserChatRooms,
  sendMessage,
  getMessages,
  markAsRead,
  markRoomAsRead,
  broadcastMessage,
  getChatRoomById,
} from "./message.controller.js";
import authMiddleware from "../../middlewares/auth.middleware.js";
import upload from "../../middlewares/multer.js";

const router = express.Router();

router.post("/createChatRoom", authMiddleware, createChatRoom);
router.get("/getUserChatRooms", authMiddleware, getUserChatRooms);
router.post("/getRoomById", authMiddleware, getChatRoomById);

// Messages Routes
router.post("/messages", authMiddleware, upload.array("media", 10), sendMessage);
router.get("/messages/:roomId", authMiddleware, getMessages);
router.put("/messages/read/:messageId", authMiddleware, markAsRead);
router.put("/messages/read-room/:roomId", authMiddleware, markRoomAsRead);

router.post("/broadcast", authMiddleware, broadcastMessage);

export default router;
