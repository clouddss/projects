import express from 'express';
import { 
    createTransactionAndChargeController, 
    createFillUpCheckoutSessionController,
    getTransactionByIdController, 
    getUserTransactionsController, 
    updateTransactionStatusController,
    coinbaseWebhook ,
    nowPaymentsWebhook,
    cryptomusWebhook
} from './transaction.controller.js';

import authMiddleware from '../../middlewares/auth.middleware.js'; 

const router = express.Router();

router.post('/create-charge', authMiddleware, createTransactionAndChargeController);
router.post('/create-checkout-session', authMiddleware, createFillUpCheckoutSessionController);
router.get('/getAlltransactions', authMiddleware, getUserTransactionsController);
router.get('/getTransactionsById/:id', authMiddleware, getTransactionByIdController);
router.patch('/update/:id/status', authMiddleware, updateTransactionStatusController);
router.post("/webhook", express.json({ type: "application/json" }), coinbaseWebhook);
router.post("/nowPayments/webhook", express.json({ type: "application/json" }), nowPaymentsWebhook);
router.post("/cryptomus/webhook", express.json({ type: "application/json" }), cryptomusWebhook);


export default router;
