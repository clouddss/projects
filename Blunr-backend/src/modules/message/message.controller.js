import ChatRoom from "./chat.model.js";
import Message from "./message.model.js";
import User from "../user/user.model.js";
import cloudinary from "../../services/cloudinary.js";
import fs from "fs";

// ✅ Create a new chat room
export const createChatRoom = async (req, res) => {
  try {
    const { members, admin } = req.body;

    if (!members || members.length !== 2 || !admin) {
      return res.status(400).json({ message: "Invalid input!" });
    }

    const existingRoom = await ChatRoom.findOne({
      members: { $all: members, $size: 2 },
    });

    if (existingRoom) {
      return res.status(200).json(existingRoom);
    }

    const newRoom = new ChatRoom({ members, admin });
    await newRoom.save();

    res.status(201).json(newRoom);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Get user chat rooms
export const getUserChatRooms = async (req, res) => {
  try {
    const userId = req.user?.id;
    const rooms = await ChatRoom.find({ members: userId })
      .populate("members", "name username avatar banner")
      .sort({ "lastMessage.timestamp": -1 }); // Sort by most recent message first

    // Add unread message count for each room
    const roomsWithUnreadCount = await Promise.all(
      rooms.map(async (room) => {
        const unreadCount = await Message.countDocuments({
          chatRoom: room._id,
          receiver: userId,
          isRead: false
        });
        
        return {
          ...room.toObject(),
          unreadCount
        };
      })
    );

    res.json(roomsWithUnreadCount);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Send a message
export const sendMessage = async (req, res) => {
  try {
    const { chatRoom, sender, receiver, text, isLocked,price } = req.body;
    if (!sender || !receiver || (!text && (!req.files || req.files.length === 0))) {
      return res.status(400).json({ message: "Invalid message data! Text or media required." });
    }

    let uploadedMedia = [];

    // ✅ Upload files to Cloudinary
    if (req.files?.length > 0) {
      uploadedMedia = await Promise.all(
        req.files.map(async (file) => {
          const uploadedFile = await cloudinary.uploader.upload(file.path, {
            resource_type: "auto",
            folder: "chat_media",
          });

          fs.unlinkSync(file.path);
          return { url: uploadedFile.secure_url, type: file.mimetype.startsWith("image/") ? "image" : "video" };
        })
      );
    }

    // ✅ Save message to DB
    const message = await Message.create({
      chatRoom,
      sender,
      receiver,
      text,
      price,
      media: uploadedMedia,
      isLocked: isLocked || false,
      status: "sent",
    });

    // ✅ Update Last Message in ChatRoom
    await ChatRoom.findByIdAndUpdate(chatRoom, {
      lastMessage: { text: text || "Media File", sender, timestamp: new Date() },
    });

    return res.status(201).json({ message: "Message sent successfully", data: message });
  } catch (error) {
    console.error("Error sending message:", error);
    return res.status(500).json({ error: "Internal server error", details: error.message });
  }
};

// ✅ Get messages of a chat room
export const getMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const messages = await Message.find({ chatRoom: roomId }).populate("sender", "name username avatar");

    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Mark message as read
export const markAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findByIdAndUpdate(
      messageId,
      { isRead: true, status: "read" },
      { new: true }
    );

    if (!message) {
      return res.status(404).json({ message: "Message not found!" });
    }

    res.json({ message: "Message marked as read", message });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Mark all messages in a chat room as read
export const markRoomAsRead = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user?.id;

    const result = await Message.updateMany(
      { 
        chatRoom: roomId, 
        receiver: userId,
        isRead: false 
      },
      { 
        isRead: true, 
        status: "read" 
      }
    );

    res.json({ 
      message: "All messages marked as read", 
      modifiedCount: result.modifiedCount 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Broadcast a message (Without Firebase)
export const broadcastMessage = async (req, res) => {
  try {
    const { sender, text } = req.body;

    if (!sender || (!text && (!req.files || req.files.length === 0))) {
      return res.status(400).json({ message: "Invalid broadcast data! Text or media required." });
    }

    // ✅ Fetch all subscribers of the creator
    const creator = await User.findById(sender).populate("subscribers", "_id");
    if (!creator || !creator.subscribers.length) {
      return res.status(400).json({ message: "No subscribers found!" });
    }

    let uploadedMedia = [];
    if (req.files?.length > 0) {
      uploadedMedia = await Promise.all(
        req.files.map(async (file) => {
          const uploadedFile = await cloudinary.uploader.upload(file.path, {
            resource_type: "auto",
            folder: "broadcast_media",
          });

          fs.unlinkSync(file.path);
          return { url: uploadedFile.secure_url, type: file.mimetype.split("/")[0] };
        })
      );
    }

    // ✅ Send message to all subscribers
    const messages = await Promise.all(
      creator.subscribers.map(async (subscriber) => {
        return Message.create({
          chatRoom: null,
          sender,
          receiver: subscriber._id,
          text,
          media: uploadedMedia,
          messageType: text ? "text" : "media",
          status: "sent",
        });
      })
    );

    res.status(201).json({ message: "Broadcast sent successfully", data: messages });
  } catch (error) {
    console.error("Error in broadcast message:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
};

// ✅ Get chat room by ID
export const getChatRoomById = async (req, res) => {
  const { id } = req.body;

  if (!id) return res.status(400).json({ message: "Chatroom ID is required" });

  const chatRoom = await ChatRoom.findById(id).populate("members", "name username avatar banner");

  if (!chatRoom) return res.status(404).json({ message: "Chatroom not found" });

  return res.status(200).json({ message: "Chatroom fetched", data: chatRoom });
};
