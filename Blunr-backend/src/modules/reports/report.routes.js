import express from 'express';
import { 
    createReportController, 
    getAllReportsController, 
    updateReportStatusController 
} from './report.controller.js';

import authMiddleware from '../../middlewares/auth.middleware.js';
import adminMiddleware from '../../middlewares/admin.middleware.js'; 

const router = express.Router();

router.post('/create', authMiddleware, createReportController);
router.get('/getAll', authMiddleware, adminMiddleware, getAllReportsController);
router.put('/update/status/:reportId', authMiddleware, adminMiddleware, updateReportStatusController);

export default router;
