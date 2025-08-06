import express from 'express';
import { getWalletController, createWalletController, addFundsController, creditUserWalletController } from './wallet.controller.js';

import authMiddleware from '../../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/getWallet', authMiddleware, getWalletController);
router.post('/', authMiddleware, createWalletController);
router.put('/add-funds', authMiddleware, addFundsController);
router.post('/credit-user', creditUserWalletController); // No auth middleware for external payment system

export default router;
