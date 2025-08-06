import express from 'express';
import { register, login, forgetPassword , resetPassword,  } from './auth.controller.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgetPassword);
router.post('/reset-password', resetPassword);

export default router;
