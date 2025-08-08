# Blunr 2-Tier Referral System - Integration Guide

## Table of Contents
1. [System Overview](#system-overview)
2. [Setup & Installation](#setup--installation)
3. [Backend Integration](#backend-integration)
4. [Frontend Integration](#frontend-integration)
5. [Database Migration](#database-migration)
6. [API Documentation](#api-documentation)
7. [Configuration Guide](#configuration-guide)
8. [Testing Procedures](#testing-procedures)
9. [Performance Monitoring](#performance-monitoring)
10. [Troubleshooting](#troubleshooting)

## System Overview

The Blunr 2-tier referral system enables users to earn commissions from their direct referrals (Tier 1) and indirect referrals (Tier 2). The system is designed for high performance with real-time commission processing.

### Key Features
- **2-Tier Commission Structure**: 10% Tier 1, 2% Tier 2
- **Real-time Processing**: Commissions calculated on transaction completion
- **Flexible Referral Codes**: Customizable 6-12 character codes
- **Comprehensive Analytics**: Dashboard with earnings, conversion rates, and performance metrics
- **Admin Management**: System-wide analytics and payout processing

### Architecture
```
User Registration → Referral Chain Creation → Transaction Processing → Commission Calculation → Payout Processing
```

## Setup & Installation

### Prerequisites
- Node.js 16+ with ES6 modules support
- MongoDB 4.4+
- Angular 19 (frontend)
- Existing Blunr authentication system

### Backend Dependencies
```bash
cd Blunr-backend
npm install mongoose
```

The referral system is already implemented in the existing codebase at:
- `src/modules/referrals/`

## Backend Integration

### Step 1: Add Referral Routes to Main Server

Add to your `index.js` or main server file:

```javascript
import referralRoutes from './src/modules/referrals/referral.routes.js';

// Add this line with your other route definitions
app.use('/api/referrals', referralRoutes);
```

### Step 2: Integrate with User Registration

Modify your user registration controller to handle referral codes:

```javascript
// In your auth.controller.js or user registration handler
import ReferralService from '../modules/referrals/referral.service.js';

const registerUser = async (req, res) => {
    try {
        const { email, username, password, referralCode } = req.body;
        
        // Create user first
        const newUser = new User({
            email,
            username,
            password: await bcrypt.hash(password, 10),
            // ... other user fields
        });
        
        await newUser.save();
        
        // Create referral record and establish chain
        const referralData = await ReferralService.createUserReferralRecord(
            newUser._id, 
            referralCode
        );
        
        // Update user with referral data if referred
        if (referralData.tier1Referrer || referralData.tier2Referrer) {
            newUser.referralData = {
                referralCode: await Referral.generateReferralCode(username),
                referredBy: referralData.tier1Referrer,
                referralChain: {
                    tier1Referrer: referralData.tier1Referrer,
                    tier2Referrer: referralData.tier2Referrer
                },
                referralStats: {
                    totalReferrals: 0,
                    activeReferrals: 0,
                    totalCommissionsEarned: 0,
                    pendingCommissions: 0
                },
                referralSource: referralCode ? 'referral' : 'organic'
            };
            
            await newUser.save();
        }
        
        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user: newUser
        });
        
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Registration failed',
            error: error.message
        });
    }
};
```

### Step 3: Integrate with Transaction Processing

Add commission processing to your transaction completion:

```javascript
// In your payment/transaction controller
import { processReferralCommissions } from '../modules/referrals/transaction-integration.js';

const completeTransaction = async (req, res) => {
    try {
        // ... existing transaction logic
        
        // Mark transaction as completed
        transaction.status = 'completed';
        await transaction.save();
        
        // Process referral commissions
        if (transaction.status === 'completed' && transaction.recipient) {
            req.transaction = transaction;
            await processReferralCommissions(req, res, () => {});
        }
        
        res.json({
            success: true,
            transaction
        });
        
    } catch (error) {
        console.error('Transaction completion error:', error);
        res.status(500).json({
            success: false,
            message: 'Transaction failed',
            error: error.message
        });
    }
};
```

### Step 4: Add Transaction Model Hook (Alternative Method)

For automatic commission processing, add this to your `transaction.model.js`:

```javascript
import { transactionPostSaveHook } from './referrals/transaction-integration.js';

// Add this after your schema definition
TransactionSchema.post('save', transactionPostSaveHook);
```

### Step 5: Environment Variables

Add to your `.env` file:

```env
# Referral System Configuration
FRONTEND_URL=http://localhost:3000
REFERRAL_TIER1_RATE=0.10
REFERRAL_TIER2_RATE=0.02
REFERRAL_MIN_PAYOUT=10
REFERRAL_CODE_LENGTH=8
```

## Frontend Integration

### Step 1: Update Angular Service

The referral service is already implemented. Update the API endpoints to match your backend:

```typescript
// In src/app/core/services/referral/referral.service.ts
// Update the base URLs from '/referral/' to '/api/referrals/'

getReferralStats(): Observable<any> {
    return this.http.get('/api/referrals/dashboard');
}

getCommissionHistory(page = 1, limit = 10, status?: 'pending' | 'paid'): Observable<any> {
    let params = `?page=${page}&limit=${limit}`;
    if (status) {
        params += `&status=${status}`;
    }
    return this.http.get(`/api/referrals/commissions${params}`);
}

getLeaderboard(limit = 10): Observable<any> {
    return this.http.get(`/api/referrals/leaderboard?limit=${limit}`);
}

validateReferralCode(code: string): Observable<any> {
    return this.http.post('/api/referrals/validate', { referralCode: code });
}

getMyReferralCode(): Observable<any> {
    return this.http.get('/api/referrals/my-code');
}
```

### Step 2: Add Registration Form Validation

Update your registration component to handle referral codes:

```typescript
// In your sign-up.component.ts
export class SignUpComponent {
    signupForm: FormGroup;
    referralCode: string = '';
    referrerInfo: any = null;
    
    constructor(
        private fb: FormBuilder,
        private authService: AuthService,
        private referralService: ReferralService,
        private route: ActivatedRoute
    ) {
        // Check for referral code in URL
        this.route.queryParams.subscribe(params => {
            if (params['ref']) {
                this.referralCode = params['ref'];
                this.validateReferralCode();
            }
        });
        
        this.signupForm = this.fb.group({
            email: ['', [Validators.required, Validators.email]],
            username: ['', [Validators.required, Validators.minLength(3)]],
            password: ['', [Validators.required, Validators.minLength(6)]],
            referralCode: [this.referralCode]
        });
    }
    
    validateReferralCode(): void {
        if (this.referralCode && this.referralCode.length >= 6) {
            this.referralService.validateReferralCode(this.referralCode).subscribe({
                next: (response) => {
                    if (response.success) {
                        this.referrerInfo = response.data.referrer;
                    } else {
                        this.referrerInfo = null;
                    }
                },
                error: (error) => {
                    console.error('Referral validation error:', error);
                    this.referrerInfo = null;
                }
            });
        }
    }
    
    onSubmit(): void {
        if (this.signupForm.valid) {
            const formData = {
                ...this.signupForm.value,
                referralCode: this.referralCode || null
            };
            
            this.authService.register(formData).subscribe({
                next: (response) => {
                    // Handle successful registration
                },
                error: (error) => {
                    // Handle registration error
                }
            });
        }
    }
}
```

### Step 3: Update Registration Template

Add referral code display to your `sign-up.component.html`:

```html
<!-- Add this section before the registration form -->
<div class="referral-info" *ngIf="referrerInfo">
    <div class="alert alert-info">
        <h5><i class="fas fa-user-plus"></i> You were invited by {{ referrerInfo.username }}!</h5>
        <p>Join now and start earning commissions:</p>
        <ul>
            <li>Earn 10% from your direct referrals</li>
            <li>Earn 2% from indirect referrals</li>
        </ul>
    </div>
</div>

<!-- In your form, add hidden field -->
<input type="hidden" [value]="referralCode" name="referralCode">
```

### Step 4: Update Referral Dashboard Component

Update your `referral-dashboard.component.ts`:

```typescript
export class ReferralDashboardComponent implements OnInit {
    stats: any = null;
    commissionHistory: any[] = [];
    leaderboard: any[] = [];
    loading = true;
    
    constructor(
        private referralService: ReferralService,
        private toast: ToastrService
    ) {}
    
    ngOnInit(): void {
        this.loadDashboardData();
    }
    
    loadDashboardData(): void {
        this.loading = true;
        
        // Load all dashboard data in parallel
        forkJoin({
            stats: this.referralService.getReferralStats(),
            myCode: this.referralService.getMyReferralCode(),
            commissions: this.referralService.getCommissionHistory(1, 10),
            leaderboard: this.referralService.getLeaderboard(10)
        }).subscribe({
            next: (data) => {
                this.stats = { ...data.stats.data, ...data.myCode.data };
                this.commissionHistory = data.commissions.data.docs || [];
                this.leaderboard = data.leaderboard.data || [];
                this.loading = false;
            },
            error: (error) => {
                console.error('Dashboard loading error:', error);
                this.loading = false;
            }
        });
    }
    
    copyReferralLink(): void {
        if (this.stats?.shareUrl) {
            navigator.clipboard.writeText(this.stats.shareUrl).then(() => {
                this.toast.success('Referral link copied to clipboard!');
            });
        }
    }
}
```

## Database Migration

### Step 1: Update User Model

Add referral fields to existing User model:

```javascript
// In your user.model.js, add these fields to the schema
const UserSchema = new mongoose.Schema({
    // ... existing fields
    
    // Add referral data
    referralData: {
        referralCode: { type: String, sparse: true, unique: true },
        referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        referralChain: {
            tier1Referrer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
            tier2Referrer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
        },
        referralStats: {
            totalReferrals: { type: Number, default: 0 },
            activeReferrals: { type: Number, default: 0 },
            totalCommissionsEarned: { type: Number, default: 0 },
            pendingCommissions: { type: Number, default: 0 }
        },
        referralSource: { type: String, default: 'organic' }
    },
    
    commissionEarnings: {
        tier1Earnings: { type: Number, default: 0 },
        tier2Earnings: { type: Number, default: 0 },
        totalCommissions: { type: Number, default: 0 },
        lastCommissionDate: { type: Date, default: null }
    }
    
    // ... rest of existing fields
});

// Add indexes for referral queries
UserSchema.index({ 'referralData.referralCode': 1 });
UserSchema.index({ 'referralData.referredBy': 1 });
UserSchema.index({ 'referralData.referralChain.tier1Referrer': 1 });
UserSchema.index({ 'referralData.referralChain.tier2Referrer': 1 });
```

### Step 2: Migration Script for Existing Users

Create a migration script to add referral codes to existing users:

```javascript
// migration-add-referrals.js
import mongoose from 'mongoose';
import User from './src/modules/user/user.model.js';
import Referral from './src/modules/referrals/referral.model.js';

const migrateExistingUsers = async () => {
    try {
        console.log('Starting referral system migration...');
        
        const users = await User.find({
            $or: [
                { 'referralData.referralCode': { $exists: false } },
                { 'referralData.referralCode': null }
            ]
        });
        
        console.log(`Found ${users.length} users to migrate`);
        
        for (const user of users) {
            try {
                // Generate referral code
                const baseString = user.username || user.email?.split('@')[0] || '';
                const referralCode = await Referral.generateReferralCode(baseString);
                
                // Create referral record
                const referralRecord = new Referral({
                    code: referralCode,
                    codeOwner: user._id,
                    source: 'organic',
                    tier1Referrer: null,
                    tier2Referrer: null
                });
                
                await referralRecord.save();
                
                // Update user with referral data
                user.referralData = {
                    referralCode: referralCode,
                    referredBy: null,
                    referralChain: {
                        tier1Referrer: null,
                        tier2Referrer: null
                    },
                    referralStats: {
                        totalReferrals: 0,
                        activeReferrals: 0,
                        totalCommissionsEarned: 0,
                        pendingCommissions: 0
                    },
                    referralSource: 'organic'
                };
                
                user.commissionEarnings = {
                    tier1Earnings: 0,
                    tier2Earnings: 0,
                    totalCommissions: 0,
                    lastCommissionDate: null
                };
                
                await user.save();
                console.log(`Migrated user: ${user.username} - Code: ${referralCode}`);
                
            } catch (userError) {
                console.error(`Failed to migrate user ${user._id}:`, userError.message);
            }
        }
        
        console.log('Migration completed successfully!');
        
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        mongoose.connection.close();
    }
};

// Run migration
mongoose.connect(process.env.MONGO_URI)
    .then(() => migrateExistingUsers())
    .catch(console.error);
```

Run the migration:

```bash
node migration-add-referrals.js
```

### Step 3: Database Indexes

Create optimal indexes for performance:

```javascript
// In MongoDB shell or create as a script
db.referrals.createIndex({ codeOwner: 1, isActive: 1 });
db.referrals.createIndex({ code: 1, isActive: 1 });
db.referrals.createIndex({ tier1Referrer: 1, tier2Referrer: 1 });
db.referrals.createIndex({ "stats.lastActivity": -1 });
db.referrals.createIndex({ "stats.totalCommissionEarned": -1 });

db.commissions.createIndex({ recipient: 1, status: 1, createdAt: -1 });
db.commissions.createIndex({ earningUser: 1, tier: 1, createdAt: -1 });
db.commissions.createIndex({ sourceTransaction: 1, tier: 1 });
db.commissions.createIndex({ status: 1, createdAt: -1 });
db.commissions.createIndex({ tier: 1, transactionType: 1 });

db.users.createIndex({ "referralData.referralCode": 1 });
db.users.createIndex({ "referralData.referredBy": 1 });
```

## API Documentation

### Authentication

All protected endpoints require JWT token in Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### Public Endpoints

#### POST /api/referrals/validate
Validate a referral code before registration.

**Request:**
```json
{
    "referralCode": "JOHN1234"
}
```

**Response:**
```json
{
    "success": true,
    "data": {
        "valid": true,
        "referrer": {
            "username": "johndoe",
            "avatar": "https://example.com/avatar.jpg",
            "isVerified": true
        },
        "benefits": {
            "tier1Rate": "10%",
            "tier2Rate": "2%",
            "description": "Earn commissions from your referrals earnings!"
        }
    }
}
```

#### GET /api/referrals/leaderboard
Get top referrers leaderboard.

**Query Parameters:**
- `limit` (optional): Number of entries (default: 20)

**Response:**
```json
{
    "success": true,
    "data": [
        {
            "code": "ALICE123",
            "username": "alice",
            "avatar": "https://example.com/alice.jpg",
            "isVerified": true,
            "stats": {
                "totalReferrals": 25,
                "totalCommissionEarned": 500.75
            },
            "joinedAt": "2024-01-01T00:00:00.000Z"
        }
    ]
}
```

### Protected Endpoints (User)

#### GET /api/referrals/dashboard
Get user's referral dashboard with analytics.

**Query Parameters:**
- `startDate` (optional): Filter start date (ISO string)
- `endDate` (optional): Filter end date (ISO string)

**Response:**
```json
{
    "success": true,
    "data": {
        "referralCode": "JOHN1234",
        "stats": {
            "totalReferrals": 15,
            "activeReferrals": 8,
            "totalCommissionEarned": 245.50,
            "tier1CommissionEarned": 200.00,
            "tier2CommissionEarned": 45.50
        },
        "commissionSummary": {
            "totalCommissions": 245.50,
            "pendingCommissions": 50.00,
            "paidCommissions": 195.50,
            "tier1Commissions": 200.00,
            "tier2Commissions": 45.50
        },
        "directReferrals": [...],
        "recentCommissions": [...],
        "performance": {
            "conversionRate": "53.33%",
            "activeReferrals": 8,
            "averageEarningsPerReferral": "15.34"
        }
    }
}
```

#### GET /api/referrals/my-code
Get user's referral code and share URL.

**Response:**
```json
{
    "success": true,
    "data": {
        "referralCode": "JOHN1234",
        "shareUrl": "https://blunr.com/register?ref=JOHN1234",
        "stats": {
            "totalReferrals": 15,
            "totalCommissionEarned": 245.50
        },
        "isNew": false
    }
}
```

#### PUT /api/referrals/update-code
Update user's referral code (one-time customization).

**Request:**
```json
{
    "newCode": "MYCUSTOMCODE"
}
```

**Response:**
```json
{
    "success": true,
    "data": {
        "referralCode": "MYCUSTOMCODE",
        "shareUrl": "https://blunr.com/register?ref=MYCUSTOMCODE"
    },
    "message": "Referral code updated successfully"
}
```

#### GET /api/referrals/commissions
Get user's commission history with pagination.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `status` (optional): Filter by status ('pending', 'paid', 'failed', 'cancelled')
- `tier` (optional): Filter by tier (1 or 2)
- `type` (optional): Filter by transaction type

**Response:**
```json
{
    "success": true,
    "data": {
        "docs": [
            {
                "_id": "...",
                "recipient": "...",
                "earningUser": {
                    "username": "alice",
                    "avatar": "https://example.com/alice.jpg"
                },
                "sourceTransaction": {
                    "type": "subscription",
                    "amount": 50.00,
                    "currency": "USD",
                    "createdAt": "2024-01-15T10:30:00.000Z"
                },
                "tier": 1,
                "commissionRate": 0.10,
                "commissionAmount": 5.00,
                "status": "paid",
                "paidAt": "2024-01-15T12:00:00.000Z",
                "createdAt": "2024-01-15T10:30:00.000Z"
            }
        ],
        "totalPages": 5,
        "page": 1,
        "limit": 20,
        "totalDocs": 95
    }
}
```

### Admin Endpoints

#### GET /api/referrals/analytics
Get comprehensive commission analytics (Admin only).

**Query Parameters:**
- `startDate` (optional): Analysis start date
- `endDate` (optional): Analysis end date

**Response:**
```json
{
    "success": true,
    "data": {
        "summary": {
            "totalCommissions": 15750.25,
            "totalTransactions": 1250,
            "avgCommission": 12.60,
            "tier1Total": 13125.00,
            "tier2Total": 2625.25
        },
        "statusBreakdown": {
            "pending": 2500.00,
            "paid": 13000.25,
            "failed": 250.00
        },
        "typeBreakdown": {
            "subscription": 10000.00,
            "tip": 3500.25,
            "post_purchase": 2250.00
        },
        "tier1Percentage": 83,
        "tier2Percentage": 17
    }
}
```

#### GET /api/referrals/admin/stats
Get system-wide referral statistics (Admin only).

**Response:**
```json
{
    "success": true,
    "data": {
        "overview": {
            "totalReferrals": 250,
            "activeReferrals": 180,
            "totalCommissionsPaid": 15750.25,
            "pendingCommissions": {
                "amount": 2500.00,
                "count": 85
            }
        },
        "topReferrers": [...]
    }
}
```

#### POST /api/referrals/process-payouts
Process pending commission payouts (Admin only).

**Request:**
```json
{
    "minAmount": 10,
    "limit": 100
}
```

**Response:**
```json
{
    "success": true,
    "data": {
        "processed": 45,
        "failed": 2,
        "totalAmount": 1250.75,
        "errors": [
            {
                "commissionId": "...",
                "error": "No wallet address configured"
            }
        ]
    },
    "message": "Processed 45 commission payouts"
}
```

### Error Responses

All endpoints return errors in this format:

```json
{
    "success": false,
    "message": "Error description",
    "error": "Detailed error message"
}
```

Common HTTP status codes:
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (invalid/missing token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found (resource doesn't exist)
- `500`: Internal Server Error

## Configuration Guide

### Commission Rate Configuration

The commission rates are configured in the referral models and can be customized:

```javascript
// In referral.model.js
ReferralSchema.virtual('commissionRates').get(function() {
    return {
        tier1: parseFloat(process.env.REFERRAL_TIER1_RATE) || 0.10,
        tier2: parseFloat(process.env.REFERRAL_TIER2_RATE) || 0.02
    };
});
```

### Environment Variables

```env
# Commission Configuration
REFERRAL_TIER1_RATE=0.10         # 10% for direct referrals
REFERRAL_TIER2_RATE=0.02         # 2% for indirect referrals

# Referral Code Settings
REFERRAL_CODE_LENGTH=8           # Length of generated codes
REFERRAL_CODE_EXPIRY_DAYS=0      # 0 = no expiry

# Payout Configuration
REFERRAL_MIN_PAYOUT=10           # Minimum commission for payout
REFERRAL_AUTO_PAYOUT=false       # Auto payout when threshold reached

# UI Configuration
FRONTEND_URL=https://blunr.com   # For generating share URLs
REFERRAL_SHARE_MESSAGE="Join Blunr and start earning!"
```

### Customizing Commission Rates

To change commission rates, update the environment variables and restart the server. For dynamic rate changes, you can modify the calculation functions:

```javascript
// In commission.model.js
const rates = { 
    tier1: parseFloat(process.env.REFERRAL_TIER1_RATE) || 0.10,
    tier2: parseFloat(process.env.REFERRAL_TIER2_RATE) || 0.02
};
```

### Transaction Type Configuration

Configure which transaction types generate commissions:

```javascript
// In referral.service.js
const COMMISSION_ELIGIBLE_TYPES = [
    'subscription',
    'tip',
    'post_purchase',
    'chat_purchase'
];
```

## Testing Procedures

### 1. Backend API Testing

Create a test script to verify all endpoints:

```javascript
// test-referral-api.js
import request from 'supertest';
import app from '../index.js'; // Your main app

describe('Referral System API', () => {
    let userToken, adminToken;
    let testReferralCode;
    
    beforeAll(async () => {
        // Setup test users and tokens
        userToken = 'your-test-user-jwt';
        adminToken = 'your-test-admin-jwt';
    });
    
    describe('Public Endpoints', () => {
        test('POST /api/referrals/validate - should validate referral code', async () => {
            const response = await request(app)
                .post('/api/referrals/validate')
                .send({ referralCode: 'TESTCODE123' });
                
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
        
        test('GET /api/referrals/leaderboard - should return leaderboard', async () => {
            const response = await request(app)
                .get('/api/referrals/leaderboard?limit=5');
                
            expect(response.status).toBe(200);
            expect(response.body.data).toBeInstanceOf(Array);
        });
    });
    
    describe('Protected Endpoints', () => {
        test('GET /api/referrals/dashboard - should return user dashboard', async () => {
            const response = await request(app)
                .get('/api/referrals/dashboard')
                .set('Authorization', `Bearer ${userToken}`);
                
            expect(response.status).toBe(200);
            expect(response.body.data.referralCode).toBeDefined();
        });
        
        test('GET /api/referrals/my-code - should return referral code', async () => {
            const response = await request(app)
                .get('/api/referrals/my-code')
                .set('Authorization', `Bearer ${userToken}`);
                
            expect(response.status).toBe(200);
            testReferralCode = response.body.data.referralCode;
        });
        
        test('GET /api/referrals/commissions - should return commission history', async () => {
            const response = await request(app)
                .get('/api/referrals/commissions?page=1&limit=10')
                .set('Authorization', `Bearer ${userToken}`);
                
            expect(response.status).toBe(200);
            expect(response.body.data.docs).toBeInstanceOf(Array);
        });
    });
    
    describe('Admin Endpoints', () => {
        test('GET /api/referrals/admin/stats - should return admin stats', async () => {
            const response = await request(app)
                .get('/api/referrals/admin/stats')
                .set('Authorization', `Bearer ${adminToken}`);
                
            expect(response.status).toBe(200);
            expect(response.body.data.overview).toBeDefined();
        });
    });
});
```

Run tests:
```bash
npm test -- test-referral-api.js
```

### 2. Commission Processing Test

Test the commission calculation:

```javascript
// test-commission-processing.js
import mongoose from 'mongoose';
import ReferralService from './src/modules/referrals/referral.service.js';
import Transaction from './src/modules/transactions/transaction.model.js';
import User from './src/modules/user/user.model.js';

const testCommissionProcessing = async () => {
    try {
        console.log('Testing commission processing...');
        
        // Create test transaction
        const testTransaction = new Transaction({
            user: 'userId1',
            recipient: 'userId2', // User with referrers
            type: 'subscription',
            amount: 100.00,
            currency: 'USD',
            status: 'completed'
        });
        
        await testTransaction.save();
        
        // Process commissions
        const result = await ReferralService.processCommissions(testTransaction);
        
        console.log('Commission processing result:', result);
        
        if (result.processed) {
            console.log('✅ Commission processing successful');
            console.log(`Tier 1 Commission: $${result.tier1Amount}`);
            console.log(`Tier 2 Commission: $${result.tier2Amount}`);
        } else {
            console.log('❌ Commission processing failed:', result.reason);
        }
        
    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        mongoose.connection.close();
    }
};

// Run test
mongoose.connect(process.env.MONGO_URI)
    .then(() => testCommissionProcessing())
    .catch(console.error);
```

### 3. Frontend Component Testing

Test Angular components:

```typescript
// referral-dashboard.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ReferralDashboardComponent } from './referral-dashboard.component';
import { ReferralService } from '../core/services/referral/referral.service';

describe('ReferralDashboardComponent', () => {
    let component: ReferralDashboardComponent;
    let fixture: ComponentFixture<ReferralDashboardComponent>;
    let referralService: jasmine.SpyObj<ReferralService>;
    
    beforeEach(async () => {
        const referralServiceSpy = jasmine.createSpyObj('ReferralService', [
            'getReferralStats',
            'getMyReferralCode',
            'getCommissionHistory',
            'getLeaderboard'
        ]);
        
        await TestBed.configureTestingModule({
            declarations: [ReferralDashboardComponent],
            imports: [HttpClientTestingModule],
            providers: [
                { provide: ReferralService, useValue: referralServiceSpy }
            ]
        }).compileComponents();
        
        fixture = TestBed.createComponent(ReferralDashboardComponent);
        component = fixture.componentInstance;
        referralService = TestBed.inject(ReferralService) as jasmine.SpyObj<ReferralService>;
    });
    
    it('should load dashboard data on init', () => {
        const mockStats = { totalReferrals: 10, totalCommissions: 100 };
        referralService.getReferralStats.and.returnValue(of({ success: true, data: mockStats }));
        
        component.ngOnInit();
        
        expect(referralService.getReferralStats).toHaveBeenCalled();
        expect(component.stats).toEqual(mockStats);
    });
});
```

### 4. Load Testing

Test system performance under load:

```javascript
// load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
    stages: [
        { duration: '30s', target: 10 },
        { duration: '1m', target: 50 },
        { duration: '30s', target: 0 }
    ]
};

export default function() {
    // Test referral validation
    let response = http.post('http://localhost:5000/api/referrals/validate', 
        JSON.stringify({ referralCode: 'TEST1234' }),
        { headers: { 'Content-Type': 'application/json' } }
    );
    
    check(response, {
        'validation request successful': (r) => r.status === 200,
        'response time < 500ms': (r) => r.timings.duration < 500,
    });
    
    sleep(1);
}
```

Run load test:
```bash
k6 run load-test.js
```

## Performance Monitoring

### 1. Key Performance Metrics

Monitor these critical metrics:

```javascript
// monitoring-metrics.js
const performanceMetrics = {
    // Response Times
    referralValidationTime: 'avg < 100ms',
    commissionProcessingTime: 'avg < 200ms',
    dashboardLoadTime: 'avg < 500ms',
    
    // Database Performance
    referralCodeLookup: 'avg < 50ms',
    commissionInsert: 'avg < 100ms',
    analyticsQuery: 'avg < 1000ms',
    
    // System Health
    commissionProcessingSuccess: 'rate > 99%',
    payoutProcessingErrors: 'rate < 1%',
    databaseConnections: 'active < 80% of pool',
    
    // Business Metrics
    referralConversionRate: 'track daily',
    averageCommissionAmount: 'track weekly',
    topReferrerPerformance: 'track monthly'
};
```

### 2. Database Index Monitoring

Monitor index usage:

```javascript
// check-index-usage.js
db.referrals.aggregate([
    { $indexStats: {} }
]);

db.commissions.aggregate([
    { $indexStats: {} }
]);

// Check for missing indexes
db.referrals.find({ code: "TEST123" }).explain("executionStats");
db.commissions.find({ recipient: ObjectId("...") }).explain("executionStats");
```

### 3. Application Performance Monitoring (APM)

Add performance tracking to your controllers:

```javascript
// In referral.controller.js
import { performance } from 'perf_hooks';

static async getReferralDashboard(req, res) {
    const startTime = performance.now();
    
    try {
        // ... existing logic
        
        const endTime = performance.now();
        console.log(`Dashboard load took ${endTime - startTime}ms`);
        
        // Log to monitoring service
        // monitoring.timing('referral.dashboard.load', endTime - startTime);
        
        res.json({ success: true, data: analytics });
        
    } catch (error) {
        // monitoring.increment('referral.dashboard.error');
        console.error('Dashboard error:', error);
        res.status(500).json({ success: false, message: 'Failed to load dashboard' });
    }
}
```

### 4. Commission Processing Monitoring

Monitor commission processing health:

```javascript
// commission-health-check.js
import Commission from './src/modules/referrals/commission.model.js';

const checkCommissionHealth = async () => {
    const healthReport = {
        timestamp: new Date(),
        pendingCommissions: await Commission.countDocuments({ status: 'pending' }),
        failedCommissions: await Commission.countDocuments({ status: 'failed' }),
        recentProcessingRate: null,
        avgProcessingTime: null,
        issues: []
    };
    
    // Check processing rate in last hour
    const lastHour = new Date(Date.now() - 60 * 60 * 1000);
    const recentCommissions = await Commission.find({
        createdAt: { $gte: lastHour },
        status: { $in: ['paid', 'failed'] }
    });
    
    healthReport.recentProcessingRate = recentCommissions.length;
    
    // Check for high failure rate
    const failedInLastHour = recentCommissions.filter(c => c.status === 'failed').length;
    if (failedInLastHour / recentCommissions.length > 0.05) {
        healthReport.issues.push('High commission failure rate detected');
    }
    
    // Check for stale pending commissions
    const stalePending = await Commission.countDocuments({
        status: 'pending',
        createdAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });
    
    if (stalePending > 0) {
        healthReport.issues.push(`${stalePending} commissions pending for over 24 hours`);
    }
    
    console.log('Commission Health Report:', healthReport);
    return healthReport;
};

// Run health check every 5 minutes
setInterval(checkCommissionHealth, 5 * 60 * 1000);
```

### 5. Monitoring Dashboard Setup

Create a monitoring endpoint:

```javascript
// In referral.controller.js
static async getSystemHealth(req, res) {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }
        
        const [
            totalReferrals,
            pendingCommissions,
            failedCommissions,
            recentActivity,
            dbHealth
        ] = await Promise.all([
            Referral.countDocuments({ isActive: true }),
            Commission.countDocuments({ status: 'pending' }),
            Commission.countDocuments({ status: 'failed' }),
            Commission.find({ 
                createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) }
            }).countDocuments(),
            mongoose.connection.db.admin().ping()
        ]);
        
        const health = {
            system: 'referral',
            status: 'healthy',
            timestamp: new Date(),
            metrics: {
                totalReferrals,
                pendingCommissions,
                failedCommissions,
                recentActivity,
                dbConnected: !!dbHealth.ok
            },
            alerts: []
        };
        
        // Add alerts based on thresholds
        if (pendingCommissions > 1000) {
            health.alerts.push('High number of pending commissions');
            health.status = 'warning';
        }
        
        if (failedCommissions > 100) {
            health.alerts.push('High number of failed commissions');
            health.status = 'warning';
        }
        
        res.json({ success: true, data: health });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            data: {
                system: 'referral',
                status: 'error',
                error: error.message
            }
        });
    }
}
```

### 6. Automated Alerts

Set up automated alerts for critical issues:

```javascript
// alert-system.js
import nodemailer from 'nodemailer';

const alertConfig = {
    email: {
        from: process.env.ALERT_EMAIL_FROM,
        to: process.env.ADMIN_EMAIL,
        smtp: {
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        }
    }
};

const sendAlert = async (type, message, details = {}) => {
    const transporter = nodemailer.createTransporter(alertConfig.email.smtp);
    
    const mailOptions = {
        from: alertConfig.email.from,
        to: alertConfig.email.to,
        subject: `[BLUNR ALERT] ${type}`,
        html: `
            <h3>Referral System Alert</h3>
            <p><strong>Type:</strong> ${type}</p>
            <p><strong>Message:</strong> ${message}</p>
            <p><strong>Time:</strong> ${new Date().toISOString()}</p>
            <pre>${JSON.stringify(details, null, 2)}</pre>
        `
    };
    
    try {
        await transporter.sendMail(mailOptions);
        console.log(`Alert sent: ${type}`);
    } catch (error) {
        console.error('Failed to send alert:', error);
    }
};

// Alert triggers
const monitorCommissionFailures = async () => {
    const failureRate = await Commission.aggregate([
        {
            $match: {
                createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) }
            }
        },
        {
            $group: {
                _id: null,
                total: { $sum: 1 },
                failed: {
                    $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
                }
            }
        }
    ]);
    
    if (failureRate[0]?.total > 0) {
        const rate = failureRate[0].failed / failureRate[0].total;
        if (rate > 0.1) { // 10% failure rate threshold
            await sendAlert(
                'High Commission Failure Rate',
                `Commission failure rate is ${(rate * 100).toFixed(2)}%`,
                { total: failureRate[0].total, failed: failureRate[0].failed }
            );
        }
    }
};

// Run monitoring every 5 minutes
setInterval(monitorCommissionFailures, 5 * 60 * 1000);

export { sendAlert, monitorCommissionFailures };
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Commission Not Being Created

**Symptoms:**
- Transactions complete but no commissions are generated
- Commission processing logs show "No referrers found"

**Diagnosis:**
```javascript
// Check user's referral chain
const user = await User.findById(userId).populate(
    'referralData.referralChain.tier1Referrer referralData.referralChain.tier2Referrer'
);
console.log('User referral data:', user.referralData);

// Check if referral record exists
const referral = await Referral.findOne({ codeOwner: userId });
console.log('Referral record:', referral);
```

**Solutions:**
1. Ensure user was properly registered with referral code
2. Check referral chain integrity in database
3. Verify transaction type is eligible for commissions
4. Run migration script for existing users

#### 2. Duplicate Referral Codes

**Symptoms:**
- Error: "Referral code already exists"
- Code generation fails

**Diagnosis:**
```javascript
// Check for duplicate codes
db.referrals.aggregate([
    { $group: { _id: "$code", count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } }
]);
```

**Solutions:**
```javascript
// Fix duplicate codes
const fixDuplicateCodes = async () => {
    const duplicates = await Referral.aggregate([
        { $group: { _id: "$code", docs: { $push: "$$ROOT" }, count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } }
    ]);
    
    for (const duplicate of duplicates) {
        const docs = duplicate.docs;
        // Keep the first one, reassign codes to others
        for (let i = 1; i < docs.length; i++) {
            const newCode = await Referral.generateReferralCode();
            await Referral.findByIdAndUpdate(docs[i]._id, { code: newCode });
        }
    }
};
```

#### 3. Commission Calculation Errors

**Symptoms:**
- Incorrect commission amounts
- Missing tier 2 commissions

**Diagnosis:**
```javascript
// Test commission calculation
const testAmount = 100;
const result = Referral.calculateCommissions(testAmount);
console.log('Expected commissions:', result);

// Check actual rates being used
const rates = { tier1: 0.10, tier2: 0.02 };
console.log('Commission rates:', rates);
```

**Solutions:**
1. Verify commission rates in environment variables
2. Check floating point precision in calculations
3. Ensure proper rounding logic

#### 4. Performance Issues

**Symptoms:**
- Slow referral dashboard loading
- Commission processing timeouts

**Diagnosis:**
```javascript
// Check index usage
db.referrals.find({ codeOwner: ObjectId("...") }).explain("executionStats");
db.commissions.find({ recipient: ObjectId("...") }).explain("executionStats");

// Check query performance
const start = Date.now();
const result = await ReferralService.getReferralAnalytics(userId);
console.log(`Query took ${Date.now() - start}ms`);
```

**Solutions:**
1. Ensure proper database indexes
2. Optimize aggregation queries
3. Implement caching for frequent queries
4. Use database connection pooling

#### 5. Failed Commission Payouts

**Symptoms:**
- Commissions stuck in "pending" status
- Payout processing errors

**Diagnosis:**
```javascript
// Check failed payouts
const failedPayouts = await Commission.find({ 
    status: 'failed',
    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
}).populate('recipient', 'walletAddress');

console.log('Failed payouts:', failedPayouts);
```

**Solutions:**
1. Verify user wallet addresses
2. Check payment processor integration
3. Implement retry logic for failed payouts
4. Add proper error handling and logging

### Database Maintenance

#### 1. Regular Cleanup Script

```javascript
// cleanup-referrals.js
const performMaintenance = async () => {
    console.log('Starting referral system maintenance...');
    
    // Clean up old failed commissions (older than 30 days)
    const oldFailedCommissions = await Commission.deleteMany({
        status: 'failed',
        createdAt: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });
    console.log(`Cleaned up ${oldFailedCommissions.deletedCount} old failed commissions`);
    
    // Update referral statistics
    const referrals = await Referral.find({});
    for (const referral of referrals) {
        const commissionTotal = await Commission.aggregate([
            { $match: { recipient: referral.codeOwner, status: 'paid' } },
            { $group: { _id: null, total: { $sum: '$commissionAmount' } } }
        ]);
        
        referral.stats.totalCommissionEarned = commissionTotal[0]?.total || 0;
        await referral.save();
    }
    console.log(`Updated statistics for ${referrals.length} referral records`);
    
    console.log('Maintenance completed');
};

// Run monthly
const schedule = require('node-cron');
schedule.cron('0 2 1 * *', performMaintenance); // First day of month at 2 AM
```

#### 2. Data Integrity Check

```javascript
// integrity-check.js
const checkDataIntegrity = async () => {
    console.log('Checking referral data integrity...');
    
    const issues = [];
    
    // Check for users without referral records
    const usersWithoutReferrals = await User.find({
        'referralData.referralCode': { $exists: false }
    });
    if (usersWithoutReferrals.length > 0) {
        issues.push(`${usersWithoutReferrals.length} users without referral records`);
    }
    
    // Check for orphaned referral records
    const orphanedReferrals = await Referral.aggregate([
        {
            $lookup: {
                from: 'users',
                localField: 'codeOwner',
                foreignField: '_id',
                as: 'user'
            }
        },
        { $match: { user: { $size: 0 } } }
    ]);
    if (orphanedReferrals.length > 0) {
        issues.push(`${orphanedReferrals.length} orphaned referral records`);
    }
    
    // Check for commissions without source transactions
    const orphanedCommissions = await Commission.aggregate([
        {
            $lookup: {
                from: 'transactions',
                localField: 'sourceTransaction',
                foreignField: '_id',
                as: 'transaction'
            }
        },
        { $match: { transaction: { $size: 0 } } }
    ]);
    if (orphanedCommissions.length > 0) {
        issues.push(`${orphanedCommissions.length} orphaned commission records`);
    }
    
    if (issues.length === 0) {
        console.log('✅ Data integrity check passed');
    } else {
        console.log('❌ Data integrity issues found:');
        issues.forEach(issue => console.log(`  - ${issue}`));
    }
    
    return issues;
};
```

### Monitoring and Alerting Checklist

- [ ] Database connection monitoring
- [ ] Commission processing success rate
- [ ] Referral code generation performance
- [ ] Payout processing errors
- [ ] Unusual referral patterns (fraud detection)
- [ ] System resource usage
- [ ] API response times
- [ ] Data backup verification

### Support and Documentation

For additional help:

1. **Code Documentation**: All functions and classes are well-documented with JSDoc
2. **API Documentation**: Complete API reference provided above
3. **Database Schema**: Detailed schema documentation in `schema-documentation.md`
4. **Performance Guide**: Monitor key metrics and set up alerts
5. **Integration Examples**: Working code samples for common use cases

---

**Note**: This integration guide assumes the referral system code is already implemented in your Blunr backend. The system is production-ready and includes all necessary security measures, performance optimizations, and error handling.