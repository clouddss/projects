# Blunr Referral System - Monitoring & Performance Guide

## Overview

This guide provides comprehensive monitoring, performance optimization, and alerting strategies for the Blunr 2-tier referral system.

## Key Performance Indicators (KPIs)

### Business Metrics
- **Referral Conversion Rate**: % of referred users who become active
- **Commission Value**: Total commissions paid per period
- **Average Revenue Per Referral (ARPR)**
- **Referral Growth Rate**: New referrals acquired per period
- **Top Referrer Performance**: Leaderboard metrics

### Technical Metrics
- **API Response Times**: All endpoint performance
- **Commission Processing Time**: Real-time processing latency
- **Database Query Performance**: Complex referral queries
- **System Resource Usage**: CPU, memory, database connections
- **Error Rates**: Failed requests, processing errors

## Performance Monitoring Implementation

### 1. Application Performance Monitoring (APM)

#### Express Middleware for Request Tracking
```javascript
// monitoring-middleware.js
import { performance } from 'perf_hooks';

class ReferralMonitoring {
    static metrics = {
        requestCounts: new Map(),
        responseTimes: new Map(),
        errorCounts: new Map(),
        commissionProcessingTimes: []
    };

    static middleware() {
        return (req, res, next) => {
            const startTime = performance.now();
            const route = `${req.method} ${req.route?.path || req.path}`;
            
            // Increment request count
            const currentCount = this.metrics.requestCounts.get(route) || 0;
            this.metrics.requestCounts.set(route, currentCount + 1);
            
            // Track response
            res.on('finish', () => {
                const endTime = performance.now();
                const duration = endTime - startTime;
                
                // Store response time
                if (!this.metrics.responseTimes.has(route)) {
                    this.metrics.responseTimes.set(route, []);
                }
                this.metrics.responseTimes.get(route).push(duration);
                
                // Keep only last 1000 measurements
                const times = this.metrics.responseTimes.get(route);
                if (times.length > 1000) {
                    times.splice(0, times.length - 1000);
                }
                
                // Track errors
                if (res.statusCode >= 400) {
                    const errorCount = this.metrics.errorCounts.get(route) || 0;
                    this.metrics.errorCounts.set(route, errorCount + 1);
                }
                
                // Log slow requests
                if (duration > 1000) { // > 1 second
                    console.warn(`🐌 Slow request: ${route} took ${duration.toFixed(2)}ms`);
                }
            });
            
            next();
        };
    }
    
    static getMetrics() {
        const metrics = {};
        
        for (const [route, times] of this.metrics.responseTimes.entries()) {
            if (times.length === 0) continue;
            
            const sorted = [...times].sort((a, b) => a - b);
            metrics[route] = {
                requests: this.metrics.requestCounts.get(route) || 0,
                errors: this.metrics.errorCounts.get(route) || 0,
                avgResponseTime: times.reduce((a, b) => a + b) / times.length,
                p50: sorted[Math.floor(sorted.length * 0.5)],
                p95: sorted[Math.floor(sorted.length * 0.95)],
                p99: sorted[Math.floor(sorted.length * 0.99)]
            };
        }
        
        return metrics;
    }
    
    static trackCommissionProcessing(duration, success = true) {
        this.metrics.commissionProcessingTimes.push({
            duration,
            success,
            timestamp: new Date()
        });
        
        // Keep only last 1000 measurements
        if (this.metrics.commissionProcessingTimes.length > 1000) {
            this.metrics.commissionProcessingTimes.splice(0, 1);
        }
    }
    
    static getCommissionMetrics() {
        const times = this.metrics.commissionProcessingTimes;
        if (times.length === 0) return null;
        
        const successful = times.filter(t => t.success);
        const failed = times.filter(t => !t.success);
        const durations = successful.map(t => t.duration);
        
        if (durations.length === 0) return null;
        
        const sorted = [...durations].sort((a, b) => a - b);
        
        return {
            totalProcessed: times.length,
            successfulProcessed: successful.length,
            failedProcessed: failed.length,
            successRate: (successful.length / times.length) * 100,
            avgProcessingTime: durations.reduce((a, b) => a + b) / durations.length,
            p50: sorted[Math.floor(sorted.length * 0.5)],
            p95: sorted[Math.floor(sorted.length * 0.95)],
            p99: sorted[Math.floor(sorted.length * 0.99)]
        };
    }
    
    // Reset metrics (call this periodically to prevent memory growth)
    static resetMetrics() {
        this.metrics.requestCounts.clear();
        this.metrics.responseTimes.clear();
        this.metrics.errorCounts.clear();
        this.metrics.commissionProcessingTimes = [];
    }
}

export default ReferralMonitoring;
```

#### Integration in Main App
```javascript
// In your main app.js or index.js
import ReferralMonitoring from './monitoring-middleware.js';

// Add monitoring middleware
app.use('/api/referrals', ReferralMonitoring.middleware());

// Metrics endpoint for monitoring systems
app.get('/api/metrics', (req, res) => {
    const apiMetrics = ReferralMonitoring.getMetrics();
    const commissionMetrics = ReferralMonitoring.getCommissionMetrics();
    
    res.json({
        timestamp: new Date().toISOString(),
        api: apiMetrics,
        commissions: commissionMetrics,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.env.npm_package_version
    });
});

// Reset metrics daily
setInterval(() => {
    ReferralMonitoring.resetMetrics();
    console.log('📊 Metrics reset');
}, 24 * 60 * 60 * 1000);
```

### 2. Commission Processing Monitoring

#### Enhanced Commission Service with Monitoring
```javascript
// monitoring-enhanced-referral.service.js
import ReferralMonitoring from './monitoring-middleware.js';

class MonitoredReferralService extends ReferralService {
    static async processCommissions(transaction) {
        const startTime = performance.now();
        let success = false;
        
        try {
            const result = await super.processCommissions(transaction);
            success = result.processed;
            
            const endTime = performance.now();
            const duration = endTime - startTime;
            
            // Track processing time
            ReferralMonitoring.trackCommissionProcessing(duration, success);
            
            // Log processing details
            console.log(`💰 Commission processed for transaction ${transaction._id}:`, {
                duration: `${duration.toFixed(2)}ms`,
                success,
                tier1Amount: result.tier1Amount || 0,
                tier2Amount: result.tier2Amount || 0
            });
            
            // Alert on slow processing
            if (duration > 500) {
                console.warn(`🐌 Slow commission processing: ${duration.toFixed(2)}ms for transaction ${transaction._id}`);
                // Could send alert here
            }
            
            return result;
        } catch (error) {
            const endTime = performance.now();
            const duration = endTime - startTime;
            
            ReferralMonitoring.trackCommissionProcessing(duration, false);
            
            console.error(`❌ Commission processing failed for transaction ${transaction._id}:`, {
                error: error.message,
                duration: `${duration.toFixed(2)}ms`
            });
            
            throw error;
        }
    }
}

export default MonitoredReferralService;
```

### 3. Database Query Performance Monitoring

#### Query Performance Tracker
```javascript
// db-performance-monitor.js
import mongoose from 'mongoose';

class DatabaseMonitor {
    static queryTimes = new Map();
    static slowQueries = [];
    
    static init() {
        // Monitor all mongoose queries
        mongoose.plugin(function(schema, options) {
            schema.pre(/^find/, function() {
                this._startTime = Date.now();
            });
            
            schema.post(/^find/, function() {
                if (this._startTime) {
                    const duration = Date.now() - this._startTime;
                    const queryType = this.op;
                    const modelName = this.model.modelName;
                    
                    DatabaseMonitor.trackQuery(modelName, queryType, duration);
                    
                    // Log slow queries
                    if (duration > 100) { // > 100ms
                        DatabaseMonitor.slowQueries.push({
                            model: modelName,
                            operation: queryType,
                            duration,
                            filter: JSON.stringify(this.getFilter()),
                            timestamp: new Date()
                        });
                        
                        console.warn(`🐌 Slow DB query: ${modelName}.${queryType} took ${duration}ms`);
                    }
                }
            });
        });
    }
    
    static trackQuery(model, operation, duration) {
        const key = `${model}.${operation}`;
        
        if (!this.queryTimes.has(key)) {
            this.queryTimes.set(key, []);
        }
        
        this.queryTimes.get(key).push(duration);
        
        // Keep only last 1000 measurements
        const times = this.queryTimes.get(key);
        if (times.length > 1000) {
            times.splice(0, 1);
        }
    }
    
    static getQueryMetrics() {
        const metrics = {};
        
        for (const [key, times] of this.queryTimes.entries()) {
            if (times.length === 0) continue;
            
            const sorted = [...times].sort((a, b) => a - b);
            metrics[key] = {
                count: times.length,
                avgTime: times.reduce((a, b) => a + b) / times.length,
                p50: sorted[Math.floor(sorted.length * 0.5)],
                p95: sorted[Math.floor(sorted.length * 0.95)],
                p99: sorted[Math.floor(sorted.length * 0.99)]
            };
        }
        
        return metrics;
    }
    
    static getSlowQueries(limit = 50) {
        return this.slowQueries
            .sort((a, b) => b.duration - a.duration)
            .slice(0, limit);
    }
    
    static resetMetrics() {
        this.queryTimes.clear();
        this.slowQueries = [];
    }
}

export default DatabaseMonitor;
```

## Alerting System

### 1. Real-time Alert Manager
```javascript
// alert-manager.js
import nodemailer from 'nodemailer';
import { performance } from 'perf_hooks';

class AlertManager {
    constructor(config) {
        this.config = config;
        this.alerts = new Map(); // Track alert frequency
        this.transporter = nodemailer.createTransporter(config.smtp);
        
        // Alert thresholds
        this.thresholds = {
            responseTime: 1000,      // ms
            errorRate: 5,            // %
            commissionFailureRate: 2, // %
            dbQueryTime: 200,        // ms
            memoryUsage: 85,         // %
            cpuUsage: 80            // %
        };
    }
    
    async checkHealthMetrics() {
        const metrics = await this.gatherMetrics();
        const alerts = [];
        
        // Check API response times
        for (const [endpoint, stats] of Object.entries(metrics.api || {})) {
            if (stats.p95 > this.thresholds.responseTime) {
                alerts.push({
                    type: 'performance',
                    severity: 'warning',
                    message: `High response time for ${endpoint}: ${stats.p95.toFixed(2)}ms (P95)`,
                    metrics: stats
                });
            }
            
            if (stats.requests > 0 && (stats.errors / stats.requests) * 100 > this.thresholds.errorRate) {
                alerts.push({
                    type: 'error_rate',
                    severity: 'critical',
                    message: `High error rate for ${endpoint}: ${((stats.errors / stats.requests) * 100).toFixed(2)}%`,
                    metrics: stats
                });
            }
        }
        
        // Check commission processing
        if (metrics.commissions) {
            const failureRate = 100 - metrics.commissions.successRate;
            if (failureRate > this.thresholds.commissionFailureRate) {
                alerts.push({
                    type: 'commission_failure',
                    severity: 'critical',
                    message: `High commission failure rate: ${failureRate.toFixed(2)}%`,
                    metrics: metrics.commissions
                });
            }
            
            if (metrics.commissions.p95 > this.thresholds.responseTime) {
                alerts.push({
                    type: 'commission_performance',
                    severity: 'warning',
                    message: `Slow commission processing: ${metrics.commissions.p95.toFixed(2)}ms (P95)`,
                    metrics: metrics.commissions
                });
            }
        }
        
        // Check database performance
        if (metrics.database) {
            for (const [query, stats] of Object.entries(metrics.database)) {
                if (stats.p95 > this.thresholds.dbQueryTime) {
                    alerts.push({
                        type: 'database_performance',
                        severity: 'warning',
                        message: `Slow database query: ${query} - ${stats.p95.toFixed(2)}ms (P95)`,
                        metrics: stats
                    });
                }
            }
        }
        
        // Check system resources
        const memoryUsagePercent = (metrics.memory.used / metrics.memory.total) * 100;
        if (memoryUsagePercent > this.thresholds.memoryUsage) {
            alerts.push({
                type: 'memory_usage',
                severity: 'critical',
                message: `High memory usage: ${memoryUsagePercent.toFixed(2)}%`,
                metrics: { memoryUsagePercent, ...metrics.memory }
            });
        }
        
        // Process alerts
        for (const alert of alerts) {
            await this.processAlert(alert);
        }
        
        return alerts;
    }
    
    async processAlert(alert) {
        const alertKey = `${alert.type}_${alert.severity}`;
        const now = Date.now();
        
        // Rate limiting - don't send same alert more than once per hour
        const lastSent = this.alerts.get(alertKey);
        if (lastSent && (now - lastSent) < 60 * 60 * 1000) {
            return;
        }
        
        this.alerts.set(alertKey, now);
        
        // Send alert
        await this.sendAlert(alert);
        
        // Log alert
        console.error(`🚨 ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`);
    }
    
    async sendAlert(alert) {
        const subject = `[BLUNR ${alert.severity.toUpperCase()}] Referral System Alert`;
        const body = `
            <h2>🚨 Referral System Alert</h2>
            <p><strong>Type:</strong> ${alert.type}</p>
            <p><strong>Severity:</strong> ${alert.severity}</p>
            <p><strong>Message:</strong> ${alert.message}</p>
            <p><strong>Time:</strong> ${new Date().toISOString()}</p>
            
            <h3>Metrics:</h3>
            <pre>${JSON.stringify(alert.metrics, null, 2)}</pre>
            
            <hr>
            <p><em>This alert was generated by the Blunr Referral System monitoring.</em></p>
        `;
        
        try {
            await this.transporter.sendMail({
                from: this.config.alertFrom,
                to: this.config.alertTo,
                subject,
                html: body
            });
            
            console.log(`📧 Alert sent: ${alert.type}`);
        } catch (error) {
            console.error(`Failed to send alert: ${error.message}`);
        }
    }
    
    async gatherMetrics() {
        const ReferralMonitoring = (await import('./monitoring-middleware.js')).default;
        const DatabaseMonitor = (await import('./db-performance-monitor.js')).default;
        
        return {
            timestamp: new Date().toISOString(),
            api: ReferralMonitoring.getMetrics(),
            commissions: ReferralMonitoring.getCommissionMetrics(),
            database: DatabaseMonitor.getQueryMetrics(),
            memory: process.memoryUsage(),
            uptime: process.uptime()
        };
    }
}

export default AlertManager;
```

### 2. Health Check Endpoint
```javascript
// health-check.js
class HealthChecker {
    static async checkSystemHealth() {
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            checks: {}
        };
        
        try {
            // Database connectivity
            health.checks.database = await this.checkDatabase();
            
            // API responsiveness
            health.checks.api = await this.checkAPIHealth();
            
            // Commission processing
            health.checks.commissions = await this.checkCommissionHealth();
            
            // System resources
            health.checks.resources = await this.checkResourceHealth();
            
            // Determine overall status
            const hasError = Object.values(health.checks).some(check => check.status === 'error');
            const hasWarning = Object.values(health.checks).some(check => check.status === 'warning');
            
            if (hasError) {
                health.status = 'error';
            } else if (hasWarning) {
                health.status = 'warning';
            }
            
        } catch (error) {
            health.status = 'error';
            health.error = error.message;
        }
        
        return health;
    }
    
    static async checkDatabase() {
        try {
            const startTime = performance.now();
            await mongoose.connection.db.admin().ping();
            const responseTime = performance.now() - startTime;
            
            return {
                status: responseTime > 100 ? 'warning' : 'healthy',
                responseTime: `${responseTime.toFixed(2)}ms`,
                connected: mongoose.connection.readyState === 1
            };
        } catch (error) {
            return {
                status: 'error',
                error: error.message
            };
        }
    }
    
    static async checkAPIHealth() {
        const ReferralMonitoring = (await import('./monitoring-middleware.js')).default;
        const metrics = ReferralMonitoring.getMetrics();
        
        // Check if any endpoint has high error rate or response time
        let status = 'healthy';
        let issues = [];
        
        for (const [endpoint, stats] of Object.entries(metrics)) {
            if (stats.errors / stats.requests > 0.05) { // > 5% error rate
                status = 'warning';
                issues.push(`High error rate on ${endpoint}: ${((stats.errors / stats.requests) * 100).toFixed(2)}%`);
            }
            
            if (stats.p95 > 1000) { // > 1 second P95
                status = 'warning';
                issues.push(`Slow response on ${endpoint}: ${stats.p95.toFixed(2)}ms (P95)`);
            }
        }
        
        return {
            status,
            issues,
            totalEndpoints: Object.keys(metrics).length
        };
    }
    
    static async checkCommissionHealth() {
        const Commission = (await import('../modules/referrals/commission.model.js')).default;
        
        try {
            const [pendingCount, failedCount, recentProcessed] = await Promise.all([
                Commission.countDocuments({ status: 'pending' }),
                Commission.countDocuments({ 
                    status: 'failed',
                    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24h
                }),
                Commission.countDocuments({
                    status: 'paid',
                    paidAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) } // Last hour
                })
            ]);
            
            let status = 'healthy';
            let issues = [];
            
            if (pendingCount > 1000) {
                status = 'warning';
                issues.push(`High pending commission count: ${pendingCount}`);
            }
            
            if (failedCount > 50) {
                status = 'error';
                issues.push(`High failed commission count in last 24h: ${failedCount}`);
            }
            
            return {
                status,
                pendingCommissions: pendingCount,
                recentFailures: failedCount,
                recentlyProcessed: recentProcessed,
                issues
            };
        } catch (error) {
            return {
                status: 'error',
                error: error.message
            };
        }
    }
    
    static async checkResourceHealth() {
        const memUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();
        
        // Memory check
        const memUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
        
        let status = 'healthy';
        let issues = [];
        
        if (memUsagePercent > 85) {
            status = 'error';
            issues.push(`High memory usage: ${memUsagePercent.toFixed(2)}%`);
        } else if (memUsagePercent > 70) {
            status = 'warning';
            issues.push(`Elevated memory usage: ${memUsagePercent.toFixed(2)}%`);
        }
        
        return {
            status,
            memory: {
                used: Math.round(memUsage.heapUsed / 1024 / 1024),
                total: Math.round(memUsage.heapTotal / 1024 / 1024),
                percentage: memUsagePercent.toFixed(2)
            },
            uptime: process.uptime(),
            issues
        };
    }
}

export default HealthChecker;
```

## Performance Optimization Strategies

### 1. Database Optimization

#### Index Optimization Script
```javascript
// optimize-indexes.js
async function optimizeReferralIndexes() {
    const collections = ['users', 'referrals', 'commissions'];
    
    for (const collectionName of collections) {
        console.log(`Optimizing indexes for ${collectionName}...`);
        
        // Get index usage stats
        const stats = await db[collectionName].aggregate([
            { $indexStats: {} }
        ]).toArray();
        
        console.log(`Index usage for ${collectionName}:`, stats);
        
        // Find unused indexes
        const unusedIndexes = stats.filter(stat => stat.accesses.ops === 0);
        if (unusedIndexes.length > 0) {
            console.warn(`Found ${unusedIndexes.length} unused indexes in ${collectionName}:`, 
                        unusedIndexes.map(idx => idx.name));
        }
    }
    
    // Analyze query patterns
    const slowQueries = await db.system.profile.find({
        ts: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24h
        millis: { $gte: 100 } // Queries taking > 100ms
    }).sort({ ts: -1 }).limit(50).toArray();
    
    console.log(`Found ${slowQueries.length} slow queries in last 24 hours`);
    slowQueries.forEach(query => {
        console.log(`- ${query.command.find || query.command.aggregate}: ${query.millis}ms`);
    });
}
```

#### Query Caching Strategy
```javascript
// cache-manager.js
import Redis from 'redis';

class CacheManager {
    constructor() {
        this.redis = Redis.createClient(process.env.REDIS_URL);
        this.defaultTTL = 300; // 5 minutes
    }
    
    async get(key) {
        try {
            const cached = await this.redis.get(key);
            return cached ? JSON.parse(cached) : null;
        } catch (error) {
            console.error('Cache get error:', error);
            return null;
        }
    }
    
    async set(key, data, ttl = this.defaultTTL) {
        try {
            await this.redis.setex(key, ttl, JSON.stringify(data));
        } catch (error) {
            console.error('Cache set error:', error);
        }
    }
    
    // Cache wrapper for referral dashboard
    async getCachedDashboard(userId) {
        const cacheKey = `referral:dashboard:${userId}`;
        let dashboard = await this.get(cacheKey);
        
        if (!dashboard) {
            dashboard = await this.generateDashboard(userId);
            await this.set(cacheKey, dashboard, 180); // 3 minutes
        }
        
        return dashboard;
    }
    
    // Cache wrapper for commission history
    async getCachedCommissions(userId, page, limit) {
        const cacheKey = `referral:commissions:${userId}:${page}:${limit}`;
        let commissions = await this.get(cacheKey);
        
        if (!commissions) {
            commissions = await this.generateCommissions(userId, page, limit);
            await this.set(cacheKey, commissions, 120); // 2 minutes
        }
        
        return commissions;
    }
    
    // Invalidate cache when commissions are updated
    async invalidateUserCache(userId) {
        const pattern = `referral:*:${userId}*`;
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
            await this.redis.del(...keys);
        }
    }
}

export default CacheManager;
```

### 2. API Response Optimization

#### Response Compression and Pagination
```javascript
// optimized-referral.controller.js
import CacheManager from './cache-manager.js';

class OptimizedReferralController extends ReferralController {
    static cache = new CacheManager();
    
    static async getReferralDashboard(req, res) {
        const startTime = performance.now();
        
        try {
            const userId = req.user.id;
            const { startDate, endDate } = req.query;
            
            // Use cache for recent requests
            let dashboard;
            if (!startDate && !endDate) {
                dashboard = await this.cache.getCachedDashboard(userId);
            } else {
                dashboard = await ReferralService.getReferralAnalytics(userId, {
                    startDate,
                    endDate
                });
            }
            
            const endTime = performance.now();
            
            res.set('X-Response-Time', `${(endTime - startTime).toFixed(2)}ms`);
            res.json({
                success: true,
                data: dashboard,
                cached: !startDate && !endDate
            });
            
        } catch (error) {
            const endTime = performance.now();
            console.error(`Dashboard error (${(endTime - startTime).toFixed(2)}ms):`, error);
            res.status(500).json({
                success: false,
                message: 'Failed to get referral dashboard',
                error: error.message
            });
        }
    }
    
    static async getCommissionHistory(req, res) {
        try {
            const userId = req.user.id;
            const { 
                page = 1, 
                limit = 20, 
                status, 
                tier, 
                type,
                useCache = true 
            } = req.query;
            
            // Validate pagination
            const pageNum = Math.max(1, parseInt(page));
            const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
            
            let commissions;
            if (useCache === 'true' && !status && !tier && !type && pageNum === 1) {
                commissions = await this.cache.getCachedCommissions(userId, pageNum, limitNum);
            } else {
                const query = { recipient: userId };
                if (status) query.status = status;
                if (tier) query.tier = parseInt(tier);
                if (type) query.transactionType = type;
                
                const options = {
                    page: pageNum,
                    limit: limitNum,
                    sort: { createdAt: -1 },
                    populate: [
                        { path: 'earningUser', select: 'username avatar' },
                        { path: 'sourceTransaction', select: 'type amount currency createdAt' }
                    ]
                };
                
                commissions = await Commission.paginate(query, options);
            }
            
            res.json({
                success: true,
                data: commissions
            });
            
        } catch (error) {
            console.error('Commission history error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get commission history',
                error: error.message
            });
        }
    }
}
```

## Monitoring Dashboard Setup

### 1. Prometheus Integration
```javascript
// prometheus-metrics.js
import client from 'prom-client';

class PrometheusMetrics {
    constructor() {
        // Create metric instances
        this.httpRequestDuration = new client.Histogram({
            name: 'http_request_duration_ms',
            help: 'Duration of HTTP requests in ms',
            labelNames: ['method', 'route', 'status_code']
        });
        
        this.httpRequestsTotal = new client.Counter({
            name: 'http_requests_total',
            help: 'Total number of HTTP requests',
            labelNames: ['method', 'route', 'status_code']
        });
        
        this.commissionProcessingDuration = new client.Histogram({
            name: 'commission_processing_duration_ms',
            help: 'Duration of commission processing in ms',
            buckets: [1, 5, 15, 50, 100, 500, 1000, 5000]
        });
        
        this.commissionsProcessedTotal = new client.Counter({
            name: 'commissions_processed_total',
            help: 'Total number of commissions processed',
            labelNames: ['status', 'tier']
        });
        
        this.activeReferrals = new client.Gauge({
            name: 'active_referrals_total',
            help: 'Total number of active referrals'
        });
        
        this.pendingCommissions = new client.Gauge({
            name: 'pending_commissions_total',
            help: 'Total number of pending commissions'
        });
        
        // Collect default metrics (memory, CPU, etc.)
        client.collectDefaultMetrics();
    }
    
    recordHttpRequest(method, route, statusCode, duration) {
        this.httpRequestDuration.observe({ method, route, status_code: statusCode }, duration);
        this.httpRequestsTotal.inc({ method, route, status_code: statusCode });
    }
    
    recordCommissionProcessing(duration, status, tier) {
        this.commissionProcessingDuration.observe(duration);
        this.commissionsProcessedTotal.inc({ status, tier });
    }
    
    updateBusinessMetrics(activeReferralsCount, pendingCommissionsCount) {
        this.activeReferrals.set(activeReferralsCount);
        this.pendingCommissions.set(pendingCommissionsCount);
    }
    
    getMetrics() {
        return client.register.metrics();
    }
}

const prometheusMetrics = new PrometheusMetrics();

// Middleware to record HTTP metrics
export const prometheusMiddleware = (req, res, next) => {
    const startTime = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        const route = req.route?.path || req.path;
        prometheusMetrics.recordHttpRequest(req.method, route, res.statusCode, duration);
    });
    
    next();
};

export default prometheusMetrics;
```

### 2. Grafana Dashboard Configuration
```json
{
  "dashboard": {
    "title": "Blunr Referral System Monitoring",
    "panels": [
      {
        "title": "API Response Times",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, sum(rate(http_request_duration_ms_bucket{job=\"blunr-api\"}[5m])) by (le, route))",
            "legendFormat": "{{route}} (P95)"
          }
        ]
      },
      {
        "title": "Commission Processing Performance",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, sum(rate(commission_processing_duration_ms_bucket[5m])) by (le))",
            "legendFormat": "Commission Processing (P95)"
          }
        ]
      },
      {
        "title": "Active Referrals",
        "type": "stat",
        "targets": [
          {
            "expr": "active_referrals_total",
            "legendFormat": "Active Referrals"
          }
        ]
      },
      {
        "title": "Pending Commissions",
        "type": "stat",
        "targets": [
          {
            "expr": "pending_commissions_total",
            "legendFormat": "Pending Commissions"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{status_code=~\"4..|5..\"}[5m]) / rate(http_requests_total[5m]) * 100",
            "legendFormat": "Error Rate %"
          }
        ]
      }
    ]
  }
}
```

## Automated Performance Reports

### Daily Performance Report Generator
```javascript
// daily-report.js
class DailyPerformanceReport {
    static async generateReport() {
        const endDate = new Date();
        const startDate = new Date(endDate - 24 * 60 * 60 * 1000); // 24 hours ago
        
        const report = {
            date: endDate.toISOString().split('T')[0],
            period: `${startDate.toISOString()} to ${endDate.toISOString()}`,
            metrics: {}
        };
        
        // API Performance
        const ReferralMonitoring = (await import('./monitoring-middleware.js')).default;
        const apiMetrics = ReferralMonitoring.getMetrics();
        
        report.metrics.api = {
            totalEndpoints: Object.keys(apiMetrics).length,
            averageResponseTime: this.calculateOverallAverage(apiMetrics, 'avgResponseTime'),
            highestP95: this.findHighest(apiMetrics, 'p95'),
            totalRequests: this.sumField(apiMetrics, 'requests'),
            totalErrors: this.sumField(apiMetrics, 'errors')
        };
        
        // Commission Performance
        const commissionMetrics = ReferralMonitoring.getCommissionMetrics();
        if (commissionMetrics) {
            report.metrics.commissions = {
                totalProcessed: commissionMetrics.totalProcessed,
                successRate: commissionMetrics.successRate,
                averageProcessingTime: commissionMetrics.avgProcessingTime,
                p95ProcessingTime: commissionMetrics.p95
            };
        }
        
        // Database Performance
        const DatabaseMonitor = (await import('./db-performance-monitor.js')).default;
        const dbMetrics = DatabaseMonitor.getQueryMetrics();
        const slowQueries = DatabaseMonitor.getSlowQueries(10);
        
        report.metrics.database = {
            totalQueries: Object.keys(dbMetrics).length,
            averageQueryTime: this.calculateOverallAverage(dbMetrics, 'avgTime'),
            slowestQuery: this.findSlowestQuery(dbMetrics),
            slowQueries: slowQueries.length
        };
        
        // Business Metrics
        const businessMetrics = await this.getBusinessMetrics(startDate, endDate);
        report.metrics.business = businessMetrics;
        
        // Generate recommendations
        report.recommendations = this.generateRecommendations(report.metrics);
        
        // Send report
        await this.sendReport(report);
        
        return report;
    }
    
    static async getBusinessMetrics(startDate, endDate) {
        const Commission = (await import('../modules/referrals/commission.model.js')).default;
        const Referral = (await import('../modules/referrals/referral.model.js')).default;
        
        const [
            commissionsCreated,
            commissionsPaid,
            totalCommissionValue,
            newReferrals
        ] = await Promise.all([
            Commission.countDocuments({
                createdAt: { $gte: startDate, $lte: endDate }
            }),
            Commission.countDocuments({
                status: 'paid',
                paidAt: { $gte: startDate, $lte: endDate }
            }),
            Commission.aggregate([
                { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
                { $group: { _id: null, total: { $sum: '$commissionAmount' } } }
            ]),
            Referral.countDocuments({
                createdAt: { $gte: startDate, $lte: endDate }
            })
        ]);
        
        return {
            commissionsCreated,
            commissionsPaid,
            totalCommissionValue: totalCommissionValue[0]?.total || 0,
            newReferrals,
            conversionRate: commissionsCreated > 0 ? (commissionsPaid / commissionsCreated) * 100 : 0
        };
    }
    
    static generateRecommendations(metrics) {
        const recommendations = [];
        
        // API Performance recommendations
        if (metrics.api.averageResponseTime > 500) {
            recommendations.push({
                category: 'performance',
                priority: 'high',
                message: 'API response times are elevated. Consider implementing caching or optimizing database queries.'
            });
        }
        
        if (metrics.api.totalErrors / metrics.api.totalRequests > 0.02) {
            recommendations.push({
                category: 'reliability',
                priority: 'high',
                message: 'Error rate is above 2%. Investigate error patterns and improve error handling.'
            });
        }
        
        // Commission Performance recommendations
        if (metrics.commissions?.successRate < 98) {
            recommendations.push({
                category: 'business',
                priority: 'critical',
                message: 'Commission processing success rate is below 98%. Review failure patterns and improve reliability.'
            });
        }
        
        // Database recommendations
        if (metrics.database.slowQueries > 20) {
            recommendations.push({
                category: 'database',
                priority: 'medium',
                message: 'High number of slow queries detected. Review query patterns and consider index optimization.'
            });
        }
        
        return recommendations;
    }
    
    static async sendReport(report) {
        // Email report to stakeholders
        const transporter = nodemailer.createTransporter({
            // SMTP configuration
        });
        
        const html = this.generateReportHTML(report);
        
        await transporter.sendMail({
            from: process.env.REPORT_FROM_EMAIL,
            to: process.env.REPORT_TO_EMAIL,
            subject: `Blunr Referral System - Daily Performance Report ${report.date}`,
            html
        });
        
        console.log(`📊 Daily report sent for ${report.date}`);
    }
    
    static generateReportHTML(report) {
        return `
            <h1>🏆 Blunr Referral System - Daily Performance Report</h1>
            <p><strong>Date:</strong> ${report.date}</p>
            <p><strong>Period:</strong> ${report.period}</p>
            
            <h2>📈 API Performance</h2>
            <ul>
                <li>Total Requests: ${report.metrics.api.totalRequests}</li>
                <li>Total Errors: ${report.metrics.api.totalErrors}</li>
                <li>Average Response Time: ${report.metrics.api.averageResponseTime?.toFixed(2)}ms</li>
                <li>Highest P95: ${report.metrics.api.highestP95?.toFixed(2)}ms</li>
            </ul>
            
            <h2>💰 Commission Processing</h2>
            <ul>
                <li>Total Processed: ${report.metrics.commissions?.totalProcessed || 0}</li>
                <li>Success Rate: ${report.metrics.commissions?.successRate?.toFixed(2) || 0}%</li>
                <li>Avg Processing Time: ${report.metrics.commissions?.averageProcessingTime?.toFixed(2) || 0}ms</li>
            </ul>
            
            <h2>🎯 Business Metrics</h2>
            <ul>
                <li>New Referrals: ${report.metrics.business.newReferrals}</li>
                <li>Commissions Created: ${report.metrics.business.commissionsCreated}</li>
                <li>Commissions Paid: ${report.metrics.business.commissionsPaid}</li>
                <li>Total Commission Value: $${report.metrics.business.totalCommissionValue.toFixed(2)}</li>
                <li>Conversion Rate: ${report.metrics.business.conversionRate.toFixed(2)}%</li>
            </ul>
            
            ${report.recommendations.length > 0 ? `
                <h2>⚠️ Recommendations</h2>
                <ul>
                    ${report.recommendations.map(rec => 
                        `<li><strong>[${rec.priority.toUpperCase()}]</strong> ${rec.message}</li>`
                    ).join('')}
                </ul>
            ` : '<h2>✅ No Issues Found</h2>'}
        `;
    }
    
    // Helper methods
    static calculateOverallAverage(metrics, field) {
        const values = Object.values(metrics).map(m => m[field]).filter(v => v != null);
        return values.length > 0 ? values.reduce((a, b) => a + b) / values.length : 0;
    }
    
    static findHighest(metrics, field) {
        const values = Object.values(metrics).map(m => m[field]).filter(v => v != null);
        return values.length > 0 ? Math.max(...values) : 0;
    }
    
    static sumField(metrics, field) {
        return Object.values(metrics).reduce((sum, m) => sum + (m[field] || 0), 0);
    }
    
    static findSlowestQuery(dbMetrics) {
        let slowest = null;
        let maxTime = 0;
        
        for (const [query, stats] of Object.entries(dbMetrics)) {
            if (stats.p99 > maxTime) {
                maxTime = stats.p99;
                slowest = { query, time: maxTime };
            }
        }
        
        return slowest;
    }
}

// Schedule daily reports
import cron from 'node-cron';

cron.schedule('0 6 * * *', async () => { // Run at 6 AM daily
    try {
        await DailyPerformanceReport.generateReport();
    } catch (error) {
        console.error('Failed to generate daily report:', error);
    }
});

export default DailyPerformanceReport;
```

## Conclusion

This monitoring and performance guide provides a comprehensive framework for:

1. **Real-time Monitoring**: Track key metrics and system health
2. **Automated Alerting**: Get notified of issues before they impact users
3. **Performance Optimization**: Identify and resolve bottlenecks
4. **Business Intelligence**: Track referral program effectiveness
5. **Proactive Maintenance**: Prevent issues through monitoring

### Quick Start Checklist

- [ ] Implement monitoring middleware
- [ ] Set up database performance tracking
- [ ] Configure alerting system
- [ ] Create Prometheus/Grafana dashboards
- [ ] Schedule daily performance reports
- [ ] Set up log aggregation
- [ ] Configure automated backups
- [ ] Test alert notification system
- [ ] Optimize database indexes
- [ ] Implement caching strategy

### Key Metrics to Monitor Daily

1. **API Response Times** (P95 < 500ms)
2. **Error Rates** (< 1%)
3. **Commission Processing Success** (> 99%)
4. **Database Query Performance** (P95 < 100ms)
5. **Memory Usage** (< 70%)
6. **Active Referral Growth**
7. **Commission Payout Success Rate**

This monitoring system ensures your referral system operates at peak performance and provides early warning of potential issues.