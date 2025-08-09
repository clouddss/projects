import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import bodyParser from 'body-parser';
import connectDB from './src/config/db.js';

// Route imports
import authRoutes from './src/modules/auth/auth.routes.js';
import userRoutes from './src/modules/user/user.routes.js';
import postRoutes from './src/modules/posts/post.routes.js';
import chatRoutes from './src/modules/message/message.routes.js';
import withdrawalRoutes from './src/modules/withdrawls/withdraw.routes.js';
import subscriptionRoutes from './src/modules/subscription/subscription.routes.js';
import transactionRoutes from './src/modules/transactions/transaction.routes.js';
import tipRoutes from './src/modules/tips/tip.routes.js';
import reportRoutes from './src/modules/reports/report.routes.js';
import walletRoutes from './src/modules/wallet/wallet.routes.js';
import commentRoutes from './src/modules/comments/comment.routes.js';
import referralRoutes from './src/modules/referrals/referral.routes.js';
import {
  coinbaseWebhook,
  nowPaymentsWebhook,
  cryptomusWebhook,
} from './src/modules/transactions/transaction.controller.js';

dotenv.config();
connectDB();

const app = express();

// ✅ Middleware: JSON and urlencoded
app.use(express.json({
  limit: '500mb',
  verify: (req, res, buf) => {
    req.rawBody = buf; // needed for signature verification in webhooks
  },
  type: (req) => {
    // Only parse as JSON if content-type is application/json
    // This prevents errors when multipart/form-data is sent
    const contentType = req.get('content-type');
    return contentType && contentType.includes('application/json');
  }
}));
app.use(express.urlencoded({
  limit: '500mb',
  extended: true,
}));

// ✅ CORS configuration - Allow all origins with proper headers
app.use(cors({
  origin: true, // Allow all origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD', 'PATCH'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With', 
    'Content-Type', 
    'Accept',
    'Authorization',
    'Cache-Control',
    'X-File-Name'
  ],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  optionsSuccessStatus: 200,
  preflightContinue: false
}));

// ✅ Helmet for basic security (with CORS-safe configuration)
app.use(helmet({
  crossOriginResourcePolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginEmbedderPolicy: false,
  // Disable helmet's HSTS to avoid conflicts with Cloudflare
  hsts: false
}));

// ✅ Raw body parsers for Webhooks (for signature verification)
app.post('/api/transaction/webhook', bodyParser.raw({ type: '*/*' }), coinbaseWebhook);
app.post('/api/transaction/nowPayments/webhook', bodyParser.raw({ type: '*/*' }), nowPaymentsWebhook);
app.post('/api/transaction/cryptomus/webhook', bodyParser.raw({ type: '*/*' }), cryptomusWebhook);

// ✅ API Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/post', postRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/withdrawals', withdrawalRoutes);
app.use('/api/subscribe', subscriptionRoutes);
app.use('/api/transaction', transactionRoutes);
app.use('/api/tip', tipRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/comment', commentRoutes);
app.use('/api/referral', referralRoutes);

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
