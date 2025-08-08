#!/usr/bin/env node

/**
 * Blunr Referral System Test Suite
 * 
 * Comprehensive testing suite for the 2-tier referral system including:
 * - API endpoint testing
 * - Commission processing validation
 * - Performance benchmarking
 * - Data integrity checks
 * - Load testing scenarios
 * 
 * Usage: node referral-system-test-suite.js [options]
 * Options:
 *   --api-only     Run only API tests
 *   --performance  Run only performance tests
 *   --load-test    Run load testing
 *   --integration  Run integration tests
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { performance } from 'perf_hooks';
import axios from 'axios';
import crypto from 'crypto';

dotenv.config();

// Test configuration
const TEST_CONFIG = {
    apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:5000/api',
    mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/blunr',
    testUserToken: null,
    testAdminToken: null,
    loadTestConcurrency: 10,
    loadTestDuration: 30000, // 30 seconds
    performanceThresholds: {
        referralValidation: 100, // ms
        dashboardLoad: 500,      // ms
        commissionProcessing: 200 // ms
    }
};

// Test data
const TEST_DATA = {
    validReferralCodes: ['TEST1234', 'DEMO5678'],
    invalidReferralCodes: ['INVALID', '123'],
    testUsers: [
        { username: 'testuser1', email: 'test1@example.com' },
        { username: 'testuser2', email: 'test2@example.com' },
        { username: 'testuser3', email: 'test3@example.com' }
    ],
    testTransactions: [
        { type: 'subscription', amount: 50.00, currency: 'USD' },
        { type: 'tip', amount: 10.00, currency: 'USD' },
        { type: 'post_purchase', amount: 25.00, currency: 'USD' }
    ]
};

class ReferralSystemTestSuite {
    constructor() {
        this.results = {
            testsPassed: 0,
            testsFailed: 0,
            performanceMetrics: {},
            errors: [],
            startTime: null,
            endTime: null
        };
        
        this.testUsers = [];
        this.testReferralCodes = [];
    }

    // Utility methods
    log(message, level = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = {
            'info': 'ℹ️',
            'success': '✅',
            'error': '❌',
            'warning': '⚠️',
            'test': '🧪'
        }[level] || 'ℹ️';
        
        console.log(`${prefix} [${timestamp}] ${message}`);
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    generateTestId() {
        return crypto.randomBytes(4).toString('hex').toUpperCase();
    }

    async apiRequest(method, endpoint, data = null, token = null) {
        const config = {
            method,
            url: `${TEST_CONFIG.apiBaseUrl}${endpoint}`,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        if (data) {
            config.data = data;
        }

        try {
            const response = await axios(config);
            return { success: true, data: response.data, status: response.status };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data || error.message,
                status: error.response?.status || 500
            };
        }
    }

    async connectToDatabase() {
        try {
            await mongoose.connect(TEST_CONFIG.mongoUri);
            this.log('Connected to test database', 'success');
            return true;
        } catch (error) {
            this.log(`Database connection failed: ${error.message}`, 'error');
            return false;
        }
    }

    async disconnectFromDatabase() {
        await mongoose.connection.close();
        this.log('Disconnected from database');
    }

    // Test setup and teardown
    async setupTestData() {
        this.log('Setting up test data...', 'test');
        
        try {
            // Import models for direct database operations
            const User = mongoose.model('User');
            const Referral = mongoose.model('Referral');
            const Commission = mongoose.model('Commission');
            const Transaction = mongoose.model('Transaction');

            // Clean up existing test data
            await User.deleteMany({ email: { $regex: /test.*@example\.com/i } });
            await Referral.deleteMany({ code: { $regex: /^TEST|^DEMO/ } });

            // Create test users with referral chains
            for (let i = 0; i < TEST_DATA.testUsers.length; i++) {
                const userData = TEST_DATA.testUsers[i];
                const testUser = new User({
                    ...userData,
                    password: 'hashed_test_password',
                    isVerified: true,
                    role: i === 0 ? 'admin' : 'user'
                });

                await testUser.save();
                this.testUsers.push(testUser);

                // Create referral record
                const referralCode = `TEST${this.generateTestId()}`;
                const referral = new Referral({
                    code: referralCode,
                    codeOwner: testUser._id,
                    tier1Referrer: i > 0 ? this.testUsers[i - 1]._id : null,
                    tier2Referrer: i > 1 ? this.testUsers[i - 2]._id : null,
                    source: 'test'
                });

                await referral.save();
                this.testReferralCodes.push(referralCode);

                // Update user with referral data
                testUser.referralData = {
                    referralCode: referralCode,
                    referredBy: i > 0 ? this.testUsers[i - 1]._id : null,
                    referralChain: {
                        tier1Referrer: i > 0 ? this.testUsers[i - 1]._id : null,
                        tier2Referrer: i > 1 ? this.testUsers[i - 2]._id : null
                    },
                    referralStats: {
                        totalReferrals: 0,
                        activeReferrals: 0,
                        totalCommissionsEarned: 0,
                        pendingCommissions: 0
                    },
                    referralSource: 'test'
                };

                await testUser.save();
            }

            this.log(`Created ${this.testUsers.length} test users`, 'success');
            return true;

        } catch (error) {
            this.log(`Failed to setup test data: ${error.message}`, 'error');
            return false;
        }
    }

    async cleanupTestData() {
        this.log('Cleaning up test data...');
        
        try {
            const User = mongoose.model('User');
            const Referral = mongoose.model('Referral');
            const Commission = mongoose.model('Commission');
            const Transaction = mongoose.model('Transaction');

            // Clean up test data
            const userIds = this.testUsers.map(u => u._id);
            
            await Commission.deleteMany({ recipient: { $in: userIds } });
            await Transaction.deleteMany({ user: { $in: userIds } });
            await Referral.deleteMany({ codeOwner: { $in: userIds } });
            await User.deleteMany({ _id: { $in: userIds } });

            this.log('Test data cleaned up', 'success');
        } catch (error) {
            this.log(`Failed to cleanup test data: ${error.message}`, 'error');
        }
    }

    // API Tests
    async testPublicEndpoints() {
        this.log('Testing public endpoints...', 'test');
        
        const tests = [
            {
                name: 'Validate valid referral code',
                request: () => this.apiRequest('POST', '/referrals/validate', {
                    referralCode: this.testReferralCodes[0]
                }),
                validator: (response) => response.success && response.data.success && response.data.data.valid
            },
            {
                name: 'Validate invalid referral code',
                request: () => this.apiRequest('POST', '/referrals/validate', {
                    referralCode: 'INVALID123'
                }),
                validator: (response) => response.success && !response.data.data.valid
            },
            {
                name: 'Get referral leaderboard',
                request: () => this.apiRequest('GET', '/referrals/leaderboard?limit=10'),
                validator: (response) => response.success && Array.isArray(response.data.data)
            }
        ];

        for (const test of tests) {
            await this.runSingleTest(test);
        }
    }

    async testProtectedEndpoints() {
        this.log('Testing protected endpoints...', 'test');
        
        if (!TEST_CONFIG.testUserToken) {
            this.log('No test user token provided, skipping protected endpoint tests', 'warning');
            return;
        }

        const tests = [
            {
                name: 'Get referral dashboard',
                request: () => this.apiRequest('GET', '/referrals/dashboard', null, TEST_CONFIG.testUserToken),
                validator: (response) => response.success && response.data.data.referralCode
            },
            {
                name: 'Get my referral code',
                request: () => this.apiRequest('GET', '/referrals/my-code', null, TEST_CONFIG.testUserToken),
                validator: (response) => response.success && response.data.data.referralCode
            },
            {
                name: 'Get commission history',
                request: () => this.apiRequest('GET', '/referrals/commissions?page=1&limit=10', null, TEST_CONFIG.testUserToken),
                validator: (response) => response.success && Array.isArray(response.data.data.docs)
            },
            {
                name: 'Calculate commission preview',
                request: () => this.apiRequest('POST', '/referrals/calculate-commission', {
                    recipientId: this.testUsers[1]._id.toString(),
                    amount: 100.00
                }, TEST_CONFIG.testUserToken),
                validator: (response) => response.success && typeof response.data.data.totalCommissions === 'number'
            }
        ];

        for (const test of tests) {
            await this.runSingleTest(test);
        }
    }

    async testAdminEndpoints() {
        this.log('Testing admin endpoints...', 'test');
        
        if (!TEST_CONFIG.testAdminToken) {
            this.log('No admin token provided, skipping admin endpoint tests', 'warning');
            return;
        }

        const tests = [
            {
                name: 'Get commission analytics',
                request: () => this.apiRequest('GET', '/referrals/analytics', null, TEST_CONFIG.testAdminToken),
                validator: (response) => response.success && response.data.data.summary
            },
            {
                name: 'Get admin stats',
                request: () => this.apiRequest('GET', '/referrals/admin/stats', null, TEST_CONFIG.testAdminToken),
                validator: (response) => response.success && response.data.data.overview
            }
        ];

        for (const test of tests) {
            await this.runSingleTest(test);
        }
    }

    // Performance Tests
    async testPerformance() {
        this.log('Running performance tests...', 'test');
        
        const performanceTests = [
            {
                name: 'Referral code validation performance',
                test: async () => {
                    const iterations = 100;
                    const startTime = performance.now();
                    
                    for (let i = 0; i < iterations; i++) {
                        await this.apiRequest('POST', '/referrals/validate', {
                            referralCode: this.testReferralCodes[0]
                        });
                    }
                    
                    const endTime = performance.now();
                    const avgTime = (endTime - startTime) / iterations;
                    
                    this.results.performanceMetrics.referralValidation = avgTime;
                    return {
                        passed: avgTime < TEST_CONFIG.performanceThresholds.referralValidation,
                        metric: `${avgTime.toFixed(2)}ms avg`
                    };
                }
            },
            {
                name: 'Dashboard load performance',
                test: async () => {
                    if (!TEST_CONFIG.testUserToken) return { passed: false, metric: 'No token' };
                    
                    const iterations = 50;
                    const startTime = performance.now();
                    
                    for (let i = 0; i < iterations; i++) {
                        await this.apiRequest('GET', '/referrals/dashboard', null, TEST_CONFIG.testUserToken);
                    }
                    
                    const endTime = performance.now();
                    const avgTime = (endTime - startTime) / iterations;
                    
                    this.results.performanceMetrics.dashboardLoad = avgTime;
                    return {
                        passed: avgTime < TEST_CONFIG.performanceThresholds.dashboardLoad,
                        metric: `${avgTime.toFixed(2)}ms avg`
                    };
                }
            }
        ];

        for (const test of performanceTests) {
            const startTime = performance.now();
            try {
                const result = await test.test();
                const endTime = performance.now();
                
                if (result.passed) {
                    this.log(`✅ ${test.name}: ${result.metric}`, 'success');
                    this.results.testsPassed++;
                } else {
                    this.log(`❌ ${test.name}: ${result.metric} (threshold exceeded)`, 'error');
                    this.results.testsFailed++;
                }
            } catch (error) {
                this.log(`❌ ${test.name}: ${error.message}`, 'error');
                this.results.testsFailed++;
                this.results.errors.push({ test: test.name, error: error.message });
            }
        }
    }

    // Integration Tests
    async testCommissionProcessing() {
        this.log('Testing commission processing...', 'test');
        
        try {
            const Transaction = mongoose.model('Transaction');
            const Commission = mongoose.model('Commission');
            
            // Import the ReferralService
            const ReferralService = (await import('./Blunr-backend/src/modules/referrals/referral.service.js')).default;
            
            // Create a test transaction for a user with referrers
            const testTransaction = new Transaction({
                user: this.testUsers[2]._id,
                recipient: this.testUsers[2]._id,
                type: 'subscription',
                amount: 100.00,
                currency: 'USD',
                status: 'completed'
            });
            
            await testTransaction.save();
            
            // Process commissions
            const startTime = performance.now();
            const result = await ReferralService.processCommissions(testTransaction);
            const endTime = performance.now();
            
            const processingTime = endTime - startTime;
            this.results.performanceMetrics.commissionProcessing = processingTime;
            
            if (result.processed) {
                this.log(`✅ Commission processing: ${processingTime.toFixed(2)}ms`, 'success');
                this.log(`  Tier 1 Commission: $${result.tier1Amount}`, 'info');
                this.log(`  Tier 2 Commission: $${result.tier2Amount}`, 'info');
                
                // Verify commission records were created
                const commissions = await Commission.find({
                    sourceTransaction: testTransaction._id
                });
                
                if (commissions.length > 0) {
                    this.log(`✅ ${commissions.length} commission records created`, 'success');
                    this.results.testsPassed++;
                } else {
                    this.log(`❌ No commission records created`, 'error');
                    this.results.testsFailed++;
                }
            } else {
                this.log(`❌ Commission processing failed: ${result.reason}`, 'error');
                this.results.testsFailed++;
            }
            
        } catch (error) {
            this.log(`❌ Commission processing test failed: ${error.message}`, 'error');
            this.results.testsFailed++;
            this.results.errors.push({ test: 'Commission Processing', error: error.message });
        }
    }

    async testReferralChainIntegrity() {
        this.log('Testing referral chain integrity...', 'test');
        
        try {
            const User = mongoose.model('User');
            const Referral = mongoose.model('Referral');
            
            // Verify referral chain for test users
            for (let i = 1; i < this.testUsers.length; i++) {
                const user = await User.findById(this.testUsers[i]._id);
                const referral = await Referral.findOne({ codeOwner: user._id });
                
                // Check referral chain consistency
                const expectedTier1 = i > 0 ? this.testUsers[i - 1]._id : null;
                const expectedTier2 = i > 1 ? this.testUsers[i - 2]._id : null;
                
                const tier1Match = (referral.tier1Referrer?.toString() === expectedTier1?.toString()) ||
                                 (!referral.tier1Referrer && !expectedTier1);
                const tier2Match = (referral.tier2Referrer?.toString() === expectedTier2?.toString()) ||
                                 (!referral.tier2Referrer && !expectedTier2);
                
                if (tier1Match && tier2Match) {
                    this.log(`✅ User ${user.username} referral chain correct`, 'success');
                    this.results.testsPassed++;
                } else {
                    this.log(`❌ User ${user.username} referral chain incorrect`, 'error');
                    this.results.testsFailed++;
                }
            }
            
        } catch (error) {
            this.log(`❌ Referral chain integrity test failed: ${error.message}`, 'error');
            this.results.testsFailed++;
            this.results.errors.push({ test: 'Referral Chain Integrity', error: error.message });
        }
    }

    // Load Testing
    async runLoadTest() {
        this.log(`Starting load test with ${TEST_CONFIG.loadTestConcurrency} concurrent users...`, 'test');
        
        const startTime = Date.now();
        const endTime = startTime + TEST_CONFIG.loadTestDuration;
        
        const stats = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            responseTimes: []
        };
        
        // Create concurrent workers
        const workers = [];
        for (let i = 0; i < TEST_CONFIG.loadTestConcurrency; i++) {
            workers.push(this.loadTestWorker(endTime, stats));
        }
        
        // Wait for all workers to complete
        await Promise.all(workers);
        
        // Calculate statistics
        const avgResponseTime = stats.responseTimes.reduce((a, b) => a + b, 0) / stats.responseTimes.length;
        const successRate = (stats.successfulRequests / stats.totalRequests) * 100;
        const requestsPerSecond = stats.totalRequests / (TEST_CONFIG.loadTestDuration / 1000);
        
        this.log('📊 Load Test Results:', 'info');
        this.log(`  Total Requests: ${stats.totalRequests}`, 'info');
        this.log(`  Successful Requests: ${stats.successfulRequests}`, 'info');
        this.log(`  Failed Requests: ${stats.failedRequests}`, 'info');
        this.log(`  Success Rate: ${successRate.toFixed(2)}%`, 'info');
        this.log(`  Average Response Time: ${avgResponseTime.toFixed(2)}ms`, 'info');
        this.log(`  Requests per Second: ${requestsPerSecond.toFixed(2)}`, 'info');
        
        // Pass/fail criteria
        const passed = successRate > 95 && avgResponseTime < 1000;
        if (passed) {
            this.log('✅ Load test passed', 'success');
            this.results.testsPassed++;
        } else {
            this.log('❌ Load test failed', 'error');
            this.results.testsFailed++;
        }
        
        return passed;
    }

    async loadTestWorker(endTime, stats) {
        while (Date.now() < endTime) {
            const requestStart = performance.now();
            
            try {
                const response = await this.apiRequest('POST', '/referrals/validate', {
                    referralCode: this.testReferralCodes[Math.floor(Math.random() * this.testReferralCodes.length)]
                });
                
                const requestEnd = performance.now();
                const responseTime = requestEnd - requestStart;
                
                stats.totalRequests++;
                stats.responseTimes.push(responseTime);
                
                if (response.success) {
                    stats.successfulRequests++;
                } else {
                    stats.failedRequests++;
                }
                
            } catch (error) {
                stats.totalRequests++;
                stats.failedRequests++;
            }
            
            // Small delay to prevent overwhelming the server
            await this.delay(Math.random() * 100);
        }
    }

    // Helper method to run individual tests
    async runSingleTest(test) {
        try {
            const response = await test.request();
            
            if (test.validator(response)) {
                this.log(`✅ ${test.name}`, 'success');
                this.results.testsPassed++;
            } else {
                this.log(`❌ ${test.name}: Validation failed`, 'error');
                this.log(`   Response: ${JSON.stringify(response.data || response.error)}`, 'error');
                this.results.testsFailed++;
            }
        } catch (error) {
            this.log(`❌ ${test.name}: ${error.message}`, 'error');
            this.results.testsFailed++;
            this.results.errors.push({ test: test.name, error: error.message });
        }
    }

    // Main test runner
    async runTests(options = {}) {
        this.log('🚀 Starting Blunr Referral System Test Suite', 'info');
        this.results.startTime = performance.now();
        
        try {
            // Connect to database
            const connected = await this.connectToDatabase();
            if (!connected) {
                throw new Error('Failed to connect to database');
            }
            
            // Setup test data
            const setupSuccess = await this.setupTestData();
            if (!setupSuccess) {
                throw new Error('Failed to setup test data');
            }
            
            // Run different test suites based on options
            if (!options.apiOnly && !options.performance) {
                this.log('Running all test suites...', 'info');
                await this.testPublicEndpoints();
                await this.testProtectedEndpoints();
                await this.testAdminEndpoints();
                await this.testCommissionProcessing();
                await this.testReferralChainIntegrity();
                await this.testPerformance();
                
                if (options.loadTest) {
                    await this.runLoadTest();
                }
            } else {
                if (options.apiOnly) {
                    await this.testPublicEndpoints();
                    await this.testProtectedEndpoints();
                    await this.testAdminEndpoints();
                }
                
                if (options.performance) {
                    await this.testPerformance();
                    
                    if (options.loadTest) {
                        await this.runLoadTest();
                    }
                }
                
                if (options.integration) {
                    await this.testCommissionProcessing();
                    await this.testReferralChainIntegrity();
                }
            }
            
        } catch (error) {
            this.log(`Test suite failed: ${error.message}`, 'error');
            this.results.testsFailed++;
        } finally {
            // Cleanup
            await this.cleanupTestData();
            await this.disconnectFromDatabase();
            
            this.results.endTime = performance.now();
            this.generateTestReport();
        }
    }

    generateTestReport() {
        const totalTime = (this.results.endTime - this.results.startTime) / 1000;
        const totalTests = this.results.testsPassed + this.results.testsFailed;
        const successRate = totalTests > 0 ? (this.results.testsPassed / totalTests) * 100 : 0;
        
        console.log('\n' + '='.repeat(60));
        console.log('📊 TEST SUITE REPORT');
        console.log('='.repeat(60));
        console.log(`Total execution time: ${totalTime.toFixed(2)} seconds`);
        console.log(`Tests passed: ${this.results.testsPassed}`);
        console.log(`Tests failed: ${this.results.testsFailed}`);
        console.log(`Success rate: ${successRate.toFixed(2)}%`);
        
        if (Object.keys(this.results.performanceMetrics).length > 0) {
            console.log('\n📈 Performance Metrics:');
            for (const [metric, value] of Object.entries(this.results.performanceMetrics)) {
                console.log(`  ${metric}: ${value.toFixed(2)}ms`);
            }
        }
        
        if (this.results.errors.length > 0) {
            console.log('\n❌ Errors:');
            this.results.errors.forEach((error, index) => {
                console.log(`  ${index + 1}. ${error.test}: ${error.error}`);
            });
        }
        
        console.log('\n' + (successRate === 100 ? '✅' : '❌') + ' Test suite completed');
        console.log('='.repeat(60));
    }
}

// CLI interface
const args = process.argv.slice(2);
const options = {
    apiOnly: args.includes('--api-only'),
    performance: args.includes('--performance'),
    loadTest: args.includes('--load-test'),
    integration: args.includes('--integration')
};

// Get tokens from environment or command line
TEST_CONFIG.testUserToken = process.env.TEST_USER_TOKEN || null;
TEST_CONFIG.testAdminToken = process.env.TEST_ADMIN_TOKEN || null;

async function main() {
    const testSuite = new ReferralSystemTestSuite();
    await testSuite.runTests(options);
    
    // Exit with error code if tests failed
    process.exit(testSuite.results.testsFailed > 0 ? 1 : 0);
}

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n⏹️  Test suite interrupted by user');
    process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch((error) => {
        console.error('💥 Test suite failed:', error);
        process.exit(1);
    });
}