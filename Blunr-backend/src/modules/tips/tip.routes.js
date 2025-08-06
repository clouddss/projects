import express from 'express';
import { 
    getReceivedTipsController, 
    getSentTipsController, 
    sendTipController 
} from './tip.controller.js';

import authMiddleware from '../../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/received', authMiddleware, getReceivedTipsController);
router.get('/sent', authMiddleware, getSentTipsController);
router.post('/send', authMiddleware, sendTipController);

export default router;
