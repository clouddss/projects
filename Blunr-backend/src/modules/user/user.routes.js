import express from 'express';
import { getAllUsersController, getUser, updateUserProfile,getUserProfile, getAllCreators, getTopCreators, setSubscriptionPrice, getUserProfileByUsernameController, getDashboardStats, toggleUserBanStatus } from './user.controller.js';
import authMiddleware from '../../middlewares/auth.middleware.js';
import adminMiddleware from '../../middlewares/admin.middleware.js';
import uploadProfile from '../../middlewares/multer1.js';

const router = express.Router();

router.get('/getUserById/:id',authMiddleware, getUser);
router.put('/update', uploadProfile, authMiddleware, updateUserProfile);
router.get('/getalluser',authMiddleware,adminMiddleware, getAllUsersController);   
router.get('/getProfile',authMiddleware,getUserProfile)   
router.get('/getAllCreators',authMiddleware,getAllCreators);
router.get('/getTopCreators',getTopCreators);
router.put('/setSubscription',authMiddleware,setSubscriptionPrice);
router.get("/profile/:username",authMiddleware,getUserProfileByUsernameController);
router.get('/dashboardStats',getDashboardStats);
router.put('/ban-unban/:userId',toggleUserBanStatus);

export default router;
