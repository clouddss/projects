# Blunr Referral System - API Documentation

## Base URL
```
Production: https://api.blunr.com/api/referrals
Development: http://localhost:5000/api/referrals
```

## Authentication
All protected endpoints require JWT token in Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Response Format
All responses follow this format:
```json
{
    "success": boolean,
    "data": object|array,
    "message": string (optional)
}
```

## Error Format
```json
{
    "success": false,
    "message": "Error description",
    "error": "Detailed error message"
}
```

---

## Public Endpoints

### 1. Validate Referral Code
Validate a referral code during registration process.

**Endpoint:** `POST /validate`  
**Access:** Public  
**Rate Limit:** 60 requests/minute

**Request Body:**
```json
{
    "referralCode": "JOHN1234"
}
```

**Success Response (200):**
```json
{
    "success": true,
    "data": {
        "valid": true,
        "referrer": {
            "username": "johndoe",
            "avatar": "https://cdn.blunr.com/avatars/john.jpg",
            "isVerified": true
        },
        "benefits": {
            "tier1Rate": "10%",
            "tier2Rate": "2%",
            "description": "Earn commissions from your referrals earnings!"
        }
    },
    "message": "Valid referral code"
}
```

**Error Response (400):**
```json
{
    "success": false,
    "message": "Invalid referral code",
    "data": null
}
```

### 2. Get Referral Leaderboard
Get top referrers for public display.

**Endpoint:** `GET /leaderboard`  
**Access:** Public  
**Rate Limit:** 30 requests/minute

**Query Parameters:**
- `limit` (optional): Number of entries (1-50, default: 20)

**Example:** `GET /leaderboard?limit=10`

**Success Response (200):**
```json
{
    "success": true,
    "data": [
        {
            "_id": "referral_id",
            "code": "ALICE123",
            "username": "alice",
            "avatar": "https://cdn.blunr.com/avatars/alice.jpg",
            "isVerified": true,
            "stats": {
                "totalReferrals": 25,
                "activeReferrals": 18,
                "totalCommissionEarned": 500.75
            },
            "joinedAt": "2024-01-01T00:00:00.000Z"
        }
    ]
}
```

---

## Protected Endpoints (User)

### 3. Get Referral Dashboard
Get comprehensive user referral analytics and dashboard data.

**Endpoint:** `GET /dashboard`  
**Access:** Private (User)  
**Rate Limit:** 100 requests/minute

**Query Parameters:**
- `startDate` (optional): Filter start date (ISO 8601 format)
- `endDate` (optional): Filter end date (ISO 8601 format)

**Example:** `GET /dashboard?startDate=2024-01-01T00:00:00Z&endDate=2024-01-31T23:59:59Z`

**Success Response (200):**
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
            "tier2CommissionEarned": 45.50,
            "lastActivity": "2024-01-15T10:30:00.000Z"
        },
        "commissionSummary": {
            "totalCommissions": 245.50,
            "pendingCommissions": 50.00,
            "paidCommissions": 195.50,
            "tier1Commissions": 200.00,
            "tier2Commissions": 45.50,
            "totalTransactions": 32
        },
        "directReferrals": [
            {
                "_id": "user_id",
                "username": "alice",
                "avatar": "https://cdn.blunr.com/avatars/alice.jpg",
                "createdAt": "2024-01-05T00:00:00.000Z",
                "earnings": 150.00
            }
        ],
        "tier1Referrer": {
            "_id": "referrer_id",
            "username": "mentor"
        },
        "tier2Referrer": {
            "_id": "original_referrer_id",
            "username": "original"
        },
        "recentCommissions": [
            {
                "_id": "commission_id",
                "earningUser": {
                    "username": "alice",
                    "avatar": "https://cdn.blunr.com/avatars/alice.jpg"
                },
                "sourceTransaction": {
                    "type": "subscription",
                    "amount": 50.00,
                    "createdAt": "2024-01-15T10:30:00.000Z"
                },
                "tier": 1,
                "commissionAmount": 5.00,
                "status": "paid",
                "createdAt": "2024-01-15T10:30:00.000Z"
            }
        ],
        "performance": {
            "conversionRate": "53.33%",
            "activeReferrals": 8,
            "averageEarningsPerReferral": "15.34"
        }
    }
}
```

### 4. Get My Referral Code
Get user's unique referral code and share URL.

**Endpoint:** `GET /my-code`  
**Access:** Private (User)  
**Rate Limit:** 100 requests/minute

**Success Response (200):**
```json
{
    "success": true,
    "data": {
        "referralCode": "JOHN1234",
        "shareUrl": "https://blunr.com/register?ref=JOHN1234",
        "stats": {
            "totalReferrals": 15,
            "activeReferrals": 8,
            "totalCommissionEarned": 245.50
        },
        "isNew": false
    }
}
```

**Note:** If user doesn't have a referral code, one will be automatically generated.

### 5. Update Referral Code
Customize user's referral code (one-time change allowed).

**Endpoint:** `PUT /update-code`  
**Access:** Private (User)  
**Rate Limit:** 5 requests/minute

**Request Body:**
```json
{
    "newCode": "MYCUSTOMCODE"
}
```

**Validation Rules:**
- Length: 6-12 characters
- Characters: A-Z, 0-9 only
- Must be unique
- One change per user allowed

**Success Response (200):**
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

**Error Response (400):**
```json
{
    "success": false,
    "message": "This referral code is already taken"
}
```

### 6. Get Commission History
Get paginated commission history with filtering options.

**Endpoint:** `GET /commissions`  
**Access:** Private (User)  
**Rate Limit:** 100 requests/minute

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (1-100, default: 20)
- `status` (optional): Filter by status (`pending`, `paid`, `failed`, `cancelled`)
- `tier` (optional): Filter by tier (1 or 2)
- `type` (optional): Filter by transaction type (`subscription`, `tip`, `post_purchase`, `chat_purchase`)

**Example:** `GET /commissions?page=1&limit=10&status=paid&tier=1`

**Success Response (200):**
```json
{
    "success": true,
    "data": {
        "docs": [
            {
                "_id": "commission_id",
                "recipient": "user_id",
                "earningUser": {
                    "_id": "alice_id",
                    "username": "alice",
                    "avatar": "https://cdn.blunr.com/avatars/alice.jpg"
                },
                "sourceTransaction": {
                    "_id": "transaction_id",
                    "type": "subscription",
                    "amount": 50.00,
                    "currency": "USD",
                    "createdAt": "2024-01-15T10:30:00.000Z"
                },
                "tier": 1,
                "commissionRate": 0.10,
                "baseAmount": 50.00,
                "commissionAmount": 5.00,
                "currency": "USD",
                "status": "paid",
                "transactionType": "subscription",
                "paidAt": "2024-01-15T12:00:00.000Z",
                "createdAt": "2024-01-15T10:30:00.000Z",
                "updatedAt": "2024-01-15T12:00:00.000Z",
                "commissionPercentage": 10
            }
        ],
        "totalPages": 5,
        "page": 1,
        "limit": 20,
        "totalDocs": 95,
        "pagingCounter": 1,
        "hasPrevPage": false,
        "hasNextPage": true,
        "prevPage": null,
        "nextPage": 2
    }
}
```

### 7. Calculate Commission Preview
Calculate potential commission for a transaction before processing.

**Endpoint:** `POST /calculate-commission`  
**Access:** Private (User)  
**Rate Limit:** 60 requests/minute

**Request Body:**
```json
{
    "recipientId": "user_id_who_will_earn",
    "amount": 100.00
}
```

**Success Response (200):**
```json
{
    "success": true,
    "data": {
        "hasReferrers": true,
        "tier1Commission": 10.00,
        "tier2Commission": 2.00,
        "totalCommissions": 12.00,
        "referrers": {
            "tier1": "direct_referrer_username",
            "tier2": "original_referrer_username"
        }
    }
}
```

**No Referrers Response:**
```json
{
    "success": true,
    "data": {
        "hasReferrers": false,
        "tier1Commission": 0,
        "tier2Commission": 0,
        "totalCommissions": 0
    }
}
```

---

## Admin Endpoints

### 8. Get Commission Analytics
Get comprehensive system-wide commission analytics.

**Endpoint:** `GET /analytics`  
**Access:** Private (Admin only)  
**Rate Limit:** 30 requests/minute

**Query Parameters:**
- `startDate` (optional): Analysis start date (ISO 8601 format)
- `endDate` (optional): Analysis end date (ISO 8601 format)

**Example:** `GET /analytics?startDate=2024-01-01T00:00:00Z`

**Success Response (200):**
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
            "post_purchase": 2250.00,
            "chat_purchase": 0
        },
        "tier1Percentage": 83,
        "tier2Percentage": 17
    }
}
```

### 9. Get Admin Statistics
Get system-wide referral statistics overview.

**Endpoint:** `GET /admin/stats`  
**Access:** Private (Admin only)  
**Rate Limit:** 30 requests/minute

**Success Response (200):**
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
        "topReferrers": [
            {
                "_id": "referral_id",
                "code": "ALICE123",
                "username": "alice",
                "avatar": "https://cdn.blunr.com/avatars/alice.jpg",
                "isVerified": true,
                "stats": {
                    "totalReferrals": 25,
                    "totalCommissionEarned": 500.75
                },
                "joinedAt": "2024-01-01T00:00:00.000Z"
            }
        ]
    }
}
```

### 10. Process Commission Payouts
Process pending commission payouts in batch.

**Endpoint:** `POST /process-payouts`  
**Access:** Private (Admin only)  
**Rate Limit:** 10 requests/minute

**Request Body:**
```json
{
    "minAmount": 10,
    "limit": 100
}
```

**Parameters:**
- `minAmount`: Minimum commission amount for payout (default: 10)
- `limit`: Maximum number of commissions to process (default: 100)

**Success Response (200):**
```json
{
    "success": true,
    "data": {
        "processed": 45,
        "failed": 2,
        "totalAmount": 1250.75,
        "errors": [
            {
                "commissionId": "commission_id",
                "error": "No wallet address configured"
            }
        ]
    },
    "message": "Processed 45 commission payouts"
}
```

---

## Status Codes

| Code | Description |
|------|-------------|
| 200  | Success |
| 201  | Created |
| 400  | Bad Request (validation error) |
| 401  | Unauthorized (invalid/missing token) |
| 403  | Forbidden (insufficient permissions) |
| 404  | Not Found |
| 429  | Too Many Requests (rate limit exceeded) |
| 500  | Internal Server Error |

---

## Rate Limits

| Endpoint Type | Limit |
|---------------|-------|
| Public endpoints | 60 requests/minute |
| User endpoints | 100 requests/minute |
| Admin endpoints | 30 requests/minute |
| Update operations | 5 requests/minute |

Rate limits are per IP address and reset every minute.

---

## Webhooks (Future Implementation)

### Commission Created Webhook
Triggered when a new commission is created.

**URL:** Your configured webhook endpoint  
**Method:** POST  
**Headers:**
```
Content-Type: application/json
X-Blunr-Signature: sha256=<signature>
```

**Payload:**
```json
{
    "event": "commission.created",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "data": {
        "commissionId": "commission_id",
        "recipient": "user_id",
        "earningUser": "earning_user_id",
        "tier": 1,
        "amount": 5.00,
        "currency": "USD",
        "transactionType": "subscription"
    }
}
```

### Commission Paid Webhook
Triggered when a commission is successfully paid.

**Payload:**
```json
{
    "event": "commission.paid",
    "timestamp": "2024-01-15T12:00:00.000Z",
    "data": {
        "commissionId": "commission_id",
        "recipient": "user_id",
        "amount": 5.00,
        "currency": "USD",
        "paidAt": "2024-01-15T12:00:00.000Z"
    }
}
```

---

## SDK Examples

### JavaScript/Node.js
```javascript
class BlunrReferralAPI {
    constructor(baseURL, token) {
        this.baseURL = baseURL;
        this.token = token;
    }
    
    async validateReferralCode(code) {
        const response = await fetch(`${this.baseURL}/validate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ referralCode: code })
        });
        return response.json();
    }
    
    async getReferralDashboard() {
        const response = await fetch(`${this.baseURL}/dashboard`, {
            headers: {
                'Authorization': `Bearer ${this.token}`
            }
        });
        return response.json();
    }
    
    async getCommissions(page = 1, limit = 20, filters = {}) {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
            ...filters
        });
        
        const response = await fetch(`${this.baseURL}/commissions?${params}`, {
            headers: {
                'Authorization': `Bearer ${this.token}`
            }
        });
        return response.json();
    }
}

// Usage
const api = new BlunrReferralAPI('https://api.blunr.com/api/referrals', 'your-jwt-token');
const dashboard = await api.getReferralDashboard();
```

### Python
```python
import requests

class BlunrReferralAPI:
    def __init__(self, base_url, token):
        self.base_url = base_url
        self.token = token
        self.headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
    
    def validate_referral_code(self, code):
        response = requests.post(
            f'{self.base_url}/validate',
            json={'referralCode': code}
        )
        return response.json()
    
    def get_referral_dashboard(self, start_date=None, end_date=None):
        params = {}
        if start_date:
            params['startDate'] = start_date
        if end_date:
            params['endDate'] = end_date
        
        response = requests.get(
            f'{self.base_url}/dashboard',
            headers=self.headers,
            params=params
        )
        return response.json()
    
    def get_commissions(self, page=1, limit=20, **filters):
        params = {'page': page, 'limit': limit}
        params.update(filters)
        
        response = requests.get(
            f'{self.base_url}/commissions',
            headers=self.headers,
            params=params
        )
        return response.json()

# Usage
api = BlunrReferralAPI('https://api.blunr.com/api/referrals', 'your-jwt-token')
dashboard = api.get_referral_dashboard()
```

---

## Testing

### Test Data
Use these test referral codes in development:
- `TEST1234` - Valid code with active referrer
- `INVALID1` - Invalid/expired code
- `ADMIN001` - Admin test account code

### Postman Collection
Import the Postman collection for easy API testing:

```json
{
    "info": {
        "name": "Blunr Referral API",
        "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
    },
    "variable": [
        {
            "key": "baseUrl",
            "value": "{{url}}/api/referrals"
        },
        {
            "key": "userToken",
            "value": "{{userJWT}}"
        },
        {
            "key": "adminToken",
            "value": "{{adminJWT}}"
        }
    ]
}
```

---

## Changelog

### v1.0.0 (Current)
- Initial release with 2-tier referral system
- Real-time commission processing
- Comprehensive analytics dashboard
- Admin payout processing
- Public leaderboard

### Planned Features
- Referral campaigns with custom rates
- Referral code expiration dates
- Advanced fraud detection
- Webhook notifications
- Mobile SDK
- Referral contests and gamification

---

## Support

For API support:
- **Email**: api-support@blunr.com
- **Documentation**: https://docs.blunr.com/referrals
- **Status Page**: https://status.blunr.com
- **Developer Discord**: https://discord.gg/blunr-dev