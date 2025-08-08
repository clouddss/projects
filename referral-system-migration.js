#!/usr/bin/env node

/**
 * Blunr Referral System Migration Script
 * 
 * This script migrates existing users to the 2-tier referral system by:
 * 1. Adding referral data to existing User documents
 * 2. Creating Referral records for all users
 * 3. Creating necessary database indexes
 * 4. Validating data integrity
 * 
 * Usage: node referral-system-migration.js
 * 
 * Environment variables required:
 * - MONGO_URI: MongoDB connection string
 * - NODE_ENV: Environment (development/production)
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { performance } from 'perf_hooks';

// Load environment variables
dotenv.config();

// Import models (adjust paths as needed for your project)
const UserSchema = new mongoose.Schema({
    username: String,
    email: String,
    // ... existing user fields
    
    // New referral fields
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
}, { timestamps: true });

const ReferralSchema = new mongoose.Schema({
    code: { 
        type: String, 
        unique: true, 
        required: true,
        uppercase: true,
        minlength: 6,
        maxlength: 12
    },
    codeOwner: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true,
        index: true
    },
    directReferrals: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    }],
    tier1Referrer: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        default: null,
        index: true
    },
    tier2Referrer: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        default: null,
        index: true
    },
    stats: {
        totalReferrals: { type: Number, default: 0 },
        activeReferrals: { type: Number, default: 0 },
        totalCommissionEarned: { type: Number, default: 0 },
        tier1CommissionEarned: { type: Number, default: 0 },
        tier2CommissionEarned: { type: Number, default: 0 },
        lastActivity: { type: Date, default: Date.now }
    },
    isActive: { type: Boolean, default: true },
    expiresAt: { type: Date, default: null },
    source: { 
        type: String, 
        enum: ['organic', 'campaign', 'influencer', 'partner'],
        default: 'organic'
    },
    campaign: { type: String, default: null }
}, { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Add indexes
UserSchema.index({ 'referralData.referralCode': 1 });
UserSchema.index({ 'referralData.referredBy': 1 });
UserSchema.index({ 'referralData.referralChain.tier1Referrer': 1 });
UserSchema.index({ 'referralData.referralChain.tier2Referrer': 1 });

ReferralSchema.index({ codeOwner: 1, isActive: 1 });
ReferralSchema.index({ code: 1, isActive: 1 });
ReferralSchema.index({ tier1Referrer: 1, tier2Referrer: 1 });
ReferralSchema.index({ 'stats.lastActivity': -1 });
ReferralSchema.index({ 'stats.totalCommissionEarned': -1 });

const User = mongoose.model('User', UserSchema);
const Referral = mongoose.model('Referral', ReferralSchema);

// Generate unique referral code
const generateReferralCode = async (baseString = '') => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const codeLength = 8;
    
    let code;
    let isUnique = false;
    let attempts = 0;
    
    while (!isUnique && attempts < 10) {
        if (baseString && attempts === 0) {
            // Try to create code from username/email first
            code = baseString.substring(0, 4).toUpperCase() + 
                   Math.random().toString(36).substring(2, 6).toUpperCase();
        } else {
            // Generate random code
            code = '';
            for (let i = 0; i < codeLength; i++) {
                code += characters.charAt(Math.floor(Math.random() * characters.length));
            }
        }
        
        const existing = await Referral.findOne({ code });
        if (!existing) {
            isUnique = true;
        }
        attempts++;
    }
    
    return code;
};

// Migration functions
class ReferralMigration {
    constructor() {
        this.results = {
            usersProcessed: 0,
            usersSkipped: 0,
            referralRecordsCreated: 0,
            errors: [],
            startTime: null,
            endTime: null
        };
    }

    async connect() {
        try {
            const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/blunr';
            
            console.log('🔗 Connecting to MongoDB...');
            await mongoose.connect(mongoUri);
            console.log('✅ Connected to MongoDB successfully');
            
            return true;
        } catch (error) {
            console.error('❌ MongoDB connection failed:', error.message);
            return false;
        }
    }

    async disconnect() {
        await mongoose.connection.close();
        console.log('🔌 Disconnected from MongoDB');
    }

    async createIndexes() {
        try {
            console.log('📇 Creating database indexes...');
            
            // User collection indexes
            await User.collection.createIndex({ 'referralData.referralCode': 1 });
            await User.collection.createIndex({ 'referralData.referredBy': 1 });
            await User.collection.createIndex({ 'referralData.referralChain.tier1Referrer': 1 });
            await User.collection.createIndex({ 'referralData.referralChain.tier2Referrer': 1 });
            
            // Referral collection indexes
            await Referral.collection.createIndex({ codeOwner: 1, isActive: 1 });
            await Referral.collection.createIndex({ code: 1, isActive: 1 });
            await Referral.collection.createIndex({ tier1Referrer: 1, tier2Referrer: 1 });
            await Referral.collection.createIndex({ 'stats.lastActivity': -1 });
            await Referral.collection.createIndex({ 'stats.totalCommissionEarned': -1 });
            
            console.log('✅ Database indexes created successfully');
        } catch (error) {
            console.error('❌ Error creating indexes:', error.message);
            throw error;
        }
    }

    async checkExistingMigration() {
        console.log('🔍 Checking for existing migration...');
        
        const usersWithReferralData = await User.countDocuments({
            'referralData.referralCode': { $exists: true, $ne: null }
        });
        
        const referralRecords = await Referral.countDocuments({});
        
        console.log(`Found ${usersWithReferralData} users with referral data`);
        console.log(`Found ${referralRecords} referral records`);
        
        if (usersWithReferralData > 0 || referralRecords > 0) {
            const response = await this.promptUser(
                `⚠️  Existing referral data found. Continue migration? This may create duplicates. (y/N): `
            );
            
            if (response.toLowerCase() !== 'y' && response.toLowerCase() !== 'yes') {
                console.log('Migration cancelled by user');
                return false;
            }
        }
        
        return true;
    }

    async promptUser(question) {
        const readline = await import('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        return new Promise((resolve) => {
            rl.question(question, (answer) => {
                rl.close();
                resolve(answer);
            });
        });
    }

    async migrateUsers() {
        console.log('👥 Starting user migration...');
        
        const batchSize = 100;
        let skip = 0;
        let hasMore = true;

        while (hasMore) {
            const users = await User.find({
                $or: [
                    { 'referralData.referralCode': { $exists: false } },
                    { 'referralData.referralCode': null }
                ]
            })
            .skip(skip)
            .limit(batchSize)
            .lean();

            if (users.length === 0) {
                hasMore = false;
                continue;
            }

            console.log(`Processing batch: ${skip + 1} to ${skip + users.length}`);

            for (const user of users) {
                try {
                    await this.migrateUser(user);
                    this.results.usersProcessed++;
                } catch (error) {
                    this.results.errors.push({
                        userId: user._id,
                        username: user.username,
                        error: error.message
                    });
                    this.results.usersSkipped++;
                    console.error(`❌ Failed to migrate user ${user.username}:`, error.message);
                }
            }

            skip += batchSize;

            // Progress update
            if (skip % 500 === 0) {
                console.log(`📊 Progress: ${this.results.usersProcessed} users processed, ${this.results.usersSkipped} skipped`);
            }
        }

        console.log('✅ User migration completed');
    }

    async migrateUser(user) {
        // Generate referral code
        const baseString = user.username || user.email?.split('@')[0] || '';
        const referralCode = await generateReferralCode(baseString);
        
        // Create referral record first
        const referralRecord = new Referral({
            code: referralCode,
            codeOwner: user._id,
            source: 'organic',
            tier1Referrer: null,
            tier2Referrer: null,
            directReferrals: [],
            stats: {
                totalReferrals: 0,
                activeReferrals: 0,
                totalCommissionEarned: 0,
                tier1CommissionEarned: 0,
                tier2CommissionEarned: 0,
                lastActivity: new Date()
            }
        });
        
        await referralRecord.save();
        this.results.referralRecordsCreated++;
        
        // Update user with referral data
        const updateData = {
            referralData: {
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
            },
            commissionEarnings: {
                tier1Earnings: 0,
                tier2Earnings: 0,
                totalCommissions: 0,
                lastCommissionDate: null
            }
        };
        
        await User.updateOne({ _id: user._id }, updateData);
    }

    async validateMigration() {
        console.log('🔍 Validating migration...');
        
        const validationResults = {
            totalUsers: await User.countDocuments({}),
            usersWithReferralData: await User.countDocuments({
                'referralData.referralCode': { $exists: true, $ne: null }
            }),
            totalReferralRecords: await Referral.countDocuments({}),
            duplicateReferralCodes: 0,
            orphanedReferralRecords: 0,
            usersWithoutReferralRecords: 0
        };

        // Check for duplicate referral codes
        const duplicateCodes = await Referral.aggregate([
            { $group: { _id: '$code', count: { $sum: 1 } } },
            { $match: { count: { $gt: 1 } } }
        ]);
        validationResults.duplicateReferralCodes = duplicateCodes.length;

        // Check for orphaned referral records (referral record without user)
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
        validationResults.orphanedReferralRecords = orphanedReferrals.length;

        // Check for users without referral records
        const usersWithoutReferralRecords = await User.aggregate([
            {
                $lookup: {
                    from: 'referrals',
                    localField: '_id',
                    foreignField: 'codeOwner',
                    as: 'referral'
                }
            },
            { $match: { referral: { $size: 0 } } }
        ]);
        validationResults.usersWithoutReferralRecords = usersWithoutReferralRecords.length;

        console.log('📋 Validation Results:');
        console.log(`  Total Users: ${validationResults.totalUsers}`);
        console.log(`  Users with Referral Data: ${validationResults.usersWithReferralData}`);
        console.log(`  Total Referral Records: ${validationResults.totalReferralRecords}`);
        console.log(`  Duplicate Referral Codes: ${validationResults.duplicateReferralCodes}`);
        console.log(`  Orphaned Referral Records: ${validationResults.orphanedReferralRecords}`);
        console.log(`  Users without Referral Records: ${validationResults.usersWithoutReferralRecords}`);

        // Report issues
        if (validationResults.duplicateReferralCodes > 0) {
            console.log('⚠️  Warning: Duplicate referral codes found');
            console.log('Duplicate codes:', duplicateCodes.map(d => d._id));
        }

        if (validationResults.orphanedReferralRecords > 0) {
            console.log('⚠️  Warning: Orphaned referral records found');
        }

        if (validationResults.usersWithoutReferralRecords > 0) {
            console.log('⚠️  Warning: Users without referral records found');
        }

        return validationResults;
    }

    async fixDuplicateCodes() {
        console.log('🔧 Fixing duplicate referral codes...');
        
        const duplicates = await Referral.aggregate([
            { $group: { _id: '$code', docs: { $push: '$$ROOT' }, count: { $sum: 1 } } },
            { $match: { count: { $gt: 1 } } }
        ]);

        let fixed = 0;
        for (const duplicate of duplicates) {
            const docs = duplicate.docs;
            // Keep the first one, reassign codes to others
            for (let i = 1; i < docs.length; i++) {
                const newCode = await generateReferralCode();
                await Referral.findByIdAndUpdate(docs[i]._id, { code: newCode });
                
                // Update user record too
                await User.updateOne(
                    { _id: docs[i].codeOwner },
                    { 'referralData.referralCode': newCode }
                );
                
                fixed++;
            }
        }

        console.log(`✅ Fixed ${fixed} duplicate referral codes`);
        return fixed;
    }

    async generateMigrationReport() {
        const totalTime = this.results.endTime - this.results.startTime;
        
        console.log('\n' + '='.repeat(60));
        console.log('📊 MIGRATION REPORT');
        console.log('='.repeat(60));
        console.log(`Migration completed in: ${(totalTime / 1000).toFixed(2)} seconds`);
        console.log(`Users processed: ${this.results.usersProcessed}`);
        console.log(`Users skipped: ${this.results.usersSkipped}`);
        console.log(`Referral records created: ${this.results.referralRecordsCreated}`);
        console.log(`Errors encountered: ${this.results.errors.length}`);
        
        if (this.results.errors.length > 0) {
            console.log('\n❌ Errors:');
            this.results.errors.forEach((error, index) => {
                console.log(`  ${index + 1}. User: ${error.username} (${error.userId})`);
                console.log(`     Error: ${error.error}`);
            });
        }
        
        console.log('\n✅ Migration completed successfully!');
        console.log('Next steps:');
        console.log('1. Integrate referral routes into your main app');
        console.log('2. Update user registration to handle referral codes');
        console.log('3. Add commission processing to transaction completion');
        console.log('4. Test the referral system with test users');
        console.log('='.repeat(60));
    }

    async run() {
        try {
            this.results.startTime = performance.now();
            
            console.log('🚀 Starting Blunr Referral System Migration');
            console.log('Environment:', process.env.NODE_ENV || 'development');
            
            // Connect to database
            const connected = await this.connect();
            if (!connected) {
                process.exit(1);
            }

            // Check for existing migration
            const shouldContinue = await this.checkExistingMigration();
            if (!shouldContinue) {
                await this.disconnect();
                process.exit(0);
            }

            // Create database indexes
            await this.createIndexes();

            // Migrate users
            await this.migrateUsers();

            // Validate migration
            const validationResults = await this.validateMigration();

            // Fix any duplicate codes found
            if (validationResults.duplicateReferralCodes > 0) {
                await this.fixDuplicateCodes();
                // Re-validate after fixes
                await this.validateMigration();
            }

            this.results.endTime = performance.now();

            // Generate report
            await this.generateMigrationReport();

            // Disconnect
            await this.disconnect();
            
            process.exit(0);
            
        } catch (error) {
            console.error('💥 Migration failed:', error);
            await this.disconnect();
            process.exit(1);
        }
    }
}

// Utility functions for post-migration testing
class MigrationTester {
    static async testReferralCodeGeneration() {
        console.log('\n🧪 Testing referral code generation...');
        
        try {
            for (let i = 0; i < 10; i++) {
                const code = await generateReferralCode(`testuser${i}`);
                console.log(`Generated code: ${code}`);
            }
            console.log('✅ Referral code generation test passed');
        } catch (error) {
            console.error('❌ Referral code generation test failed:', error);
        }
    }
    
    static async testReferralLookup() {
        console.log('\n🧪 Testing referral code lookup...');
        
        try {
            const sampleReferral = await Referral.findOne({});
            if (sampleReferral) {
                const foundReferral = await Referral.findOne({ 
                    code: sampleReferral.code,
                    isActive: true 
                }).populate('codeOwner', 'username email');
                
                console.log(`Found referral: ${foundReferral.code} owned by ${foundReferral.codeOwner.username}`);
                console.log('✅ Referral lookup test passed');
            } else {
                console.log('⚠️  No referral records found for testing');
            }
        } catch (error) {
            console.error('❌ Referral lookup test failed:', error);
        }
    }
    
    static async testDashboardQuery() {
        console.log('\n🧪 Testing dashboard query performance...');
        
        try {
            const startTime = performance.now();
            
            const sampleUser = await User.findOne({
                'referralData.referralCode': { $exists: true }
            });
            
            if (sampleUser) {
                const referralData = await Referral.findOne({ 
                    codeOwner: sampleUser._id 
                })
                .populate('directReferrals', 'username createdAt')
                .populate('tier1Referrer tier2Referrer', 'username');
                
                const endTime = performance.now();
                console.log(`Query completed in ${(endTime - startTime).toFixed(2)}ms`);
                console.log(`User: ${sampleUser.username}, Code: ${referralData?.code}`);
                console.log('✅ Dashboard query test passed');
            } else {
                console.log('⚠️  No users with referral data found for testing');
            }
        } catch (error) {
            console.error('❌ Dashboard query test failed:', error);
        }
    }
    
    static async runAllTests() {
        console.log('\n🧪 Running post-migration tests...');
        
        await this.testReferralCodeGeneration();
        await this.testReferralLookup();
        await this.testDashboardQuery();
        
        console.log('\n✅ All tests completed');
    }
}

// Command line interface
const args = process.argv.slice(2);
const command = args[0];

async function main() {
    if (command === 'test') {
        // Run tests only
        const migration = new ReferralMigration();
        await migration.connect();
        await MigrationTester.runAllTests();
        await migration.disconnect();
    } else if (command === 'validate') {
        // Run validation only
        const migration = new ReferralMigration();
        await migration.connect();
        await migration.validateMigration();
        await migration.disconnect();
    } else {
        // Run full migration
        const migration = new ReferralMigration();
        await migration.run();
    }
}

// Handle process termination
process.on('SIGINT', async () => {
    console.log('\n⏹️  Migration interrupted by user');
    await mongoose.connection.close();
    process.exit(0);
});

process.on('unhandledRejection', async (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    await mongoose.connection.close();
    process.exit(1);
});

// Run migration
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(async (error) => {
        console.error('💥 Migration script failed:', error);
        await mongoose.connection.close();
        process.exit(1);
    });
}