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

// ✅ Middleware: Only urlencoded globally (JSON will be applied per route)
app.use(express.urlencoded({
  limit: '500mb',
  extended: true,
}));

// Create JSON middleware for routes that need it
const jsonMiddleware = express.json({
  limit: '500mb',
  verify: (req, res, buf) => {
    req.rawBody = buf; // needed for signature verification in webhooks
  },
});

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

// ✅ API Routes (routes with file uploads skip JSON middleware)
app.use('/api/auth', jsonMiddleware, authRoutes);
app.use('/api/user', jsonMiddleware, userRoutes);
app.use('/api/post', postRoutes); // Post routes have multer for file uploads
app.use('/api/chat', chatRoutes); // Chat routes have multer for media uploads
app.use('/api/withdrawals', jsonMiddleware, withdrawalRoutes);
app.use('/api/subscribe', jsonMiddleware, subscriptionRoutes);
app.use('/api/transaction', jsonMiddleware, transactionRoutes);
app.use('/api/tip', jsonMiddleware, tipRoutes);
app.use('/api/report', jsonMiddleware, reportRoutes);
app.use('/api/wallet', jsonMiddleware, walletRoutes);
app.use('/api/comment', jsonMiddleware, commentRoutes);
app.use('/api/referral', jsonMiddleware, referralRoutes);

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
