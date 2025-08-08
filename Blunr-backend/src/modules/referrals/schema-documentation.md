# Blunr 2-Tier Referral System Database Schema

## Overview

This document outlines the complete MongoDB schema design for Blunr's 2-tier referral system, optimized for real-time commission calculations and high-performance querying.

## Schema Architecture

### 1. Referral Model (`referrals` collection)

**Purpose**: Tracks referral relationships, codes, and performance metrics.

```javascript
{
  _id: ObjectId,
  code: String,                    // Unique referral code (indexed)
  codeOwner: ObjectId,            // User who owns this code
  directReferrals: [ObjectId],    // Users directly referred
  tier1Referrer: ObjectId,        // Direct referrer (Tier 1)
  tier2Referrer: ObjectId,        // Original referrer (Tier 2)
  stats: {
    totalReferrals: Number,       // Total users referred
    activeReferrals: Number,      // Currently earning users
    totalCommissionEarned: Number,
    tier1CommissionEarned: Number,
    tier2CommissionEarned: Number,
    lastActivity: Date
  },
  isActive: Boolean,
  source: String,                 // 'organic', 'campaign', 'influencer'
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes**:
```javascript
// Compound indexes for optimal performance
db.referrals.createIndex({ codeOwner: 1, isActive: 1 });
db.referrals.createIndex({ code: 1, isActive: 1 });
db.referrals.createIndex({ tier1Referrer: 1, tier2Referrer: 1 });
db.referrals.createIndex({ "stats.lastActivity": -1 });
db.referrals.createIndex({ "stats.totalCommissionEarned": -1 });
```

### 2. Commission Model (`commissions` collection)

**Purpose**: Tracks individual commission payments and history.

```javascript
{
  _id: ObjectId,
  recipient: ObjectId,            // Commission recipient
  sourceTransaction: ObjectId,    // Transaction that generated commission
  earningUser: ObjectId,         // User whose earning created commission
  referralChain: {
    tier1Referrer: ObjectId,
    tier2Referrer: ObjectId
  },
  tier: Number,                  // 1 or 2
  commissionRate: Number,        // 0.10 for 10%, 0.02 for 2%
  baseAmount: Number,            // Original transaction amount
  commissionAmount: Number,      // Calculated commission
  currency: String,              // 'USD', 'EUR', etc.
  status: String,                // 'pending', 'paid', 'failed'
  transactionType: String,       // 'subscription', 'tip', etc.
  paidAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes**:
```javascript
// Optimized for commission queries
db.commissions.createIndex({ recipient: 1, status: 1, createdAt: -1 });
db.commissions.createIndex({ earningUser: 1, tier: 1, createdAt: -1 });
db.commissions.createIndex({ sourceTransaction: 1, tier: 1 });
db.commissions.createIndex({ status: 1, createdAt: -1 });
db.commissions.createIndex({ tier: 1, transactionType: 1 });
```

### 3. Enhanced User Model (modifications)

**New fields added to existing User schema**:

```javascript
{
  // ... existing user fields ...
  
  referralData: {
    referralCode: String,          // User's unique referral code
    referredBy: ObjectId,          // Direct referrer
    referralChain: {
      tier1Referrer: ObjectId,     // Direct referrer
      tier2Referrer: ObjectId      // Original referrer
    },
    referralStats: {
      totalReferrals: Number,
      activeReferrals: Number,
      totalCommissionsEarned: Number,
      pendingCommissions: Number
    },
    referralSource: String         // How user was acquired
  },
  
  commissionEarnings: {
    tier1Earnings: Number,         // From direct referrals
    tier2Earnings: Number,         // From indirect referrals
    totalCommissions: Number,
    lastCommissionDate: Date
  }
}
```

## Commission Rate Configuration

### Current Rates
- **Tier 1** (Direct Referrals): 10% of referred user's earnings
- **Tier 2** (Indirect Referrals): 2% of indirect user's earnings

### Rate Calculation Example
```javascript
// For a $100 subscription payment:
const baseAmount = 100;
const tier1Commission = baseAmount * 0.10; // $10
const tier2Commission = baseAmount * 0.02; // $2
```

## Sample Document Structures

### Sample Referral Document
```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439011"),
  code: "JOHN1234",
  codeOwner: ObjectId("507f1f77bcf86cd799439012"),
  directReferrals: [
    ObjectId("507f1f77bcf86cd799439013"),
    ObjectId("507f1f77bcf86cd799439014")
  ],
  tier1Referrer: ObjectId("507f1f77bcf86cd799439015"),
  tier2Referrer: ObjectId("507f1f77bcf86cd799439016"),
  stats: {
    totalReferrals: 15,
    activeReferrals: 8,
    totalCommissionEarned: 245.50,
    tier1CommissionEarned: 200.00,
    tier2CommissionEarned: 45.50,
    lastActivity: ISODate("2024-01-15T10:30:00Z")
  },
  isActive: true,
  source: "organic",
  createdAt: ISODate("2024-01-01T00:00:00Z"),
  updatedAt: ISODate("2024-01-15T10:30:00Z")
}
```

### Sample Commission Document
```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439017"),
  recipient: ObjectId("507f1f77bcf86cd799439012"),
  sourceTransaction: ObjectId("507f1f77bcf86cd799439018"),
  earningUser: ObjectId("507f1f77bcf86cd799439013"),
  referralChain: {
    tier1Referrer: ObjectId("507f1f77bcf86cd799439012"),
    tier2Referrer: ObjectId("507f1f77bcf86cd799439015")
  },
  tier: 1,
  commissionRate: 0.10,
  baseAmount: 50.00,
  commissionAmount: 5.00,
  currency: "USD",
  status: "pending",
  transactionType: "subscription",
  paidAt: null,
  createdAt: ISODate("2024-01-15T10:30:00Z"),
  updatedAt: ISODate("2024-01-15T10:30:00Z")
}
```

## Performance Optimization Queries

### 1. Real-time Commission Calculation
```javascript
// Get referral chain for commission calculation
db.users.findOne(
  { _id: ObjectId("userId") },
  { "referralData.referralChain": 1 }
);

// Calculate potential commissions
const calculateCommissions = (amount, chain) => {
  return {
    tier1: chain.tier1Referrer ? amount * 0.10 : 0,
    tier2: chain.tier2Referrer ? amount * 0.02 : 0
  };
};
```

### 2. User Dashboard Analytics
```javascript
// Get user's referral performance
db.referrals.aggregate([
  { $match: { codeOwner: ObjectId("userId") } },
  {
    $lookup: {
      from: "users",
      localField: "directReferrals",
      foreignField: "_id",
      as: "referralDetails"
    }
  },
  {
    $lookup: {
      from: "commissions",
      localField: "codeOwner",
      foreignField: "recipient",
      as: "commissions"
    }
  }
]);
```

### 3. Commission History with Pagination
```javascript
// Paginated commission history
db.commissions.find(
  { recipient: ObjectId("userId") }
).sort({ createdAt: -1 })
 .skip((page - 1) * limit)
 .limit(limit);
```

### 4. Leaderboard Query
```javascript
// Top referrers by commission earned
db.referrals.aggregate([
  { $match: { "stats.totalReferrals": { $gt: 0 }, isActive: true } },
  {
    $lookup: {
      from: "users",
      localField: "codeOwner",
      foreignField: "_id",
      as: "user"
    }
  },
  { $unwind: "$user" },
  {
    $project: {
      username: "$user.username",
      avatar: "$user.avatar",
      stats: 1
    }
  },
  { $sort: { "stats.totalCommissionEarned": -1 } },
  { $limit: 20 }
]);
```

### 5. Pending Commissions for Payout
```javascript
// Get pending commissions ready for payout
db.commissions.find({
  status: "pending",
  commissionAmount: { $gte: 10 }
}).sort({ createdAt: 1 }).limit(100);
```

## Performance Optimization Guidelines

### 1. Index Strategy
- **Primary indexes**: On frequently queried fields (userId, referralCode, status)
- **Compound indexes**: For multi-field queries (recipient + status + date)
- **Sparse indexes**: On optional fields (referralCode in User model)

### 2. Query Optimization
- Use projections to limit returned fields
- Leverage aggregation pipeline for complex analytics
- Implement pagination for large result sets
- Cache frequently accessed data (Redis recommended)

### 3. Scaling Considerations
- **Sharding**: Consider sharding on `codeOwner` or `recipient` for high volume
- **Read replicas**: Use read replicas for analytics queries
- **Archiving**: Archive old commission records to maintain performance

## Real-time Commission Processing Flow

```javascript
// 1. Transaction completion trigger
TransactionSchema.post('save', async function(doc) {
  if (doc.status === 'completed') {
    await processReferralCommissions(doc);
  }
});

// 2. Commission creation
const processReferralCommissions = async (transaction) => {
  // Get user's referral chain
  const user = await User.findById(transaction.recipient);
  
  if (user.referralData?.referralChain?.tier1Referrer) {
    // Create Tier 1 commission
    await Commission.create({
      recipient: user.referralData.referralChain.tier1Referrer,
      sourceTransaction: transaction._id,
      tier: 1,
      commissionAmount: transaction.amount * 0.10
      // ... other fields
    });
  }
  
  if (user.referralData?.referralChain?.tier2Referrer) {
    // Create Tier 2 commission
    await Commission.create({
      recipient: user.referralData.referralChain.tier2Referrer,
      sourceTransaction: transaction._id,
      tier: 2,
      commissionAmount: transaction.amount * 0.02
      // ... other fields
    });
  }
};
```

## Analytics Queries

### 1. System-wide Commission Analytics
```javascript
db.commissions.aggregate([
  {
    $group: {
      _id: null,
      totalCommissions: { $sum: "$commissionAmount" },
      tier1Total: {
        $sum: { $cond: [{ $eq: ["$tier", 1] }, "$commissionAmount", 0] }
      },
      tier2Total: {
        $sum: { $cond: [{ $eq: ["$tier", 2] }, "$commissionAmount", 0] }
      },
      avgCommission: { $avg: "$commissionAmount" }
    }
  }
]);
```

### 2. Monthly Commission Trends
```javascript
db.commissions.aggregate([
  {
    $group: {
      _id: {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
        tier: "$tier"
      },
      totalAmount: { $sum: "$commissionAmount" },
      count: { $sum: 1 }
    }
  },
  { $sort: { "_id.year": 1, "_id.month": 1 } }
]);
```

### 3. User Referral Performance
```javascript
db.referrals.aggregate([
  { $match: { codeOwner: ObjectId("userId") } },
  {
    $lookup: {
      from: "commissions",
      let: { userId: "$codeOwner" },
      pipeline: [
        { $match: { $expr: { $eq: ["$recipient", "$$userId"] } } },
        {
          $group: {
            _id: "$tier",
            totalEarned: { $sum: "$commissionAmount" },
            count: { $sum: 1 }
          }
        }
      ],
      as: "commissionBreakdown"
    }
  }
]);
```

## Security Considerations

### 1. Data Validation
- Validate referral codes against injection attacks
- Ensure commission rates are within acceptable ranges
- Prevent circular referral chains

### 2. Access Control
- Commission data only accessible to recipient and admins
- Referral codes publicly readable but not modifiable
- Admin-only access to system analytics

### 3. Audit Trail
- Log all commission calculations and payments
- Track referral code changes and usage
- Monitor for suspicious referral patterns

## Backup and Maintenance

### 1. Regular Backups
- Daily backups of referral and commission collections
- Point-in-time recovery capability
- Test backup restoration procedures

### 2. Data Cleanup
- Archive old commission records (>1 year)
- Clean up inactive referral codes
- Optimize indexes periodically

### 3. Monitoring
- Track commission processing performance
- Monitor referral code usage patterns
- Alert on unusual commission activities

This schema design provides a robust foundation for Blunr's 2-tier referral system with optimal performance and scalability.