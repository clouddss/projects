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

// JSON middleware for routes that need it
const jsonMiddleware = express.json({ limit: '500mb' });

router.post("/createChatRoom", jsonMiddleware, authMiddleware, createChatRoom);
router.get("/getUserChatRooms", authMiddleware, getUserChatRooms);
router.post("/getRoomById", jsonMiddleware, authMiddleware, getChatRoomById);

// Messages Routes
router.post("/messages", authMiddleware, upload.array("media", 10), sendMessage);
router.get("/messages/:roomId", authMiddleware, getMessages);
router.put("/messages/read/:messageId", jsonMiddleware, authMiddleware, markAsRead);
router.put("/messages/read-room/:roomId", jsonMiddleware, authMiddleware, markRoomAsRead);

router.post("/broadcast", jsonMiddleware, authMiddleware, broadcastMessage);

export default router;
