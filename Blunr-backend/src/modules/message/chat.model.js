import mongoose from "mongoose";

const { Schema } = mongoose;

const chatRoomSchema = new Schema(
  {
    name: { type: String}, 
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }], 
    admin: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, 
    messages: [{ type: mongoose.Schema.Types.ObjectId, ref: "Message" }], 
    description: { type: String }, 
    lastMessage: {
      text: { type: String },
      media: { type: String },
      sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      timestamp: { type: Date },
    },
  },
  { timestamps: true }
);

export default mongoose.model("ChatRoom", chatRoomSchema);
