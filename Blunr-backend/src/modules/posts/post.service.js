import Post from './post.model.js';
import User from '../user/user.model.js';

export const createPost = async (data) => {
  try {
    const newPost = await Post.create(data);
    console.log("✅ Debug: Post saved successfully", newPost);
    return newPost;
  } catch (err) {
    console.error("❌ Debug: Error saving post to DB:", err);
    throw err;
  }  
};

  
export const getPostById = async (id) => await Post.findById(id);



export const getAllPosts = async (filter = {}) => {
  return await Post.find(filter)
      .populate('creator', 'username name avatar isVerified') 
      .sort({ createdAt: -1 }); 
};

export const getPostsByUserId = async (userId) => {
  return await Post.find({ creator: userId }).sort({ createdAt: -1 });
};
