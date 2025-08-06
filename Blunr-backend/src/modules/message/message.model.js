import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    chatRoom: { type: mongoose.Schema.Types.ObjectId, ref: "ChatRoom", required: true }, 
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String }, 
    media: [
      {
        url: { type: String },
        type: { type: String, enum: ["image", "video", "audio", "file"] },
      },
    ],
    firebaseMessageId: { type: String }, 
    senderFcmToken: { type: String }, 
    receiverFcmToken: { type: String },
    messageType: { type: String, enum: ["text", "media", "file"], default: "text" },
    status: { type: String, enum: ["sent", "delivered", "read"], default: "sent" },
    isLocked: { 
      type: Boolean, 
      default: false 
    },
    isLocked: { type: Boolean, default: false },
    price: { type: Number, default: 0, min: 0 },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Message", messageSchema);
