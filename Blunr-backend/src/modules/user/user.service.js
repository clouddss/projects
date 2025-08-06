import User from './user.model.js';

export const getUserById = async (id) => {
    return await User.findById(id).select('-password');
};

export const getAllUsers = async () => {
    return await User.find();
}

export const updateUser = async (id, updateData) => {
    return await User.findByIdAndUpdate(id, updateData, { new: true });
};
