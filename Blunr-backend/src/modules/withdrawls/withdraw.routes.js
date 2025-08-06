import express from 'express';
import { 
    createWithdrawal, 
    getAllWithdrawals, 
    getUserWithdrawals, 
    updateWithdrawalStatus, 
    deleteWithdrawal 
} from './withdraw.controller.js';
import authMiddleware from '../../middlewares/auth.middleware.js';
import adminMiddleware from '../../middlewares/admin.middleware.js';
const router = express.Router();

// User routes
router.post('/createRequest', authMiddleware, createWithdrawal);
router.get('/getMyWithdrawls', authMiddleware, getUserWithdrawals);

// Admin routes
router.get('/getAllWithdrawls', authMiddleware,adminMiddleware, getAllWithdrawals);
router.put('/update/:id', authMiddleware,adminMiddleware, updateWithdrawalStatus);
router.delete('/delete/:id', authMiddleware, deleteWithdrawal);

export default router;
