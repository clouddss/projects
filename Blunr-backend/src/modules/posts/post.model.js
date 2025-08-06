import mongoose from 'mongoose';

const PostSchema = new mongoose.Schema(
  {
    creator: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    caption: { 
      type: String, 
      maxlength: 1000,
      trim: true, 
      default: "" 
    },
    media: [
      {
        url: {
          type: String,
          required: true,
          trim: true,
        },
        type: {
          type: String,
          enum: ["image", "video"],
        },
        publicId: { type: String, default: null },
      }
    ],
    isNSFW: { 
      type: Boolean, 
      default: false 
    },
    price: { 
      type: Number, 
      default: 0,
      min: 0 
    },
    likes: [{ 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User',
      default: []
    }],
    comments: [{ 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Comment',
      default: []
    }],
    views: { 
      type: Number, 
      default: 0,
      min: 0 
    },
    isLocked: { 
      type: Boolean, 
      default: false 
    }
  }, 
  { 
    timestamps: true
  }
);

// 🔍 Indexing for better search performance
PostSchema.index({ creator: 1, createdAt: -1 });

export default mongoose.model('Post', PostSchema);
